const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testAzureConnectionWithTimeouts() {
    console.log('🔍 Testing Azure PostgreSQL Connection with Enhanced Parameters...\n');
    
    const connectionString = process.env.DATABASE_URL;
    console.log('Connection String (masked):', connectionString.replace(/:[^:]+@/, ':****@'));
    
    // Parse connection string to show parameters
    const url = new URL(connectionString);
    const params = Object.fromEntries(url.searchParams.entries());
    console.log('Connection Parameters:', params);
    
    const client = new Client({
        connectionString: connectionString,
        // Additional client-level configurations
        connectionTimeoutMillis: 60000,    // 60 seconds
        idleTimeoutMillis: 30000,          // 30 seconds
        query_timeout: 60000,              // 60 seconds
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
    });

    try {
        console.log('\n⏱️  Attempting connection with extended timeouts...');
        const startTime = Date.now();
        
        await client.connect();
        const connectTime = Date.now() - startTime;
        console.log(`✅ Connected successfully in ${connectTime}ms`);

        // Test basic query
        console.log('\n🔍 Testing basic query...');
        const result = await client.query('SELECT version(), current_database(), current_user, inet_server_addr(), inet_server_port()');
        console.log('Database Info:', {
            version: result.rows[0].version,
            database: result.rows[0].current_database,
            user: result.rows[0].current_user,
            server_ip: result.rows[0].inet_server_addr,
            server_port: result.rows[0].inet_server_port
        });

        // Test connection settings
        console.log('\n🔍 Testing connection settings...');
        const settingsResult = await client.query(`
            SELECT 
                name, 
                setting, 
                unit, 
                context 
            FROM pg_settings 
            WHERE name IN ('ssl', 'log_connections', 'max_connections', 'shared_preload_libraries')
            ORDER BY name;
        `);
        
        console.log('Database Settings:');
        settingsResult.rows.forEach(row => {
            console.log(`  ${row.name}: ${row.setting}${row.unit || ''} (${row.context})`);
        });

        // Test table creation (to verify write permissions)
        console.log('\n🔍 Testing write permissions...');
        try {
            await client.query('CREATE TABLE IF NOT EXISTS connection_test (id SERIAL PRIMARY KEY, test_time TIMESTAMP DEFAULT NOW())');
            await client.query('INSERT INTO connection_test DEFAULT VALUES');
            const countResult = await client.query('SELECT COUNT(*) FROM connection_test');
            console.log(`✅ Write test successful - ${countResult.rows[0].count} records in test table`);
            await client.query('DROP TABLE IF EXISTS connection_test');
            console.log('✅ Cleanup successful');
        } catch (writeError) {
            console.log('⚠️  Write test failed:', writeError.message);
        }

        console.log('\n🎉 All connection tests passed!');
        
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        
        if (error.code) {
            console.error('Error Code:', error.code);
        }
        
        // Provide specific troubleshooting based on error
        if (error.message.includes('timeout')) {
            console.error('\n💡 Timeout Issues:');
            console.error('- Azure Burstable tier may have connection limitations');
            console.error('- Consider upgrading to General Purpose tier');
            console.error('- Network latency might be high');
        }
        
        if (error.message.includes('SSL') || error.message.includes('ssl')) {
            console.error('\n💡 SSL Issues:');
            console.error('- Azure PostgreSQL requires SSL connections');
            console.error('- Try sslmode=require parameter');
            console.error('- Check if SSL certificates are properly configured');
        }
        
        if (error.message.includes('authentication')) {
            console.error('\n💡 Authentication Issues:');
            console.error('- Verify username and password are correct');
            console.error('- Check if user has proper permissions');
            console.error('- Ensure firewall allows your IP');
        }
        
    } finally {
        try {
            await client.end();
            console.log('\n🔌 Connection closed');
        } catch (closeError) {
            console.error('Error closing connection:', closeError.message);
        }
    }
}

// Run the test
if (require.main === module) {
    testAzureConnectionWithTimeouts()
        .then(() => {
            console.log('\n✨ Test completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testAzureConnectionWithTimeouts };