const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkAuditLogTable() {
  console.log('🔍 Checking audit_log table schema...\n');
  
  const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false
  });

  try {
    const client = await pool.connect();
    
    // Check audit_log table schema
    console.log('📋 audit_log table columns:');
    const auditSchema = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'audit_log' 
      ORDER BY ordinal_position
    `);
    
    auditSchema.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });
    
    // Check if table has any data
    console.log('\n📊 Sample audit_log entries:');
    const sampleData = await client.query('SELECT * FROM audit_log LIMIT 3');
    console.log(`Found ${sampleData.rowCount} entries`);
    
    client.release();
    
  } catch (error) {
    console.error('❌ Error checking audit_log table:', error.message);
  } finally {
    await pool.end();
  }
}

checkAuditLogTable();