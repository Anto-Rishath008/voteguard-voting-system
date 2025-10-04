const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnections() {
  console.log('🔍 Testing different Supabase connection formats...\n');

  // Different connection string formats to try
  const connectionStrings = [
    // Current format
    process.env.DATABASE_URL,
    // Try with pooler on port 6543
    'postgresql://postgres.dcbqzfcwohsjyzeutqwi:@ctobeR$002@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
    // Try with pooler on port 5432
    'postgresql://postgres.dcbqzfcwohsjyzeutqwi:@ctobeR$002@aws-0-ap-south-1.pooler.supabase.com:5432/postgres',
    // Try with different region
    'postgresql://postgres.dcbqzfcwohsjyzeutqwi:@ctobeR$002@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
    // Try direct connection to different host
    'postgresql://postgres:@ctobeR$002@dcbqzfcwohsjyzeutqwi.supabase.co:5432/postgres'
  ];

  const labels = [
    'Current DATABASE_URL',
    'Pooler ap-south-1:6543',
    'Pooler ap-south-1:5432',
    'Pooler us-east-1:6543',
    'Direct connection'
  ];

  for (let i = 0; i < connectionStrings.length; i++) {
    const connectionString = connectionStrings[i];
    const label = labels[i];
    
    console.log(`🔗 Testing ${label}:`);
    console.log(`   ${connectionString}`);
    
    try {
      const pool = new Pool({
        connectionString,
        ssl: {
          rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000
      });

      const client = await pool.connect();
      const result = await client.query('SELECT version(), current_database()');
      
      console.log(`✅ SUCCESS! Connected to ${result.rows[0].current_database}`);
      console.log(`   PostgreSQL: ${result.rows[0].version.split(' ')[1]}`);
      
      client.release();
      await pool.end();
      
      console.log(`\n🎉 WORKING CONNECTION FOUND:`);
      console.log(`DATABASE_URL=${connectionString}\n`);
      
      return connectionString;
      
    } catch (error) {
      console.log(`❌ Failed: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('💥 None of the connection strings worked. Please check:');
  console.log('1. Your Supabase project is active');
  console.log('2. The password is correct');
  console.log('3. Your IP is allowed (if IP restrictions are enabled)');
}

// Run the test
testSupabaseConnections()
  .then((workingConnection) => {
    if (workingConnection) {
      console.log('✨ Test completed! Use the working connection above.');
    } else {
      console.log('⚠️  No working connection found. Check Supabase settings.');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  });