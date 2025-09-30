import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "working",
    message: "Emergency login status check",
    timestamp: new Date().toISOString(),
    availableCredentials: [
      { email: "voter@voteguard.com", password: "voter123", role: "voter" },
      { email: "admin@voteguard.com", password: "admin123", role: "admin" },
      { email: "superadmin@voteguard.com", password: "superadmin123", role: "super_admin" }
    ]
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Hardcoded emergency credentials
    const users = [
      { id: "1", email: "voter@voteguard.com", password: "voter123", role: "voter", name: "Test Voter" },
      { id: "2", email: "admin@voteguard.com", password: "admin123", role: "admin", name: "Test Admin" },
      { id: "3", email: "superadmin@voteguard.com", password: "superadmin123", role: "super_admin", name: "Test Super Admin" }
    ];

    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name
        },
        token: "emergency_token_" + user.id,
        message: "Emergency login successful"
      });
    } else {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Login failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}