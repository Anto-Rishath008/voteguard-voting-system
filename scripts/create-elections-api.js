/**
 * Create Elections via API
 * This script logs in and creates elections through the API endpoints
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function createElectionsViaAPI() {
  console.log('🗳️  Creating Elections via API...');
  
  try {
    const baseUrl = 'http://localhost:3000';
    
    // Step 1: Login to get authentication cookie
    console.log('🔐 Logging in as SuperAdmin...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@voteguard.system',
        password: 'Admin123!'
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Extract cookies for subsequent requests
    const cookies = loginResponse.headers.get('set-cookie');
    const authCookie = cookies?.split(';')[0]; // Get the auth-token cookie
    
    // Step 2: Create Election 1
    console.log('\n📊 Creating Election 1: 2024 General Election');
    const election1Response = await fetch(`${baseUrl}/api/elections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie || ''
      },
      body: JSON.stringify({
        election_name: '2024 General Election',
        description: 'General election for mayor and city council positions',
        start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Active'
      })
    });
    
    if (election1Response.ok) {
      const election1Data = await election1Response.json();
      console.log('✅ Created election:', election1Data.election?.election_name);
    } else {
      console.log('❌ Failed to create election 1:', await election1Response.text());
    }
    
    // Step 3: Create Election 2
    console.log('\n📊 Creating Election 2: School Board Election');
    const election2Response = await fetch(`${baseUrl}/api/elections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authCookie || ''
      },
      body: JSON.stringify({
        election_name: 'School Board Election 2024',
        description: 'Election for school board members and education initiatives',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'Active'
      })
    });
    
    if (election2Response.ok) {
      const election2Data = await election2Response.json();
      console.log('✅ Created election:', election2Data.election?.election_name);
    } else {
      console.log('❌ Failed to create election 2:', await election2Response.text());
    }
    
    // Step 4: Check created elections
    console.log('\n📋 Checking created elections...');
    const electionsResponse = await fetch(`${baseUrl}/api/elections`, {
      method: 'GET',
      headers: {
        'Cookie': authCookie || ''
      }
    });
    
    if (electionsResponse.ok) {
      const electionsData = await electionsResponse.json();
      console.log('✅ Current elections:', electionsData.elections?.length || 0);
      electionsData.elections?.forEach((election, index) => {
        console.log(`   ${index + 1}. ${election.election_name} (${election.status})`);
      });
    } else {
      console.log('❌ Failed to fetch elections:', await electionsResponse.text());
    }
    
    console.log('\n🎉 Election creation completed!');
    console.log('🚀 You can now test voting at: http://localhost:3000/dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Install node-fetch if needed: npm install node-fetch
createElectionsViaAPI();