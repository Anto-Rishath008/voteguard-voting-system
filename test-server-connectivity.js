const http = require('http');

// Simple HTTP test to check server connectivity
function testServer() {
  const options = {
    hostname: 'localhost',
    port: 8000,
    path: '/',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log('✅ Server is reachable');
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      console.log('Response length:', data.length);
    });
  });

  req.on('error', (err) => {
    console.error('❌ Server connection failed:', err.message);
  });

  req.end();
}

console.log('🔍 Testing server connectivity...');
testServer();

// Also test if the environment is loaded correctly
setTimeout(() => {
  console.log('\n📋 Environment check:');
  console.log('NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('PORT from env:', process.env.PORT || 'undefined');
  console.log('DATABASE_URL present:', !!process.env.DATABASE_URL);
}, 1000);