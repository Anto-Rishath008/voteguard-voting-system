const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createAuditLogsTable() {
  try {
    console.log('🔗 Connecting to database...');
    
    const createTableQuery = `
      -- Create audit_logs table
      CREATE TABLE IF NOT EXISTS audit_logs (
          log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          table_name VARCHAR(100) NOT NULL,
          record_id UUID,
          action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, SELECT
          old_values JSONB,
          new_values JSONB,
          changed_fields TEXT[],
          user_id UUID REFERENCES users(user_id),
          session_id VARCHAR(255),
          ip_address INET,
          user_agent TEXT,
          timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resource_type VARCHAR(100),
          resource_id UUID,
          details JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Index for performance
          CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT', 'VOTE', 'ELECTION_CREATE', 'ELECTION_UPDATE'))
      );
      
      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON audit_logs(table_name, action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
    `;
    
    await pool.query(createTableQuery);
    console.log('✅ audit_logs table created successfully!');
    
    // Verify table exists
    const checkQuery = `SELECT table_name FROM information_schema.tables WHERE table_name = 'audit_logs'`;
    const result = await pool.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Table verification successful - audit_logs table exists');
    } else {
      console.log('❌ Table verification failed - audit_logs table not found');
    }
    
  } catch (error) {
    console.error('❌ Error creating audit_logs table:', error);
    console.error('Full error details:', error.message);
  } finally {
    await pool.end();
  }
}

createAuditLogsTable();