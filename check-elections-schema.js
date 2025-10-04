const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkElectionsTableSchema() {
  console.log('🔍 Checking elections table schema...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check elections table columns
    console.log('📋 Elections table columns:');
    const electionsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'elections' 
      ORDER BY ordinal_position
    `);
    
    electionsSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check contests table too
    console.log('\n📋 Contests table columns:');
    const contestsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'contests' 
      ORDER BY ordinal_position
    `);
    
    contestsSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check candidates table
    console.log('\n📋 Candidates table columns:');
    const candidatesSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'candidates' 
      ORDER BY ordinal_position
    `);
    
    candidatesSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkElectionsTableSchema();