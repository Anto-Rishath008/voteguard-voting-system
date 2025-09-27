import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
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

    const supabase = createAdminClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("user_id, email, first_name, last_name, status")
      .eq("email", email.toLowerCase())
      .single();

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
      const { error: tokenError } = await supabase
        .from("password_reset_tokens")
        .insert({
          user_id: user.user_id,
          email: user.email,
          token: resetToken,
          expires_at: resetTokenExpiry.toISOString(),
          created_at: new Date().toISOString(),
          used: false
        });

      if (tokenError) {
        console.error("Failed to store reset token:", tokenError);
        // Try to update existing token instead
        const { error: updateError } = await supabase
          .from("password_reset_tokens")
          .update({
            token: resetToken,
            expires_at: resetTokenExpiry.toISOString(),
            created_at: new Date().toISOString(),
            used: false
          })
          .eq("user_id", user.user_id);

        if (updateError) {
          console.error("Failed to update reset token:", updateError);
          // Continue anyway - we'll create the table later if needed
        }
      }
    } catch (dbError) {
      console.log("Password reset tokens table may not exist:", dbError);
      // Continue with email sending - table will be created later
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