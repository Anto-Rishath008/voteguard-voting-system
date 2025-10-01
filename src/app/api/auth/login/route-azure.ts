import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { getDatabase } from "@/lib/enhanced-database";

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

    // Get Azure Database instance
    const db = getDatabase();
    
    // Test connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      return NextResponse.json({ 
        error: "Database connection failed",
        message: "Azure Database is currently unavailable. Please try again later."
      }, { status: 503 });
    }

    // Find user by email in Azure Database
    const user = await db.getUserByEmail(email);

    if (!user) {
      // Log security event for failed login attempt
      await db.logSecurityEvent({
        action: 'LOGIN_FAILED',
        details: { email, reason: 'user_not_found' },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if account is locked due to too many failed attempts
    if (user.failed_login_attempts >= 5) {
      await db.logSecurityEvent({
        user_id: user.user_id,
        action: 'LOGIN_BLOCKED',
        details: { email, reason: 'account_locked', attempts: user.failed_login_attempts },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { 
          error: "Account temporarily locked due to multiple failed login attempts",
          message: "Please contact administrator to unlock your account"
        },
        { status: 423 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      // Update failed login attempts
      await db.updateUserLoginAttempt(user.user_id, false);
      
      // Log security event
      await db.logSecurityEvent({
        user_id: user.user_id,
        action: 'LOGIN_FAILED',
        details: { 
          email, 
          reason: 'invalid_password',
          attempts: (user.failed_login_attempts || 0) + 1
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user account is active
    if (!user.is_active) {
      await db.logSecurityEvent({
        user_id: user.user_id,
        action: 'LOGIN_FAILED',
        details: { email, reason: 'account_inactive' },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

      return NextResponse.json(
        { error: "Account is deactivated. Please contact administrator." },
        { status: 403 }
      );
    }

    // Successful login - update user record
    await db.updateUserLoginAttempt(user.user_id, true);
    
    // Log successful login
    await db.logSecurityEvent({
      user_id: user.user_id,
      action: 'LOGIN_SUCCESS',
      details: { email, role: user.role },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    // Create JWT token
    const token = sign(
      {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
      },
      process.env.JWT_SECRET || 'default-secret',
      { expiresIn: '24h' }
    );

    // Return success response
    return NextResponse.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.user_id,
        email: user.email,
        role: user.role,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        lastLogin: new Date().toISOString()
      },
      source: "Azure Database for PostgreSQL"
    });

  } catch (error) {
    console.error('Login error:', error);
    
    // Log system error
    const db = getDatabase();
    await db.logSecurityEvent({
      action: 'LOGIN_ERROR',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });

    return NextResponse.json(
      { 
        error: "Internal server error",
        message: "Please try again later",
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}