import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

// GET /api/elections/[id]/contests - Get contests and candidates for an election
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();

    // Get election details
    const electionResult = await db.query(
      "SELECT election_id, election_name, description, status, start_date, end_date FROM elections WHERE election_id = $1",
      [electionId]
    );

    if (electionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    const election = electionResult.rows[0];

    // Check if user is eligible to vote in this election
    const eligibilityResult = await db.query(
      "SELECT status FROM eligible_voters WHERE election_id = $1 AND user_id = $2",
      [electionId, authUser.userId]
    );

    const isEligible = eligibilityResult.rows.length > 0 && eligibilityResult.rows[0].status === 'eligible';

    // Get contests and candidates
    const contestsResult = await db.query(`
      SELECT 
        c.contest_id,
        c.contest_title,
        c.contest_type,
        json_agg(
          json_build_object(
            'candidate_id', cand.candidate_id,
            'candidate_name', cand.candidate_name,
            'party', cand.party
          ) ORDER BY cand.candidate_name
        ) as candidates
      FROM contests c
      LEFT JOIN candidates cand ON c.contest_id = cand.contest_id
      WHERE c.election_id = $1
      GROUP BY c.contest_id, c.contest_title, c.contest_type
      ORDER BY c.contest_id
    `, [electionId]);

    // Check if user has already voted
    const votesResult = await db.query(
      "SELECT contest_id, candidate_id FROM votes WHERE voter_id = $1 AND election_id = $2",
      [authUser.userId, electionId]
    );

    const userVotes: { [key: string]: string } = {};
    votesResult.rows.forEach(vote => {
      userVotes[vote.contest_id] = vote.candidate_id;
    });

    return NextResponse.json({
      election,
      contests: contestsResult.rows,
      isEligible,
      hasVoted: votesResult.rows.length > 0,
      userVotes
    });

  } catch (error) {
    console.error("Get election contests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}