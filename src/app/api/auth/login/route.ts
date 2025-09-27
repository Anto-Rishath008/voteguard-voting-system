import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { sign } from "jsonwebtoken";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.toLowerCase())
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json(
        {
          error:
            "Account is temporarily locked due to multiple failed login attempts",
        },
        { status: 423 }
      );
    }

    // Check if account is active
    if (user.status !== "Active") {
      return NextResponse.json(
        { error: "Account is not active" },
        { status: 403 }
      );
    }

    // Verify password using bcrypt
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      // Increment failed login attempts
      const failedAttempts = (user.failed_login_attempts || 0) + 1;
      const lockUntil =
        failedAttempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // Lock for 15 minutes
          : null;

      await supabase
        .from("users")
        .update({
          failed_login_attempts: failedAttempts,
          locked_until: lockUntil,
        })
        .eq("user_id", user.user_id);

      // Log security event
      await supabase.from("security_events").insert({
        user_id: user.user_id,
        event_type: "FailedLogin",
        severity_level: failedAttempts >= 3 ? "High" : "Medium",
        description: `Failed login attempt ${failedAttempts} for ${email}`,
        event_data: {
          email,
          failed_attempts: failedAttempts,
          ip_address: request.headers.get("x-forwarded-for") || "unknown",
        },
      });

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Reset failed login attempts on successful login
    await supabase
      .from("users")
      .update({
        failed_login_attempts: 0,
        locked_until: null,
        last_login: new Date().toISOString(),
      })
      .eq("user_id", user.user_id);

    // Get user roles
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", user.user_id);

    const userRoles = roles?.map((r) => r.role_name) || [];

    // Create JWT token
    const token = sign(
      {
        userId: user.user_id,
        email: user.email,
        roles: userRoles,
        firstName: user.first_name,
        lastName: user.last_name,
      },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    // Create user session
    const { data: session } = await supabase
      .from("user_sessions")
      .insert({
        user_id: user.user_id,
        ip_address: request.headers.get("x-forwarded-for") || "unknown",
        login_timestamp: new Date().toISOString(),
        last_seen_timestamp: new Date().toISOString(),
        is_active: true,
      })
      .select()
      .single();

    // Create audit log
    await DatabaseUtils.createAuditLog(
      user.user_id,
      "LOGIN",
      "user_sessions",
      session?.session_id || "unknown",
      undefined,
      { email, action: "successful_login" },
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    // Set HTTP-only cookie
    const response = NextResponse.json({
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: userRoles,
        status: user.status,
      },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 3600, // 1 hour
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
