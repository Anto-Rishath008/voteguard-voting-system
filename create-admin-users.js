const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createAdminUsers() {
  console.log('👤 Creating admin users for VoteGuard system...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔧 Creating SuperAdmin user...');
    
    // Create SuperAdmin user using INSERT (since we can't use supabase.auth with service key directly)
    const { data: superAdminData, error: superAdminError } = await supabase
      .from('users')
      .insert([
        {
          email: 'superadmin@voteguard.com',
          first_name: 'Super',
          last_name: 'Admin',
          status: 'Active',
          email_verified: true,
          password_hash: 'temp_hash_change_immediately', // This should be changed immediately
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (superAdminError) {
      if (superAdminError.message.includes('unique')) {
        console.log('⚠️  SuperAdmin user already exists, skipping creation');
      } else {
        throw superAdminError;
      }
    } else {
      console.log('✅ SuperAdmin user created:', superAdminData.email);
      
      // Assign SuperAdmin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: superAdminData.user_id,
            role_name: 'SuperAdmin',
            created_at: new Date().toISOString()
          }
        ]);

      if (roleError && !roleError.message.includes('unique')) {
        throw roleError;
      }
      console.log('✅ SuperAdmin role assigned');
    }

    console.log('\n🔧 Creating Admin user...');
    
    // Create regular Admin user
    const { data: adminData, error: adminError } = await supabase
      .from('users')
      .insert([
        {
          email: 'admin@voteguard.com',
          first_name: 'Admin',
          last_name: 'User',
          status: 'Active',
          email_verified: true,
          password_hash: 'temp_hash_change_immediately', // This should be changed immediately
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (adminError) {
      if (adminError.message.includes('unique')) {
        console.log('⚠️  Admin user already exists, skipping creation');
      } else {
        throw adminError;
      }
    } else {
      console.log('✅ Admin user created:', adminData.email);
      
      // Assign Admin role
      const { error: adminRoleError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: adminData.user_id,
            role_name: 'Admin',
            created_at: new Date().toISOString()
          }
        ]);

      if (adminRoleError && !adminRoleError.message.includes('unique')) {
        throw adminRoleError;
      }
      console.log('✅ Admin role assigned');
    }

    console.log('\n🔧 Creating sample voter users...');
    
    // Create some sample voters
    const voters = [
      { email: 'john.doe@example.com', first_name: 'John', last_name: 'Doe' },
      { email: 'jane.smith@example.com', first_name: 'Jane', last_name: 'Smith' },
      { email: 'bob.johnson@example.com', first_name: 'Bob', last_name: 'Johnson' }
    ];

    for (const voter of voters) {
      const { data: voterData, error: voterError } = await supabase
        .from('users')
        .insert([
          {
            email: voter.email,
            first_name: voter.first_name,
            last_name: voter.last_name,
            status: 'Active',
            email_verified: true,
            password_hash: 'temp_hash_change_immediately',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (voterError) {
        if (voterError.message.includes('unique')) {
          console.log(`⚠️  Voter ${voter.email} already exists, skipping`);
        } else {
          console.error(`❌ Error creating voter ${voter.email}:`, voterError.message);
        }
      } else {
        console.log(`✅ Voter created: ${voterData.email}`);
        
        // Assign Voter role
        const { error: voterRoleError } = await supabase
          .from('user_roles')
          .insert([
            {
              user_id: voterData.user_id,
              role_name: 'Voter',
              created_at: new Date().toISOString()
            }
          ]);

        if (voterRoleError && !voterRoleError.message.includes('unique')) {
          console.error(`❌ Error assigning voter role to ${voter.email}:`, voterRoleError.message);
        }
      }
    }

    // Create a default jurisdiction
    console.log('\n🏛️  Creating default jurisdiction...');
    
    const { data: jurisdictionData, error: jurisdictionError } = await supabase
      .from('jurisdictions')
      .insert([
        {
          jurisdiction_name: 'Default City',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (jurisdictionError) {
      if (jurisdictionError.message.includes('unique')) {
        console.log('⚠️  Default jurisdiction already exists');
      } else {
        console.error('❌ Error creating jurisdiction:', jurisdictionError.message);
      }
    } else {
      console.log('✅ Default jurisdiction created:', jurisdictionData.jurisdiction_name);
    }

    console.log('\n🎉 Admin users and basic data created successfully!');
    console.log('\n📋 Summary:');
    console.log('- SuperAdmin: superadmin@voteguard.com');
    console.log('- Admin: admin@voteguard.com');
    console.log('- Sample Voters: john.doe@example.com, jane.smith@example.com, bob.johnson@example.com');
    console.log('\n⚠️  IMPORTANT: Change all temporary passwords immediately!');
    console.log('   The current password hashes are placeholders and need proper hashing.');

  } catch (error) {
    console.error('❌ Failed to create admin users:', error.message);
    throw error;
  }
}

// Run the admin creation
createAdminUsers()
  .then(() => {
    console.log('\n✨ Admin setup completed! Your VoteGuard system is ready to use.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Admin setup failed:', error.message);
    process.exit(1);
  });