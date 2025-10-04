const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

async function testDashboardDirectly() {
  try {
    console.log('🔓 Testing login...\n');
    
    // Login request
    const loginOptions = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    const loginData = JSON.stringify({
      email: 'jane.user@example.com',
      password: 'password123'
    });
    
    const loginResponse = await makeRequest(loginOptions, loginData);
    console.log('Login Status:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      console.log('❌ Login failed');
      console.log('Response:', loginResponse.data);
      return;
    }
    
    console.log('✅ Login successful');
    
    // Extract auth token from set-cookie header
    const setCookieHeader = loginResponse.headers['set-cookie'];
    if (!setCookieHeader) {
      console.log('❌ No cookies set');
      return;
    }
    
    const authTokenMatch = setCookieHeader.find(cookie => cookie.includes('auth-token'));
    if (!authTokenMatch) {
      console.log('❌ No auth-token found');
      return;
    }
    
    const authToken = authTokenMatch.split('auth-token=')[1].split(';')[0];
    console.log('Auth token extracted:', !!authToken);
    
    // Dashboard request
    console.log('\n📊 Testing dashboard API...');
    
    const dashboardOptions = {
      hostname: 'localhost',
      port: 8000,
      path: '/api/dashboard',
      method: 'GET',
      headers: {
        'Cookie': `auth-token=${authToken}`
      }
    };
    
    const dashboardResponse = await makeRequest(dashboardOptions);
    console.log('Dashboard Status:', dashboardResponse.status);
    
    if (dashboardResponse.status !== 200) {
      console.log('❌ Dashboard failed');
      console.log('Response:', dashboardResponse.data);
      return;
    }
    
    console.log('✅ Dashboard API successful');
    
    const data = dashboardResponse.data;
    console.log('\n📈 Dashboard Stats:');
    console.log('├── Total Elections:', data.stats?.elections?.total);
    console.log('├── Active Elections:', data.stats?.elections?.active);
    console.log('├── Completed Elections:', data.stats?.elections?.completed);
    console.log('├── Draft Elections:', data.stats?.elections?.draft);
    console.log('└── User Role:', data.user?.role);
    
    console.log('\n🗳️  Elections List:');
    if (data.elections && data.elections.length > 0) {
      data.elections.forEach((e, i) => {
        console.log(`   ${i + 1}. ${e.name} (Status: ${e.status})`);
      });
    } else {
      console.log('   ❌ No elections in response');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testDashboardDirectly();