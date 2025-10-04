import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed", details: "Failed to get database connection" },
        { status: 500 }
      );
    }

    // Test database connection by running a simple query
    const result = await db.query("SELECT COUNT(*) as count FROM users LIMIT 1");

    if (!result.rows) {
      return NextResponse.json(
        { error: "Database connection failed", details: "No response from database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Database connection successful",
      timestamp: new Date().toISOString(),
      userCount: result.rows[0]?.count || 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Connection test failed", details: error.message },
      { status: 500 }
    );
  }
}
