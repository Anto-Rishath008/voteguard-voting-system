// Quick database status checker
const { Pool } = require('pg');
require('dotenv').config();

async function quickDbCheck() {
  console.log('⚡ Quick Database Status Check...\n');
  
  const pool = new Pool({
    connectionString: process.env.AZURE_SQL_CONNECTION_STRING,
    ssl: false
  });

  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as time, \'Database is UP!\' as status');
    console.log('✅ SUCCESS:', result.rows[0].status);
    console.log('⏰ Time:', result.rows[0].time);
    client.release();
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    if (error.message.includes('timeout')) {
      console.log('💡 Database might still be starting up - try again in 30 seconds');
    }
  } finally {
    await pool.end();
  }
}

quickDbCheck();