import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/enhanced-database';

export async function GET() {
  const db = getDatabase();
  
  if (!db) {
    return NextResponse.json({
      success: false,
      message: 'Database connection failed'
    }, { status: 500 });
  }

  try {
    console.log('🔍 Checking user data in database...');
    
    // Get all users with their roles
    const usersQuery = `
      SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.status,
        u.created_at,
        u.last_login,
        ARRAY_AGG(ur.role_name) as roles
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at, u.last_login
      ORDER BY u.created_at DESC
      LIMIT 10
    `;
    
    const result = await db.query(usersQuery);
    console.log('✅ Found users:', result.rows.length);
    
    // Log user details for debugging
    result.rows.forEach(user => {
      console.log(`User: ${user.email} - ${user.first_name} ${user.last_name} - Roles: ${user.roles}`);
    });
    
    return NextResponse.json({
      success: true,
      users: result.rows,
      message: `Found ${result.rows.length} users`
    });
    
  } catch (error) {
    console.error('❌ Error querying users:', error);
    return NextResponse.json({
      success: false,
      message: 'Error querying users',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}