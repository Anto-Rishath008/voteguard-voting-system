const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkConstraints() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    // Check contest_type constraint
    const constraints = await pool.query(`
      SELECT constraint_name, check_clause 
      FROM information_schema.check_constraints 
      WHERE constraint_name LIKE '%contest%'
    `);
    
    console.log('Contest constraints:', constraints.rows);
    
    // Also check existing contest types
    const existingTypes = await pool.query(`
      SELECT DISTINCT contest_type FROM contests
    `);
    
    console.log('Existing contest types:', existingTypes.rows);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkConstraints();