import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  try {
    const authToken = request.cookies.get("auth-token")?.value;

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
      response.cookies.delete("auth-token");
      return response;
    }

    try {
      // Log successful logout
      await supabaseAuth.logSecurityEvent({
        action: 'LOGOUT',
        details: { user_id: userId },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        user_id: userId
      });
    } catch (error) {
      console.log("Logout logging failed, continuing:", error);
    }

    // Clear the auth cookie
    const response = NextResponse.json({ message: "Logged out successfully" });
    response.cookies.delete("auth-token");

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    // Still try to clear the cookie even if there's an error
    const response = NextResponse.json({ message: "Logged out" });
    response.cookies.delete("auth-token");
    return response;
  }
}
