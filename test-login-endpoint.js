const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function testLoginEndpoint() {
  console.log('🔍 Testing login endpoint logic manually...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    const email = 'test@voteguard.com';
    const password = 'testpass123';
    
    console.log(`👤 Testing login flow for: ${email}`);
    
    // Step 1: Test getUserByEmail query (this should match the fixed query)
    console.log('\n🔍 Step 1: Testing getUserByEmail query...');
    const userResult = await client.query(
      'SELECT * FROM users WHERE email = $1 AND (status IS NULL OR status != $2)',
      [email.toLowerCase(), 'disabled']
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`   ✅ User found: ${user.first_name} ${user.last_name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   📊 Status: ${user.status || 'No status'}`);
      console.log(`   🔐 Has password: ${user.password_hash ? 'Yes' : 'No'}`);
      
      // Step 2: Test password verification
      console.log('\n🔍 Step 2: Testing password verification...');
      if (user.password_hash) {
        try {
          const isValidPassword = await bcrypt.compare(password, user.password_hash);
          console.log(`   ${isValidPassword ? '✅' : '❌'} Password match: ${isValidPassword}`);
          
          if (isValidPassword) {
            console.log('\n🎉 Login should succeed!');
            console.log('\n📋 User data that would be returned:');
            console.log(`   user_id: ${user.user_id}`);
            console.log(`   email: ${user.email}`);
            console.log(`   first_name: ${user.first_name}`);
            console.log(`   last_name: ${user.last_name}`);
            console.log(`   status: ${user.status}`);
          } else {
            console.log('\n❌ Login would fail - password mismatch');
          }
        } catch (bcryptError) {
          console.log(`   ❌ Bcrypt error: ${bcryptError.message}`);
        }
      } else {
        console.log('   ❌ No password hash found');
      }
    } else {
      console.log('   ❌ User not found with query');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error testing login endpoint:', error.message);
  } finally {
    await pool.end();
  }
}

testLoginEndpoint();