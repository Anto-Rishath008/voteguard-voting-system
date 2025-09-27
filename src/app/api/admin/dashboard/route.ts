import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions
    const hasAdminPermission = await DatabaseUtils.checkUserRole(
      authUser.userId,
      "Admin"
    );
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Get total elections count
    const { count: totalElections } = await supabase
      .from("elections")
      .select("*", { count: "exact" });

    // Get active elections count
    const { count: activeElections } = await supabase
      .from("elections")
      .select("*", { count: "exact" })
      .eq("status", "Active");

    // Get total votes count
    const { count: totalVotes } = await supabase
      .from("votes")
      .select("*", { count: "exact" });

    // Get total users count
    const { count: totalUsers } = await supabase
      .from("users")
      .select("*", { count: "exact" });

    // Get recent activity from audit logs
    const { data: recentActivity } = await supabase
      .from("audit_log")
      .select(
        `
        audit_log_id,
        operation_type,
        details,
        timestamp,
        user_id,
        users!audit_log_user_id_fkey(first_name, last_name, email)
      `
      )
      .order("timestamp", { ascending: false })
      .limit(10);

    const formattedActivity = (recentActivity || []).map((log: any) => ({
      id: log.audit_log_id,
      action: log.operation_type?.replace(/_/g, " ").toLowerCase() || "unknown",
      details:
        typeof log.details === "object"
          ? JSON.stringify(log.details)
          : log.details || "No details available",
      timestamp: log.timestamp,
      user: log.users
        ? `${log.users.first_name} ${log.users.last_name}`
        : "Unknown User",
    }));

    const stats = {
      totalElections: totalElections || 0,
      activeElections: activeElections || 0,
      totalVotes: totalVotes || 0,
      totalUsers: totalUsers || 0,
      recentActivity: formattedActivity,
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Admin dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
