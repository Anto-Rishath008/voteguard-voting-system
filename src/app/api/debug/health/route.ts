import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    console.log("Health check started...");
    
    // Test database connection
    const supabase = createAdminClient();
    let dbStatus = "failed";
    let dbError = null;
    
    if (supabase) {
      try {
        console.log("Testing database connection...");
        const { data, error } = await supabase
          .from("users")
          .select("count")
          .limit(1);
        
        if (error) {
          dbError = error.message;
          console.error("Database test error:", error);
        } else {
          dbStatus = "connected";
          console.log("Database connection successful");
        }
      } catch (err) {
        dbError = err instanceof Error ? err.message : "Unknown database error";
        console.error("Database connection error:", err);
      }
    } else {
      dbError = "Failed to create Supabase client";
      console.error("Failed to create Supabase client");
    }

    const healthStatus = {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      database: {
        status: dbStatus,
        error: dbError,
      },
      services: {
        supabaseClient: !!supabase,
        jwtSecret: !!process.env.JWT_SECRET,
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