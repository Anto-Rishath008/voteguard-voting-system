import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { Client } from "pg";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Create direct PostgreSQL client
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    });
    
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: "Database configuration missing" },
        { status: 500 }
      );
    }

    try {
      await client.connect();

      // Find user by email in the database
      const userQuery = `
        SELECT user_id, email, password_hash, first_name, last_name, status 
        FROM users 
        WHERE LOWER(email) = LOWER($1)
      `;
      const userResult = await client.query(userQuery, [email]);

      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Check if user is active
      if (user.status !== "Active") {
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 403 }
        );
      }

      // Get user roles
      const rolesQuery = `
        SELECT role 
        FROM user_roles 
        WHERE user_id = $1
      `;
      const rolesResult = await client.query(rolesQuery, [user.user_id]);

      const roles = rolesResult.rows.map(r => r.role) || ["voter"];
      const primaryRole = roles.includes("super_admin") ? "super_admin" : 
                        roles.includes("admin") ? "admin" : "voter";

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET || "voteguard_secret_key_2024";
      const token = sign(
        {
          userId: user.user_id,
          email: user.email,
          roles: roles,
          primaryRole: primaryRole
        },
        jwtSecret,
        { expiresIn: "24h" }
      );

      // Return success response
      return NextResponse.json({
        success: true,
        user: {
          id: user.user_id,
          email: user.email,
          role: primaryRole,
          roles: roles,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`
        },
        token,
        message: "Login successful"
      });

    } finally {
      await client.end();
    }

  } catch (error) {
    console.error("Login API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? 
          (error instanceof Error ? error.message : "Unknown error") : undefined
      },
      { status: 500 }
    );
  }
}