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
    const { selections } = await request.json(); // selections: array of { contestId, candidateIds }

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

    // Validate selections against contests
    const contestsResult = await db.query(
      `SELECT contest_id as id, max_selections FROM contests WHERE election_id = $1`,
      [electionId]
    );
    const contests = contestsResult.rows;

    for (const selection of selections) {
      const contest = contests?.find((c) => c.id === selection.contestId);
      if (!contest) {
        return NextResponse.json(
          {
            error: `Invalid contest: ${selection.contestId}`,
          },
          { status: 400 }
        );
      }

      if (selection.candidateIds.length > contest.max_selections) {
        return NextResponse.json(
          {
            error: `Too many selections for contest. Maximum: ${contest.max_selections}`,
          },
          { status: 400 }
        );
      }

      // Validate candidate IDs exist for this contest
      if (selection.candidateIds.length > 0) {
        const candidatesResult = await db.query(
          `SELECT candidate_id as id FROM candidates 
           WHERE contest_id = $1 AND candidate_id = ANY($2)`,
          [selection.contestId, selection.candidateIds]
        );

        if (
          !candidatesResult.rows ||
          candidatesResult.rows.length !== selection.candidateIds.length
        ) {
          return NextResponse.json(
            {
              error: `Invalid candidates for contest: ${selection.contestId}`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Generate vote record
    const voteId = uuidv4();
    const timestamp = new Date().toISOString();

    // Create ballot hash for verification
    const ballotData = JSON.stringify({
      electionId,
      userId: authUser.userId,
      selections: selections.sort((a, b) =>
        a.contestId.localeCompare(b.contestId)
      ),
      timestamp,
    });
    const ballotHash = crypto
      .createHash("sha256")
      .update(ballotData)
      .digest("hex");

    // Get previous vote hash for chaining
    const lastVoteResult = await db.query(
      `SELECT ballot_hash FROM votes ORDER BY created_at DESC LIMIT 1`
    );
    const lastVote = lastVoteResult.rows.length > 0 ? lastVoteResult.rows[0] : null;

    const previousHash = lastVote?.ballot_hash || "0";
    const chainedData = previousHash + ballotHash;
    const voteHash = crypto
      .createHash("sha256")
      .update(chainedData)
      .digest("hex");

    // Start transaction - Insert vote record
    try {
      await db.query(
        `INSERT INTO votes (vote_id, election_id, user_id, ballot_hash, vote_hash, previous_vote_hash, cast_at, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          voteId,
          electionId,
          authUser.userId,
          ballotHash,
          voteHash,
          previousHash,
          timestamp,
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
          timestamp
        ]
      );
    } catch (voteError) {
      console.error("Error creating vote:", voteError);
      return NextResponse.json(
        { error: "Failed to record vote" },
        { status: 500 }
      );
    }

    // Record individual ballot selections
    const ballotSelections = [];
    for (const selection of selections) {
      for (const candidateId of selection.candidateIds) {
        ballotSelections.push({
          id: uuidv4(),
          vote_id: voteId,
          contest_id: selection.contestId,
          candidate_id: candidateId,
          selection_order: selection.candidateIds.indexOf(candidateId) + 1,
        });
      }
    }

    if (ballotSelections.length > 0) {
      try {
        // Insert ballot selections
        const selectionsQuery = `
          INSERT INTO ballot_selections (vote_id, contest_id, candidate_id, selection_order, created_at)
          VALUES ${ballotSelections.map((_, i) => 
            `($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`
          ).join(', ')}
        `;
        
        const selectionsParams = ballotSelections.flatMap(selection => [
          selection.vote_id,
          selection.contest_id,
          selection.candidate_id,
          selection.selection_order,
          timestamp
        ]);
        
        await db.query(selectionsQuery, selectionsParams);
      } catch (selectionsError) {
        console.error("Error recording ballot selections:", selectionsError);
        // Try to clean up the vote record
        try {
          await db.query(`DELETE FROM votes WHERE vote_id = $1`, [voteId]);
        } catch (cleanupError) {
          console.error("Failed to cleanup vote record:", cleanupError);
        }
        return NextResponse.json(
          { error: "Failed to record ballot selections" },
          { status: 500 }
        );
      }
    }

    // Create audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, changes, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          authUser.userId,
          "VOTE_CAST",
          "election",
          electionId,
          JSON.stringify({
            vote_id: voteId,
            contests_voted: selections.length,
            total_selections: selections.reduce(
              (sum, s) => sum + s.candidateIds.length,
              0
            ),
          }),
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
          request.headers.get("user-agent") || "unknown",
          timestamp
        ]
      );
    } catch (auditError) {
      console.log("Audit log table may not exist:", auditError);
    }

    return NextResponse.json({
      success: true,
      message: "Vote cast successfully",
      data: {
        voteId,
        ballotHash,
        voteHash,
        timestamp,
      },
    });

  } catch (error) {
    console.error("Vote submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
