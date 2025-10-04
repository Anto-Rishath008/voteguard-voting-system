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
        .from('audit_log')
        .select(`
          *,
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
        query = query.eq('operation_type', operation);
      }
      if (startDate) {
        query = query.gte('timestamp', startDate);
      }
      if (endDate) {
        query = query.lte('timestamp', endDate);
      }

      // Apply pagination and ordering
      const { data: auditLogs, error: auditError, count } = await query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (auditError) {
        console.error("Error fetching audit logs:", auditError);
        throw auditError;
      }

      // Transform the data to match expected format
      const transformedLogs = (auditLogs || []).map((log: any) => ({
        ...log,
        first_name: log.users?.first_name,
        last_name: log.users?.last_name,
        email: log.users?.email,
        created_at: log.timestamp,
        action: log.operation_type
      }));

      return NextResponse.json({
        auditLogs: transformedLogs,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
        },
      });
    } catch (error) {
      console.log("Audit logs table may not exist:", error);
      return NextResponse.json({
        auditLogs: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 0,
        },
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
        .from('audit_log')
        .insert([{
          user_id: userId,
          operation_type: operationType,
          table_name: tableName,
          record_id: recordId,
          old_values: oldValues || null,
          new_values: newValues || null,
          ip_address: ipAddress,
          user_agent: userAgent,
          timestamp: new Date().toISOString()
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
