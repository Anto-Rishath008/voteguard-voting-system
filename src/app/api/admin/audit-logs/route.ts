import { NextRequest, NextResponse } from "next/server";
import { EnhancedDatabase } from "@/lib/enhanced-database";
import { verifyJWT } from "@/lib/auth";

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

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin permissions
    const hasPermission = await DatabaseUtils.checkUserRole(
      authUser.userId,
      "Admin"
    );
    if (!hasPermission) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Build query
    let query = supabase.from("audit_log").select(`
        *,
        users!audit_log_user_id_fkey (
          first_name,
          last_name,
          email
        )
      `);

    // Apply filters
    if (userId) {
      query = query.eq("user_id", userId);
    }
    if (operation) {
      query = query.eq("operation_type", operation);
    }
    if (startDate) {
      query = query.gte("timestamp", startDate);
    }
    if (endDate) {
      query = query.lte("timestamp", endDate);
    }

    // Get audit logs with pagination
    const {
      data: auditLogs,
      error,
      count,
    } = await query
      .range(offset, offset + limit - 1)
      .order("timestamp", { ascending: false });

    if (error) {
      console.error("Error fetching audit logs:", error);
      return NextResponse.json(
        { error: "Failed to fetch audit logs" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      auditLogs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
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

    // Create audit log entry
    await DatabaseUtils.createAuditLog(
      userId,
      operationType,
      tableName,
      recordId,
      oldValues,
      newValues,
      ipAddress,
      userAgent
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Create audit log error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
