import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("=== LOGIN TEST STARTED ===");
    
    const body = await request.json();
    console.log("Request body:", body);
    
    return NextResponse.json({
      status: "test-success",
      message: "Login test endpoint is working",
      receivedData: body,
      timestamp: new Date().toISOString(),
      hasJwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error("Login test error:", error);
    return NextResponse.json({
      status: "test-error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}