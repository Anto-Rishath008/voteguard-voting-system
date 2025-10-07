import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";
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

    // Note: Candidate check removed - candidates table doesn't have user_id field
    // Candidates are stored by name only, not linked to user accounts
    
    // Check if user has already voted in this election
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
      selections: selections.sort((a: any, b: any) =>
        a.contestId.localeCompare(b.contestId)
      ),
      timestamp,
    });
    const ballotHash = crypto
      .createHash("sha256")
      .update(ballotData)
      .digest("hex");

    // Get previous vote hash for chaining (will be retrieved in insert section)
    const chainedData = ballotHash + timestamp;
    const voteHash = crypto
      .createHash("sha256")
      .update(chainedData)
      .digest("hex");

    // Insert vote records - one per candidate selection
    // The votes table stores: vote_id, contest_id, election_id, voter_id, candidate_id, 
    // vote_timestamp, vote_hash, previous_vote_hash, session_id, created_at
    
    console.log('📝 Preparing to insert votes...');
    console.log('Selections:', JSON.stringify(selections, null, 2));
    
    // Get previous vote hash for chaining
    const lastVoteResult = await db.query(
      `SELECT vote_hash FROM votes ORDER BY created_at DESC LIMIT 1`
    );
    const lastVote = lastVoteResult.rows.length > 0 ? lastVoteResult.rows[0] : null;
    const previousHash = lastVote?.vote_hash || null;
    
    try {
      // Collect all vote records to insert
      const voteRecords = [];
      
      for (const selection of selections) {
        for (const candidateId of selection.candidateIds) {
          voteRecords.push({
            vote_id: uuidv4(),
            contest_id: selection.contestId,
            election_id: electionId,
            voter_id: authUser.userId,
            candidate_id: candidateId,
            vote_timestamp: timestamp,
            vote_hash: voteHash,
            previous_vote_hash: previousHash,
            session_id: null, // Can be added if session tracking is needed
            created_at: timestamp
          });
        }
      }

      console.log('📊 Vote records to insert:', voteRecords.length);
      
      // Insert all vote records
      if (voteRecords.length > 0) {
        const votesQuery = `
          INSERT INTO votes (vote_id, contest_id, election_id, voter_id, candidate_id, vote_timestamp, vote_hash, previous_vote_hash, session_id, created_at)
          VALUES ${voteRecords.map((_, i) => 
            `($${i * 10 + 1}, $${i * 10 + 2}, $${i * 10 + 3}, $${i * 10 + 4}, $${i * 10 + 5}, $${i * 10 + 6}, $${i * 10 + 7}, $${i * 10 + 8}, $${i * 10 + 9}, $${i * 10 + 10})`
          ).join(', ')}
        `;
        
        const votesParams = voteRecords.flatMap(vote => [
          vote.vote_id,
          vote.contest_id,
          vote.election_id,
          vote.voter_id,
          vote.candidate_id,
          vote.vote_timestamp,
          vote.vote_hash,
          vote.previous_vote_hash,
          vote.session_id,
          vote.created_at
        ]);
        
        console.log('🔍 Executing INSERT query with', votesParams.length / 10, 'records');
        await db.query(votesQuery, votesParams);
        console.log('✅ Votes inserted successfully');
      }
    } catch (voteError) {
      console.error("Error creating votes:", voteError);
      console.error("Vote error details:", {
        name: voteError instanceof Error ? voteError.name : 'Unknown',
        message: voteError instanceof Error ? voteError.message : String(voteError),
        code: (voteError as any)?.code,
        detail: (voteError as any)?.detail,
        hint: (voteError as any)?.hint,
        constraint: (voteError as any)?.constraint,
        table: (voteError as any)?.table,
        column: (voteError as any)?.column
      });
      return NextResponse.json(
        { 
          error: "Failed to record votes",
          details: voteError instanceof Error ? voteError.message : String(voteError)
        },
        { status: 500 }
      );
    }

    // Create audit log
    try {
      await db.query(
        `INSERT INTO audit_log (user_id, operation_type, table_name, record_id, timestamp, ip_address, user_agent, new_values)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          authUser.userId,
          "VOTE_CAST",
          "votes",
          electionId,
          timestamp,
          request.headers.get("x-forwarded-for") ||
          request.headers.get("x-real-ip") ||
          "unknown",
          request.headers.get("user-agent") || "unknown",
          JSON.stringify({
            election_id: electionId,
            contests_voted: selections.length,
            total_selections: selections.reduce(
              (sum: number, s: any) => sum + s.candidateIds.length,
              0
            ),
          })
        ]
      );
    } catch (auditError) {
      console.log("Audit log error:", auditError);
    }

    // Update eligible voters status to 'voted'
    try {
      await db.query(
        `UPDATE eligible_voters SET status = 'voted' WHERE election_id = $1 AND user_id = $2`,
        [electionId, authUser.userId]
      );
    } catch (statusError) {
      console.log("Error updating eligible voter status:", statusError);
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
    console.error("Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      hint: (error as any)?.hint,
      constraint: (error as any)?.constraint,
      table: (error as any)?.table,
      column: (error as any)?.column
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
