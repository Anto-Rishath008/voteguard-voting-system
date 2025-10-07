import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

// GET users that can be added as candidates
export async function GET(request: NextRequest) {
  try {
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

    // Get all active users
    const usersResult = await db.query(
      "SELECT user_id, first_name, last_name, email FROM users WHERE status = 'Active' ORDER BY first_name"
    );

    const formattedUsers = usersResult.rows.map((user) => ({
      id: user.user_id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
    }));

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Get users API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
