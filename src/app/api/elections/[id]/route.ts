import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
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

    // Get voter count for this election
    const voterCountResult = await db.query(
      `SELECT COUNT(DISTINCT voter_id) as total FROM votes WHERE election_id = $1`,
      [electionId]
    );
    const totalVoters = parseInt(voterCountResult.rows[0]?.total || '0');

    // Check if user has voted
    const userVoteResult = await db.query(
      `SELECT vote_id FROM votes WHERE election_id = $1 AND voter_id = $2`,
      [electionId, authUser.userId]
    );
    const userVote = userVoteResult.rows.length > 0 ? userVoteResult.rows[0] : null;

    // For now, assume all authenticated users are eligible
    let myVoteStatus = userVote ? "voted" : "not_voted";

    // Get contests for this election
    const contestsResult = await db.query(
      `SELECT contest_id, contest_title, contest_type 
       FROM contests 
       WHERE election_id = $1 
       ORDER BY contest_id ASC`,
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

    // Get candidates for each contest
    const contests = await Promise.all(
      contestsData.map(async (contest: any) => {
        const candidatesResult = await db.query(
          `SELECT candidate_id, candidate_name, party
           FROM candidates 
           WHERE contest_id = $1 AND election_id = $2
           ORDER BY candidate_name ASC`,
          [contest.contest_id, electionId]
        );
        const candidatesData = candidatesResult.rows;

        return {
          id: contest.contest_id,
          title: contest.contest_title,
          contestType: contest.contest_type,
          candidates: (candidatesData || []).map((candidate: any) => ({
            id: candidate.candidate_id,
            name: candidate.candidate_name,
            party: candidate.party,
          })),
        };
      })
    );

    const election = {
      id: electionData.election_id,
      title: electionData.election_name,
      description: electionData.description,
      status: electionData.status,
      startDate: electionData.start_date,
      endDate: electionData.end_date,
      totalVoters: totalVoters || 0,
      myVoteStatus,
      contests,
    };

    return NextResponse.json({ election });
  } catch (error) {
    console.error("Election details API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
