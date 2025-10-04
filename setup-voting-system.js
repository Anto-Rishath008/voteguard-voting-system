const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createEligibleVotersTable() {
  console.log('🏗️  Creating eligible_voters table and related functionality...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false
  });
  
  try {
    // Create eligible_voters table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS eligible_voters (
        id SERIAL PRIMARY KEY,
        election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        added_by UUID REFERENCES users(user_id),
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) DEFAULT 'eligible' CHECK (status IN ('eligible', 'voted', 'disabled')),
        UNIQUE(election_id, user_id)
      );
    `);
    console.log('✅ Created eligible_voters table');
    
    // Create index for better performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_eligible_voters_election 
      ON eligible_voters(election_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_eligible_voters_user 
      ON eligible_voters(user_id);
    `);
    console.log('✅ Created indexes for eligible_voters table');
    
    // Add some sample eligible voters for testing
    // First, get an active election
    const activeElection = await pool.query(`
      SELECT election_id FROM elections WHERE status = 'Active' LIMIT 1
    `);
    
    if (activeElection.rows.length > 0) {
      const electionId = activeElection.rows[0].election_id;
      
      // Get some voters (users with Voter role)
      const voters = await pool.query(`
        SELECT u.user_id 
        FROM users u 
        JOIN user_roles ur ON u.user_id = ur.user_id 
        WHERE ur.role_name = 'Voter' 
        LIMIT 5
      `);
      
      // Add them as eligible voters
      for (const voter of voters.rows) {
        await pool.query(`
          INSERT INTO eligible_voters (election_id, user_id, status)
          VALUES ($1, $2, 'eligible')
          ON CONFLICT (election_id, user_id) DO NOTHING
        `, [electionId, voter.user_id]);
      }
      
      console.log(`✅ Added ${voters.rows.length} eligible voters to election ${electionId}`);
    }
    
    // Add some sample contests and candidates
    if (activeElection.rows.length > 0) {
      const electionId = activeElection.rows[0].election_id;
      
      // Create a contest
      const contestResult = await pool.query(`
        INSERT INTO contests (election_id, contest_title, contest_type)
        VALUES ($1, 'President Election', 'ChooseOne')
        RETURNING contest_id
      `, [electionId]);
      
      const contestId = contestResult.rows[0].contest_id;
      console.log(`✅ Created contest: President Election (ID: ${contestId})`);
      
      // Add candidates
      const candidates = [
        { name: 'John Smith', party: 'Progressive Party' },
        { name: 'Sarah Johnson', party: 'Unity Party' },
        { name: 'Michael Brown', party: 'Independent' }
      ];
      
      for (const candidate of candidates) {
        await pool.query(`
          INSERT INTO candidates (contest_id, election_id, candidate_name, party)
          VALUES ($1, $2, $3, $4)
        `, [contestId, electionId, candidate.name, candidate.party]);
      }
      
      console.log(`✅ Added ${candidates.length} candidates to the contest`);
      
      // Create another contest
      const contest2Result = await pool.query(`
        INSERT INTO contests (election_id, contest_title, contest_type)
        VALUES ($1, 'Vice President Election', 'ChooseOne')
        RETURNING contest_id
      `, [electionId]);
      
      const contest2Id = contest2Result.rows[0].contest_id;
      console.log(`✅ Created contest: Vice President Election (ID: ${contest2Id})`);
      
      // Add VP candidates
      const vpCandidates = [
        { name: 'Lisa Davis', party: 'Progressive Party' },
        { name: 'Robert Wilson', party: 'Unity Party' }
      ];
      
      for (const candidate of vpCandidates) {
        await pool.query(`
          INSERT INTO candidates (contest_id, election_id, candidate_name, party)
          VALUES ($1, $2, $3, $4)
        `, [contest2Id, electionId, candidate.name, candidate.party]);
      }
      
      console.log(`✅ Added ${vpCandidates.length} VP candidates to the contest`);
    }
    
    // Display current status
    console.log('\n📊 Current voting system status:');
    
    const electionCount = await pool.query('SELECT COUNT(*) as count FROM elections');
    console.log(`   ├── Elections: ${electionCount.rows[0].count}`);
    
    const contestCount = await pool.query('SELECT COUNT(*) as count FROM contests');
    console.log(`   ├── Contests: ${contestCount.rows[0].count}`);
    
    const candidateCount = await pool.query('SELECT COUNT(*) as count FROM candidates');
    console.log(`   ├── Candidates: ${candidateCount.rows[0].count}`);
    
    const eligibleCount = await pool.query('SELECT COUNT(*) as count FROM eligible_voters');
    console.log(`   └── Eligible voters: ${eligibleCount.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

createEligibleVotersTable();