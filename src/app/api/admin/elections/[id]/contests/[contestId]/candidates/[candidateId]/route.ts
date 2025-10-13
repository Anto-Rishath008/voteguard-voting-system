import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

// PUT - Update candidate
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; contestId: string; candidateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const contestId = resolvedParams.contestId;
    const candidateId = resolvedParams.candidateId;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const body = await request.json();

    const { name, party } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Candidate name is required" },
        { status: 400 }
      );
    }

    // Update candidate
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .update({
        candidate_name: name,
        party: party || null,
        updated_at: new Date().toISOString(),
      })
      .eq("candidate_id", candidateId)
      .eq("contest_id", contestId)
      .eq("election_id", electionId)
      .select()
      .single();

    if (candidateError || !candidate) {
      console.error("Error updating candidate:", candidateError);
      return NextResponse.json(
        { error: "Failed to update candidate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Candidate updated successfully",
      candidate: {
        id: candidate.candidate_id,
        name: candidate.candidate_name,
        party: candidate.party,
      },
    });
  } catch (error) {
    console.error("Update candidate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete candidate
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ id: string; contestId: string; candidateId: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const contestId = resolvedParams.contestId;
    const candidateId = resolvedParams.candidateId;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Delete candidate
    const { error: deleteError } = await supabase
      .from("candidates")
      .delete()
      .eq("candidate_id", candidateId)
      .eq("contest_id", contestId)
      .eq("election_id", electionId);

    if (deleteError) {
      console.error("Error deleting candidate:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete candidate" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Candidate deleted successfully",
    });
  } catch (error) {
    console.error("Delete candidate API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
