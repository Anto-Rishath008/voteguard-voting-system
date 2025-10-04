/**
 * Check actual database schema for user roles
 */

require('dotenv').config({ path: '.env.local' });

async function checkActualSchema() {
  console.log('🔍 Checking Actual Database Schema');
  console.log('================================================================================');

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // List all tables
    console.log('\n📊 ALL TABLES:');
    console.log('--------------------------------------------------------------------------------');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.table(tables.rows);

    // Check user_roles table structure
    console.log('\n📊 USER_ROLES TABLE COLUMNS:');
    console.log('--------------------------------------------------------------------------------');
    const userRolesColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'user_roles' 
      ORDER BY column_name
    `);
    console.table(userRolesColumns.rows);

    // Check actual data in user_roles
    console.log('\n📊 USER_ROLES TABLE DATA:');
    console.log('--------------------------------------------------------------------------------');
    const userRolesData = await pool.query('SELECT * FROM user_roles LIMIT 10');
    console.table(userRolesData.rows);

    // Check users table structure
    console.log('\n📊 USERS TABLE COLUMNS:');
    console.log('--------------------------------------------------------------------------------');
    const usersColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY column_name
    `);
    console.table(usersColumns.rows);

    await pool.end();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
checkActualSchema().catch(console.error);