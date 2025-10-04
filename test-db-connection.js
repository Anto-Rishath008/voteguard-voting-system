const { Pool } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...\n');
  
  let pool;
  try {
    // Create connection pool
    pool = new Pool({
      connectionString: process.env.AZURE_SQL_CONNECTION_STRING,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    console.log('📡 Attempting connection...');
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    console.log('🔍 Testing query execution...');
    const result = await client.query('SELECT NOW() as current_time, version() as postgres_version');
    
    console.log('✅ Query execution successful!');
    console.log('⏰ Current time:', result.rows[0].current_time);
    console.log('🐘 PostgreSQL version:', result.rows[0].postgres_version.split(' ')[0]);
    
    // Test tables exist
    console.log('\n📋 Checking key tables...');
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'elections', 'contests', 'candidates', 'votes', 'eligible_voters')
      ORDER BY table_name
    `);
    
    console.log('📊 Found tables:', tablesResult.rows.map(r => r.table_name).join(', '));
    
    // Check some basic counts
    console.log('\n📈 Database statistics:');
    const counts = await Promise.all([
      client.query('SELECT COUNT(*) as count FROM users'),
      client.query('SELECT COUNT(*) as count FROM elections'),
      client.query('SELECT COUNT(*) as count FROM contests'),
      client.query('SELECT COUNT(*) as count FROM candidates'),
      client.query('SELECT COUNT(*) as count FROM votes'),
      client.query('SELECT COUNT(*) as count FROM eligible_voters')
    ]);
    
    console.log('👥 Users:', counts[0].rows[0].count);
    console.log('🗳️  Elections:', counts[1].rows[0].count);
    console.log('🏆 Contests:', counts[2].rows[0].count);
    console.log('👨‍💼 Candidates:', counts[3].rows[0].count);
    console.log('📝 Votes:', counts[4].rows[0].count);
    console.log('✅ Eligible Voters:', counts[5].rows[0].count);
    
    client.release();
    console.log('\n🎉 Database is fully accessible and functional!');
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('🔧 Error details:', error);
    
    if (error.message.includes('password')) {
      console.log('\n💡 Tip: Check your AZURE_SQL_CONNECTION_STRING in .env.local');
    }
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Tip: Check if the database server is running and accessible');
    }
    if (error.message.includes('timeout')) {
      console.log('\n💡 Tip: Check your network connection to Azure PostgreSQL');
    }
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

testDatabaseConnection();