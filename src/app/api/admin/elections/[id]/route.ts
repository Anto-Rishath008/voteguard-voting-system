import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
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

    // Check if user has admin permissions
    const db = await getDatabase();
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get election details
    const electionResult = await db.query(
      "SELECT * FROM elections WHERE election_id = $1",
      [electionId]
    );

    if (!electionResult.rows || electionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }
    
    const electionData = electionResult.rows[0];

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
    const db = await getDatabase();
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
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
    const updateResult = await db.query(
      `UPDATE elections SET 
       election_name = $1, 
       description = $2, 
       start_date = $3, 
       end_date = $4, 
       status = $5, 
       updated_at = CURRENT_TIMESTAMP 
       WHERE election_id = $6 
       RETURNING *`,
      [title, description || "", startDate, endDate, status || "Draft", electionId]
    );

    if (updateResult.rows.length === 0) {
      console.error("Error updating election");
      return NextResponse.json(
        { error: "Failed to update election" },
        { status: 500 }
      );
    }
    const updatedElection = updateResult.rows[0];

    // Create audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, timestamp)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          authUser.userId,
          "UPDATE",
          "election_update",
          electionId,
          JSON.stringify({
            election_name: title,
            status: status,
            updated_fields: Object.keys(body),
          })
        ]
      );
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

    // Check if user has admin permissions
    const db = await getDatabase();
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check if election exists
    const existingElectionResult = await db.query(
      "SELECT election_name FROM elections WHERE election_id = $1",
      [electionId]
    );

    if (existingElectionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }
    const existingElection = existingElectionResult.rows[0];

    // Delete election (this will cascade to related records)
    const deleteResult = await db.query(
      "DELETE FROM elections WHERE election_id = $1",
      [electionId]
    );

    if (deleteResult.rowCount === 0) {
      console.error("Error deleting election");
      return NextResponse.json(
        { error: "Failed to delete election" },
        { status: 500 }
      );
    }

    // Create audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, timestamp)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
        [
          authUser.userId,
          "DELETE",
          "election_delete",
          electionId,
          JSON.stringify({ election_name: existingElection.election_name })
        ]
      );
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
