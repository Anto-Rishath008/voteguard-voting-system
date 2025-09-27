import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

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

    const supabase = createAdminClient();
    if (!supabase) {
      console.error("Failed to create Supabase client");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    try {
      // Check if token exists and is valid
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