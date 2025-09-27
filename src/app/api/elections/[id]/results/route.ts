import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get election details
    const { data: electionData, error: electionError } = await supabase
      .from("elections")
      .select(
        `
        election_id,
        election_name,
        description,
        status,
        start_date,
        end_date
      `
      )
      .eq("election_id", electionId)
      .single();

    if (electionError || !electionData) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Only show results if election is completed (simplified access control)
    if (electionData.status !== "Completed") {
      return NextResponse.json(
        {
          error: "Results are not available until the election is completed",
        },
        { status: 403 }
      );
    }

    // Get total eligible voters
    const { count: totalEligibleVoters } = await supabase
      .from("election_eligibility")
      .select("*", { count: "exact" })
      .eq("election_id", electionId);

    // Get total votes cast
    const { count: totalVotesCast } = await supabase
      .from("votes")
      .select("*", { count: "exact" })
      .eq("election_id", electionId);

    // Calculate turnout percentage
    const turnoutPercentage =
      (totalEligibleVoters || 0) > 0
        ? ((totalVotesCast || 0) / (totalEligibleVoters || 0)) * 100
        : 0;

    // Get contests for this election
    const { data: contestsData, error: contestsError } = await supabase
      .from("contests")
      .select(
        `
        id,
        title,
        description,
        contest_type,
        max_selections
      `
      )
      .eq("election_id", electionId)
      .order("display_order", { ascending: true });

    if (contestsError) {
      console.error("Error fetching contests:", contestsError);
      return NextResponse.json(
        { error: "Failed to fetch contests" },
        { status: 500 }
      );
    }

    // Get results for each contest
    const contests = await Promise.all(
      (contestsData || []).map(async (contest: any) => {
        // Get candidates for this contest
        const { data: candidatesData } = await supabase
          .from("candidates")
          .select("id, name, party, description")
          .eq("contest_id", contest.id)
          .order("display_order", { ascending: true });

        // Get vote counts for each candidate
        const candidateResults = await Promise.all(
          (candidatesData || []).map(async (candidate: any) => {
            const { count: votes } = await supabase
              .from("ballot_selections")
              .select("*, votes!inner(*)", { count: "exact" })
              .eq("candidate_id", candidate.id)
              .eq("votes.election_id", electionId);

            return {
              id: candidate.id,
              name: candidate.name,
              party: candidate.party,
              description: candidate.description,
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
        const maxVotes = candidatesWithPercentages[0]?.votes || 0;
        const candidatesWithWinners = candidatesWithPercentages.map(
          (candidate, index) => ({
            ...candidate,
            isWinner:
              contest.max_selections === 1
                ? index === 0 && candidate.votes > 0
                : index < contest.max_selections &&
                  candidate.votes === maxVotes,
          })
        );

        return {
          id: contest.id,
          title: contest.title,
          description: contest.description,
          totalVotes: totalContestVotes,
          candidates: candidatesWithWinners,
        };
      })
    );

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

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Election results API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
