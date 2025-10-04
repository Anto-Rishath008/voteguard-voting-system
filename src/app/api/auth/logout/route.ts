import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";

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

    const db = getDatabase();

    try {
      // Deactivate user sessions if the table exists
      await db.query(
        `UPDATE user_sessions SET is_active = false WHERE user_id = $1`,
        [userId]
      );
    } catch (error) {
      console.log("User sessions table not found, continuing logout:", error);
    }

    try {
      // Create audit log if the table exists
      await db.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, changes, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          "LOGOUT", 
          "user_sessions", 
          userId,
          JSON.stringify({ action: "user_logout" }),
          request.headers.get("x-forwarded-for") || "unknown",
          request.headers.get("user-agent") || "unknown",
          new Date().toISOString()
        ]
      );
    } catch (error) {
      console.log("Audit log table not found, continuing logout:", error);
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
