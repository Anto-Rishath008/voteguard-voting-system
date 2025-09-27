import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password, firstName, lastName, confirmPassword, role = "voter" } =
      await request.json();

    // Validation
    if (!email || !password || !firstName || !lastName || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["voter", "admin", "super_admin"];
    if (!validRoles.includes(role)) {
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

    const supabase = createAdminClient();

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const userId = uuidv4();

    // Create user with hashed password using database function
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        email: email.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        status: "Active",
        password_hash: await supabase.rpc("hash_password", { password }),
        email_verified: false, // Require email verification
        email_verification_token: await supabase.rpc("generate_token"),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Assign role based on selection (convert to proper case)
    const roleMap: { [key: string]: string } = {
      voter: "Voter",
      admin: "Admin",
      super_admin: "SuperAdmin"
    };
    
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role_name: roleMap[role],
      assigned_by: userId, // Self-assigned for registration
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Try to cleanup user if role assignment fails
      await supabase.from("users").delete().eq("user_id", userId);
      return NextResponse.json(
        { error: "Failed to complete user registration" },
        { status: 500 }
      );
    }

    // Create audit log
    await DatabaseUtils.createAuditLog(
      userId,
      "INSERT",
      "users",
      userId,
      undefined,
      {
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        action: "user_registration",
      },
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    // TODO: Send email verification email here
    // For now, we'll just return success

    return NextResponse.json(
      {
        message: "User registered successfully",
        user: {
          id: userId,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          emailVerified: false,
        },
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
