import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    console.log("Validating reset token...");

    const db = getDatabase();
    if (!db) {
      console.error("Failed to connect to database");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    try {
      // Check if token exists and is valid
      const tokenResult = await db.query(
        `SELECT * FROM password_reset_tokens 
         WHERE token = $1 AND used = false AND expires_at > $2`,
        [token, new Date().toISOString()]
      );

      if (!tokenResult.rows || tokenResult.rows.length === 0) {
        console.log("Invalid or expired token");
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }

      console.log("Token is valid");
      return NextResponse.json({
        success: true,
        message: "Token is valid",
      });
    } catch (dbError) {
      console.log("Password reset tokens table may not exist:", dbError);
      // If table doesn't exist, consider token invalid
      return NextResponse.json(
        { error: "Invalid reset token" },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error("Validate reset token error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}