import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    console.log("Profile API called - checking authentication...");
    
    // Check for local auth token
    const authToken = request.cookies.get("auth_token")?.value;
    console.log("Auth token present:", !!authToken);

    if (!authToken) {
      return NextResponse.json({ 
        error: "No authentication token found",
        authRequired: true 
      }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("JWT_SECRET is not set in environment variables");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      
      decoded = verify(authToken, jwtSecret);
      console.log("JWT verification successful for user:", decoded.userId);
    } catch (error) {
      console.error("JWT verification failed:", error);
      return NextResponse.json({ 
        error: "Invalid token",
        message: "Authentication token is invalid or expired",
        authRequired: true
      }, { status: 401 });
    }

    const db = getDatabase();
    
    console.log("Querying user details from database for user_id:", decoded.userId);
    
    // Get user details from database
    const userResult = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      console.error("User not found in database:", decoded.userId);
      return NextResponse.json({ 
        error: "User not found",
        authRequired: true
      }, { status: 404 });
    }
    
    const user = userResult.rows[0];
    console.log("User found:", { userId: user.user_id, email: user.email });

    // Get user roles
    const rolesResult = await db.query(`
      SELECT r.role_name 
      FROM user_roles ur 
      JOIN roles r ON ur.role_id = r.role_id 
      WHERE ur.user_id = $1
    `, [user.user_id]);
    
    const userRoles = rolesResult.rows.map((r: any) => r.role_name) || [];
    console.log("User roles:", userRoles);

    // Create audit log
    await db.query(`
      INSERT INTO audit_log (user_id, operation, resource_type, resource_id, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      user.user_id,
      'VIEW',
      'profile',
      user.user_id,
      'User accessed their profile information'
    ]);

    return NextResponse.json({
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        roles: userRoles,
        createdAt: user.created_at,
        lastLogin: user.last_login
      }
    });

  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check for auth token
    const authToken = request.cookies.get("auth_token")?.value;
    if (!authToken) {
      return NextResponse.json({ 
        error: "No authentication token found",
        authRequired: true 
      }, { status: 401 });
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
      return NextResponse.json({ 
        error: "Invalid token",
        authRequired: true
      }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phoneNumber } = body;

    const db = getDatabase();
    
    // Update user profile
    const updateResult = await db.query(`
      UPDATE users 
      SET first_name = $1, last_name = $2, phone_number = $3, updated_at = NOW()
      WHERE user_id = $4
      RETURNING *
    `, [firstName, lastName, phoneNumber, decoded.userId]);

    if (updateResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = updateResult.rows[0];

    // Create audit log
    await db.query(`
      INSERT INTO audit_log (user_id, operation, resource_type, resource_id, details, timestamp)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      decoded.userId,
      'UPDATE',
      'profile',
      decoded.userId,
      'User updated their profile information'
    ]);

    return NextResponse.json({
      user: {
        id: updatedUser.user_id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phoneNumber: updatedUser.phone_number,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}