const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to Supabase PostgreSQL database');
    
    // Test database info
    const result = await client.query('SELECT version(), current_database(), current_user');
    console.log('\n📊 Database Information:');
    console.log('Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    console.log('Database:', result.rows[0].current_database);
    console.log('User:', result.rows[0].current_user);
    
    // Test extensions
    const extensions = await client.query(`
      SELECT extname FROM pg_extension 
      WHERE extname IN ('uuid-ossp', 'pgcrypto')
      ORDER BY extname
    `);
    
    console.log('\n🔧 Available Extensions:');
    if (extensions.rows.length > 0) {
      extensions.rows.forEach(ext => {
        console.log(`✅ ${ext.extname}`);
      });
    } else {
      console.log('⚠️  No required extensions found - we will install them');
    }
    
    // Check existing tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('\n📋 Existing Tables:');
    if (tables.rows.length > 0) {
      tables.rows.forEach(table => {
        console.log(`- ${table.table_name}`);
      });
    } else {
      console.log('No existing tables found - database is empty and ready for setup');
    }
    
    client.release();
    console.log('\n🎉 Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the test
testSupabaseConnection()
  .then(() => {
    console.log('\n✨ Ready to proceed with database setup!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });