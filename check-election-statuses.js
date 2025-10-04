const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkElectionStatuses() {
  console.log('🔗 Using connection string for database config');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    console.log('🔍 Checking election statuses...\n');
    
    // Check actual status values
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM elections 
      GROUP BY status 
      ORDER BY count DESC
    `);
    
    console.log('📊 Status distribution:');
    statusResult.rows.forEach(row => {
      console.log(`   ├── ${row.status}: ${row.count} elections`);
    });
    
    // Check all elections
    const allElections = await pool.query(`
      SELECT election_name, status, start_date, end_date 
      FROM elections 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('\n📋 Recent elections:');
    allElections.rows.forEach(e => {
      console.log(`   ├── ${e.election_name} - Status: ${e.status}`);
    });
    
    // Test the problematic query from getDashboardStats
    const problematicQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_elections,
        COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_elections,
        COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_elections
      FROM elections
    `);
    
    console.log('\n⚠️  getDashboardStats query results:');
    console.log('   ├── Total Elections:', problematicQuery.rows[0].total_elections);
    console.log('   ├── Active Elections:', problematicQuery.rows[0].active_elections);
    console.log('   └── Completed Elections:', problematicQuery.rows[0].completed_elections);
    
    // Test fixed query
    const fixedQuery = await pool.query(`
      SELECT 
        COUNT(*) as total_elections,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_elections,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_elections,
        COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled_elections
      FROM elections
    `);
    
    console.log('\n✅ Fixed query results:');
    console.log('   ├── Total Elections:', fixedQuery.rows[0].total_elections);
    console.log('   ├── Active Elections:', fixedQuery.rows[0].active_elections);
    console.log('   ├── Completed Elections:', fixedQuery.rows[0].completed_elections);
    console.log('   └── Scheduled Elections:', fixedQuery.rows[0].scheduled_elections);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkElectionStatuses();