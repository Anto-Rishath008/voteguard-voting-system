import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get("auth_token")?.value;

    if (!authToken) {
      return NextResponse.json({ message: "Already logged out" });
    }

    // Decode token to get user ID (basic implementation)
    // In production, you'd want more robust token handling
    let userId: string;
    try {
      const payload = JSON.parse(atob(authToken.split(".")[1]));
      userId = payload.userId;
    } catch {
      // Invalid token, but still clear the cookie
      const response = NextResponse.json({
        message: "Logged out successfully",
      });
      response.cookies.delete("auth_token");
      return response;
    }

    const supabase = createAdminClient();

    // Deactivate user sessions
    await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", userId);

    // Create audit log
    await DatabaseUtils.createAuditLog(
      userId,
      "LOGOUT",
      "user_sessions",
      userId,
      undefined,
      { action: "user_logout" },
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    // Clear the auth cookie
    const response = NextResponse.json({ message: "Logged out successfully" });
    response.cookies.delete("auth_token");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Still try to clear the cookie even if there's an error
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.delete("auth_token");
    return response;
  }
}
