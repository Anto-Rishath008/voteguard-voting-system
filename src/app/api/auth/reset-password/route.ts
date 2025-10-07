import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    console.log("Processing password reset...");

    const db = getDatabase();
    if (!db) {
      console.error("Failed to connect to database");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    try {
      // Verify token is valid and not used
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

      const tokenData = tokenResult.rows[0];

      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user's password
      await db.query(
        `UPDATE users SET 
         password_hash = $1, 
         updated_at = $2 
         WHERE id = $3`,
        [hashedPassword, new Date().toISOString(), tokenData.user_id]
      );

      // Mark token as used
      await db.query(
        `UPDATE password_reset_tokens SET 
         used = true, 
         used_at = $1 
         WHERE token = $2`,
        [new Date().toISOString(), token]
      );

      console.log("Password reset successful for user:", tokenData.user_id);

      return NextResponse.json({
        success: true,
        message: "Password has been reset successfully",
      });

    } catch (dbError) {
      console.error("Database error during password reset:", dbError);
      return NextResponse.json(
        { error: "Database error occurred" },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}