import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient(request);
    const { votes, sessionId } = await request.json();

    // Get current user and check permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await DatabaseUtils.checkUserRole(user.id, "Voter");
    if (!hasPermission) {
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
        const hasVoted = await DatabaseUtils.hasUserVoted(
          user.id,
          contestId,
          electionId
        );
        if (hasVoted) {
          errors.push(`User has already voted in contest ${contestId}`);
          continue;
        }

        // Verify contest and candidate exist
        const { data: contest } = await supabase
          .from("contests")
          .select("*")
          .eq("contest_id", contestId)
          .eq("election_id", electionId)
          .single();

        if (!contest) {
          errors.push(`Contest ${contestId} not found`);
          continue;
        }

        const { data: candidate } = await supabase
          .from("candidates")
          .select("*")
          .eq("candidate_id", candidateId)
          .eq("contest_id", contestId)
          .eq("election_id", electionId)
          .single();

        if (!candidate) {
          errors.push(`Candidate ${candidateId} not found`);
          continue;
        }

        // Check if election is active
        const { data: election } = await supabase
          .from("elections")
          .select("*")
          .eq("election_id", electionId)
          .single();

        if (!election || election.status !== "Active") {
          errors.push(`Election ${electionId} is not active`);
          continue;
        }

        const now = new Date();
        const startDate = new Date(election.start_date);
        const endDate = new Date(election.end_date);

        if (now < startDate || now > endDate) {
          errors.push(`Election ${electionId} is not within voting period`);
          continue;
        }

        // Get previous vote hash for chaining
        const previousHash = await DatabaseUtils.getLastVoteHash();

        // Generate vote data
        const voteTimestamp = new Date().toISOString();
        const voteHash = DatabaseUtils.generateVoteHash({
          contestId,
          voterId: user.id,
          candidateId,
          timestamp: voteTimestamp,
          previousHash,
        });

        // Insert vote
        const { data: newVote, error: voteError } = await supabase
          .from("votes")
          .insert({
            vote_id: uuidv4(),
            contest_id: contestId,
            election_id: electionId,
            voter_id: user.id,
            candidate_id: candidateId,
            vote_timestamp: voteTimestamp,
            vote_hash: voteHash,
            previous_vote_hash: previousHash,
            session_id: sessionId || uuidv4(),
          })
          .select()
          .single();

        if (voteError) {
          console.error("Error casting vote:", voteError);
          errors.push(`Failed to cast vote for contest ${contestId}`);
          continue;
        }

        castedVotes.push(newVote);

        // Create audit log for vote
        await DatabaseUtils.createAuditLog(
          user.id,
          "VOTE_CAST",
          "votes",
          newVote.vote_id,
          undefined,
          {
            contestId,
            electionId,
            candidateId,
            voteHash,
            timestamp: voteTimestamp,
          },
          request.headers.get("x-forwarded-for") || "unknown",
          request.headers.get("user-agent") || "unknown"
        );
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
    const supabase = createRouteHandlerClient(request);
    const { searchParams } = new URL(request.url);
    const electionId = searchParams.get("electionId");

    // Get current user and check permissions
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hasPermission = await DatabaseUtils.checkUserRole(user.id, "Voter");
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Build query
    let query = supabase
      .from("votes")
      .select(
        `
        *,
        candidates (
          candidate_name,
          party
        ),
        contests!inner (
          contest_title,
          contest_type
        ),
        elections!inner (
          election_name
        )
      `
      )
      .eq("voter_id", user.id);

    if (electionId) {
      query = query.eq("election_id", electionId);
    }

    const { data: votes, error } = await query.order("vote_timestamp", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching vote history:", error);
      return NextResponse.json(
        { error: "Failed to fetch vote history" },
        { status: 500 }
      );
    }

    return NextResponse.json({ votes });
  } catch (error) {
    console.error("Vote history error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
