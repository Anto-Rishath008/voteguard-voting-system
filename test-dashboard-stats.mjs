import { getDatabase } from './src/lib/enhanced-database.ts';

async function testDashboardStats() {
  try {
    console.log('🔌 Testing enhanced-database methods...\n');
    
    const db = getDatabase();
    
    // Test connection
    console.log('1. Testing database connection...');
    const isConnected = await db.testConnection();
    console.log(`   Connection status: ${isConnected ? '✅ Connected' : '❌ Failed'}`);
    
    if (!isConnected) {
      console.log('   Cannot proceed without database connection');
      return;
    }
    
    // Test getUserByEmail with a known user
    console.log('\n2. Testing getUserByEmail...');
    try {
      const userProfile = await db.getUserByEmail('jane.user@example.com');
      console.log('   User profile:', {
        user_id: userProfile?.user_id,
        email: userProfile?.email,
        role: userProfile?.role
      });
      
      if (userProfile && userProfile.user_id) {
        // Test getDashboardStats
        console.log('\n3. Testing getDashboardStats...');
        const dashboardStats = await db.getDashboardStats(userProfile.user_id);
        console.log('   Dashboard Stats:');
        console.log('   ├── Users:', dashboardStats.users);
        console.log('   ├── Elections:', dashboardStats.elections);  // This is what shows as 0!
        console.log('   ├── Votes:', dashboardStats.votes);
        console.log('   └── User Votes:', dashboardStats.userVotes);
      }
    } catch (error) {
      console.log('   ❌ getUserByEmail failed:', error.message);
    }
    
    // Test getActiveElections
    console.log('\n4. Testing getActiveElections...');
    try {
      const activeElections = await db.getActiveElections();
      console.log(`   Active elections count: ${activeElections.length}`);
      if (activeElections.length > 0) {
        console.log('   Sample election:', {
          id: activeElections[0].election_id,
          name: activeElections[0].election_name,
          status: activeElections[0].status
        });
      }
    } catch (error) {
      console.log('   ❌ getActiveElections failed:', error.message);
    }
    
    // Direct query for comparison
    console.log('\n5. Direct election count query...');
    try {
      const result = await db.query('SELECT COUNT(*) as count FROM elections');
      console.log(`   Direct count: ${result.rows[0].count} elections`);
      
      const allElections = await db.query('SELECT election_id, election_name, status FROM elections LIMIT 5');
      console.log('   Sample elections:');
      allElections.rows.forEach(e => {
        console.log(`   ├── ${e.election_name} (${e.status})`);
      });
    } catch (error) {
      console.log('   ❌ Direct query failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testDashboardStats();