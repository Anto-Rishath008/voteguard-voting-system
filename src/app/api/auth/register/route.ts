import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      confirmPassword, 
      role = "Voter",
    } = await request.json();

    // Basic validation
    if (!email || !password || !firstName || !lastName || !confirmPassword) {
      return NextResponse.json(
        { error: "All basic fields are required" },
        { status: 400 }
      );
    }

    // Validate role - case insensitive, normalize to title case
    const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
    const validRoles = ["Voter", "Admin", "Superadmin"];
    if (!validRoles.includes(normalizedRole)) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
        },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
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

    // Check if user already exists
    const existingUserResult = await db.query(
      "SELECT email FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    const existingUser = existingUserResult.rows[0];

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const userId = uuidv4();

    // Hash password manually since we might not have RPC functions
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with enhanced security data
    const userData: any = {
      user_id: userId,
      email: email.toLowerCase(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      status: "Active",
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    // Simplified registration - no advanced fields required
    try {
      const userResult = await db.query(
        `INSERT INTO users (user_id, email, first_name, last_name, status, password_hash, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING user_id, email, first_name, last_name, status, created_at`,
        [userId, email.toLowerCase(), firstName.trim(), lastName.trim(), "Active", passwordHash, new Date().toISOString()]
      );
      
      if (!userResult.rows || userResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }
      
      const user = userResult.rows[0];
    } catch (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Assign role to user
    try {
      // Assign role to user (using simplified table structure)
      await db.query(
        "INSERT INTO user_roles (user_id, role_name, created_at) VALUES ($1, $2, $3)",
        [userId, normalizedRole, new Date().toISOString()]
      );
    } catch (roleError) {
      console.error("Error assigning role:", roleError);
      // Try to cleanup user if role assignment fails
      await db.query("DELETE FROM users WHERE user_id = $1", [userId]);
      return NextResponse.json(
        { error: "Failed to complete user registration" },
        { status: 500 }
      );
    }

    // Log user registration
    console.log(`User registered successfully: ${email.toLowerCase()} with role: ${normalizedRole}`);

    return NextResponse.json(
      {
        message: "User registration completed successfully",
        user: {
          id: userId,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: normalizedRole,
          emailVerified: false,
        },
        success: true
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
