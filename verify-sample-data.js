require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

async function verifyData() {
  console.log('🔍 Verifying sample data...');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    
    // Check elections
    const elections = await client.query('SELECT election_name, status, start_date, end_date FROM elections ORDER BY created_at DESC LIMIT 5');
    console.log('\n📊 Recent Elections:');
    elections.rows.forEach(row => {
      console.log(`   📝 ${row.election_name} (${row.status}) - ${row.start_date} to ${row.end_date}`);
    });
    
    // Check contests
    const contests = await client.query(`
      SELECT c.contest_title, c.contest_type, e.election_name 
      FROM contests c 
      JOIN elections e ON c.election_id = e.election_id 
      ORDER BY c.created_at DESC LIMIT 5
    `);
    console.log('\n🏆 Recent Contests:');
    contests.rows.forEach(row => {
      console.log(`   🎯 ${row.contest_title} (${row.contest_type}) in "${row.election_name}"`);
    });
    
    // Check candidates
    const candidates = await client.query(`
      SELECT ca.candidate_name, ca.party, c.contest_title, e.election_name
      FROM candidates ca
      JOIN contests c ON ca.contest_id = c.contest_id
      JOIN elections e ON ca.election_id = e.election_id
      ORDER BY ca.created_at DESC LIMIT 8
    `);
    console.log('\n👥 Recent Candidates:');
    candidates.rows.forEach(row => {
      console.log(`   🗳️  ${row.candidate_name} (${row.party}) for ${row.contest_title} in "${row.election_name}"`);
    });
    
    // Check user roles
    const userRoles = await client.query(`
      SELECT u.email, ur.role_name 
      FROM users u 
      JOIN user_roles ur ON u.user_id = ur.user_id 
      WHERE ur.role_name IN ('Admin', 'SuperAdmin', 'Voter')
      ORDER BY ur.role_name, u.email
    `);
    console.log('\n👤 User Roles:');
    userRoles.rows.forEach(row => {
      console.log(`   ${row.role_name}: ${row.email}`);
    });
    
    await client.end();
    console.log('\n✅ Data verification complete!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

verifyData();