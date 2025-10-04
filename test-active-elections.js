const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testActiveElections() {
  console.log('🔗 Using connection string for database config');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    console.log('🔍 Testing getActiveElections query...\n');
    
    // This is the query from getActiveElections in enhanced-database.ts
    const activeElectionsQuery = await pool.query(`
      SELECT 
        e.*,
        'VoteGuard System' as org_name,
        COUNT(DISTINCT c.contest_id) as contest_count,
        COUNT(DISTINCT candidates.candidate_id) as candidate_count,
        0 as voter_count
      FROM elections e
      LEFT JOIN contests c ON e.election_id = c.election_id
      LEFT JOIN candidates ON c.contest_id = candidates.contest_id
      WHERE e.status = 'Active'
      GROUP BY e.election_id
      ORDER BY e.start_date DESC
    `);
    
    console.log(`📊 getActiveElections returned ${activeElectionsQuery.rows.length} elections`);
    
    if (activeElectionsQuery.rows.length > 0) {
      console.log('\n📋 Active elections found:');
      activeElectionsQuery.rows.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.election_name} (Status: ${e.status})`);
      });
    } else {
      console.log('❌ No active elections found with status = "Active"');
    }
    
    // Double check what Active elections exist
    const simpleActiveCheck = await pool.query(`
      SELECT election_id, election_name, status 
      FROM elections 
      WHERE status = 'Active'
    `);
    
    console.log(`\n✅ Simple Active check: ${simpleActiveCheck.rows.length} elections`);
    simpleActiveCheck.rows.forEach(e => {
      console.log(`   ├── ${e.election_name} (ID: ${e.election_id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

testActiveElections();