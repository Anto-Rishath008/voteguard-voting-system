import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { createAdminClient } from "@/lib/supabase";
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

    // Create Supabase admin client
    const supabase = createAdminClient();
    
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Find user by email in the database
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("user_id, email, password_hash, first_name, last_name, status")
      .eq("email", email.toLowerCase())
      .single();

    if (fetchError || !user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

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
    const { data: userRoles, error: rolesError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.user_id);

    const roles = userRoles?.map(r => r.role) || ["voter"];
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