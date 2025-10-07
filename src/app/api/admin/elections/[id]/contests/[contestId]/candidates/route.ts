import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

// GET candidates for a contest
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contestId: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const contestId = resolvedParams.contestId;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions
    const hasAdminPermission = await DatabaseUtils.checkUserRole(
      authUser.userId,
      "Admin"
    );
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Get candidates
    const { data: candidates, error: candidateError } = await supabase
      .from("candidates")
      .select("*")
      .eq("election_id", electionId)
      .eq("contest_id", contestId)
      .order("candidate_name");

    if (candidateError) {
      console.error("Error fetching candidates:", candidateError);
      return NextResponse.json(
        { error: "Failed to fetch candidates" },
        { status: 500 }
      );
    }

    const formattedCandidates =
      candidates?.map((candidate) => ({
        id: candidate.candidate_id,
        name: candidate.candidate_name,
        party: candidate.party,
      })) || [];

    return NextResponse.json({ candidates: formattedCandidates });
  } catch (error) {
    console.error("Get candidates API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new candidate
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contestId: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const contestId = resolvedParams.contestId;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions
    const hasAdminPermission = await DatabaseUtils.checkUserRole(
      authUser.userId,
      "Admin"
    );
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const { name, party, userId } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Candidate name is required" },
        { status: 400 }
      );
    }

    // If userId is provided, verify the user exists
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("first_name, last_name")
        .eq("user_id", userId)
        .single();

      if (userError || !user) {
        return NextResponse.json(
          { error: "Selected user not found" },
          { status: 400 }
        );
      }
    }

    // Verify the contest exists
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .select("contest_id")
      .eq("contest_id", contestId)
      .eq("election_id", electionId)
      .single();

    if (contestError || !contest) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    // Check if candidate with the same name already exists in this contest
    const { data: existingCandidate, error: duplicateCheckError } = await supabase
      .from("candidates")
      .select("candidate_id, candidate_name")
      .eq("contest_id", parseInt(contestId))
      .eq("election_id", electionId)
      .ilike("candidate_name", name.trim())
      .maybeSingle();

    if (duplicateCheckError) {
      console.error("Error checking for duplicate candidate:", duplicateCheckError);
    }

    if (existingCandidate) {
      return NextResponse.json(
        { error: `Candidate "${name}" is already added to this contest` },
        { status: 409 } // 409 Conflict
      );
    }

    // Create candidate
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .insert({
        contest_id: parseInt(contestId),
        election_id: electionId,
        candidate_name: name,
        party: party || null,
      })
      .select()
      .single();

    if (candidateError) {
      console.error("Error creating candidate:", candidateError);
      return NextResponse.json(
        { error: "Failed to create candidate" },
        { status: 500 }
      );
    }

    // Create audit log
    await DatabaseUtils.createAuditLog({
      userId: authUser.userId,
      action: "INSERT",
      resourceType: "candidate",
      resourceId: candidate.candidate_id,
      details: {
        election_id: electionId,
        contest_id: contestId,
        candidate_name: name,
        party: party,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      message: "Candidate added successfully",
      candidate: {
        id: candidate.candidate_id,
        name: candidate.candidate_name,
        party: candidate.party,
      },
    });
  } catch (error) {
    console.error("Create candidate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
