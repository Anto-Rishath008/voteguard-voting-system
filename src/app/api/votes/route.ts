import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verifyJWT } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { votes, sessionId } = await request.json();
    
    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has voter permissions
    const db = await getDatabase();
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name = 'Voter'",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Validate votes array
    if (!Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json(
        { error: "Invalid votes data" },
        { status: 400 }
      );
    }

    const castedVotes = [];
    const errors = [];

    for (const vote of votes) {
      try {
        const { contestId, electionId, candidateId } = vote;

        // Validate required fields
        if (!contestId || !electionId || !candidateId) {
          errors.push(`Missing required fields for vote`);
          continue;
        }

        // Check if user already voted in this contest
        const voteCheckResult = await db.query(
          "SELECT vote_id FROM votes WHERE user_id = $1 AND contest_id = $2 AND election_id = $3",
          [authUser.userId, contestId, electionId]
        );
        if (voteCheckResult.rows.length > 0) {
          errors.push(`User has already voted in contest ${contestId}`);
          continue;
        }

        // Verify contest exists
        const contestResult = await db.query(
          "SELECT * FROM contests WHERE contest_id = $1 AND election_id = $2",
          [contestId, electionId]
        );

        if (contestResult.rows.length === 0) {
          errors.push(`Contest ${contestId} not found`);
          continue;
        }
        const contest = contestResult.rows[0];

        const candidateResult = await db.query(
          "SELECT * FROM candidates WHERE candidate_id = $1 AND contest_id = $2",
          [candidateId, contestId]
        );

        if (candidateResult.rows.length === 0) {
          errors.push(`Candidate ${candidateId} not found`);
          continue;
        }
        const candidate = candidateResult.rows[0];

        // Check if election is active
        const electionResult = await db.query(
          "SELECT * FROM elections WHERE election_id = $1",
          [electionId]
        );

        if (electionResult.rows.length === 0 || electionResult.rows[0].status !== "Active") {
          errors.push(`Election ${electionId} is not active`);
          continue;
        }
        const election = electionResult.rows[0];

        const now = new Date();
        const startDate = new Date(election.start_date);
        const endDate = new Date(election.end_date);

        if (now < startDate || now > endDate) {
          errors.push(`Election ${electionId} is not within voting period`);
          continue;
        }

        // Get previous vote hash for chaining
        const previousHashResult = await db.query(
          "SELECT vote_hash FROM votes ORDER BY vote_timestamp DESC LIMIT 1"
        );
        const previousHash = previousHashResult.rows[0]?.vote_hash || null;

        // Generate vote data
        const voteTimestamp = new Date().toISOString();
        const voteData = `${contestId}-${authUser.userId}-${candidateId}-${voteTimestamp}-${previousHash || ''}`;
        const voteHash = crypto.createHash('sha256').update(voteData).digest('hex');

        // Insert vote
        const voteId = uuidv4();
        const voteInsertResult = await db.query(
          `INSERT INTO votes (vote_id, contest_id, election_id, user_id, candidate_id, vote_timestamp, vote_hash, previous_vote_hash, session_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING *`,
          [voteId, contestId, electionId, authUser.userId, candidateId, voteTimestamp, voteHash, previousHash, sessionId || uuidv4()]
        );

        if (voteInsertResult.rows.length === 0) {
          console.error("Error casting vote");
          errors.push(`Failed to cast vote for contest ${contestId}`);
          continue;
        }
        const newVote = voteInsertResult.rows[0];

        castedVotes.push(newVote);

        // Create audit log for vote (optional - only if audit_logs table exists)
        try {
          await db.query(
            `INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
            [
              authUser.userId,
              "VOTE_CAST",
              "votes",
              newVote.vote_id,
              JSON.stringify({ contestId, electionId, candidateId, voteHash, timestamp: voteTimestamp }),
              request.headers.get("x-forwarded-for") || "unknown",
              request.headers.get("user-agent") || "unknown"
            ]
          );
        } catch (auditError: any) {
          // Audit logging is optional - don't fail the vote if audit table doesn't exist
          console.log("Audit logging skipped (table may not exist):", auditError.message);
        }
      } catch (error) {
        console.error("Error processing vote:", error);
        errors.push(`Error processing vote: ${error}`);
      }
    }

    // Return results
    const response = {
      success: castedVotes.length > 0,
      castedVotes: castedVotes.length,
      totalVotes: votes.length,
      votes: castedVotes,
      errors: errors.length > 0 ? errors : undefined,
    };

    const statusCode = castedVotes.length > 0 ? 201 : 400;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error("Vote casting error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Get vote history for current user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId");

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has voter permissions
    const db = await getDatabase();
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name = 'Voter'",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build query for vote history with joins
    let sqlQuery = `
      SELECT v.*, 
             c.candidate_name, c.party,
             cont.contest_title, cont.contest_type,
             e.election_name
      FROM votes v
      LEFT JOIN candidates c ON v.candidate_id = c.candidate_id
      LEFT JOIN contests cont ON v.contest_id = cont.contest_id
      LEFT JOIN elections e ON v.election_id = e.election_id
      WHERE v.user_id = $1
    `;
    
    let queryParams = [authUser.userId];
    
    if (electionId) {
      sqlQuery += ` AND v.election_id = $2`;
      queryParams.push(electionId);
    }
    
    sqlQuery += ` ORDER BY v.vote_timestamp DESC`;

    const votesResult = await db.query(sqlQuery, queryParams);

    if (!votesResult.rows) {
      console.error("Error fetching vote history");
      return NextResponse.json(
        { error: "Failed to fetch vote history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ votes: votesResult.rows });
  } catch (error) {
    console.error("Vote history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
