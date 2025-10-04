const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🔄 Testing Supabase connection using API...\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment');
  }

  console.log('🔗 Connecting to:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Test connection by trying to get database version
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.log('Testing with simple query instead...');
      // Try a simple query if RPC doesn't work
      const { data: testData, error: testError } = await supabase
        .from('pg_stat_activity')
        .select('*')
        .limit(1);
        
      if (testError) {
        throw testError;
      }
    }
    
    console.log('✅ Successfully connected to Supabase!');
    
    // Check existing tables
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_type', 'BASE TABLE');
    
    if (tablesError) {
      console.log('⚠️  Could not query tables (this is normal for a new database)');
      console.log('Error:', tablesError.message);
    } else {
      console.log('\n📋 Existing Tables:');
      if (tables && tables.length > 0) {
        tables.forEach(table => {
          console.log(`- ${table.table_name}`);
        });
      } else {
        console.log('No existing tables found - database is empty and ready for setup');
      }
    }
    
    console.log('\n🎉 Supabase API connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    throw error;
  }
}

// Run the test
testSupabaseConnection()
  .then(() => {
    console.log('\n✨ Ready to proceed with database setup using Supabase API!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed:', error.message);
    process.exit(1);
  });