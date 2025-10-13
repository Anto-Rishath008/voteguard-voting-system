import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verifyJWT } from "@/lib/auth";

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

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get election details
    const { data: electionData, error: electionError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .select('*')
      .eq('election_id', electionId)
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

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, startDate, endDate, status } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Title, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Update election
    const { data: updatedElection, error: updateError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .update({
        election_name: title,
        description: description || "",
        start_date: startDate,
        end_date: endDate,
        status: status || "Draft",
        updated_at: new Date().toISOString()
      })
      .eq('election_id', electionId)
      .select()
      .single();

    if (updateError || !updatedElection) {
      console.error("Error updating election:", updateError);
      return NextResponse.json(
        { error: "Failed to update election" },
        { status: 500 }
      );
    }

    // Create audit log
    try {
      await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .insert([{
          user_id: authUser.userId,
          operation_type: "UPDATE",
          table_name: "elections",
          record_id: electionId,
          new_values: {
            election_name: title,
            status: status,
            updated_fields: Object.keys(body),
          },
          timestamp: new Date().toISOString()
        }]);
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
    }

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

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check if election exists
    const { data: existingElection, error: fetchError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .select('election_name')
      .eq('election_id', electionId)
      .single();

    if (fetchError || !existingElection) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Delete election (this will cascade to related records)
    const { error: deleteError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .delete()
      .eq('election_id', electionId);

    if (deleteError) {
      console.error("Error deleting election:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete election" },
        { status: 500 }
      );
    }

    // Create audit log
    try {
      await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .insert([{
          user_id: authUser.userId,
          operation_type: "DELETE",
          table_name: "elections",
          record_id: electionId,
          old_values: { election_name: existingElection.election_name },
          timestamp: new Date().toISOString()
        }]);
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
    }

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
