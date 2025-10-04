const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
    console.log('🔍 Testing Supabase Database Connection...\n');
    
    const connectionString = process.env.DATABASE_URL;
    console.log('Connection String (masked):', connectionString.replace(/:[^:]+@/, ':****@'));
    
    const client = new Client({
        connectionString: connectionString,
        ssl: {
            rejectUnauthorized: false // Supabase requires this
        }
    });

    try {
        console.log('⏱️  Connecting to Supabase...');
        await client.connect();
        console.log('✅ Connected successfully!');

        // Test basic query
        console.log('\n🔍 Testing basic query...');
        const result = await client.query('SELECT version(), current_database(), current_user');
        console.log('Database Info:', {
            version: result.rows[0].version.split(' ')[0],
            database: result.rows[0].current_database,
            user: result.rows[0].current_user
        });

        // Check if our voting system tables exist
        console.log('\n🔍 Checking existing tables...');
        const tablesResult = await client.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        const tables = tablesResult.rows.map(row => row.table_name);
        console.log('Existing tables:', tables);

        // Check if we have the main voting system tables
        const requiredTables = ['users', 'elections', 'contests', 'candidates', 'votes', 'eligible_voters'];
        const missingTables = requiredTables.filter(table => !tables.includes(table));
        
        if (missingTables.length > 0) {
            console.log('⚠️  Missing tables:', missingTables);
            console.log('💡 You may need to run the database setup script');
        } else {
            console.log('✅ All required voting system tables found!');
        }

        console.log('\n🎉 Supabase connection test passed!');
        
    } catch (error) {
        console.error('\n❌ Connection failed:', error.message);
        console.error('Code:', error.code);
        
        if (error.message.includes('password')) {
            console.error('\n💡 Try updating the password in your Supabase dashboard');
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

if (require.main === module) {
    testSupabaseConnection();
}

module.exports = { testSupabaseConnection };