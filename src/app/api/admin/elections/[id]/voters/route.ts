import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

// GET /api/admin/elections/[id]/voters - Get eligible voters for an election
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    
    // Check if user has admin permissions
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
      "SELECT election_name, status FROM elections WHERE election_id = $1",
      [electionId]
    );

    if (electionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Get eligible voters
    const eligibleVoters = await db.query(`
      SELECT 
        ev.id,
        ev.user_id,
        ev.status,
        ev.added_at,
        u.first_name,
        u.last_name,
        u.email,
        CASE WHEN v.voter_id IS NOT NULL THEN true ELSE false END as has_voted
      FROM eligible_voters ev
      JOIN users u ON ev.user_id = u.user_id
      LEFT JOIN votes v ON v.voter_id = ev.user_id AND v.election_id = ev.election_id
      WHERE ev.election_id = $1
      ORDER BY u.first_name, u.last_name
    `, [electionId]);

    // Get all voters (users with Voter role) for adding new eligible voters
    const allVoters = await db.query(`
      SELECT 
        u.user_id,
        u.first_name,
        u.last_name,
        u.email,
        CASE WHEN ev.user_id IS NOT NULL THEN true ELSE false END as is_eligible
      FROM users u
      JOIN user_roles ur ON u.user_id = ur.user_id
      LEFT JOIN eligible_voters ev ON ev.user_id = u.user_id AND ev.election_id = $1
      WHERE ur.role_name = 'Voter'
      ORDER BY u.first_name, u.last_name
    `, [electionId]);

    return NextResponse.json({
      election: electionResult.rows[0],
      eligibleVoters: eligibleVoters.rows,
      allVoters: allVoters.rows
    });

  } catch (error: any) {
    console.error("Get eligible voters error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/elections/[id]/voters - Add eligible voter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const { userId } = await request.json();

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    
    // Check if user has admin permissions
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

    // Add eligible voter
    await db.query(`
      INSERT INTO eligible_voters (election_id, user_id, added_by, status)
      VALUES ($1, $2, $3, 'eligible')
      ON CONFLICT (election_id, user_id) 
      DO UPDATE SET status = 'eligible', added_by = $3, added_at = CURRENT_TIMESTAMP
    `, [electionId, userId, authUser.userId]);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Add eligible voter error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/elections/[id]/voters - Remove eligible voter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    
    // Check if user has admin permissions
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

    // Check if voter has already voted
    const voteCheck = await db.query(
      "SELECT vote_id FROM votes WHERE voter_id = $1 AND election_id = $2",
      [userId, electionId]
    );

    if (voteCheck.rows.length > 0) {
      return NextResponse.json(
        { error: "Cannot remove voter who has already voted" },
        { status: 400 }
      );
    }

    // Remove eligible voter
    await db.query(
      "DELETE FROM eligible_voters WHERE election_id = $1 AND user_id = $2",
      [electionId, userId]
    );

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Remove eligible voter error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}