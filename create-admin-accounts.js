const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function createAdminAccounts() {
  console.log('🔍 Creating admin and super admin accounts...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check user_roles table structure
    console.log('📋 Checking user_roles table structure:');
    const roleSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      ORDER BY ordinal_position
    `);
    
    roleSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Create accounts
    const accounts = [
      {
        email: 'admin@voteguard.com',
        firstName: 'Admin',
        lastName: 'User',
        password: 'admin123',
        role: 'Admin'
      },
      {
        email: 'superadmin@voteguard.com', 
        firstName: 'Super',
        lastName: 'Admin',
        password: 'superadmin123',
        role: 'SuperAdmin'
      },
      {
        email: 'voter@voteguard.com',
        firstName: 'Voter',
        lastName: 'User', 
        password: 'voter123',
        role: 'Voter'
      }
    ];
    
    for (const account of accounts) {
      console.log(`\n👤 Creating ${account.role}: ${account.email}`);
      
      // Hash password
      const hashedPassword = await bcrypt.hash(account.password, 10);
      
      // Check if user already exists
      const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [account.email]);
      
      let userId;
      
      if (existingUser.rows.length > 0) {
        console.log('   ⚠️  User already exists, updating password...');
        userId = existingUser.rows[0].user_id;
        
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2',
          [hashedPassword, userId]
        );
      } else {
        console.log('   ✅ Creating new user...');
        
        const userResult = await client.query(`
          INSERT INTO users (
            user_id, email, first_name, last_name, password_hash, 
            status, email_verified, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
          ) RETURNING user_id
        `, [
          account.email,
          account.firstName,
          account.lastName,
          hashedPassword,
          'Active',
          true
        ]);
        
        userId = userResult.rows[0].user_id;
      }
      
      // Check and create role assignment
      const existingRole = await client.query('SELECT * FROM user_roles WHERE user_id = $1', [userId]);
      
      if (existingRole.rows.length > 0) {
        console.log('   ⚠️  Role already exists, updating...');
        await client.query(
          'UPDATE user_roles SET role_name = $1 WHERE user_id = $2',
          [account.role, userId]
        );
      } else {
        console.log('   ✅ Creating role assignment...');
        await client.query(`
          INSERT INTO user_roles (user_id, role_name, created_at)
          VALUES ($1, $2, NOW())
        `, [userId, account.role]);
      }
      
      console.log(`   📧 Email: ${account.email}`);
      console.log(`   🔐 Password: ${account.password}`);
      console.log(`   👔 Role: ${account.role}`);
    }
    
    // Verify all accounts
    console.log('\n📋 All created accounts:');
    const allUsers = await client.query(`
      SELECT u.email, u.first_name, u.last_name, u.status, ur.role_name
      FROM users u
      LEFT JOIN user_roles ur ON u.user_id = ur.user_id
      WHERE u.email IN ('admin@voteguard.com', 'superadmin@voteguard.com', 'voter@voteguard.com', 'test@voteguard.com')
      ORDER BY u.email
    `);
    
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.first_name} ${user.last_name} (${user.role_name || 'No role'}) [${user.status}]`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error creating admin accounts:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminAccounts();