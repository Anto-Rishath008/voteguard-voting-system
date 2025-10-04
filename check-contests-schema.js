require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkContestsSchema() {
  console.log('🔍 Checking contests table schema...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Check contests table structure
    const contestsColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contests' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Contests table columns:');
    contestsColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
    });
    
    // Also check candidates table
    const candidatesColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'candidates' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Candidates table columns:');
    candidatesColumns.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default || 'none'}`);
    });
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContestsSchema();