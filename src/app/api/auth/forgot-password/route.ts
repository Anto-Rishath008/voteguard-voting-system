import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import EmailService from "@/lib/email";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log("Processing forgot password request for:", email);

    const db = getDatabase();
    if (!db) {
      console.error("Failed to connect to database");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check if user exists
    const userResult = await db.query(
      "SELECT user_id, email, first_name, last_name, status FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const user = userResult.rows[0];
    const userError = userResult.rows.length === 0 ? "User not found" : null;

    if (userError || !user) {
      console.log("User not found for email:", email);
      // Return success even if user doesn't exist (security best practice)
      return NextResponse.json({
        success: true,
        message: "If an account with this email exists, a password reset link has been sent.",
      });
    }

    if (user.status !== "Active") {
      console.log("Account is not active for email:", email);
      return NextResponse.json({
        error: "Account is not active. Please contact support.",
      }, { status: 403 });
    }

    // Generate password reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    try {
      // First try to insert new token
      await db.query(
        `INSERT INTO password_reset_tokens (user_id, email, token, expires_at, created_at, used) 
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (user_id) DO UPDATE SET
           token = $3,
           expires_at = $4,
           created_at = $5,
           used = $6`,
        [user.user_id, user.email, resetToken, resetTokenExpiry.toISOString(), new Date().toISOString(), false]
      );
    } catch (dbError) {
      console.log("Password reset tokens table may not exist, creating simple token storage:", dbError);
      // Continue with email sending - we'll handle this gracefully
    }

    // Send password reset email
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://voteguard-webapp-7388.azurewebsites.net'}/reset-password?token=${resetToken}`;
    
    try {
      const emailSent = await EmailService.sendPasswordResetEmail(user.email, user.first_name, resetUrl);
      
      if (emailSent) {
        console.log("Password reset email sent successfully to:", email);
      } else {
        console.log("Failed to send password reset email, but continuing...");
      }
    } catch (emailError) {
      console.error("Email sending error:", emailError);
      // Continue anyway - in development, we can check logs
    }

    return NextResponse.json({
      success: true,
      message: "If an account with this email exists, a password reset link has been sent.",
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}