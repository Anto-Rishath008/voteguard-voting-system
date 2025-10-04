const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTestUsers() {
  console.log('🔍 Checking for test users...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check for specific test users
    const testEmails = ['test@voteguard.com', 'admin@voteguard.com'];
    
    for (const email of testEmails) {
      console.log(`👤 Checking user: ${email}`);
      const user = await client.query('SELECT email, first_name, last_name, status, password_hash FROM users WHERE email = $1', [email]);
      
      if (user.rows.length > 0) {
        const userData = user.rows[0];
        console.log(`   ✅ Found: ${userData.first_name} ${userData.last_name}`);
        console.log(`   📧 Email: ${userData.email}`);
        console.log(`   👔 Role: Check user_roles table`);
        console.log(`   📊 Status: ${userData.status || 'No status set'}`);
        console.log(`   🔐 Has password: ${userData.password_hash ? 'Yes' : 'No'}`);
      } else {
        console.log(`   ❌ Not found`);
      }
      console.log('');
    }
    
    // Show all users
    console.log('📋 All users:');
    const allUsers = await client.query('SELECT email, first_name, last_name, status FROM users ORDER BY email');
    allUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} - ${user.first_name} ${user.last_name} [${user.status || 'active'}]`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  } finally {
    await pool.end();
  }
}

checkTestUsers();