import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    console.log("Health check started...");
    
    // Test database connection
    let dbStatus = "failed";
    let dbError = null;
    let connectionType = "none";
    const supabase = createAdminClient();
    
    if (supabase) {
      try {
        console.log("Testing Supabase connection...");
        const { data, error } = await supabase
          .from("users")
          .select("count")
          .limit(1);
        
        if (error) {
          dbError = error.message;
          console.error("Supabase test error:", error);
        } else {
          dbStatus = "connected";
          connectionType = "supabase";
          console.log("Supabase connection successful");
        }
      } catch (err) {
        dbError = err instanceof Error ? err.message : "Unknown Supabase error";
        console.error("Supabase connection error:", err);
      }
    } else {
      dbError = "Failed to create Supabase client - missing environment variables";
      console.error("Failed to create Supabase client");
    }

    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        connectionType: connectionType,
        error: dbError,
      },
      services: {
        supabaseClient: !!supabase,
        jwtSecret: !!process.env.JWT_SECRET,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      }
    };

    console.log("Health check completed:", healthStatus);

    return NextResponse.json(healthStatus);
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}