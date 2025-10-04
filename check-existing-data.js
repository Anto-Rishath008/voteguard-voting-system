require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkExistingData() {
  // Parse Supabase connection details from DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;
  const client = new Client({
    connectionString: dbUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('🔍 Checking existing data and constraints...');
    
    // Check existing elections and their status values
    const existingElections = await client.query('SELECT election_name, status FROM elections LIMIT 5');
    console.log('\n📋 Existing elections and their status values:');
    if (existingElections.rows.length > 0) {
      existingElections.rows.forEach(row => {
        console.log(`   ${row.election_name}: "${row.status}"`);
      });
    } else {
      console.log('   No existing elections found');
    }
    
    // Check constraint definition
    const constraints = await client.query(`
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'elections'::regclass 
      AND contype = 'c'
    `);
    
    console.log('\n🔒 Check constraints on elections table:');
    constraints.rows.forEach(row => {
      console.log(`   ${row.constraint_name}: ${row.definition}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkExistingData();