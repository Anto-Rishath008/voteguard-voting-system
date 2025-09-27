import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient();

    // Test database connection by running a simple query
    const { data, error } = await supabase
      .from("users")
      .select("count")
      .limit(1);

    if (error) {
      return NextResponse.json(
        { error: "Database connection failed", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Database connection successful",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Connection test failed", details: error.message },
      { status: 500 }
    );
  }
}
