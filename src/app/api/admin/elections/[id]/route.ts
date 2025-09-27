import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication using local auth
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

    // Get election details
    const { data: electionData, error: electionError } = await supabase
      .from("elections")
      .select("*")
      .eq("election_id", electionId)
      .single();

    if (electionError || !electionData) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    const election = {
      id: electionData.election_id,
      title: electionData.election_name,
      description: electionData.description,
      status: electionData.status,
      startDate: electionData.start_date,
      endDate: electionData.end_date,
      creator: electionData.creator,
      createdAt: electionData.created_at,
    };

    return NextResponse.json({ election });
  } catch (error) {
    console.error("Admin election detail API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication using local auth
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

    const { title, description, startDate, endDate, status } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Title, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Update election
    const { data: updatedElection, error: updateError } = await supabase
      .from("elections")
      .update({
        election_name: title,
        description: description || "",
        start_date: startDate,
        end_date: endDate,
        status: status || "Draft",
        updated_at: new Date().toISOString(),
      })
      .eq("election_id", electionId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating election:", updateError);
      return NextResponse.json(
        { error: "Failed to update election" },
        { status: 500 }
      );
    }

    // Create audit log
    await DatabaseUtils.createAuditLog(
      authUser.userId,
      "UPDATE",
      "election_update",
      electionId,
      null,
      {
        election_name: title,
        status: status,
        updated_fields: Object.keys(body),
      },
      "unknown",
      "unknown"
    );

    return NextResponse.json({
      message: "Election updated successfully",
      election: {
        id: updatedElection.election_id,
        title: updatedElection.election_name,
        description: updatedElection.description,
        status: updatedElection.status,
        startDate: updatedElection.start_date,
        endDate: updatedElection.end_date,
      },
    });
  } catch (error) {
    console.error("Update election API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication using local auth
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

    // Check if election exists
    const { data: existingElection, error: checkError } = await supabase
      .from("elections")
      .select("election_name")
      .eq("election_id", electionId)
      .single();

    if (checkError || !existingElection) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Delete election (this will cascade to related records)
    const { error: deleteError } = await supabase
      .from("elections")
      .delete()
      .eq("election_id", electionId);

    if (deleteError) {
      console.error("Error deleting election:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete election" },
        { status: 500 }
      );
    }

    // Create audit log
    await DatabaseUtils.createAuditLog(
      authUser.userId,
      "DELETE",
      "election_delete",
      electionId,
      null,
      { election_name: existingElection.election_name },
      "unknown",
      "unknown"
    );

    return NextResponse.json({
      message: "Election deleted successfully",
    });
  } catch (error) {
    console.error("Delete election API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
