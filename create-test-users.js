const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Creating test users in Azure Database...');
    
    // Create test voter
    const voterPassword = await bcrypt.hash('password123', 12);
    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['test@voteguard.com', voterPassword, 'Test', 'User', 'voter', true]);
    
    // Create test admin
    const adminPassword = await bcrypt.hash('admin123', 12);
    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (email) DO NOTHING
    `, ['admin@voteguard.com', adminPassword, 'Admin', 'User', 'admin', true]);
    
    // Create sample election
    const orgResult = await pool.query('SELECT org_id FROM organizations LIMIT 1');
    if (orgResult.rows.length > 0) {
      const orgId = orgResult.rows[0].org_id;
      const adminResult = await pool.query('SELECT user_id FROM users WHERE role = $1 LIMIT 1', ['admin']);
      
      if (adminResult.rows.length > 0) {
        const adminId = adminResult.rows[0].user_id;
        
        await pool.query(`
          INSERT INTO elections (election_name, description, org_id, status, voting_start, voting_end, created_by)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [
          'Sample Student Council Election',
          'Vote for your student council representatives',
          orgId,
          'active',
          new Date(),
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          adminId
        ]);
        
        console.log('✅ Sample election created');
      }
    }
    
    console.log('✅ Test users created successfully:');
    console.log('   📧 test@voteguard.com / password123 (voter)');
    console.log('   📧 admin@voteguard.com / admin123 (admin)');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
  } finally {
    await pool.end();
  }
}

createTestUsers();