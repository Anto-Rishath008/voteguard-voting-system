import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

// PUT - Update contest
export async function PUT(
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

    const { title, contestType } = body;

    if (!title || !contestType) {
      return NextResponse.json(
        { error: "Title and contest type are required" },
        { status: 400 }
      );
    }

    // Update contest
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .update({
        contest_title: title,
        contest_type: contestType,
        updated_at: new Date().toISOString(),
      })
      .eq("contest_id", contestId)
      .eq("election_id", electionId)
      .select()
      .single();

    if (contestError || !contest) {
      console.error("Error updating contest:", contestError);
      return NextResponse.json(
        { error: "Failed to update contest" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Contest updated successfully",
      contest: {
        id: contest.contest_id,
        title: contest.contest_title,
        contestType: contest.contest_type,
      },
    });
  } catch (error) {
    console.error("Update contest API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE - Delete contest
export async function DELETE(
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

    // Delete contest (candidates will be deleted by cascade)
    const { error: deleteError } = await supabase
      .from("contests")
      .delete()
      .eq("contest_id", contestId)
      .eq("election_id", electionId);

    if (deleteError) {
      console.error("Error deleting contest:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete contest" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Contest deleted successfully",
    });
  } catch (error) {
    console.error("Delete contest API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
