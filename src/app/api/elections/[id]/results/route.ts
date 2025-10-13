import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verifyJWT } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("📊 [Results API] Starting request...");
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    console.log("📊 [Results API] Election ID:", electionId);

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    console.log("📊 [Results API] Auth check:", authUser ? "✅ Authenticated" : "❌ Not authenticated");
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("📊 [Results API] ✅ Using Supabase client");

    // Get election details
    console.log("📊 [Results API] Fetching election details...");
    const { data: electionData, error: electionError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .select('election_id, election_name, description, status, start_date, end_date, creator')
      .eq('election_id', electionId)
      .single();

    if (electionError || !electionData) {
      console.log("📊 [Results API] ❌ Election not found");
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    console.log("📊 [Results API] ✅ Election found:", electionData.election_name, "Status:", electionData.status);

    // Check if results should be visible (election ended or user is admin)
    const currentTime = new Date();
    const endDate = new Date(electionData.end_date);
    const isElectionEnded = currentTime > endDate;
    
    // Check if user is admin from JWT roles
    const isAdmin = authUser.roles?.includes("Admin") || authUser.roles?.includes("SuperAdmin") || false;
    console.log("📊 [Results API] User admin status:", isAdmin);
    
    // Allow access if:
    // 1. User is admin OR
    // 2. Election has ended (status is "Completed" or "Closed")
    const allowedStatuses = ["Completed", "Closed"];
    const canAccessResults = isAdmin || (isElectionEnded && allowedStatuses.includes(electionData.status));
    
    console.log("📊 [Results API] Access check:", {
      isAdmin,
      isElectionEnded,
      status: electionData.status,
      canAccessResults
    });
    
    if (!canAccessResults) {
      const errorMessage = !isElectionEnded 
        ? "Results are not available until the election ends"
        : "Results are not available yet. Please wait for the election to be finalized.";
      
      console.log("📊 [Results API] ❌ Access denied:", errorMessage);
      return NextResponse.json(
        { error: errorMessage },
        { status: 403 }
      );
    }
    
    console.log("📊 [Results API] ✅ Access granted");

    // Get total eligible voters
    console.log("📊 [Results API] Fetching eligible voters...");
    let totalEligibleVoters = 0;
    try {
      const { count } = await supabaseAuth.supabaseAdmin
        .from('eligible_voters')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', electionId)
        .eq('status', 'eligible');
      
      totalEligibleVoters = count || 0;
      console.log("📊 [Results API] ✅ Eligible voters:", totalEligibleVoters);
    } catch (error) {
      console.log("📊 [Results API] ⚠️ Error fetching eligible voters:", error);
      totalEligibleVoters = 0;
    }

    // Get total votes cast (unique voters)
    console.log("📊 [Results API] Fetching votes cast...");
    const { data: votesData } = await supabaseAuth.supabaseAdmin
      .from('votes')
      .select('voter_id')
      .eq('election_id', electionId);
    
    const uniqueVoters = new Set(votesData?.map(v => v.voter_id) || []);
    const totalVotesCast = uniqueVoters.size;
    console.log("📊 [Results API] ✅ Votes cast:", totalVotesCast);

    // Calculate turnout percentage
    const turnoutPercentage =
      (totalEligibleVoters || 0) > 0
        ? ((totalVotesCast || 0) / (totalEligibleVoters || 0)) * 100
        : 0;

    // Get contests for this election
    console.log("📊 [Results API] Fetching contests...");
    const { data: contestsData, error: contestsError } = await supabaseAuth.supabaseAdmin
      .from('contests')
      .select('contest_id, contest_title, contest_type')
      .eq('election_id', electionId)
      .order('contest_id');

    if (contestsError) {
      console.error("📊 [Results API] ❌ Error fetching contests:", contestsError);
      return NextResponse.json(
        { error: "Failed to fetch contests" },
        { status: 500 }
      );
    }

    console.log("📊 [Results API] ✅ Contests found:", contestsData?.length || 0);

    // Get results for each contest
    console.log("📊 [Results API] Processing contest results...");
    const contests = await Promise.all(
      (contestsData || []).map(async (contest: any) => {
        console.log(`📊 [Results API] Processing contest: ${contest.contest_title}`);
        
        // Get candidates for this contest
        const { data: candidatesData } = await supabaseAuth.supabaseAdmin
          .from('candidates')
          .select('candidate_id, candidate_name, party')
          .eq('contest_id', contest.contest_id)
          .order('candidate_id');

        // Get vote counts for each candidate
        const candidateResults = await Promise.all(
          (candidatesData || []).map(async (candidate: any) => {
            const { count } = await supabaseAuth.supabaseAdmin
              .from('votes')
              .select('*', { count: 'exact', head: true })
              .eq('candidate_id', candidate.candidate_id)
              .eq('election_id', electionId);

            return {
              id: candidate.candidate_id,
              name: candidate.candidate_name,
              party: candidate.party,
              votes: count || 0,
            };
          })
        );

        // Calculate total votes for this contest
        const totalContestVotes = candidateResults.reduce(
          (sum: number, candidate: any) => sum + candidate.votes,
          0
        );

        // Calculate percentages and determine winner(s)
        const candidatesWithPercentages = candidateResults.map((candidate: any) => ({
          ...candidate,
          percentage:
            totalContestVotes > 0
              ? (candidate.votes / totalContestVotes) * 100
              : 0,
        }));

        // Sort by votes (descending)
        candidatesWithPercentages.sort((a: any, b: any) => b.votes - a.votes);

        // Mark winners (for single-winner contests, just the first; for multi-winner, top N)
        // Default to single winner for all contest types (max_selections = 1)
        const maxVotes = candidatesWithPercentages[0]?.votes || 0;
        const candidatesWithWinners = candidatesWithPercentages.map(
          (candidate: any, index: number) => ({
            id: candidate.id,
            name: candidate.name,
            party: candidate.party,
            votes: candidate.votes, // Keep as 'votes' to match frontend expectation
            percentage: candidate.percentage,
            isWinner: index === 0 && candidate.votes > 0, // Only first candidate wins if they have votes
          })
        );

        return {
          id: contest.contest_id,
          title: contest.contest_title,
          description: '', // Not available in schema
          contestType: contest.contest_type, // Add contestType for frontend
          totalVotes: totalContestVotes,
          candidates: candidatesWithWinners,
        };
      })
    );

    console.log("📊 [Results API] ✅ All contests processed successfully");
    
    const results = {
      id: electionData.election_id,
      title: electionData.election_name,
      description: electionData.description,
      status: electionData.status,
      startDate: electionData.start_date,
      endDate: electionData.end_date,
      totalEligibleVoters: totalEligibleVoters || 0,
      totalVotesCast: totalVotesCast || 0,
      turnoutPercentage,
      contests,
    };

    console.log("📊 [Results API] ✅ Sending response");
    return NextResponse.json({ results });
  } catch (error) {
    console.error("📊 [Results API] ❌ ERROR:", error);
    console.error("📊 [Results API] Error details:", {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
