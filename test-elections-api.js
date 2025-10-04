/**
 * Test script to check elections API endpoints
 * This will help diagnose why elections are showing as 0 despite having data in database
 */

require('dotenv').config({ path: '.env.local' });

async function testElectionsAPI() {
  console.log('🔍 Testing Elections API Endpoints');
  console.log('================================================================================');

  try {
    // First check database directly
    console.log('\n📊 DATABASE CHECK:');
    console.log('--------------------------------------------------------------------------------');
    
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    const electionsCount = await pool.query('SELECT COUNT(*) as count FROM elections');
    console.log(`Total elections in database: ${electionsCount.rows[0].count}`);

    const sampleElections = await pool.query('SELECT election_id, election_name, status FROM elections LIMIT 3');
    console.log('Sample elections:');
    console.table(sampleElections.rows);

    // Test the API without authentication (to see basic error)
    console.log('\n🔌 API ENDPOINT TESTS:');
    console.log('--------------------------------------------------------------------------------');
    
    console.log('Testing /api/elections endpoint (no auth):');
    try {
      const response = await fetch('http://localhost:8000/api/elections');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('API Error:', error.message);
    }

    console.log('\nTesting /api/admin/elections endpoint (no auth):');
    try {
      const response = await fetch('http://localhost:8000/api/admin/elections');
      console.log('Status:', response.status);
      console.log('Content-Type:', response.headers.get('content-type'));
      
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('API Error:', error.message);
    }

    // Test with a mock JWT to see if authentication is the issue
    console.log('\n🔑 JWT AUTHENTICATION TEST:');
    console.log('--------------------------------------------------------------------------------');
    
    // Create a simple JWT token for testing (this won't be valid but will show the error)
    const testJWT = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MzQ1Njc4OTB9.test';
    
    try {
      const response = await fetch('http://localhost:8000/api/elections', {
        headers: {
          'Authorization': testJWT,
          'Content-Type': 'application/json'
        }
      });
      console.log('Status with JWT:', response.status);
      const data = await response.json();
      console.log('Response with JWT:', JSON.stringify(data, null, 2));
    } catch (error) {
      console.log('JWT API Error:', error.message);
    }

    await pool.end();

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testElectionsAPI().catch(console.error);