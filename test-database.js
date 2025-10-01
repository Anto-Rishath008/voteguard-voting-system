#!/usr/bin/env node

/**
 * Quick test to check if users exist in Supabase database
 */

const { createClient } = require('@supabase/supabase-js');

// Configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testDatabaseUsers() {
  console.log('🔍 Testing database connection and users...');
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log('❌ Missing environment variables:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set ✅' : 'Missing ❌');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set ✅' : 'Missing ❌');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Test connection with simple query
    console.log('🔌 Testing connection...');
    const { data, error: countError } = await supabase
      .from('users')
      .select('email')
      .limit(1);

    if (countError) {
      console.log('❌ Connection error:', countError.message);
      console.log('Error details:', countError);
      return;
    }

    console.log('✅ Connection successful!');
    console.log('📊 Total users in database:', count);

    // Check for test users
    console.log('👤 Checking for test users...');
    const { data: testUsers, error: usersError } = await supabase
      .from('users')
      .select('email, first_name, last_name, password_hash')
      .in('email', ['voter@voteguard.com', 'admin@voteguard.com', 'superadmin@voteguard.com']);

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
      return;
    }

    console.log('📋 Test users found:');
    testUsers.forEach(user => {
      console.log(`  - ${user.email}: ${user.first_name} ${user.last_name} (Password: ${user.password_hash ? 'Has hash ✅' : 'No password ❌'})`);
    });

    if (testUsers.length === 0) {
      console.log('⚠️  No test users found! Database migration may not have run.');
    }

    // Check user roles
    if (testUsers.length > 0) {
      console.log('🔑 Checking user roles...');
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', testUsers.map(u => u.user_id));

      if (rolesError) {
        console.log('❌ Error fetching roles:', rolesError.message);
      } else {
        console.log('📋 User roles:');
        roles.forEach(role => {
          const user = testUsers.find(u => u.user_id === role.user_id);
          console.log(`  - ${user?.email}: ${role.role}`);
        });
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testDatabaseUsers().then(() => {
  console.log('✅ Test completed!');
}).catch(error => {
  console.error('💥 Test script failed:', error);
});