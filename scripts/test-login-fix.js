#!/usr/bin/env node

// Test script to verify login functionality works with bcrypt fix
// Using Node.js built-in fetch (Node 18+)

async function testLogin() {
  console.log('🧪 Testing Login Authentication Fix');
  console.log('═══════════════════════════════════');

  const testAccounts = [
    {
      email: 'admin@voteguard.system',
      password: 'Admin123!',
      role: 'SuperAdmin',
      name: 'System Administrator'
    },
    {
      email: 'john.admin@example.com',
      password: 'Password123!',
      role: 'Admin',
      name: 'John Admin'
    },
    {
      email: 'jane.user@example.com',
      password: 'Password123!',
      role: 'Voter',
      name: 'Jane Smith'
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const account of testAccounts) {
    try {
      console.log(`\n🔐 Testing login for ${account.name} (${account.role})`);
      console.log(`   Email: ${account.email}`);
      
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: account.email,
          password: account.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.user) {
        console.log(`   ✅ SUCCESS: Login successful`);
        console.log(`   ✅ User ID: ${data.user.user_id}`);
        console.log(`   ✅ Name: ${data.user.first_name} ${data.user.last_name}`);
        console.log(`   ✅ Roles: ${data.user.roles?.map(r => r.role_name).join(', ') || 'None'}`);
        successCount++;
      } else {
        console.log(`   ❌ FAILED: ${data.error || 'Unknown error'}`);
        console.log(`   ❌ Status: ${response.status}`);
        failCount++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failCount++;
    }
  }

  console.log('\n📊 Test Results Summary');
  console.log('═══════════════════════');
  console.log(`✅ Successful logins: ${successCount}`);
  console.log(`❌ Failed logins: ${failCount}`);
  console.log(`📈 Success rate: ${Math.round((successCount / testAccounts.length) * 100)}%`);

  if (successCount === testAccounts.length) {
    console.log('\n🎉 ALL TESTS PASSED! Login authentication is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the API implementation.');
  }
}

testLogin().catch(console.error);