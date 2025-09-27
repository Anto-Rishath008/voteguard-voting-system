import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envCheck = {
      JWT_SECRET: !!process.env.JWT_SECRET,
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    console.log("Environment check:", envCheck);

    return NextResponse.json({
      message: "Environment check completed",
      environment: envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Environment check error:", error);
    return NextResponse.json(
      { error: "Environment check failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}