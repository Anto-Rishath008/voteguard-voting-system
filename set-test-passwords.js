const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

async function setTestPasswords() {
  console.log('🔐 Setting up test passwords for VoteGuard accounts...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Test credentials to set
  const testCredentials = [
    {
      email: 'superadmin@voteguard.com',
      password: 'SuperAdmin123!',
      role: 'SuperAdmin'
    },
    {
      email: 'admin@voteguard.com',
      password: 'Admin123!',
      role: 'Admin'
    },
    {
      email: 'john.doe@example.com',
      password: 'Voter123!',
      role: 'Voter'
    },
    {
      email: 'jane.smith@example.com',
      password: 'Voter123!',
      role: 'Voter'
    },
    {
      email: 'bob.johnson@example.com',
      password: 'Voter123!',
      role: 'Voter'
    }
  ];

  try {
    console.log('🔧 Updating password hashes...\n');

    for (const credential of testCredentials) {
      // Hash the password using bcrypt
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(credential.password, saltRounds);
      
      // Update the user's password hash
      const { data, error } = await supabase
        .from('users')
        .update({
          password_hash: hashedPassword,
          password_salt: null, // bcrypt includes salt in hash
          updated_at: new Date().toISOString()
        })
        .eq('email', credential.email)
        .select('email, first_name, last_name');

      if (error) {
        console.error(`❌ Error updating ${credential.email}:`, error.message);
      } else if (data && data.length > 0) {
        console.log(`✅ ${credential.email} (${credential.role}) - Password set`);
      } else {
        console.log(`⚠️  ${credential.email} - User not found`);
      }
    }

    console.log('\n🎉 Test passwords have been set successfully!');
    console.log('\n📋 LOGIN CREDENTIALS FOR TESTING:');
    console.log('==========================================');
    
    testCredentials.forEach(cred => {
      console.log(`\n${cred.role.toUpperCase()}:`);
      console.log(`  Email: ${cred.email}`);
      console.log(`  Password: ${cred.password}`);
    });

    console.log('\n==========================================');
    console.log('⚠️  SECURITY NOTE: These are TEST passwords only!');
    console.log('   Change them in production environments.');
    console.log('\n🌐 Access your app at: http://localhost:8000');

  } catch (error) {
    console.error('❌ Failed to set test passwords:', error.message);
    throw error;
  }
}

// Run the password setup
setTestPasswords()
  .then(() => {
    console.log('\n✨ Password setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Password setup failed:', error.message);
    process.exit(1);
  });