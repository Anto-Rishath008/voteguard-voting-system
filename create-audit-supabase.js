// Create audit_logs table using environment configuration
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function createAuditLogsTable() {
  try {
    console.log('🔗 Connecting to Supabase...');
    
    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Create audit_logs table
        CREATE TABLE IF NOT EXISTS audit_logs (
            log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            table_name VARCHAR(100) NOT NULL,
            record_id UUID,
            action VARCHAR(20) NOT NULL,
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
            
            CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT', 'VOTE', 'ELECTION_CREATE', 'ELECTION_UPDATE'))
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_audit_logs_table_action ON audit_logs(table_name, action);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
        
        SELECT 'audit_logs table created successfully' as message;
      `
    });
    
    if (error) {
      console.error('❌ Error creating audit_logs table:', error);
    } else {
      console.log('✅ audit_logs table created successfully!');
      console.log('Result:', data);
    }
    
    // Verify table exists
    const { data: checkData, error: checkError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'audit_logs');
      
    if (checkError) {
      console.error('Error checking table:', checkError);
    } else if (checkData && checkData.length > 0) {
      console.log('✅ Table verification successful - audit_logs table exists');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

createAuditLogsTable();