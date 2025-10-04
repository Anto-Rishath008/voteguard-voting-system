const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function verifyDatabaseSetup() {
  console.log('🔍 Verifying VoteGuard database setup...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const requiredTables = [
    'users', 'user_roles', 'jurisdictions', 'elections', 
    'election_jurisdictions', 'contests', 'candidates', 
    'candidate_profiles', 'user_sessions', 'votes', 
    'audit_log', 'eligible_voters', 'security_events', 
    'verification_tokens', 'system_configuration'
  ];

  try {
    console.log('📋 Checking required tables...\n');
    
    for (const table of requiredTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`);
        } else {
          console.log(`✅ ${table}: Ready (${count || 0} records)`);
        }
      } catch (err) {
        console.log(`❌ ${table}: ${err.message}`);
      }
    }

    // Check for admin users
    console.log('\n👤 Checking admin users...\n');
    
    try {
      const { data: admins, error: adminError } = await supabase
        .from('users')
        .select(`
          email, 
          first_name, 
          last_name, 
          status,
          user_roles(role_name)
        `)
        .in('email', ['superadmin@voteguard.com', 'admin@voteguard.com']);

      if (adminError) {
        console.log('❌ Could not check admin users:', adminError.message);
      } else if (admins && admins.length > 0) {
        admins.forEach(admin => {
          const roles = admin.user_roles.map(r => r.role_name).join(', ');
          console.log(`✅ ${admin.email} (${roles})`);
        });
      } else {
        console.log('⚠️  No admin users found - run create-admin-users.js');
      }
    } catch (err) {
      console.log('⚠️  Admin users check pending - create tables first');
    }

    // Check jurisdictions
    console.log('\n🏛️  Checking jurisdictions...\n');
    
    try {
      const { data: jurisdictions, error: jurisdictionError } = await supabase
        .from('jurisdictions')
        .select('jurisdiction_id, jurisdiction_name')
        .limit(5);

      if (jurisdictionError) {
        console.log('❌ Could not check jurisdictions:', jurisdictionError.message);
      } else if (jurisdictions && jurisdictions.length > 0) {
        jurisdictions.forEach(jurisdiction => {
          console.log(`✅ ${jurisdiction.jurisdiction_name} (ID: ${jurisdiction.jurisdiction_id})`);
        });
      } else {
        console.log('⚠️  No jurisdictions found - run create-admin-users.js to create default');
      }
    } catch (err) {
      console.log('⚠️  Jurisdictions check pending - create tables first');
    }

    console.log('\n🎉 Database verification completed!');
    console.log('\n📋 Summary:');
    console.log('- If all tables show ✅, your database is ready');
    console.log('- If you see ❌, run the SQL schema in Supabase dashboard first');
    console.log('- After schema setup, run create-admin-users.js');

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    throw error;
  }
}

// Run verification
verifyDatabaseSetup()
  .then(() => {
    console.log('\n✨ Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error.message);
    process.exit(1);
  });