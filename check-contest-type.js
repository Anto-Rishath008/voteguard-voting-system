require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkContestTypeConstraint() {
  console.log('🔍 Checking contest_type constraint...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Check constraint details for contests
    const constraintQuery = `
      SELECT 
        conname as constraint_name,
        pg_get_constraintdef(oid) as formatted_definition
      FROM pg_constraint 
      WHERE conrelid = 'contests'::regclass 
      AND contype = 'c'
    `;
    
    const constraints = await client.query(constraintQuery);
    console.log('\n📋 Contests table constraints:');
    constraints.rows.forEach(row => {
      console.log(`   ${row.constraint_name}: ${row.formatted_definition}`);
    });
    
    // Also check existing contest types
    const existingContests = await client.query('SELECT contest_title, contest_type FROM contests LIMIT 10');
    console.log('\n📋 Existing contests:');
    if (existingContests.rows.length > 0) {
      existingContests.rows.forEach(row => {
        console.log(`   "${row.contest_title}" - type: "${row.contest_type}"`);
      });
    } else {
      console.log('   No existing contests found');
    }
    
    await client.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContestTypeConstraint();