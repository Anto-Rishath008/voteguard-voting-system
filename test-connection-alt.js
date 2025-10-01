const { Client } = require('pg');

// Alternative connection test with different SSL settings
async function testConnectionAlternative() {
  console.log('🔧 Testing Azure Database Connection (Alternative)...');
  
  // Try different connection configurations
  const configs = [
    {
      name: 'Standard SSL',
      config: {
        host: 'voteguard-db-4824.postgres.database.azure.com',
        port: 5432,
        database: 'postgres',
        user: 'voteguardadmin',
        password: 'n@pASSWORD@002',
        ssl: { rejectUnauthorized: false }
      }
    },
    {
      name: 'Connection String',
      config: {
        connectionString: 'postgresql://voteguardadmin:n%40pASSWORD%40002@voteguard-db-4824.postgres.database.azure.com:5432/postgres?sslmode=require'
      }
    },
    {
      name: 'No SSL (test)',
      config: {
        host: 'voteguard-db-4824.postgres.database.azure.com',
        port: 5432,
        database: 'postgres',
        user: 'voteguardadmin',
        password: 'n@pASSWORD@002',
        ssl: false
      }
    }
  ];

  for (let i = 0; i < configs.length; i++) {
    const { name, config } = configs[i];
    console.log(`\n📋 Testing configuration ${i + 1}: ${name}`);
    
    const client = new Client(config);
    
    try {
      await client.connect();
      console.log('✅ Connection successful with', name);
      
      const result = await client.query('SELECT version()');
      console.log('📊 Database version:', result.rows[0].version);
      
      await client.end();
      console.log(`🎉 ${name} configuration works!`);
      return config;
      
    } catch (error) {
      console.log(`❌ ${name} failed:`, error.message);
      await client.end().catch(() => {});
    }
  }
  
  console.log('\n❌ All connection methods failed');
  return null;
}

testConnectionAlternative().catch(console.error);