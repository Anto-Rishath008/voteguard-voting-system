import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";
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

    const db = getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Get election details
    const electionResult = await db.query(
      `SELECT election_id, election_name, description, status, start_date, end_date, creator
       FROM elections WHERE election_id = $1`,
      [electionId]
    );

    if (!electionResult.rows || electionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    const electionData = electionResult.rows[0];

    // Check if results should be visible (election ended or user is admin)
    const currentTime = new Date();
    const endDate = new Date(electionData.end_date);
    const isElectionEnded = currentTime > endDate;
    
    // Check if user is admin
    const userRoles = await db.getUserRoles(authUser.userId);
    const isAdmin = userRoles.some(role => ['Admin', 'SuperAdmin'].includes(role));
    
    if (!isElectionEnded && !isAdmin) {
      return NextResponse.json(
        { error: "Results not available yet" },
        { status: 403 }
      );
    }

    // Only show results if election is completed (simplified access control)
    if (electionData.status !== "Completed" && !isAdmin) {
      return NextResponse.json(
        {
          error: "Results are not available until the election is completed",
        },
        { status: 403 }
      );
    }

    // Get total eligible voters
    let totalEligibleVoters = 0;
    try {
      const eligibleResult = await db.query(
        `SELECT COUNT(*) as total FROM election_eligibility WHERE election_id = $1`,
        [electionId]
      );
      totalEligibleVoters = parseInt(eligibleResult.rows[0]?.total || '0');
    } catch (error) {
      console.log("Election eligibility table may not exist, using total users");
      const usersResult = await db.query(`SELECT COUNT(*) as total FROM users`);
      totalEligibleVoters = parseInt(usersResult.rows[0]?.total || '0');
    }

    // Get total votes cast
    const votesCastResult = await db.query(
      `SELECT COUNT(DISTINCT user_id) as total FROM votes WHERE election_id = $1`,
      [electionId]
    );
    const totalVotesCast = parseInt(votesCastResult.rows[0]?.total || '0');

    // Calculate turnout percentage
    const turnoutPercentage =
      (totalEligibleVoters || 0) > 0
        ? ((totalVotesCast || 0) / (totalEligibleVoters || 0)) * 100
        : 0;

    // Get contests for this election
    const contestsResult = await db.query(
      `SELECT contest_id as id, contest_title as title, description, contest_type, max_selections
       FROM contests WHERE election_id = $1 ORDER BY display_order ASC`,
      [electionId]
    );

    if (!contestsResult.rows) {
      console.error("Error fetching contests");
      return NextResponse.json(
        { error: "Failed to fetch contests" },
        { status: 500 }
      );
    }

    const contestsData = contestsResult.rows;

    // Get results for each contest
    const contests = await Promise.all(
      (contestsData || []).map(async (contest: any) => {
        // Get candidates for this contest
        const candidatesResult = await db.query(
          `SELECT candidate_id as id, candidate_name as name, party, description
           FROM candidates WHERE contest_id = $1 ORDER BY display_order ASC`,
          [contest.id]
        );
        const candidatesData = candidatesResult.rows;

        // Get vote counts for each candidate
        const candidateResults = await Promise.all(
          (candidatesData || []).map(async (candidate: any) => {
            const votesResult = await db.query(
              `SELECT COUNT(*) as count 
               FROM ballot_selections bs
               JOIN votes v ON bs.vote_id = v.vote_id
               WHERE bs.candidate_id = $1 AND v.election_id = $2`,
              [candidate.id, electionId]
            );
            const votes = parseInt(votesResult.rows[0]?.count || '0');

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
