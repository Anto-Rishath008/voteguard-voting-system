import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { sign } from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Hardcoded test users for when Supabase is unavailable
const FALLBACK_USERS = [
  {
    id: "1",
    email: "voter@voteguard.com",
    role: "voter",
    full_name: "Test Voter",
    is_active: true,
    status: "Active"
  },
  {
    id: "2", 
    email: "admin@voteguard.com",
    role: "admin",
    full_name: "Test Admin", 
    is_active: true,
    status: "Active"
  },
  {
    id: "3",
    email: "superadmin@voteguard.com", 
    role: "super_admin",
    full_name: "Test Super Admin",
    is_active: true,
    status: "Active"
  }
];

const FALLBACK_PASSWORDS: { [key: string]: string } = {
  "voter@voteguard.com": "voter123",
  "admin@voteguard.com": "admin123", 
  "superadmin@voteguard.com": "superadmin123"
};

export async function POST(request: NextRequest) {
  try {
    console.log("=== LOGIN ATTEMPT STARTED ===");
    const { email, password } = await request.json();

    if (!email || !password) {
      console.log("❌ Missing email or password");
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("📧 Email:", email.toLowerCase());

    let user = null;
    let authMethod = "unknown";
    
    // Try Supabase authentication first
    const supabase = createAdminClient();
    if (supabase) {
      try {
        console.log("🔄 Attempting Supabase authentication...");
        
        const { data: supabaseUser, error: userError } = await supabase
          .from("users")
          .select("*")
          .eq("email", email.toLowerCase())
          .single();

        if (!userError && supabaseUser) {
          console.log("✅ User found in Supabase database");
          
          // Verify password
          const isValidPassword = await bcrypt.compare(password, supabaseUser.password_hash);
          
          if (isValidPassword) {
            user = supabaseUser;
            authMethod = "supabase";
            console.log("✅ Supabase authentication successful");
          } else {
            console.log("❌ Supabase authentication failed - invalid password");
          }
        } else {
          console.log("❌ User not found in Supabase database:", userError?.message);
        }
      } catch (error) {
        console.log("❌ Supabase authentication error:", error);
      }
    } else {
      console.log("⚠️ Supabase client not available");
    }
    
    // Fallback to hardcoded users if Supabase authentication failed
    if (!user) {
      console.log("🔄 Attempting fallback authentication...");
      
      const fallbackUser = FALLBACK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (fallbackUser) {
        const expectedPassword = FALLBACK_PASSWORDS[fallbackUser.email.toLowerCase()];
        if (password === expectedPassword) {
          user = fallbackUser;
          authMethod = "fallback";
          console.log("✅ Fallback authentication successful");
        } else {
          console.log("❌ Fallback authentication failed - invalid password");
        }
      } else {
        console.log("❌ User not found in fallback users");
      }
    }

    if (!user) {
      console.log("❌ Authentication failed for:", email);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active || user.status !== "Active") {
      console.log("❌ User account is inactive:", email);
      return NextResponse.json(
        { error: "Account is inactive. Please contact an administrator." },
        { status: 403 }
      );
    }

    // Check JWT secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.log("❌ JWT_SECRET not configured");
      return NextResponse.json(
        { error: "Authentication service not configured" },
        { status: 500 }
      );
    }

    // Generate JWT token
    const tokenPayload = {
      userId: user.id.toString(),
      email: user.email,
      role: user.role,
      fullName: user.full_name,
      authMethod: authMethod,
      iat: Math.floor(Date.now() / 1000),
    };

    const token = sign(tokenPayload, jwtSecret, {
      expiresIn: "24h",
      issuer: "VoteGuard",
      audience: "VoteGuard-Users",
    });

    console.log("✅ JWT token generated successfully for:", email, "via", authMethod);

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
          authMethod: authMethod,
        },
        message: "Login successful",
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60, // 24 hours
      path: "/",
    });

    console.log("=== LOGIN SUCCESSFUL ===");
    return response;
    
  } catch (error) {
    console.error("💥 Login error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}