import { NextRequest, NextResponse } from "next/server";
import { Pool } from 'pg';

export async function GET(request: NextRequest) {
  try {
    console.log("Testing direct PostgreSQL connection...");
    
    // Check if we have DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return NextResponse.json({
        status: "error",
        message: "DATABASE_URL not found",
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      });
    }

    // Create a direct PostgreSQL connection
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('postgres://') && !databaseUrl.includes('localhost') 
        ? { rejectUnauthorized: false } 
        : false
    });

    try {
      const client = await pool.connect();
      const result = await client.query('SELECT COUNT(*) as count FROM users');
      client.release();
      await pool.end();
      
      return NextResponse.json({
        status: "success",
        message: "Direct PostgreSQL connection successful",
        userCount: result.rows[0].count,
        connectionType: "postgresql"
      });
    } catch (dbError) {
      await pool.end();
      return NextResponse.json({
        status: "error",
        message: "PostgreSQL connection failed",
        error: dbError instanceof Error ? dbError.message : "Unknown error",
        databaseUrl: databaseUrl.substring(0, 20) + "...",
      });
    }
  } catch (error) {
    return NextResponse.json({
      status: "error",
      message: "Test failed",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}