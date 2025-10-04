require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testSuperAdminLogin() {
  console.log('🔍 Testing SuperAdmin role retrieval...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Check SuperAdmin user and roles
    const superAdminUser = await client.query(`
      SELECT u.user_id, u.email, u.first_name, u.last_name 
      FROM users u 
      WHERE u.email = 'superadmin@voteguard.com'
    `);
    
    if (superAdminUser.rows.length > 0) {
      const user = superAdminUser.rows[0];
      console.log('✅ SuperAdmin user found:');
      console.log(`   User ID: ${user.user_id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      
      // Get roles for this user
      const roles = await client.query(`
        SELECT role_name FROM user_roles WHERE user_id = $1
      `, [user.user_id]);
      
      console.log(`   Roles: ${roles.rows.map(r => r.role_name).join(', ')}`);
      
      // Test the new getUserRoles method by simulating it
      console.log('\n🧪 Simulating API response for login...');
      const userWithRoles = {
        userId: user.user_id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        roles: roles.rows.map(r => r.role_name),
        name: `${user.first_name} ${user.last_name}`
      };
      
      console.log('📦 User object that will be returned:');
      console.log(JSON.stringify(userWithRoles, null, 2));
      
      // Test role checking logic
      const hasRoles = userWithRoles.roles;
      const isSuperAdmin = hasRoles.includes('SuperAdmin');
      const isAdmin = hasRoles.includes('Admin');
      
      console.log('\n🎯 Role check results:');
      console.log(`   isSuperAdmin: ${isSuperAdmin}`);
      console.log(`   isAdmin: ${isAdmin}`);
      console.log(`   Expected dashboard: ${isSuperAdmin ? 'SuperAdminDashboard' : isAdmin ? 'AdminDashboard' : 'VoterDashboard'}`);
      
    } else {
      console.log('❌ SuperAdmin user not found');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSuperAdminLogin();