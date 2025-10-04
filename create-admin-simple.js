const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function createAdminAccountsSimple() {
  console.log('🔍 Creating admin accounts (simplified)...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    const accounts = [
      { email: 'admin@voteguard.com', firstName: 'Admin', lastName: 'User', password: 'admin123', role: 'Admin' },
      { email: 'superadmin@voteguard.com', firstName: 'Super', lastName: 'Admin', password: 'superadmin123', role: 'SuperAdmin' },
      { email: 'voter@voteguard.com', firstName: 'Voter', lastName: 'User', password: 'voter123', role: 'Voter' }
    ];
    
    for (const account of accounts) {
      console.log(`👤 Processing ${account.role}: ${account.email}`);
      
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      // Delete existing user and role if exists
      await client.query('DELETE FROM user_roles WHERE user_id IN (SELECT user_id FROM users WHERE email = $1)', [account.email]);
      await client.query('DELETE FROM users WHERE email = $1', [account.email]);
      
      // Create user
      const userResult = await client.query(`
        INSERT INTO users (
          user_id, email, first_name, last_name, password_hash, 
          status, email_verified, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, 'Active', true, NOW(), NOW()
        ) RETURNING user_id
      `, [account.email, account.firstName, account.lastName, hashedPassword]);
      
      const userId = userResult.rows[0].user_id;
      
      // Create role
      await client.query(`
        INSERT INTO user_roles (user_id, role_name, created_at)
        VALUES ($1, $2, NOW())
      `, [userId, account.role]);
      
      console.log(`   ✅ Created successfully`);
      console.log(`   📧 Email: ${account.email}`);
      console.log(`   🔐 Password: ${account.password}`);
      console.log(`   👔 Role: ${account.role}\n`);
    }
    
    // Verify accounts
    console.log('📋 All accounts verification:');
    const verification = await client.query(`
      SELECT u.email, u.first_name, u.last_name, ur.role_name
      FROM users u
      JOIN user_roles ur ON u.user_id = ur.user_id
      WHERE u.email IN ('admin@voteguard.com', 'superadmin@voteguard.com', 'voter@voteguard.com', 'test@voteguard.com')
      ORDER BY u.email
    `);
    
    verification.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.first_name} ${user.last_name} (${user.role_name})`);
    });
    
    client.release();
    console.log('\n🎉 All admin accounts created successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminAccountsSimple();