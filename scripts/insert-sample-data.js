/**
 * Insert Sample Election Data Script
 * Creates elections, contests, and candidates for testing
 */

const { Pool } = require('pg');

// Database connection using connection string
const pool = new Pool({
  connectionString: process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL
});

async function insertSampleData() {
  console.log('🗳️  Creating Sample Elections...');
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    console.log('✅ Database connected successfully');
    
    // Get SuperAdmin user ID
    const adminResult = await pool.query(
      "SELECT user_id FROM users WHERE email = 'admin@voteguard.system'"
    );
    
    if (adminResult.rows.length === 0) {
      console.error('❌ SuperAdmin user not found');
      return;
    }
    
    const adminUserId = adminResult.rows[0].user_id;
    console.log('✅ Found admin user:', adminUserId);
    
    // 1. CREATE ELECTION 1: 2024 General Election
    console.log('\n📊 Creating Election 1: 2024 General Election');
    
    const election1Result = await pool.query(`
      INSERT INTO elections (election_name, description, start_date, end_date, status, creator)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING election_id
    `, [
      '2024 General Election',
      'General election for mayor and city council positions',
      new Date(Date.now() - 24 * 60 * 60 * 1000), // Started yesterday
      new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // Ends in 6 days
      'Active',
      adminUserId
    ]);
    
    const election1Id = election1Result.rows[0].election_id;
    console.log('✅ Created election:', election1Id);
    
    // Contest 1: Mayor
    const contest1Result = await pool.query(`
      INSERT INTO contests (election_id, contest_title, contest_type)
      VALUES ($1, $2, $3)
      RETURNING contest_id
    `, [election1Id, 'Mayor of the City', 'ChooseOne']);
    
    const contest1Id = contest1Result.rows[0].contest_id;
    
    // Mayor candidates
    await pool.query(`
      INSERT INTO candidates (contest_id, election_id, candidate_name, party_affiliation, candidate_description)
      VALUES 
        ($1, $2, 'John Smith', 'Democratic Party', 'Experienced leader with 15 years in public service'),
        ($1, $2, 'Jane Doe', 'Republican Party', 'Successful business owner focused on economic growth'),
        ($1, $2, 'Bob Wilson', 'Independent', 'Community organizer advocating for social justice')
    `, [contest1Id, election1Id]);
    
    console.log('✅ Created Mayor contest with 3 candidates');
    
    // Contest 2: City Council
    const contest2Result = await pool.query(`
      INSERT INTO contests (election_id, contest_title, contest_type)
      VALUES ($1, $2, $3)
      RETURNING contest_id
    `, [election1Id, 'City Council (Choose up to 3)', 'ChooseOne']);
    
    const contest2Id = contest2Result.rows[0].contest_id;
    
    // City Council candidates
    await pool.query(`
      INSERT INTO candidates (contest_id, election_id, candidate_name, party_affiliation, candidate_description)
      VALUES 
        ($1, $2, 'Alice Brown', 'Democratic Party', 'Environmental advocate and sustainability expert'),
        ($1, $2, 'Mike Jones', 'Republican Party', 'Former police chief with focus on public safety'),
        ($1, $2, 'Sarah Davis', 'Democratic Party', 'Public school teacher advocating for education'),
        ($1, $2, 'Tom White', 'Independent', 'Small business owner supporting local economy'),
        ($1, $2, 'Lisa Garcia', 'Green Party', 'Healthcare worker focused on community health')
    `, [contest2Id, election1Id]);
    
    console.log('✅ Created City Council contest with 5 candidates');
    
    // 2. CREATE ELECTION 2: School Board Election
    console.log('\n📊 Creating Election 2: School Board Election');
    
    const election2Result = await pool.query(`
      INSERT INTO elections (election_name, description, start_date, end_date, status, creator)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING election_id
    `, [
      'School Board Election 2024',
      'Election for school board members and education initiatives',
      new Date(Date.now() + 24 * 60 * 60 * 1000), // Starts tomorrow
      new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Ends in 10 days
      'Active',
      adminUserId
    ]);
    
    const election2Id = election2Result.rows[0].election_id;
    console.log('✅ Created election:', election2Id);
    
    // School Board contest
    const contest3Result = await pool.query(`
      INSERT INTO contests (election_id, contest_title, contest_type)
      VALUES ($1, $2, $3)
      RETURNING contest_id
    `, [election2Id, 'School Board Members', 'ChooseOne']);
    
    const contest3Id = contest3Result.rows[0].contest_id;
    
    // School Board candidates
    await pool.query(`
      INSERT INTO candidates (contest_id, election_id, candidate_name, party_affiliation, candidate_description)
      VALUES 
        ($1, $2, 'Dr. Maria Rodriguez', 'Nonpartisan', 'Former principal with 20 years in education'),
        ($1, $2, 'James Thompson', 'Nonpartisan', 'Parent advocate and PTA president'),
        ($1, $2, 'Karen Williams', 'Nonpartisan', 'Special education teacher and inclusion advocate')
    `, [contest3Id, election2Id]);
    
    console.log('✅ Created School Board contest with 3 candidates');
    
    // Education funding proposition
    const contest4Result = await pool.query(`
      INSERT INTO contests (election_id, contest_title, contest_type)
      VALUES ($1, $2, $3)
      RETURNING contest_id
    `, [election2Id, 'Proposition A: School Funding', 'YesNo']);
    
    const contest4Id = contest4Result.rows[0].contest_id;
    
    // Yes/No options for proposition
    await pool.query(`
      INSERT INTO candidates (contest_id, election_id, candidate_name, party_affiliation, candidate_description)
      VALUES 
        ($1, $2, 'Yes', 'Support', 'Support increased funding for schools through bond measure'),
        ($1, $2, 'No', 'Oppose', 'Oppose additional school funding bond measure')
    `, [contest4Id, election2Id]);
    
    console.log('✅ Created Proposition A with Yes/No options');
    
    // 3. CREATE ELECTION 3: Draft Election for Admin Testing
    console.log('\n📊 Creating Election 3: Draft Election for Testing');
    
    const election3Result = await pool.query(`
      INSERT INTO elections (election_name, description, start_date, end_date, status, creator)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING election_id
    `, [
      'Test Election (Draft)',
      'Draft election for admin testing and configuration',
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Starts in 30 days
      new Date(Date.now() + 37 * 24 * 60 * 60 * 1000), // Ends in 37 days
      'Draft',
      adminUserId
    ]);
    
    const election3Id = election3Result.rows[0].election_id;
    console.log('✅ Created draft election:', election3Id);
    
    console.log('\n🎉 SAMPLE DATA CREATION COMPLETE!');
    console.log('═══════════════════════════════════════');
    
    // Show summary
    const electionsCount = await pool.query('SELECT COUNT(*) FROM elections');
    const contestsCount = await pool.query('SELECT COUNT(*) FROM contests');
    const candidatesCount = await pool.query('SELECT COUNT(*) FROM candidates');
    
    console.log(`📊 Summary:`);
    console.log(`   Elections: ${electionsCount.rows[0].count}`);
    console.log(`   Contests: ${contestsCount.rows[0].count}`);
    console.log(`   Candidates: ${candidatesCount.rows[0].count}`);
    
    console.log('\n🚀 You can now test the voting system!');
    console.log('   1. Login as a voter (e.g., jane.user@example.com)');
    console.log('   2. Go to Dashboard to see available elections');
    console.log('   3. Click "Cast Vote" to participate in elections');
    console.log('   4. Login as admin to manage elections');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating sample data:', error);
    process.exit(1);
  }
}

// Run the script
insertSampleData();
