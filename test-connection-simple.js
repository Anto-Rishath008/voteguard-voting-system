require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testConnection() {
  console.log('🔍 Testing database connection...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database successfully');
    
    // Test a simple query
    const result = await client.query('SELECT COUNT(*) as user_count FROM users');
    console.log(`👥 Found ${result.rows[0].user_count} users in database`);
    
    await client.end();
    console.log('✅ Connection closed successfully');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
}

testConnection();