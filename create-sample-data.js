const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function createSampleElectionData() {
  console.log('🔍 Creating sample election data...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('📡 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    // Get admin user ID
    const adminUser = await client.query('SELECT user_id FROM users WHERE email = $1', ['admin@voteguard.com']);
    const adminUserId = adminUser.rows[0].user_id;
    
    console.log('🗳️  Creating sample elections...');
    
    // Create sample elections
    const elections = [
      {
        name: '2025 Student Council Election',
        description: 'Annual student council election for academic year 2025-2026',
        votingStart: '2025-10-15 09:00:00',
        votingEnd: '2025-10-20 17:00:00',
        status: 'Active'
      },
      {
        name: 'Department Representative Election',
        description: 'Election for department representatives to the academic board',
        votingStart: '2025-11-01 08:00:00', 
        votingEnd: '2025-11-05 18:00:00',
        status: 'Draft'
      },
      {
        name: 'Club Leadership Election 2024',
        description: 'Election for various club leadership positions',
        votingStart: '2024-09-01 09:00:00',
        votingEnd: '2024-09-07 17:00:00', 
        status: 'Completed'
      }
    ];
    
    let electionIds = [];
    
    for (const election of elections) {
      const electionResult = await client.query(`
        INSERT INTO elections (
          election_id, election_name, description, start_date, end_date, 
          status, creator, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW()
        ) RETURNING election_id
      `, [
        election.name,
        election.description, 
        election.votingStart,
        election.votingEnd,
        election.status,
        adminUserId
      ]);
      
      electionIds.push({
        id: electionResult.rows[0].election_id,
        name: election.name,
        status: election.status
      });
      
      console.log(`   ✅ Created: ${election.name} (${election.status})`);
    }
    
    console.log('\n🏆 Creating contests and candidates...');
    
    // Create contests for the active election
    const activeElection = electionIds.find(e => e.name === '2025 Student Council Election');
    
    const contests = [
      { name: 'President', description: 'ChooseOne' },
      { name: 'Vice President', description: 'ChooseOne' },
      { name: 'Secretary', description: 'ChooseOne' }
    ];
    
    for (const contest of contests) {
      const contestResult = await client.query(`
        INSERT INTO contests (
          election_id, contest_title, contest_type, 
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, NOW(), NOW()
        ) RETURNING contest_id
      `, [activeElection.id, contest.name, contest.description]);
      
      const contestId = contestResult.rows[0].contest_id;
      
      // Create candidates for each contest
      const candidateNames = {
        'President': ['Alice Johnson', 'Bob Smith', 'Carol Davis'],
        'Vice President': ['David Wilson', 'Eva Brown'], 
        'Secretary': ['Frank Miller', 'Grace Lee', 'Henry Taylor']
      };
      
      for (const candidateName of candidateNames[contest.name]) {
        await client.query(`
          INSERT INTO candidates (
            contest_id, election_id, candidate_name, party,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, NOW(), NOW()
          )
        `, [contestId, activeElection.id, candidateName, 'Independent']);
      }
      
      console.log(`   ✅ Created contest: ${contest.name} with ${candidateNames[contest.name].length} candidates`);
    }
    
    // Create some sample votes for completed election
    const completedElection = electionIds.find(e => e.status === 'Completed');
    if (completedElection) {
      console.log('\n🗳️  Adding sample votes to completed election...');
      
      // Get voter user
      const voterUser = await client.query('SELECT user_id FROM users WHERE email = $1', ['voter@voteguard.com']);
      const voterUserId = voterUser.rows[0].user_id;
      
      // Get a contest from completed election
      const completedContests = await client.query('SELECT contest_id FROM contests WHERE election_id = $1 LIMIT 1', [completedElection.id]);
      
      if (completedContests.rows.length > 0) {
        const contestId = completedContests.rows[0].contest_id;
        
        // Get a candidate
        const candidates = await client.query('SELECT candidate_id FROM candidates WHERE contest_id = $1 LIMIT 1', [contestId]);
        
        if (candidates.rows.length > 0) {
          const candidateId = candidates.rows[0].candidate_id;
          
          await client.query(`
            INSERT INTO votes (
              vote_id, user_id, contest_id, candidate_id, vote_timestamp
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, '2024-09-03 14:30:00'
            )
          `, [voterUserId, contestId, candidateId]);
          
          console.log('   ✅ Added sample vote');
        }
      }
    }
    
    // Verify data
    console.log('\n📊 Data summary:');
    const summary = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM elections) as total_elections,
        (SELECT COUNT(*) FROM contests) as total_contests,
        (SELECT COUNT(*) FROM candidates) as total_candidates,
        (SELECT COUNT(*) FROM votes) as total_votes
    `);
    
    const stats = summary.rows[0];
    console.log(`Elections: ${stats.total_elections}`);
    console.log(`Contests: ${stats.total_contests}`);
    console.log(`Candidates: ${stats.total_candidates}`);
    console.log(`Votes: ${stats.total_votes}`);
    
    console.log('\n🎉 Sample election data created successfully!');
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

createSampleElectionData();