import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/enhanced-database';

export async function GET() {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      envVars: {
        database_url: !!process.env.DATABASE_URL,
        supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabase_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabase_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        jwt_secret: !!process.env.JWT_SECRET,
      },
      database_url_preview: process.env.DATABASE_URL ? 
        process.env.DATABASE_URL.substring(0, 30) + '...' : 
        'NOT SET',
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    };

    // Test database connection
    try {
      const db = getDatabase();
      if (!db) {
        diagnostics.database_connection = 'FAILED - getDatabase returned null';
      } else {
        // Try a simple query
        const result = await db.query('SELECT NOW() as current_time, version() as pg_version');
        diagnostics.database_connection = 'SUCCESS';
        diagnostics.database_time = result.rows[0]?.current_time;
        diagnostics.database_version = result.rows[0]?.pg_version?.substring(0, 50) + '...';
        
        // Test if users table exists
        const tableCheck = await db.query(
          "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') as table_exists"
        );
        diagnostics.users_table_exists = tableCheck.rows[0]?.table_exists;
      }
    } catch (dbError) {
      diagnostics.database_connection = 'ERROR';
      diagnostics.database_error = dbError instanceof Error ? dbError.message : String(dbError);
      diagnostics.database_error_stack = dbError instanceof Error ? dbError.stack?.substring(0, 200) : undefined;
    }

    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Diagnostic check failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack?.substring(0, 300) : undefined
      },
      { status: 500 }
    );
  }
}
