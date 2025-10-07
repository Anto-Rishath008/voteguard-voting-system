import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";
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

    // Check if election exists and is active
    const { data: electionData, error: electionError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .select('election_name, status')
      .eq('election_id', electionId)
      .single();

    if (electionError || !electionData) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    if (electionData.status !== 'Active') {
      return NextResponse.json(
        { error: "Election is not active" },
        { status: 400 }
      );
    }

    // Check if user is eligible to vote
    const { data: eligibilityData, error: eligibilityError } = await supabaseAuth.supabaseAdmin
      .from('eligible_voters')
      .select('status')
      .eq('election_id', electionId)
      .eq('user_id', authUser.userId)
      .single();

    if (eligibilityError || !eligibilityData || eligibilityData.status !== 'eligible') {
      return NextResponse.json(
        { error: "You are not eligible to vote in this election" },
        { status: 403 }
      );
    }

    // Check if user has already voted
    const { data: existingVoteData, error: existingVoteError } = await supabaseAuth.supabaseAdmin
      .from('votes')
      .select('vote_id')
      .eq('voter_id', authUser.userId)
      .eq('election_id', electionId)
      .limit(1);

    if (existingVoteData && existingVoteData.length > 0) {
      return NextResponse.json(
        { error: "You have already voted in this election" },
        { status: 400 }
      );
    }

    // Validate selections against contests
    const { data: contestsData, error: contestsError } = await supabaseAuth.supabaseAdmin
      .from('contests')
      .select('contest_id, max_selections')
      .eq('election_id', electionId);

    if (contestsError || !contestsData) {
      return NextResponse.json(
        { error: "Failed to validate contests" },
        { status: 500 }
      );
    }

    for (const selection of selections) {
      const contest = contestsData.find((c: any) => c.contest_id === selection.contestId);
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
        const { data: candidatesData, error: candidatesError } = await supabaseAuth.supabaseAdmin
          .from('candidates')
          .select('candidate_id')
          .eq('contest_id', selection.contestId)
          .in('candidate_id', selection.candidateIds);

        if (candidatesError || !candidatesData || candidatesData.length !== selection.candidateIds.length) {
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

    // Get previous vote hash for chaining
    const { data: lastVoteData, error: lastVoteError } = await supabaseAuth.supabaseAdmin
      .from('votes')
      .select('ballot_hash')
      .order('created_at', { ascending: false })
      .limit(1);

    const previousHash = (lastVoteData && lastVoteData.length > 0) ? lastVoteData[0].ballot_hash : "0";
    const chainedData = previousHash + ballotHash;
    const voteHash = crypto
      .createHash("sha256")
      .update(chainedData)
      .digest("hex");

    // Insert vote record
    const { data: voteData, error: voteError } = await supabaseAuth.supabaseAdmin
      .from('votes')
      .insert({
        vote_id: voteId,
        election_id: electionId,
        user_id: authUser.userId,
        ballot_hash: ballotHash,
        vote_hash: voteHash,
        previous_vote_hash: previousHash,
        cast_at: timestamp,
        ip_address: request.headers.get("x-forwarded-for") || 
                   request.headers.get("x-real-ip") || 
                   "unknown",
        created_at: timestamp
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
          vote_id: voteId,
          contest_id: selection.contestId,
          candidate_id: candidateId,
          selection_order: selection.candidateIds.indexOf(candidateId) + 1,
          created_at: timestamp
        });
      }
    }

    if (ballotSelections.length > 0) {
      const { error: selectionsError } = await supabaseAuth.supabaseAdmin
        .from('ballot_selections')
        .insert(ballotSelections);

      if (selectionsError) {
        console.error("Error recording ballot selections:", selectionsError);
        // Try to clean up the vote record
        try {
          await supabaseAuth.supabaseAdmin
            .from('votes')
            .delete()
            .eq('vote_id', voteId);
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
      await supabaseAuth.logSecurityEvent({
        action: 'VOTE_CAST',
        details: {
          vote_id: voteId,
          election_id: electionId,
          contests_voted: selections.length,
          total_selections: selections.reduce(
            (sum: number, s: any) => sum + s.candidateIds.length,
            0
          ),
        },
        ip_address: request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
        user_id: authUser.userId
      });
    } catch (auditError) {
      console.log("Audit log creation failed:", auditError);
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