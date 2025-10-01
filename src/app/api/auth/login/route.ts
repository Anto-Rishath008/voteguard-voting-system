import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDatabase } from "@/lib/enhanced-database";

export async function POST(request: NextRequest) {
  const db = getDatabase();
  
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

    // Get client IP for security logging
    const clientIP = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    try {
      // Find user by email using enhanced database
      const user = await db.getUserByEmail(email);

      if (!user) {
        // Log failed login attempt
        await db.logSecurityEvent({
          eventType: 'FAILED_LOGIN_ATTEMPT',
          description: `Failed login attempt for email: ${email}`,
          severity: 'WARNING',
          ipAddress: clientIP,
          userAgent: userAgent
        });

        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Check if account is locked
      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        await db.logSecurityEvent({
          eventType: 'LOCKED_ACCOUNT_ACCESS',
          userId: user.user_id,
          description: `Login attempt on locked account: ${email}`,
          severity: 'ERROR',
          ipAddress: clientIP,
          userAgent: userAgent
        });

        return NextResponse.json(
          { error: "Account is temporarily locked due to multiple failed attempts" },
          { status: 423 }
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      
      if (!isPasswordValid) {
        // Update failed login attempts
        await db.updateUserLoginAttempt(user.user_id, false);
        
        await db.logSecurityEvent({
          eventType: 'FAILED_LOGIN_ATTEMPT',
          userId: user.user_id,
          description: `Invalid password for user: ${email}`,
          severity: 'WARNING',
          ipAddress: clientIP,
          userAgent: userAgent
        });

        return NextResponse.json(
          { error: "Invalid email or password" },
          { status: 401 }
        );
      }

      // Check if user is active
      if (user.status !== "active") {
        await db.logSecurityEvent({
          eventType: 'INACTIVE_ACCOUNT_ACCESS',
          userId: user.user_id,
          description: `Login attempt on inactive account: ${email}`,
          severity: 'WARNING',
          ipAddress: clientIP,
          userAgent: userAgent
        });

        return NextResponse.json(
          { error: "Account is not active" },
          { status: 403 }
        );
      }

      // Successful login - update login attempts and last login
      await db.updateUserLoginAttempt(user.user_id, true);

      // Log successful login
      await db.logSecurityEvent({
        eventType: 'SUCCESSFUL_LOGIN',
        userId: user.user_id,
        description: `Successful login for user: ${email}`,
        severity: 'INFO',
        ipAddress: clientIP,
        userAgent: userAgent
      });

      const roles = user.roles || ["voter"];
      const primaryRole = roles.includes("super_admin") ? "super_admin" : 
                        roles.includes("admin") ? "admin" : 
                        roles.includes("election_officer") ? "election_officer" : "voter";

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
          firstName: user.first_name,
          lastName: user.last_name,
          roles: roles,
          role: primaryRole,
          fullName: `${user.first_name} ${user.last_name}`
        },
        token: token,
        message: "Login successful"
      });

    } catch (dbError) {
      console.error("Database error during login:", dbError);
      
      await db.logSecurityEvent({
        eventType: 'LOGIN_DATABASE_ERROR',
        description: `Database error during login for email: ${email}`,
        severity: 'ERROR',
        ipAddress: clientIP,
        userAgent: userAgent,
        additionalData: { error: dbError instanceof Error ? dbError.message : 'Unknown error' }
      });

      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
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