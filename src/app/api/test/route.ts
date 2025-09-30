import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "API Test endpoint working",
    timestamp: new Date().toISOString(),
    routes: {
      login: "/api/auth/login",
      loginMinimal: "/api/auth/login-minimal",
      loginTest: "/api/auth/login-test",
      health: "/api/debug/health"
    }
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "POST method working on test endpoint",
    timestamp: new Date().toISOString()
  });
}