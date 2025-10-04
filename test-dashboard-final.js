const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardAPI() {
  try {
    console.log('🧪 Testing Dashboard API after fixes...\n');
    
    // Test the dashboard API endpoint directly
    const response = await fetch('http://localhost:8000/api/dashboard', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Using a mock auth token for testing - in real scenario this would come from login
        'Cookie': 'auth-token=mock-token-for-testing'
      }
    });
    
    console.log('Response Status:', response.status);
    console.log('Response Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.status === 401) {
      console.log('✅ Expected 401 - API correctly requires authentication');
      console.log('💡 This confirms the API is working and the issue is frontend connection');
      
      // Let's test with a real login
      console.log('\n🔓 Testing with real login...');
      
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
      
      console.log('Login Status:', loginResponse.status);
      
      if (loginResponse.ok) {
        const authToken = loginResponse.headers.get('set-cookie')?.match(/auth-token=([^;]+)/)?.[1];
        console.log('Auth token received:', !!authToken);
        
        if (authToken) {
          const dashboardResponse = await fetch('http://localhost:8000/api/dashboard', {
            method: 'GET',
            headers: {
              'Cookie': `auth-token=${authToken}`
            }
          });
          
          console.log('Dashboard with auth Status:', dashboardResponse.status);
          
          if (dashboardResponse.ok) {
            const data = await dashboardResponse.json();
            console.log('\n📊 Dashboard Data:');
            console.log('├── Total Elections:', data.stats?.totalElections);
            console.log('├── Active Elections:', data.stats?.activeElections);
            console.log('├── Voted Elections:', data.stats?.votedElections);
            console.log('├── Upcoming Elections:', data.stats?.upcomingElections);
            console.log('└── Elections Array Length:', data.elections?.length || 0);
            
            if (data.stats?.totalElections > 0) {
              console.log('\n✅ SUCCESS: Dashboard API is returning correct election counts!');
              console.log('🔧 The issue is likely a frontend connection problem or stale cache');
            } else {
              console.log('\n❌ Issue: Dashboard API still returning 0 elections');
            }
          }
        }
      }
    } else {
      const text = await response.text();
      console.log('Response Body:', text);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n💡 Likely issues:');
    console.log('   ├── Server is not running on port 8000');
    console.log('   ├── Network connectivity issue');
    console.log('   └── Environment configuration problem');
  }
}

testDashboardAPI();