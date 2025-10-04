/**
 * Test script to check user roles and API authentication
 */

require('dotenv').config({ path: '.env.local' });

async function checkUserRoles() {
  console.log('🔍 Checking User Roles and API Authentication');
  console.log('================================================================================');

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Check the roles table structure
    console.log('\n📊 ROLES TABLE:');
    console.log('--------------------------------------------------------------------------------');
    const roles = await pool.query('SELECT * FROM roles ORDER BY role_name');
    console.table(roles.rows);

    // Check user_roles table structure
    console.log('\n📊 USER ROLES TABLE (sample):');
    console.log('--------------------------------------------------------------------------------');
    const userRoles = await pool.query(`
      SELECT DISTINCT ur.role_name, COUNT(*) as user_count
      FROM user_roles ur 
      GROUP BY ur.role_name
      ORDER BY ur.role_name
    `);
    console.table(userRoles.rows);

    // Check if there are any Admin or SuperAdmin users
    console.log('\n📊 ADMIN USERS:');
    console.log('--------------------------------------------------------------------------------');
    const adminUsers = await pool.query(`
      SELECT u.email, u.first_name, u.last_name, ur.role_name
      FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      WHERE ur.role_name IN ('Admin', 'SuperAdmin')
      ORDER BY ur.role_name, u.email
    `);
    console.table(adminUsers.rows);

    // Check the specific role checking query used in the API
    console.log('\n📊 API ROLE CHECK QUERY TEST:');
    console.log('--------------------------------------------------------------------------------');
    const testUserId = adminUsers.rows[0]?.user_id || '6d09caff-0f3c-453e-9f09-13796d20a8aa'; // admin@voteguard.com
    console.log(`Testing with user_id: ${testUserId}`);
    
    const roleCheck = await pool.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [testUserId]
    );
    console.log('Role check result:', roleCheck.rows);
    console.log('Role check count:', roleCheck.rows.length);

    await pool.end();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
checkUserRoles().catch(console.error);