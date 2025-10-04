const { getDatabase } = require('./src/lib/enhanced-database.ts');

async function testDashboardAPI() {
  try {
    console.log('🔌 Testing Dashboard API functionality...\n');
    
    const db = getDatabase();
    
    // Test connection
    console.log('1. Testing database connection...');
    const isConnected = await db.testConnection();
    console.log(`   Connection status: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
    
    if (!isConnected) {
      console.log('   Cannot proceed without database connection');
      return;
    }
    
    // Test getDashboardStats
    console.log('\n2. Testing getDashboardStats...');
    try {
      const dashboardStats = await db.getDashboardStats(1); // Using user ID 1
      console.log('   Dashboard Stats:');
      console.log('   ├── Users:', dashboardStats.users);
      console.log('   ├── Elections:', dashboardStats.elections);
      console.log('   ├── Votes:', dashboardStats.votes);
      console.log('   └── User Votes:', dashboardStats.userVotes);
    } catch (error) {
      console.log('   ❌ getDashboardStats failed:', error.message);
    }
    
    // Test getActiveElections
    console.log('\n3. Testing getActiveElections...');
    try {
      const activeElections = await db.getActiveElections();
      console.log(`   Found ${activeElections.length} active elections`);
      if (activeElections.length > 0) {
        console.log('   First election:', {
          id: activeElections[0].election_id,
          name: activeElections[0].election_name,
          status: activeElections[0].status
        });
      }
    } catch (error) {
      console.log('   ❌ getActiveElections failed:', error.message);
    }
    
    // Test direct election count
    console.log('\n4. Testing direct election count...');
    try {
      const result = await db.query('SELECT COUNT(*) as count FROM elections');
      console.log(`   Direct count from elections table: ${result.rows[0].count}`);
    } catch (error) {
      console.log('   ❌ Direct count failed:', error.message);
    }
    
    // Test getUserByEmail
    console.log('\n5. Testing getUserByEmail...');
    try {
      // Let's find a valid user first
      const usersResult = await db.query('SELECT email FROM users LIMIT 3');
      console.log('   Available users:', usersResult.rows.map(u => u.email));
      
      if (usersResult.rows.length > 0) {
        const testEmail = usersResult.rows[0].email;
        const userProfile = await db.getUserByEmail(testEmail);
        console.log('   User profile for', testEmail, ':', {
          user_id: userProfile?.user_id,
          email: userProfile?.email,
          role: userProfile?.role
        });
      }
    } catch (error) {
      console.log('   ❌ getUserByEmail failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Dashboard API test failed:', error);
  } finally {
    process.exit(0);
  }
}

testDashboardAPI();