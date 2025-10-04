require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function testAllFixes() {
  console.log('🔍 Testing all database fixes...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✅ Database connection successful');
    
    // Test 1: Dashboard stats query (should work now with correct column names)
    console.log('\n📊 Testing dashboard stats query...');
    try {
      // Get user counts
      const userStats = await client.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN (status IS NULL OR status != 'disabled') THEN 1 END) as active_users
        FROM users
      `);
      console.log(`   Users - Total: ${userStats.rows[0].total_users}, Active: ${userStats.rows[0].active_users}`);

      // Get election counts
      const electionStats = await client.query(`
        SELECT 
          COUNT(*) as total_elections,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_elections,
          COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_elections
        FROM elections
      `);
      console.log(`   Elections - Total: ${electionStats.rows[0].total_elections}, Active: ${electionStats.rows[0].active_elections}, Completed: ${electionStats.rows[0].completed_elections}`);

      // Get vote counts
      const voteStats = await client.query(`
        SELECT COUNT(*) as total_votes
        FROM votes
        WHERE DATE(vote_timestamp) = CURRENT_DATE
      `);
      console.log(`   Votes today: ${voteStats.rows[0].total_votes}`);
      
      console.log('   ✅ Dashboard stats query works!');
    } catch (error) {
      console.log(`   ❌ Dashboard stats failed: ${error.message}`);
    }

    // Test 2: Active elections query (should work now with correct column names)
    console.log('\n🗳️  Testing active elections query...');
    try {
      const activeElections = await client.query(`
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
      console.log(`   Found ${activeElections.rows.length} active elections`);
      activeElections.rows.forEach(election => {
        console.log(`     - ${election.election_name} (${election.contest_count} contests, ${election.candidate_count} candidates)`);
      });
      console.log('   ✅ Active elections query works!');
    } catch (error) {
      console.log(`   ❌ Active elections failed: ${error.message}`);
    }

    // Test 3: Voter history query (should work now with correct column names)
    console.log('\n📜 Testing voter history query...');
    try {
      // Get a sample voter ID
      const voterResult = await client.query(`
        SELECT u.user_id FROM users u 
        JOIN user_roles ur ON u.user_id = ur.user_id 
        WHERE ur.role_name = 'Voter' 
        LIMIT 1
      `);
      
      if (voterResult.rows.length > 0) {
        const voterId = voterResult.rows[0].user_id;
        const voterHistory = await client.query(`
          SELECT 
            v.*,
            e.election_name,
            e.description as election_description,
            c.contest_title
          FROM votes v
          JOIN contests c ON v.contest_id = c.contest_id
          JOIN elections e ON c.election_id = e.election_id
          WHERE v.voter_id = $1
          ORDER BY v.vote_timestamp DESC
        `, [voterId]);
        
        console.log(`   Found ${voterHistory.rows.length} votes for voter ${voterId}`);
        console.log('   ✅ Voter history query works!');
      } else {
        console.log('   ⚠️  No voters found to test with');
      }
    } catch (error) {
      console.log(`   ❌ Voter history failed: ${error.message}`);
    }

    // Test 4: User roles query
    console.log('\n👤 Testing user roles query...');
    try {
      const superAdminResult = await client.query(`
        SELECT role_name FROM user_roles WHERE user_id = (
          SELECT user_id FROM users WHERE email = 'superadmin@voteguard.com'
        )
      `);
      console.log(`   SuperAdmin roles: ${superAdminResult.rows.map(r => r.role_name).join(', ')}`);
      console.log('   ✅ User roles query works!');
    } catch (error) {
      console.log(`   ❌ User roles failed: ${error.message}`);
    }

    await client.end();
    console.log('\n🎉 All database query tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAllFixes();