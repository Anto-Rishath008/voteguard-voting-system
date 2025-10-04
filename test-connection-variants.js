const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testMultipleConnectionMethods() {
    console.log('🔍 Testing Multiple Azure PostgreSQL Connection Methods...\n');
    
    const baseUrl = 'postgresql://voteguardadmin:n%40pASSWORD%40002@voteguard-db-4824.postgres.database.azure.com:5432/postgres';
    
    const connectionVariants = [
        {
            name: 'SSL Required with Timeouts',
            url: `${baseUrl}?sslmode=require&connect_timeout=60&command_timeout=60&application_name=VoteGuard`
        },
        {
            name: 'SSL Prefer with Timeouts', 
            url: `${baseUrl}?sslmode=prefer&connect_timeout=60&command_timeout=60&application_name=VoteGuard`
        },
        {
            name: 'SSL Disable (if allowed)',
            url: `${baseUrl}?sslmode=disable&connect_timeout=60&command_timeout=60&application_name=VoteGuard`
        },
        {
            name: 'SSL Required without additional params',
            url: `${baseUrl}?sslmode=require`
        },
        {
            name: 'No SSL parameters',
            url: baseUrl
        }
    ];
    
    for (const variant of connectionVariants) {
        console.log(`\n📡 Trying: ${variant.name}`);
        console.log(`URL (masked): ${variant.url.replace(/:[^:]+@/, ':****@')}`);
        
        const client = new Client({
            connectionString: variant.url,
            connectionTimeoutMillis: 30000,  // Shorter timeout for testing
        });
        
        try {
            const startTime = Date.now();
            await client.connect();
            const connectTime = Date.now() - startTime;
            
            console.log(`✅ SUCCESS! Connected in ${connectTime}ms`);
            
            // Quick test query
            const result = await client.query('SELECT current_database(), version()');
            console.log(`Database: ${result.rows[0].current_database}`);
            console.log(`Version: ${result.rows[0].version.split(' ')[0]}`);
            
            await client.end();
            console.log(`🎉 ${variant.name} works! Use this configuration.`);
            break;
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            if (error.code) {
                console.log(`   Code: ${error.code}`);
            }
            
            try {
                await client.end();
            } catch (closeError) {
                // Ignore close errors
            }
        }
    }
    
    console.log('\n🔍 Connection troubleshooting complete.');
    console.log('\nIf all methods failed, the issue might be:');
    console.log('1. Azure Database is stopped/paused');
    console.log('2. Firewall blocking connection');
    console.log('3. Network connectivity issues');
    console.log('4. Database server resource limitations (Burstable tier)');
    console.log('5. Incorrect credentials or database name');
}

// Test Azure connectivity at network level
async function testNetworkConnectivity() {
    console.log('\n🌐 Testing Network Connectivity to Azure Database...\n');
    
    const net = require('net');
    const host = 'voteguard-db-4824.postgres.database.azure.com';
    const port = 5432;
    
    return new Promise((resolve) => {
        const socket = new net.Socket();
        const timeout = 15000; // 15 seconds
        
        socket.setTimeout(timeout);
        
        socket.on('connect', () => {
            console.log(`✅ Network connection to ${host}:${port} successful`);
            socket.destroy();
            resolve(true);
        });
        
        socket.on('timeout', () => {
            console.log(`⏰ Network connection to ${host}:${port} timed out after ${timeout}ms`);
            socket.destroy();
            resolve(false);
        });
        
        socket.on('error', (error) => {
            console.log(`❌ Network connection to ${host}:${port} failed: ${error.message}`);
            resolve(false);
        });
        
        console.log(`🔌 Attempting network connection to ${host}:${port}...`);
        socket.connect(port, host);
    });
}

// Run all tests
async function runAllTests() {
    try {
        await testNetworkConnectivity();
        await testMultipleConnectionMethods();
    } catch (error) {
        console.error('Test suite failed:', error);
    }
}

if (require.main === module) {
    runAllTests();
}

module.exports = { testMultipleConnectionMethods, testNetworkConnectivity };