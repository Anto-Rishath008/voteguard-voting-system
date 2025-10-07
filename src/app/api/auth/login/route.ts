import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { supabaseAuth } from "@/lib/supabase-auth";

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 LOGIN API CALLED - Start debugging');
    const body = await request.json();
    const { email, password } = body;
    console.log('📧 Email received:', email);
    console.log('🔑 Password received:', password ? `${password.length} chars` : 'EMPTY');

    // Validate input
    if (!email || !password) {
      console.log('❌ LOGIN FAILED: Missing email or password');
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Test connection first
    console.log('📡 Testing database connection...');
    const isConnected = await supabaseAuth.testConnection();
    if (!isConnected) {
      console.log('❌ LOGIN FAILED: Database connection failed');
      return NextResponse.json({ 
        error: "Database connection failed",
        message: "Supabase Database is currently unavailable. Please try again later."
      }, { status: 503 });
    }
    console.log('✅ Database connection OK');

    // Find user by email with roles
    console.log('👤 Looking up user by email...');
    const user = await supabaseAuth.getUserWithRolesByEmail(email);

    if (!user) {
      console.log('❌ LOGIN FAILED: User not found for email:', email);
      // Log security event for failed login attempt
      await supabaseAuth.logSecurityEvent({
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
      const lockedUntil = user.locked_until ? new Date(user.locked_until) : null;
      if (lockedUntil && lockedUntil > new Date()) {
        await supabaseAuth.logSecurityEvent({
          action: 'LOGIN_BLOCKED',
          details: { email, reason: 'account_locked' },
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown',
          user_id: user.user_id
        });

        return NextResponse.json(
          { error: "Account temporarily locked due to multiple failed login attempts. Please try again later." },
          { status: 423 }
        );
      }
    }

    // Check if account is active
    if (user.status !== 'Active') {
      await supabaseAuth.logSecurityEvent({
        action: 'LOGIN_FAILED',
        details: { email, reason: 'account_inactive', status: user.status },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        user_id: user.user_id
      });

      return NextResponse.json(
        { error: "Account is not active" },
        { status: 401 }
      );
    }

    // Get user's password hash from database
    const { data: passwordData, error: passwordError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('password_hash')
      .eq('user_id', user.user_id)
      .single();

    if (passwordError || !passwordData?.password_hash) {
      return NextResponse.json(
        { error: "Authentication system error" },
        { status: 500 }
      );
    }

    // Verify password
    console.log('🔓 Verifying password...');
    console.log('Password to verify:', password);
    console.log('Hash from DB:', passwordData.password_hash.substring(0, 30) + '...');
    const isPasswordValid = await supabaseAuth.verifyPassword(password, passwordData.password_hash);
    console.log('Password verification result:', isPasswordValid ? '✅ VALID' : '❌ INVALID');

    if (!isPasswordValid) {
      console.log('❌ LOGIN FAILED: Invalid password for user:', email);
      // Increment failed login attempts
      await supabaseAuth.incrementFailedLoginAttempts(user.user_id);

      await supabaseAuth.logSecurityEvent({
        action: 'LOGIN_FAILED',
        details: { email, reason: 'invalid_password' },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
        user_id: user.user_id
      });

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Update last login timestamp and reset failed attempts
    await supabaseAuth.updateLastLogin(user.user_id);

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");
      return NextResponse.json(
        { error: "Authentication configuration error" },
        { status: 500 }
      );
    }

    const token = sign(
      {
        userId: user.user_id,
        email: user.email,
        roles: user.roles,
        firstName: user.first_name,
        lastName: user.last_name
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Log successful login
    await supabaseAuth.logSecurityEvent({
      action: 'LOGIN_SUCCESS',
      details: { email, roles: user.roles },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
      user_id: user.user_id
    });

    // Set HTTP-only cookie
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        status: user.status,
        roles: user.roles,
        emailVerified: user.email_verified
      }
    });

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 // 24 hours
    });

    return response;

  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}