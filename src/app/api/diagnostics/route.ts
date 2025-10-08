import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      checks: {
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

    return NextResponse.json(diagnostics);
  } catch (error) {
    return NextResponse.json(
      { error: 'Diagnostic check failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
