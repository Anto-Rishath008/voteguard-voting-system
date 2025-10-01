import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const db = getDatabase();
    
    console.log("🔧 Creating test users in Azure Database...");
    
    // Check if users already exist
    const existingUsers = await db.query('SELECT email FROM users LIMIT 5');
    console.log("📊 Existing users:", existingUsers.rows.map(u => u.email));
    
    // Create test voter
    const voterPassword = await bcrypt.hash('password123', 12);
    await db.query(`
      INSERT INTO users (user_id, email, password_hash, first_name, last_name, is_active, created_at, updated_at) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, ['voter@voteguard.com', voterPassword, 'Test', 'Voter', true]);
    
    // Create test admin
    const adminPassword = await bcrypt.hash('admin123', 12);
    await db.query(`
      INSERT INTO users (user_id, email, password_hash, first_name, last_name, is_active, created_at, updated_at) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, ['admin@voteguard.com', adminPassword, 'Admin', 'User', true]);
    
    // Create additional test user with the email you're trying to use
    const testPassword = await bcrypt.hash('password123', 12);
    await db.query(`
      INSERT INTO users (user_id, email, password_hash, first_name, last_name, is_active, created_at, updated_at) 
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, ['test@voteguard.com', testPassword, 'Test', 'User', true]);
    
    // Get all users after creation
    const allUsers = await db.query('SELECT user_id, email, first_name, last_name, is_active, created_at FROM users ORDER BY created_at DESC');
    
    console.log("✅ Test users created successfully");
    
    return NextResponse.json({
      message: "Test users created successfully",
      users: allUsers.rows,
      credentials: [
        { email: 'voter@voteguard.com', password: 'password123' },
        { email: 'admin@voteguard.com', password: 'admin123' },
        { email: 'test@voteguard.com', password: 'password123' }
      ]
    });

  } catch (error) {
    console.error("❌ Error creating test users:", error);
    return NextResponse.json(
      { 
        error: "Failed to create test users", 
        message: error instanceof Error ? error.message : "Unknown error",
        details: error
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check existing users
export async function GET(request: NextRequest) {
  try {
    const db = getDatabase();
    
    // Get all users (without passwords)
    const users = await db.query(`
      SELECT user_id, email, first_name, last_name, is_active, failed_login_attempts, last_login, created_at 
      FROM users 
      ORDER BY created_at DESC
    `);
    
    return NextResponse.json({
      totalUsers: users.rows.length,
      users: users.rows
    });

  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch users", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}