require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkAdminUser() {
  console.log('🔍 Checking for admin user...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Check if admin user exists
    const adminResult = await client.query(`
      SELECT u.user_id, u.email, ur.role_name 
      FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      WHERE ur.role_name = 'Admin' 
      LIMIT 1
    `);
    
    if (adminResult.rows.length > 0) {
      console.log('✅ Admin user found:');
      console.log(`   ID: ${adminResult.rows[0].user_id}`);
      console.log(`   Email: ${adminResult.rows[0].email}`);
      console.log(`   Role: ${adminResult.rows[0].role_name}`);
    } else {
      console.log('❌ No admin user found');
    }
    
    // Also check voter user for votes
    const voterResult = await client.query(`
      SELECT u.user_id, u.email, ur.role_name 
      FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      WHERE ur.role_name = 'Voter' 
      LIMIT 1
    `);
    
    if (voterResult.rows.length > 0) {
      console.log('✅ Voter user found:');
      console.log(`   ID: ${voterResult.rows[0].user_id}`);
      console.log(`   Email: ${voterResult.rows[0].email}`);
    } else {
      console.log('❌ No voter user found');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminUser();