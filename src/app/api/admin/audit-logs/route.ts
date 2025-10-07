import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const userId = searchParams.get("userId");
    const operation = searchParams.get("operation");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const offset = (page - 1) * limit;

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
      // Build Supabase query with filters
      let query = supabaseAuth.supabaseAdmin
        .from('audit_logs')
        .select(`
          log_id,
          user_id,
          action,
          table_name,
          record_id,
          old_values,
          new_values,
          created_at,
          ip_address,
          user_agent,
          details,
          resource_type,
          resource_id,
          users:user_id (
            first_name,
            last_name,
            email
          )
        `, { count: 'exact' });

      // Apply filters
      if (userId) {
        query = query.eq('user_id', userId);
      }
      if (operation) {
        query = query.eq('action', operation);
      }
      if (startDate) {
        query = query.gte('created_at', startDate);
      }
      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Apply pagination and ordering
      const { data: auditLogs, error: auditError, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (auditError) {
        console.error("Error fetching audit logs:", auditError);
        throw auditError;
      }

      // Transform the data to match expected format
      const transformedLogs = (auditLogs || []).map((log: any) => ({
        audit_log_id: log.log_id,
        user_id: log.user_id,
        operation_type: log.action,
        table_name: log.table_name,
        record_id: log.record_id,
        old_values: log.old_values,
        new_values: log.new_values,
        timestamp: log.created_at,
        ip_address: log.ip_address,
        user_agent: log.user_agent,
        details: log.details,
        resource_type: log.resource_type,
        resource_id: log.resource_id,
        users: log.users ? {
          first_name: log.users.first_name,
          last_name: log.users.last_name,
          email: log.users.email
        } : null
      }));

      return NextResponse.json({
        logs: transformedLogs,
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (error) {
      console.log("Audit logs error:", error);
      return NextResponse.json({
        logs: [],
        total: 0,
        page: 1,
        limit,
        totalPages: 0,
      });
    }
  } catch (error) {
    console.error("Audit logs API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      operationType,
      tableName,
      recordId,
      oldValues,
      newValues,
      ipAddress,
      userAgent,
    } = body;

    try {
      // Create audit log entry using Supabase
      const { error: insertError } = await supabaseAuth.supabaseAdmin
        .from('audit_logs')
        .insert([{
          user_id: userId,
          action: operationType,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues || null,
          new_values: newValues || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          created_at: new Date().toISOString()
        }]);

      if (insertError) {
        console.error("Error creating audit log:", insertError);
      }

      return NextResponse.json({ success: true }, { status: 201 });
    } catch (error) {
      console.log("Audit logs table may not exist:", error);
      return NextResponse.json({ success: true }, { status: 201 });
    }
  } catch (error) {
    console.error("Create audit log error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
