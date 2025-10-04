const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDatabaseSchema() {
  console.log('🔍 Checking database schema...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check users table schema
    console.log('📋 Users table columns:');
    const usersSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    usersSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check what tables exist
    console.log('\n📋 Available tables:');
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    tables.rows.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Show sample user data
    console.log('\n👥 Sample users (first 3):');
    const users = await client.query('SELECT * FROM users LIMIT 3');
    users.rows.forEach((user, index) => {
      console.log(`${index + 1}. User keys:`, Object.keys(user));
      console.log(`   Email: ${user.email}`);
      if (user.password_hash) {
        console.log(`   Has password: Yes`);
      }
      console.log('');
    });
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking schema:', error.message);
  } finally {
    await pool.end();
  }
}

checkDatabaseSchema();