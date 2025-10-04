const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testDatabaseConnection() {
  console.log('🔍 Testing Azure Database connection locally...\n');
  
  // Show environment variables (without passwords)
  console.log('Environment Variables:');
  console.log('- NODE_ENV:', process.env.NODE_ENV);
  console.log('- AZURE_DATABASE_URL:', process.env.AZURE_DATABASE_URL ? 'SET (hidden)' : 'NOT SET');
  console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'SET (hidden)' : 'NOT SET');
  console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'SET (hidden)' : 'NOT SET');
  console.log('');

  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ No database connection string found!');
    console.log('Please set AZURE_DATABASE_URL or DATABASE_URL in your .env.local file');
    console.log('Format: postgresql://username:password@hostname:port/database?sslmode=require');
    process.exit(1);
  }

  // Parse connection string to show connection details (without password)
  try {
    const url = new URL(connectionString);
    console.log('Connection Details:');
    console.log('- Host:', url.hostname);
    console.log('- Port:', url.port || 5432);
    console.log('- Database:', url.pathname.slice(1));
    console.log('- Username:', url.username);
    console.log('- SSL Mode:', url.searchParams.get('sslmode') || 'not specified');
    console.log('');
  } catch (error) {
    console.error('❌ Invalid connection string format:', error.message);
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔗 Connecting to Azure Database...');
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const result = await client.query('SELECT version(), current_database(), current_user, current_timestamp');
    console.log('\nDatabase Info:');
    console.log('- Version:', result.rows[0].version.split(' ')[0]);
    console.log('- Database:', result.rows[0].current_database);
    console.log('- User:', result.rows[0].current_user);
    console.log('- Timestamp:', result.rows[0].current_timestamp);
    
    // Check if users table exists
    const tablesResult = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('\n✅ Users table exists');
      
      // Count users
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log('- Total users:', userCount.rows[0].count);
      
      // Show first 5 users (without passwords)
      const users = await client.query(`
        SELECT user_id, email, first_name, last_name, is_active, created_at 
        FROM users 
        ORDER BY created_at DESC 
        LIMIT 5
      `);
      
      if (users.rows.length > 0) {
        console.log('\nExisting Users:');
        users.rows.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} (${user.first_name} ${user.last_name}) - Active: ${user.is_active}`);
        });
      } else {
        console.log('\n⚠️  No users found in database');
        console.log('You may need to create test users');
      }
    } else {
      console.log('\n❌ Users table does not exist');
      console.log('You may need to run database migrations');
    }
    
    client.release();
    console.log('\n🎉 Database test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Database connection failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\nTroubleshooting:');
      console.log('1. Check if your Azure Database is running');
      console.log('2. Verify the connection string is correct');
      console.log('3. Check firewall settings (Azure Database should allow your IP)');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\nTroubleshooting:');
      console.log('1. Check the hostname in your connection string');
      console.log('2. Ensure the Azure Database server name is correct');
    } else if (error.message.includes('password authentication failed')) {
      console.log('\nTroubleshooting:');
      console.log('1. Check your username and password');
      console.log('2. Verify Azure Database credentials');
    }
  } finally {
    await pool.end();
  }
}

testDatabaseConnection();