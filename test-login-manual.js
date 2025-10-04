const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function testLogin() {
  console.log('🔍 Testing login functionality...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Test getting user by email (using the corrected query)
    const email = 'charlie.admin@example.com';
    console.log(`👤 Testing getUserByEmail for: ${email}`);
    
    const user = await client.query(
      'SELECT * FROM users WHERE email = $1 AND (status IS NULL OR status != $2)',
      [email.toLowerCase(), 'disabled']
    );
    
    if (user.rows.length > 0) {
      const userData = user.rows[0];
      console.log(`   ✅ User found: ${userData.first_name} ${userData.last_name}`);
      console.log(`   📧 Email: ${userData.email}`);
      console.log(`   📊 Status: ${userData.status || 'No status set'}`);
      console.log(`   🔐 Has password_hash: ${userData.password_hash ? 'Yes' : 'No'}`);
      
      if (userData.password_hash) {
        console.log(`   🔐 Password hash length: ${userData.password_hash.length}`);
        
        // Test if the password might be a common test password
        const testPasswords = ['password', 'admin123', 'test123', '123456', 'admin'];
        
        for (const testPassword of testPasswords) {
          try {
            const isMatch = await bcrypt.compare(testPassword, userData.password_hash);
            if (isMatch) {
              console.log(`   ✅ Password match found: "${testPassword}"`);
              break;
            }
          } catch (err) {
            console.log(`   ❌ Error testing password "${testPassword}":`, err.message);
          }
        }
      }
    } else {
      console.log(`   ❌ User not found with current query`);
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message);
  } finally {
    await pool.end();
  }
}

testLogin();