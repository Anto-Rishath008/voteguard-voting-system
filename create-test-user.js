const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function createTestUser() {
  console.log('🔍 Creating test user with known password...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Hash password
    const plainPassword = 'testpass123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    console.log(`🔐 Hashed password for "testpass123": ${hashedPassword.substring(0, 20)}...`);
    
    // Check if test user already exists
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', ['test@voteguard.com']);
    
    if (existingUser.rows.length > 0) {
      console.log('👤 Test user already exists, updating password...');
      
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2',
        [hashedPassword, 'test@voteguard.com']
      );
      
      console.log('✅ Updated test user password');
      
    } else {
      console.log('👤 Creating new test user...');
      
      await client.query(`
        INSERT INTO users (
          user_id, email, first_name, last_name, password_hash, 
          status, email_verified, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        )
      `, [
        'test@voteguard.com',
        'Test',
        'User',
        hashedPassword,
        'Active',
        true
      ]);
      
      console.log('✅ Created new test user');
    }
    
    // Verify the user
    const verifyUser = await client.query(
      'SELECT email, first_name, last_name, status, password_hash FROM users WHERE email = $1',
      ['test@voteguard.com']
    );
    
    if (verifyUser.rows.length > 0) {
      const user = verifyUser.rows[0];
      console.log('\n📋 Test user details:');
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Password: testpass123`);
      console.log(`   Password hash starts with: ${user.password_hash.substring(0, 20)}...`);
      
      // Test password verification
      const isValid = await bcrypt.compare(plainPassword, user.password_hash);
      console.log(`   Password verification: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUser();