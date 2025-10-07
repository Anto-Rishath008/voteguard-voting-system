import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { userId, email, firstName, lastName } = await request.json();

    if (!userId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const db = getDatabase();
    if (!db) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Create user in our custom users table
    const userResult = await db.query(
      `INSERT INTO users (id, email, first_name, last_name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        userId,
        email,
        firstName,
        lastName,
        "Active",
        new Date().toISOString(),
        new Date().toISOString(),
      ]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      console.error("Error creating user");
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    const user = userResult.rows[0];

    // Assign default voter role
    try {
      await db.query(
        `INSERT INTO user_roles (user_id, role_name, assigned_by, assigned_at)
         VALUES ($1, $2, $3, $4)`,
        [userId, "Voter", userId, new Date().toISOString()]
      );
    } catch (roleError) {
      console.log("User roles table may not exist:", roleError);
    }

    // Create audit log
    try {
      await db.query(
        `INSERT INTO audit_logs (user_id, action, table_name, record_id, changes, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          "INSERT",
          "users",
          userId,
          JSON.stringify({ email, firstName, lastName, action: "user_registration" }),
          request.headers.get("x-forwarded-for") || "unknown",
          request.headers.get("user-agent") || "unknown",
          new Date().toISOString()
        ]
      );
    } catch (auditError) {
      console.log("Audit logs table may not exist:", auditError);
    }

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
