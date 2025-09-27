const fs = require('fs');
const path = require('path');

async function testAdminUsersAPI() {
  try {
    console.log('Testing Admin Users API...');
    
    // First, test login to get auth cookie
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'admin123'
      })
    });

    console.log('Login response status:', loginResponse.status);
    
    if (!loginResponse.ok) {
      const loginError = await loginResponse.text();
      console.error('Login failed:', loginError);
      return;
    }

    // Get the cookie from the response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    console.log('Auth cookie:', setCookieHeader);

    // Now test the admin users API
    const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': setCookieHeader || ''
      }
    });

    console.log('Admin users API response status:', usersResponse.status);
    
    if (usersResponse.ok) {
      const usersData = await usersResponse.json();
      console.log('Success! Users data:', JSON.stringify(usersData, null, 2));
    } else {
      const errorText = await usersResponse.text();
      console.error('API Error:', errorText);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testAdminUsersAPI();