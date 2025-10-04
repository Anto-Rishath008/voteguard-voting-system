const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

// Create database connection
function getDatabase() {
  return new Pool({
    connectionString: process.env.AZURE_SQL_CONNECTION_STRING,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

async function testVotingSystem() {
  console.log('🧪 Testing Voting System...\n');
  
  try {
    const db = getDatabase();
    
    // 1. Check eligible voters
    console.log('1️⃣ Checking eligible voters...');
    const eligibleResult = await db.query(`
      SELECT 
        ev.user_id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        ev.election_id,
        e.election_name,
        ev.status
      FROM eligible_voters ev
      JOIN users u ON ev.user_id = u.user_id
      JOIN elections e ON ev.election_id = e.election_id
      ORDER BY ev.election_id, u.username
    `);
    
    console.log(`   Found ${eligibleResult.rows.length} eligible voter assignments:`);
    eligibleResult.rows.forEach(row => {
      console.log(`   - ${row.first_name} ${row.last_name} (@${row.username}) → ${row.election_name} [${row.status}]`);
    });
    
    // 2. Check contests and candidates
    console.log('\n2️⃣ Checking contests and candidates...');
    const contestsResult = await db.query(`
      SELECT 
        c.contest_id,
        c.contest_name,
        c.election_id,
        e.election_name,
        COUNT(ca.candidate_id) as candidate_count
      FROM contests c
      JOIN elections e ON c.election_id = e.election_id
      LEFT JOIN candidates ca ON c.contest_id = ca.contest_id
      GROUP BY c.contest_id, c.contest_name, c.election_id, e.election_name
      ORDER BY c.election_id, c.contest_id
    `);
    
    console.log(`   Found ${contestsResult.rows.length} contests:`);
    contestsResult.rows.forEach(row => {
      console.log(`   - ${row.contest_name} (Election: ${row.election_name}) - ${row.candidate_count} candidates`);
    });
    
    // 3. Check candidates
    console.log('\n3️⃣ Checking candidates...');
    const candidatesResult = await db.query(`
      SELECT 
        ca.candidate_id,
        ca.candidate_name,
        ca.party,
        c.contest_name,
        e.election_name
      FROM candidates ca
      JOIN contests c ON ca.contest_id = c.contest_id
      JOIN elections e ON c.election_id = e.election_id
      ORDER BY e.election_id, c.contest_id, ca.candidate_name
    `);
    
    console.log(`   Found ${candidatesResult.rows.length} candidates:`);
    candidatesResult.rows.forEach(row => {
      console.log(`   - ${row.candidate_name} (${row.party}) - ${row.contest_name} in ${row.election_name}`);
    });
    
    // 4. Check existing votes
    console.log('\n4️⃣ Checking existing votes...');
    const votesResult = await db.query(`
      SELECT 
        v.vote_id,
        u.username,
        e.election_name,
        c.contest_name,
        ca.candidate_name,
        v.vote_timestamp
      FROM votes v
      JOIN users u ON v.voter_id = u.user_id
      JOIN elections e ON v.election_id = e.election_id
      JOIN contests co ON v.contest_id = co.contest_id
      JOIN candidates ca ON v.candidate_id = ca.candidate_id
      ORDER BY v.vote_timestamp DESC
    `);
    
    console.log(`   Found ${votesResult.rows.length} votes cast:`);
    votesResult.rows.forEach(row => {
      console.log(`   - ${row.username} voted for ${row.candidate_name} in ${row.contest_name} (${row.election_name}) at ${row.vote_timestamp}`);
    });
    
    // 5. Test API endpoints
    console.log('\n5️⃣ API endpoints ready for testing:');
    console.log('   - GET /api/elections/[id]/contests - Get contests and candidates for an election');
    console.log('   - POST /api/elections/[id]/vote - Submit votes for an election');
    console.log('   - GET /api/admin/elections/[id]/voters - Get eligible voters for an election');
    console.log('   - POST /api/admin/elections/[id]/voters - Add eligible voters');
    console.log('   - DELETE /api/admin/elections/[id]/voters - Remove eligible voters');
    
    // 6. Voting test instructions
    console.log('\n6️⃣ To test voting:');
    console.log('   1. Login as a user who is eligible to vote');
    console.log('   2. Go to the dashboard - you should see active elections with "Cast Your Vote" buttons');
    console.log('   3. Click "Cast Your Vote" to go to /elections/[id]/vote');
    console.log('   4. Select candidates and submit your vote');
    console.log('   5. Check that the vote is recorded and the user cannot vote again');
    
    console.log('\n✅ Voting system setup complete!\n');
    
    // 7. Show sample users for testing
    console.log('7️⃣ Sample users for testing:');
    const usersResult = await db.query(`
      SELECT user_id, username, email, role 
      FROM users 
      WHERE role IN ('Voter', 'Admin', 'SuperAdmin')
      ORDER BY role, username
      LIMIT 10
    `);
    
    usersResult.rows.forEach(row => {
      console.log(`   - ${row.username} (${row.email}) - Role: ${row.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing voting system:', error);
  }
}

testVotingSystem();