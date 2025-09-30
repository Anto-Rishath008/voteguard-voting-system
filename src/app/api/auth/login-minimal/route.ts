import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // Minimal test - just check hardcoded credentials
    if (email === "voter@voteguard.com" && password === "voter123") {
      return NextResponse.json({
        success: true,
        user: {
          id: "1",
          email: "voter@voteguard.com",
          role: "voter",
          fullName: "Test Voter"
        },
        message: "Login successful"
      });
    }
    
    if (email === "admin@voteguard.com" && password === "admin123") {
      return NextResponse.json({
        success: true,
        user: {
          id: "2",
          email: "admin@voteguard.com",
          role: "admin",
          fullName: "Test Admin"
        },
        message: "Login successful"
      });
    }
    
    if (email === "superadmin@voteguard.com" && password === "superadmin123") {
      return NextResponse.json({
        success: true,
        user: {
          id: "3",
          email: "superadmin@voteguard.com",
          role: "super_admin",
          fullName: "Test Super Admin"
        },
        message: "Login successful"
      });
    }
    
    return NextResponse.json(
      { error: "Invalid email or password" },
      { status: 401 }
    );
    
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}