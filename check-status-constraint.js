require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function checkStatusConstraint() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  });

  try {
    await client.connect();
    console.log('🔍 Checking elections status constraint...');
    
    // Check constraint details
    const constraintQuery = `
      SELECT 
        conname as constraint_name,
        consrc as constraint_definition,
        pg_get_constraintdef(oid) as formatted_definition
      FROM pg_constraint 
      WHERE conname = 'elections_status_check'
    `;
    
    const constraints = await client.query(constraintQuery);
    console.log('\n📋 Status constraint details:');
    constraints.rows.forEach(row => {
      console.log(`   Name: ${row.constraint_name}`);
      console.log(`   Definition: ${row.formatted_definition}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkStatusConstraint();