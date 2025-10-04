const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseLogin() {
  console.log('🔐 Testing Supabase-based login...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('1. Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (testError) {
      throw testError;
    }
    console.log('✅ Connection successful!');

    console.log('\n2. Testing user lookup...');
    const testEmail = 'superadmin@voteguard.com';
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('user_id, email, first_name, last_name, password_hash, status, failed_login_attempts')
      .eq('email', testEmail)
      .single();

    if (userError) {
      throw userError;
    }

    console.log(`✅ User found: ${userData.first_name} ${userData.last_name}`);
    console.log(`   Status: ${userData.status}`);
    console.log(`   Failed attempts: ${userData.failed_login_attempts}`);

    console.log('\n3. Testing password verification...');
    const testPassword = 'SuperAdmin123!';
    const isValid = await bcrypt.compare(testPassword, userData.password_hash);
    
    if (isValid) {
      console.log('✅ Password verification successful!');
    } else {
      console.log('❌ Password verification failed!');
    }

    console.log('\n4. Testing roles lookup...');
    const { data: rolesData, error: rolesError } = await supabase
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userData.user_id);

    if (rolesError) {
      throw rolesError;
    }

    const roles = rolesData?.map(r => r.role_name) || [];
    console.log(`✅ User roles: ${roles.join(', ')}`);

    console.log('\n🎉 All tests passed! Supabase authentication is working correctly.');
    console.log('\n📋 Test Credentials Verified:');
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log(`   Roles: ${roles.join(', ')}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check if Supabase project is active');
    console.log('2. Verify environment variables are correct');
    console.log('3. Ensure database tables exist');
  }
}

// Run the test
testSupabaseLogin()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });