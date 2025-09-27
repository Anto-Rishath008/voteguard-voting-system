import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
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

    const supabase = createAdminClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    try {
      // Verify token is valid and not used
      const { data: tokenData, error: tokenError } = await supabase
        .from("password_reset_tokens")
        .select("*")
        .eq("token", token)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        console.log("Invalid or expired token");
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user's password
      const { error: updateError } = await supabase
        .from("users")
        .update({
          password_hash: hashedPassword,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", tokenData.user_id);

      if (updateError) {
        console.error("Failed to update password:", updateError);
        return NextResponse.json(
          { error: "Failed to update password" },
          { status: 500 }
        );
      }

      // Mark token as used
      const { error: tokenUpdateError } = await supabase
        .from("password_reset_tokens")
        .update({
          used: true,
          used_at: new Date().toISOString(),
        })
        .eq("token", token);

      if (tokenUpdateError) {
        console.error("Failed to mark token as used:", tokenUpdateError);
        // Continue anyway - password was updated successfully
      }

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