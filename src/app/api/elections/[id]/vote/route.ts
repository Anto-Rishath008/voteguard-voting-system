import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";

interface BallotSelection {
  contestId: string;
  candidateIds: string[];
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const body = await request.json();
    const { selections }: { selections: BallotSelection[] } = body;

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Verify election exists and is active
    const { data: election, error: electionError } = await supabase
      .from("elections")
      .select("election_id, status")
      .eq("election_id", electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    if (election.status !== "Active") {
      return NextResponse.json(
        { error: "Election is not active" },
        { status: 400 }
      );
    }

    // Check if user has already voted
    const { data: existingVote } = await supabase
      .from("votes")
      .select("vote_id")
      .eq("election_id", electionId)
      .eq("user_id", authUser.userId)
      .single();

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted in this election" },
        { status: 400 }
      );
    }

    // Validate selections against contests
    const { data: contests } = await supabase
      .from("contests")
      .select("id, max_selections")
      .eq("election_id", electionId);

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
        const { data: candidates } = await supabase
          .from("candidates")
          .select("id")
          .eq("contest_id", selection.contestId)
          .in("id", selection.candidateIds);

        if (
          !candidates ||
          candidates.length !== selection.candidateIds.length
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
    const { data: lastVote } = await supabase
      .from("votes")
      .select("vote_hash")
      .eq("election_id", electionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const previousHash = lastVote?.vote_hash || "0";
    const chainedData = previousHash + ballotHash;
    const voteHash = crypto
      .createHash("sha256")
      .update(chainedData)
      .digest("hex");

    // Start transaction
    const { error: voteError } = await supabase.from("votes").insert({
      id: voteId,
      election_id: electionId,
      user_id: authUser.userId,
      ballot_hash: ballotHash,
      vote_hash: voteHash,
      previous_vote_hash: previousHash,
      cast_at: timestamp,
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
    });

    if (voteError) {
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
      const { error: selectionsError } = await supabase
        .from("ballot_selections")
        .insert(ballotSelections);

      if (selectionsError) {
        console.error("Error recording ballot selections:", selectionsError);
        // Try to clean up the vote record
        await supabase.from("votes").delete().eq("id", voteId);
        return NextResponse.json(
          { error: "Failed to record ballot selections" },
          { status: 500 }
        );
      }
    }

    // Create audit log
    await supabase.from("audit_log").insert({
      user_id: authUser.userId,
      operation_type: "VOTE_CAST",
      resource_type: "election",
      resource_id: electionId,
      details: {
        vote_id: voteId,
        contests_voted: selections.length,
        total_selections: selections.reduce(
          (sum, s) => sum + s.candidateIds.length,
          0
        ),
      },
      ip_address:
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown",
      user_agent: request.headers.get("user-agent") || "unknown",
    });

    return NextResponse.json({
      success: true,
      voteId,
      message: "Ballot cast successfully",
    });
  } catch (error) {
    console.error("Vote submission error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
