const { Pool } = require('pg');
require('dotenv').config();

async function testAzureConnection() {
  console.log('🔍 Testing Azure PostgreSQL Connection (Fixed Format)...\n');
  
  const connectionString = process.env.DATABASE_URL;
  console.log('🔗 Using connection string from .env.local');
  console.log('📝 Format: postgresql://voteguardadmin:n@pASSWORD@002@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=disable\n');
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: false,
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
  });

  try {
    console.log('📡 Attempting connection...');
    const client = await pool.connect();
    
    console.log('✅ Connection successful!');
    
    const result = await client.query('SELECT NOW() as time, version() as version');
    console.log('⏰ Current time:', result.rows[0].time);
    console.log('🐘 PostgreSQL version:', result.rows[0].version.split(' ')[0]);
    
    // Test a simple query
    const testQuery = await client.query('SELECT 1 as test');
    console.log('🧪 Test query result:', testQuery.rows[0].test);
    
    client.release();
    console.log('\n🎉 Azure PostgreSQL connection is working perfectly!');
    
  } catch (error) {
    console.log('❌ Connection failed:', error.message);
    console.log('🔍 Error code:', error.code);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 This means:');
      console.log('   - Database server might not be fully started');
      console.log('   - Firewall is blocking the connection');
      console.log('   - Check Azure portal firewall rules');
    }
    
    if (error.message.includes('password')) {
      console.log('\n💡 Password issue - trying different formats...');
    }
  } finally {
    await pool.end();
  }
}

testAzureConnection();