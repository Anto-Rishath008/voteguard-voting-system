const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkCurrentSchema() {
  console.log('🔍 Checking current database schema...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    // Check existing tables
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:');
    tables.rows.forEach(row => {
      console.log(`   ├── ${row.table_name}`);
    });
    
    // Check if we have contests table
    const contestsTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contests'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🏆 Contests table structure:');
    if (contestsTable.rows.length > 0) {
      contestsTable.rows.forEach(row => {
        console.log(`   ├── ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('   ❌ Contests table not found');
    }
    
    // Check candidates table
    const candidatesTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'candidates'
      ORDER BY ordinal_position
    `);
    
    console.log('\n👥 Candidates table structure:');
    if (candidatesTable.rows.length > 0) {
      candidatesTable.rows.forEach(row => {
        console.log(`   ├── ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('   ❌ Candidates table not found');
    }
    
    // Check eligible_voters table
    const eligibleVotersTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'eligible_voters'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🗳️  Eligible voters table structure:');
    if (eligibleVotersTable.rows.length > 0) {
      eligibleVotersTable.rows.forEach(row => {
        console.log(`   ├── ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('   ❌ Eligible voters table not found');
    }
    
    // Check votes table
    const votesTable = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'votes'
      ORDER BY ordinal_position
    `);
    
    console.log('\n🗳️  Votes table structure:');
    if (votesTable.rows.length > 0) {
      votesTable.rows.forEach(row => {
        console.log(`   ├── ${row.column_name}: ${row.data_type}`);
      });
    } else {
      console.log('   ❌ Votes table not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCurrentSchema();