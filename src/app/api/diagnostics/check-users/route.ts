import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/database";

// This endpoint helps check all users and their roles - for debugging purposes
export async function GET(request: NextRequest) {
  const db = getDatabase();
  
  try {
    // Get all users with their roles
    const query = `
      SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        COALESCE(
          array_agg(ur.role_name) FILTER (WHERE ur.role_name IS NOT NULL),
          ARRAY[]::text[]
        ) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status
      ORDER BY u.created_at DESC
      LIMIT 20
    `;

    const result = await db.query(query);

    return NextResponse.json({
      success: true,
      users: result.rows,
      count: result.rows.length,
      note: "This endpoint shows the first 20 users and their roles for debugging"
    });

  } catch (error) {
    console.error("Database check error:", error);
    return NextResponse.json(
      { 
        error: "Database check failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
