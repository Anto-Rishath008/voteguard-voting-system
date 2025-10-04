const { Pool } = require('pg');

async function testAzureConnection() {
  console.log('🔍 Testing Azure PostgreSQL Connection...\n');
  
  // Test with different connection string formats
  const connectionStrings = [
    // Format 1: URL encoded password
    'postgresql://voteguardadmin:n%40pASSWORD%40002@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=require',
    
    // Format 2: Direct password (no URL encoding)
    'postgresql://voteguardadmin:n@pASSWORD@002@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=require',
    
    // Format 3: Configuration object
    null // Will use config object
  ];
  
  for (let i = 0; i < connectionStrings.length; i++) {
    console.log(`\n🧪 Test ${i + 1}:`);
    
    let pool;
    try {
      if (connectionStrings[i]) {
        console.log('Using connection string format...');
        pool = new Pool({
          connectionString: connectionStrings[i],
          ssl: { rejectUnauthorized: false }
        });
      } else {
        console.log('Using configuration object...');
        pool = new Pool({
          host: 'voteguard-db-4824.postgres.database.azure.com',
          port: 5432,
          database: 'postgres',
          user: 'voteguardadmin',
          password: 'n@pASSWORD@002',
          ssl: { rejectUnauthorized: false }
        });
      }
      
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time, \'SUCCESS!\' as status');
      console.log('✅ SUCCESS:', result.rows[0].status);
      console.log('⏰ Time:', result.rows[0].time);
      client.release();
      await pool.end();
      
      console.log('🎉 Found working configuration! Using format', i + 1);
      break;
      
    } catch (error) {
      console.log('❌ FAILED:', error.message);
      if (pool) {
        try { await pool.end(); } catch (e) {}
      }
    }
  }
}

testAzureConnection();