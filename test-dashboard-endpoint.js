const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardAPI() {
  try {
    // First let's get a valid auth token by logging in
    console.log('🔓 Attempting to get auth token...\n');
    
    const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'jane.user@example.com',
        password: 'password123'
      })
    });
    
    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResponse.status, loginResponse.statusText);
      return;
    }
    
    const loginData = await loginResponse.json();
    console.log('✅ Login successful');
    
    // Extract auth token from response
    const authToken = loginResponse.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1];
    console.log('Auth token present:', !!authToken);
    
    if (!authToken) {
      console.log('❌ No auth token received');
      return;
    }
    
    // Now test the dashboard API with the auth token
    console.log('\n📊 Testing dashboard API...');
    
    const dashboardResponse = await fetch('http://localhost:8000/api/dashboard', {
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${authToken}`,
      }
    });
    
    if (!dashboardResponse.ok) {
      console.log('❌ Dashboard API failed:', dashboardResponse.status, dashboardResponse.statusText);
      const errorText = await dashboardResponse.text();
      console.log('Error response:', errorText);
      return;
    }
    
    const dashboardData = await dashboardResponse.json();
    console.log('✅ Dashboard API successful');
    console.log('\n📈 Dashboard Stats:');
    console.log('├── Total Elections:', dashboardData.stats?.elections?.total || 'undefined');
    console.log('├── Active Elections:', dashboardData.stats?.elections?.active || 'undefined');
    console.log('├── Completed Elections:', dashboardData.stats?.elections?.completed || 'undefined');
    console.log('└── User Role:', dashboardData.user?.role || 'undefined');
    
    console.log('\n🗳️  Elections List:');
    if (dashboardData.elections && dashboardData.elections.length > 0) {
      dashboardData.elections.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.name} (Status: ${e.status})`);
      });
    } else {
      console.log('   ❌ No elections in response');
    }
    
    // Show the full response structure for debugging
    console.log('\n🔍 Full Response Structure:');
    console.log(JSON.stringify(dashboardData, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardAPI();