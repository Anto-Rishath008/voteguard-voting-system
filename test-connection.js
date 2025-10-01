const { Client } = require('pg');

// Simple connection test for Azure Database
async function testConnection() {
  console.log('🔧 Testing Azure Database Connection...');
  
  const client = new Client({
    host: 'voteguard-db-4824.postgres.database.azure.com',
    port: 5432,
    database: 'postgres',
    user: 'voteguardadmin',
    password: 'n@pASSWORD@002',
    ssl: {
      rejectUnauthorized: false,
      require: true
    },
    connectionTimeoutMillis: 10000,
    query_timeout: 10000,
    statement_timeout: 10000,
    idle_in_transaction_session_timeout: 10000
  });

  try {
    console.log('📡 Attempting connection...');
    await client.connect();
    console.log('✅ Connection successful!');
    
    // Test query
    const result = await client.query('SELECT version()');
    console.log('📊 Database version:', result.rows[0].version);
    
    // Check existing tables
    const tables = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log(`📋 Existing tables: ${tables.rows.length}`);
    
    await client.end();
    console.log('🎉 Connection test completed successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n🔍 Error details:');
    console.log('- Error code:', error.code);
    console.log('- Error address:', error.address);
    console.log('- Error port:', error.port);
    
    if (error.code === 'ETIMEDOUT') {
      console.log('\n🛠️ Timeout troubleshooting:');
      console.log('1. Check if Azure Database server is running');
      console.log('2. Verify your IP is in firewall rules');
      console.log('3. Try connecting from Azure Cloud Shell');
      console.log('4. Check if your network blocks port 5432');
    }
    
    await client.end().catch(() => {});
    return false;
  }
}

testConnection().catch(console.error);