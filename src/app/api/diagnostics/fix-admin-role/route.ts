import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/database";

// This endpoint helps assign the Admin role to the currently logged-in user
// Use this ONLY if you're locked out and need to fix your permissions
export async function POST(request: NextRequest) {
  const db = getDatabase();
  
  try {
    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    
    if (authError || !authUser) {
      return NextResponse.json({ 
        error: "Unauthorized - You must be logged in",
        hint: "Please log in first, then call this endpoint"
      }, { status: 401 });
    }

    console.log("🔧 ADMIN FIX - Checking current user:", authUser.userId);

    // Check current roles
    const currentRoles = await db.query(
      `SELECT role_name FROM user_roles WHERE user_id = $1`,
      [authUser.userId]
    );

    console.log("Current roles:", currentRoles.rows);

    // Check if user already has Admin role
    const hasAdmin = currentRoles.rows.some((r: any) => 
      r.role_name.toLowerCase() === 'admin'
    );

    if (hasAdmin) {
      return NextResponse.json({
        message: "You already have the Admin role",
        currentRoles: currentRoles.rows.map((r: any) => r.role_name)
      });
    }

    // Add Admin role
    await db.query(
      `INSERT INTO user_roles (user_id, role_name, assigned_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, role_name) DO NOTHING`,
      [authUser.userId, 'Admin']
    );

    console.log("✅ Admin role added to user:", authUser.userId);

    // Verify it was added
    const updatedRoles = await db.query(
      `SELECT role_name FROM user_roles WHERE user_id = $1`,
      [authUser.userId]
    );

    return NextResponse.json({
      success: true,
      message: "Admin role has been added to your account",
      userId: authUser.userId,
      email: authUser.email,
      previousRoles: currentRoles.rows.map((r: any) => r.role_name),
      currentRoles: updatedRoles.rows.map((r: any) => r.role_name),
      note: "Please log out and log back in for the changes to take effect in your session"
    });

  } catch (error) {
    console.error("Admin fix error:", error);
    return NextResponse.json(
      { 
        error: "Failed to add Admin role",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
