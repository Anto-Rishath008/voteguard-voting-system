import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    // Check for auth token
    const authToken = request.cookies.get("auth-token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      
      decoded = verify(authToken, jwtSecret);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get current user with roles to check permissions
    const currentUser = await supabaseAuth.getUserWithRolesByEmail(decoded.email);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin permissions
    if (!currentUser.roles || !currentUser.roles.some((role: string) => ['Admin', 'SuperAdmin'].includes(role))) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    try {
      // Get total logs count
      const { count: totalLogs } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('*', { count: 'exact', head: true });

      // Get logs by action type
      const { data: actionStats } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('operation_type');

      // Count by action
      const actionCounts: Record<string, number> = {};
      actionStats?.forEach((log: any) => {
        actionCounts[log.operation_type] = (actionCounts[log.operation_type] || 0) + 1;
      });

      // Get logs by user (top 10)
      const { data: userLogs } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select(`
          user_id,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `);

      // Count by user
      const userCounts: Record<string, { count: number, name: string, email: string }> = {};
      userLogs?.forEach((log: any) => {
        if (log.user_id) {
          if (!userCounts[log.user_id]) {
            userCounts[log.user_id] = {
              count: 0,
              name: log.users ? `${log.users.first_name} ${log.users.last_name}` : 'Unknown User',
              email: log.users?.email || 'N/A'
            };
          }
          userCounts[log.user_id].count++;
        }
      });

      // Sort users by activity
      const topUsers = Object.entries(userCounts)
        .map(([userId, data]) => ({
          user_id: userId,
          name: data.name,
          email: data.email,
          count: data.count
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // Get recent activity (last 24 hours)
      const oneDayAgo = new Date();
      oneDayAgo.setDate(oneDayAgo.getDate() - 1);
      
      const { count: last24Hours } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', oneDayAgo.toISOString());

      // Get recent activity (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { count: last7Days } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', sevenDaysAgo.toISOString());

      // Get date of first and last log
      const { data: firstLog } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('timestamp')
        .order('timestamp', { ascending: true })
        .limit(1);

      const { data: lastLog } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('timestamp')
        .order('timestamp', { ascending: false })
        .limit(1);

      // Get logs by table
      const { data: tableLogs } = await supabaseAuth.supabaseAdmin
        .from('audit_log')
        .select('table_name');

      const tableCounts: Record<string, number> = {};
      tableLogs?.forEach((log: any) => {
        if (log.table_name) {
          tableCounts[log.table_name] = (tableCounts[log.table_name] || 0) + 1;
        }
      });

      const topTables = Object.entries(tableCounts)
        .map(([table, count]) => ({ table, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return NextResponse.json({
        summary: {
          totalLogs: totalLogs || 0,
          last24Hours: last24Hours || 0,
          last7Days: last7Days || 0,
          firstLogDate: firstLog?.[0]?.timestamp || null,
          lastLogDate: lastLog?.[0]?.timestamp || null,
          actionBreakdown: actionCounts,
          topUsers,
          topTables,
          uniqueUsers: Object.keys(userCounts).length,
          uniqueTables: Object.keys(tableCounts).length,
        }
      });
    } catch (error) {
      console.error("Error fetching audit log summary:", error);
      return NextResponse.json({
        summary: {
          totalLogs: 0,
          last24Hours: 0,
          last7Days: 0,
          firstLogDate: null,
          lastLogDate: null,
          actionBreakdown: {},
          topUsers: [],
          topTables: [],
          uniqueUsers: 0,
          uniqueTables: 0,
        }
      });
    }
  } catch (error) {
    console.error("Audit logs summary API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
