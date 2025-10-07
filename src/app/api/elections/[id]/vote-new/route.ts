import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

// POST /api/elections/[id]/vote - Submit votes for an election
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const { votes } = await request.json(); // votes: { contestId: candidateId }

    console.log('🗳️ Vote submission for election:', electionId);
    console.log('📊 Votes received:', votes);

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();

    // Check if election exists and is active
    const electionResult = await db.query(
      "SELECT election_name, status FROM elections WHERE election_id = $1",
      [electionId]
    );

    if (electionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    if (electionResult.rows[0].status !== 'Active') {
      return NextResponse.json(
        { error: "Election is not active" },
        { status: 400 }
      );
    }

    // Check if user is eligible to vote
    const eligibilityResult = await db.query(
      "SELECT status FROM eligible_voters WHERE election_id = $1 AND user_id = $2",
      [electionId, authUser.userId]
    );

    if (eligibilityResult.rows.length === 0 || eligibilityResult.rows[0].status !== 'eligible') {
      return NextResponse.json(
        { error: "You are not eligible to vote in this election" },
        { status: 403 }
      );
    }

    // Check if user has already voted
    const existingVoteResult = await db.query(
      "SELECT vote_id FROM votes WHERE voter_id = $1 AND election_id = $2 LIMIT 1",
      [authUser.userId, electionId]
    );

    if (existingVoteResult.rows.length > 0) {
      return NextResponse.json(
        { error: "You have already voted in this election" },
        { status: 400 }
      );
    }

    // Validate votes
    if (!votes || typeof votes !== 'object') {
      return NextResponse.json(
        { error: "Invalid votes format" },
        { status: 400 }
      );
    }

    // Get all contests for this election
    const contestsResult = await db.query(
      "SELECT contest_id FROM contests WHERE election_id = $1",
      [electionId]
    );

    const validContestIds = contestsResult.rows.map(row => row.contest_id.toString());

    // Validate that all votes are for valid contests
    for (const contestId of Object.keys(votes)) {
      if (!validContestIds.includes(contestId)) {
        return NextResponse.json(
          { error: `Invalid contest ID: ${contestId}` },
          { status: 400 }
        );
      }

      // Validate candidate exists in the contest
      const candidateResult = await db.query(
        "SELECT candidate_id FROM candidates WHERE candidate_id = $1 AND contest_id = $2",
        [votes[contestId], contestId]
      );

      if (candidateResult.rows.length === 0) {
        return NextResponse.json(
          { error: `Invalid candidate for contest ${contestId}` },
          { status: 400 }
        );
      }
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      const sessionId = uuidv4();
      let previousHash = null;

      // Get the last vote hash for blockchain-like integrity
      const lastVoteResult = await db.query(
        "SELECT vote_hash FROM votes ORDER BY created_at DESC LIMIT 1"
      );

      if (lastVoteResult.rows.length > 0) {
        previousHash = lastVoteResult.rows[0].vote_hash;
      }

      // Insert votes
      for (const [contestId, candidateId] of Object.entries(votes)) {
        const voteId = uuidv4();
        const voteData = `${voteId}-${authUser.userId}-${contestId}-${candidateId}-${Date.now()}`;
        const voteHash = crypto.createHash('sha256').update(voteData).digest('hex');

        await db.query(`
          INSERT INTO votes (
            vote_id, contest_id, election_id, voter_id, candidate_id, 
            vote_timestamp, vote_hash, previous_vote_hash, session_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          voteId, 
          parseInt(contestId), 
          electionId, 
          authUser.userId, 
          candidateId,
          new Date().toISOString(),
          voteHash,
          previousHash,
          sessionId
        ]);

        previousHash = voteHash; // For next vote in this session
      }

      // Update eligible voter status
      await db.query(
        "UPDATE eligible_voters SET status = 'voted' WHERE election_id = $1 AND user_id = $2",
        [electionId, authUser.userId]
      );

      // Commit transaction
      await db.query('COMMIT');

      console.log('✅ Vote recorded successfully for user:', authUser.userId);

      return NextResponse.json({ 
        success: true, 
        message: "Your votes have been recorded successfully",
        sessionId 
      });

    } catch (error) {
      // Rollback transaction
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error("Vote submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}