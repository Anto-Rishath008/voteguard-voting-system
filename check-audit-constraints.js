const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkAuditLogConstraints() {
  console.log('🔍 Checking audit_log table constraints...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check table constraints
    console.log('📋 audit_log table constraints:');
    const constraints = await client.query(`
      SELECT conname, contype, pg_get_constraintdef(c.oid) as definition
      FROM pg_constraint c
      JOIN pg_namespace n ON n.oid = c.connamespace
      JOIN pg_class t ON t.oid = c.conrelid
      WHERE n.nspname = 'public' AND t.relname = 'audit_log'
    `);
    
    constraints.rows.forEach(constraint => {
      console.log(`- ${constraint.conname} (${constraint.contype}): ${constraint.definition}`);
    });
    
    // Check existing operation types in use
    console.log('\n📊 Existing operation_type values in audit_log:');
    const existingTypes = await client.query(`
      SELECT DISTINCT operation_type, COUNT(*) as count
      FROM audit_log 
      GROUP BY operation_type 
      ORDER BY count DESC
    `);
    
    existingTypes.rows.forEach(type => {
      console.log(`- ${type.operation_type}: ${type.count} entries`);
    });
    
    // Check test user status
    console.log('\n👤 Test user status:');
    const testUser = await client.query('SELECT email, status, first_name, last_name FROM users WHERE email = $1', ['test@voteguard.com']);
    
    if (testUser.rows.length > 0) {
      const user = testUser.rows[0];
      console.log(`   Email: ${user.email}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
    } else {
      console.log('   ❌ Test user not found');
    }
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking constraints:', error.message);
  } finally {
    await pool.end();
  }
}

checkAuditLogConstraints();