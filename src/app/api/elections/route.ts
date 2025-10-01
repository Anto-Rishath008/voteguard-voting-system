import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Build base query
    let baseQuery = `
      SELECT 
        e.election_id,
        e.election_name,
        e.description,
        e.status,
        e.start_date,
        e.end_date,
        e.creator,
        e.created_at,
        e.updated_at,
        COUNT(c.contest_id) as contest_count
      FROM elections e
      LEFT JOIN contests c ON e.election_id = c.election_id
    `;
    
    let whereClause = '';
    let params: any[] = [];
    let paramIndex = 1;

    // Add status filter if provided
    if (status) {
      whereClause = ` WHERE e.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // Complete the query
    const query = `
      ${baseQuery}
      ${whereClause}
      GROUP BY e.election_id, e.election_name, e.description, e.status, e.start_date, e.end_date, e.creator, e.created_at, e.updated_at
      ORDER BY e.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);

    console.log("Executing elections query:", query, "with params:", params);
    
    const result = await db.query(query, params);
    
    // Get total count for pagination
    let countQuery = `SELECT COUNT(*) as total FROM elections e`;
    let countParams: any[] = [];
    
    if (status) {
      countQuery += ` WHERE e.status = $1`;
      countParams.push(status);
    }
    
    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    console.log(`Found ${result.rows.length} elections, total: ${total}`);

    return NextResponse.json({
      elections: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Elections API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token and check permissions
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = getDatabase();
    
    // Check if user has admin privileges
    const roleResult = await db.query(`
      SELECT r.role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.role_id 
      WHERE ur.user_id = $1 AND r.role_name IN ('admin', 'super_admin')
    `, [authUser.userId]);

    if (roleResult.rows.length === 0) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      election_name, 
      description, 
      start_date, 
      end_date, 
      status = 'draft' 
    } = body;

    // Validate required fields
    if (!election_name || !description || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: election_name, description, start_date, end_date" },
        { status: 400 }
      );
    }

    // Create the election
    const insertResult = await db.query(`
      INSERT INTO elections (election_name, description, start_date, end_date, status, creator, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [election_name, description, start_date, end_date, status, authUser.userId]);

    const newElection = insertResult.rows[0];

    // Create audit log
    await db.query(`
      INSERT INTO audit_log (user_id, operation, resource_type, resource_id, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      authUser.userId,
      'CREATE',
      'election',
      newElection.election_id,
      `Created election: ${election_name}`
    ]);

    console.log("Created new election:", newElection.election_id);

    return NextResponse.json({
      message: "Election created successfully",
      election: newElection
    }, { status: 201 });

  } catch (error) {
    console.error("Create election error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}