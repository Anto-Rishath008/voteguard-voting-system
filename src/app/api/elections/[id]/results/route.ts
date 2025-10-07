import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
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

    const db = getDatabase();
    if (!db) {
      console.error("📊 [Results API] ❌ Database connection failed");
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }
    console.log("📊 [Results API] ✅ Database connected");

    // Get election details
    console.log("📊 [Results API] Fetching election details...");
    const electionResult = await db.query(
      `SELECT election_id, election_name, description, status, start_date, end_date, creator
       FROM elections WHERE election_id = $1`,
      [electionId]
    );

    if (!electionResult.rows || electionResult.rows.length === 0) {
      console.log("📊 [Results API] ❌ Election not found");
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    const electionData = electionResult.rows[0];
    console.log("📊 [Results API] ✅ Election found:", electionData.election_name, "Status:", electionData.status);

    // Check if results should be visible (election ended or user is admin)
    const currentTime = new Date();
    const endDate = new Date(electionData.end_date);
    const isElectionEnded = currentTime > endDate;
    
    // Check if user is admin - query the database directly
    let isAdmin = false;
    try {
      const rolesResult = await db.query(
        `SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')`,
        [authUser.userId]
      );
      isAdmin = rolesResult.rows && rolesResult.rows.length > 0;
      console.log("📊 [Results API] User admin status:", isAdmin);
    } catch (roleError) {
      console.error("Error checking user roles:", roleError);
      // Continue without admin privileges if role check fails
      isAdmin = false;
    }
    
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
      const eligibleResult = await db.query(
        `SELECT COUNT(*) as total FROM eligible_voters 
         WHERE election_id = $1 AND status = 'eligible'`,
        [electionId]
      );
      totalEligibleVoters = parseInt(eligibleResult.rows[0]?.total || '0');
      console.log("📊 [Results API] ✅ Eligible voters:", totalEligibleVoters);
    } catch (error) {
      console.log("📊 [Results API] ⚠️ Error fetching eligible voters:", error);
      totalEligibleVoters = 0;
    }

    // Get total votes cast (unique voters)
    console.log("📊 [Results API] Fetching votes cast...");
    const votesCastResult = await db.query(
      `SELECT COUNT(DISTINCT voter_id) as total FROM votes WHERE election_id = $1`,
      [electionId]
    );
    const totalVotesCast = parseInt(votesCastResult.rows[0]?.total || '0');
    console.log("📊 [Results API] ✅ Votes cast:", totalVotesCast);

    // Calculate turnout percentage
    const turnoutPercentage =
      (totalEligibleVoters || 0) > 0
        ? ((totalVotesCast || 0) / (totalEligibleVoters || 0)) * 100
        : 0;

    // Get contests for this election
    console.log("📊 [Results API] Fetching contests...");
    const contestsResult = await db.query(
      `SELECT contest_id as id, contest_title as title, contest_type
       FROM contests WHERE election_id = $1 ORDER BY contest_id ASC`,
      [electionId]
    );

    if (!contestsResult.rows) {
      console.error("📊 [Results API] ❌ Error fetching contests");
      return NextResponse.json(
        { error: "Failed to fetch contests" },
        { status: 500 }
      );
    }

    const contestsData = contestsResult.rows;
    console.log("📊 [Results API] ✅ Contests found:", contestsData.length);

    // Get results for each contest
    console.log("📊 [Results API] Processing contest results...");
    const contests = await Promise.all(
      (contestsData || []).map(async (contest: any) => {
        console.log(`📊 [Results API] Processing contest: ${contest.title}`);
        // Get candidates for this contest
        const candidatesResult = await db.query(
          `SELECT candidate_id as id, candidate_name as name, party
           FROM candidates WHERE contest_id = $1 ORDER BY candidate_id ASC`,
          [contest.id]
        );
        const candidatesData = candidatesResult.rows;

        // Get vote counts for each candidate
        const candidateResults = await Promise.all(
          (candidatesData || []).map(async (candidate: any) => {
            const votesResult = await db.query(
              `SELECT COUNT(*) as count 
               FROM votes
               WHERE candidate_id = $1 AND election_id = $2`,
              [candidate.id, electionId]
            );
            const votes = parseInt(votesResult.rows[0]?.count || '0');

            return {
              id: candidate.id,
              name: candidate.name,
              party: candidate.party,
              votes: votes || 0,
            };
          })
        );

        // Calculate total votes for this contest
        const totalContestVotes = candidateResults.reduce(
          (sum, candidate) => sum + candidate.votes,
          0
        );

        // Calculate percentages and determine winner(s)
        const candidatesWithPercentages = candidateResults.map((candidate) => ({
          ...candidate,
          percentage:
            totalContestVotes > 0
              ? (candidate.votes / totalContestVotes) * 100
              : 0,
        }));

        // Sort by votes (descending)
        candidatesWithPercentages.sort((a, b) => b.votes - a.votes);

        // Mark winners (for single-winner contests, just the first; for multi-winner, top N)
        // Default to single winner for all contest types (max_selections = 1)
        const maxVotes = candidatesWithPercentages[0]?.votes || 0;
        const candidatesWithWinners = candidatesWithPercentages.map(
          (candidate, index) => ({
            id: candidate.id,
            name: candidate.name,
            party: candidate.party,
            votes: candidate.votes, // Keep as 'votes' to match frontend expectation
            percentage: candidate.percentage,
            isWinner: index === 0 && candidate.votes > 0, // Only first candidate wins if they have votes
          })
        );

        return {
          id: contest.id,
          title: contest.title,
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
