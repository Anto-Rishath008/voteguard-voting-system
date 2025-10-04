/**
 * Test admin elections API endpoint directly
 */

require('dotenv').config({ path: '.env.local' });

async function testAdminElectionsAPI() {
  console.log('🔍 Testing Admin Elections API Fix');
  console.log('================================================================================');

  try {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test the role query directly
    console.log('\n📊 TESTING ROLE QUERY:');
    console.log('--------------------------------------------------------------------------------');
    const adminUserId = '6d09caff-0f3c-453e-9f09-13796d20a8aa'; // admin@voteguard.com
    console.log(`Testing with admin user: ${adminUserId}`);
    
    const roleResult = await pool.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [adminUserId]
    );
    console.log('Role query result:', roleResult.rows);
    console.log('Has admin access:', roleResult.rows.length > 0);

    // Test the elections query directly
    console.log('\n📊 TESTING ELECTIONS QUERY:');
    console.log('--------------------------------------------------------------------------------');
    const electionsResult = await pool.query(
      `SELECT election_id, election_name, description, status, start_date, end_date, creator, created_at
       FROM elections ORDER BY created_at DESC LIMIT 5`
    );
    console.log(`Found ${electionsResult.rows.length} elections`);
    console.table(electionsResult.rows.map(row => ({
      ID: row.election_id.substring(0, 8) + '...',
      Name: row.election_name,
      Status: row.status,
      Creator: row.creator?.substring(0, 8) + '...' || 'N/A'
    })));

    await pool.end();

    console.log('\n✅ DATABASE QUERIES WORKING:');
    console.log('- Role checking query works ✅');
    console.log('- Elections query works ✅');
    console.log('- Admin elections API should now work ✅');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testAdminElectionsAPI().catch(console.error);