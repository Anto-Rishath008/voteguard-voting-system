const fetch = require('node-fetch');

async function testLoginAPI() {
  console.log('🔍 Testing login API directly...\n');
  
  const loginData = {
    email: 'charlie.admin@example.com',
    password: 'password' // Common test password
  };
  
  try {
    console.log(`👤 Attempting login with: ${loginData.email}`);
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData)
    });
    
    console.log(`📊 Response status: ${response.status}`);
    
    const responseData = await response.json();
    console.log('📄 Response data:', responseData);
    
    if (response.ok) {
      console.log('✅ Login successful!');
    } else {
      console.log('❌ Login failed');
      
      // Try another common password
      const loginData2 = {
        email: 'charlie.admin@example.com',
        password: 'admin123'
      };
      
      console.log(`\n👤 Trying different password: admin123`);
      
      const response2 = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginData2)
      });
      
      console.log(`📊 Response status: ${response2.status}`);
      const responseData2 = await response2.json();
      console.log('📄 Response data:', responseData2);
    }
    
  } catch (error) {
    console.error('❌ Error testing login API:', error.message);
  }
}

testLoginAPI();