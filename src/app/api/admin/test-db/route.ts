import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";

export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Test basic connection
    const connectionTest = await db.testConnection();
    
    if (!connectionTest) {
      return NextResponse.json({
        status: "error",
        message: "Database connection failed",
        connected: false
      }, { status: 503 });
    }
    
    // Get database info
    const dbInfo = await db.query('SELECT version(), current_database(), current_user, current_timestamp');
    
    // Get table list
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    // Get user count
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    
    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      connected: true,
      info: {
        version: dbInfo.rows[0].version,
        database: dbInfo.rows[0].current_database,
        user: dbInfo.rows[0].current_user,
        timestamp: dbInfo.rows[0].current_timestamp
      },
      tables: tables.rows.map(t => t.table_name),
      userCount: parseInt(userCount.rows[0].count)
    });

  } catch (error) {
    console.error("❌ Database test error:", error);
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}