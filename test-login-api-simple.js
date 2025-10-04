// Test login API using built-in fetch (Node.js 18+)
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
    
    const responseText = await response.text();
    console.log('📄 Response text:', responseText);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('📄 Parsed response:', responseData);
    } catch (e) {
      console.log('❌ Could not parse response as JSON');
    }
    
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
      const responseText2 = await response2.text();
      console.log('📄 Response text:', responseText2);
    }
    
  } catch (error) {
    console.error('❌ Error testing login API:', error.message);
  }
}

testLoginAPI();