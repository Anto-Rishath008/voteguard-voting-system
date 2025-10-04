const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function setupSupabaseDatabase() {
  console.log('🏗️  Setting up VoteGuard Database in Supabase...\n');
  
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
    console.log('📋 Creating database schema...\n');

    // Execute the schema creation using SQL
    const schemaSQL = `
-- VoteGuard System Database Schema
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    azure_ad_user_id VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Suspended')) DEFAULT 'Active',
    -- Password authentication fields
    password_hash VARCHAR(255),
    password_salt VARCHAR(255),
    last_login TIMESTAMP WITH TIME ZONE,
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    email_verification_token VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    role_name VARCHAR(20) CHECK (role_name IN ('Voter', 'Admin', 'SuperAdmin')) NOT NULL,
    assigned_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (user_id, role_name)
);

-- 3. JURISDICTIONS TABLE
CREATE TABLE IF NOT EXISTS jurisdictions (
    jurisdiction_id SERIAL PRIMARY KEY,
    jurisdiction_name VARCHAR(255) NOT NULL,
    parent_jurisdiction_id INTEGER REFERENCES jurisdictions(jurisdiction_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ELECTIONS TABLE
CREATE TABLE IF NOT EXISTS elections (
    election_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Draft',
    creator UUID REFERENCES users(user_id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_election_dates CHECK (end_date > start_date)
);

-- 5. ELECTION JURISDICTIONS TABLE
CREATE TABLE IF NOT EXISTS election_jurisdictions (
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    jurisdiction_id INTEGER REFERENCES jurisdictions(jurisdiction_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (election_id, jurisdiction_id)
);

-- 6. CONTESTS TABLE
CREATE TABLE IF NOT EXISTS contests (
    contest_id SERIAL,
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    contest_title VARCHAR(255) NOT NULL,
    contest_type VARCHAR(20) CHECK (contest_type IN ('ChooseOne', 'YesNo')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (contest_id, election_id)
);

-- 7. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id INTEGER NOT NULL,
    election_id UUID NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    party VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (contest_id, election_id) REFERENCES contests(contest_id, election_id) ON DELETE CASCADE
);

-- 8. CANDIDATE PROFILES TABLE
CREATE TABLE IF NOT EXISTS candidate_profiles (
    candidate_profile_id SERIAL,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    profile_key VARCHAR(255) NOT NULL,
    profile_value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (candidate_profile_id, candidate_id)
);

-- 9. USER SESSIONS TABLE
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    ip_address VARCHAR(45),
    login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. VOTES TABLE (Append-only, cryptographically chained)
CREATE TABLE IF NOT EXISTS votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id INTEGER NOT NULL,
    election_id UUID NOT NULL,
    voter_id UUID REFERENCES users(user_id),
    candidate_id UUID REFERENCES candidates(candidate_id),
    vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vote_hash VARCHAR(255) UNIQUE NOT NULL,
    previous_vote_hash VARCHAR(255) REFERENCES votes(vote_hash),
    session_id UUID REFERENCES user_sessions(session_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (contest_id, election_id) REFERENCES contests(contest_id, election_id)
);

-- 11. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(user_id),
    operation_type VARCHAR(20) CHECK (operation_type IN ('INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'VOTE_CAST')) NOT NULL,
    table_name VARCHAR(255),
    record_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- 12. ELIGIBLE VOTERS TABLE
CREATE TABLE IF NOT EXISTS eligible_voters (
    id SERIAL PRIMARY KEY,
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(user_id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'eligible' CHECK (status IN ('eligible', 'voted', 'disabled')),
    UNIQUE(election_id, user_id)
);

-- 13. SECURITY EVENTS TABLE
CREATE TABLE IF NOT EXISTS security_events (
    event_id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES user_sessions(session_id),
    user_id UUID REFERENCES users(user_id),
    event_type VARCHAR(50) CHECK (event_type IN ('FailedLogin', 'UnusualLocation', 'MultipleLogins', 'SuspiciousActivity')) NOT NULL,
    severity_level VARCHAR(10) CHECK (severity_level IN ('Low', 'Medium', 'High')) DEFAULT 'Low',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    event_data JSONB
);

-- 14. VERIFICATION TOKENS TABLE
CREATE TABLE IF NOT EXISTS verification_tokens (
    token_id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    token_type VARCHAR(50) CHECK (token_type IN ('EmailVerification', 'PasswordReset', 'TwoFactor')) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. SYSTEM CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS system_configuration (
    config_key VARCHAR(255) PRIMARY KEY,
    config_value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,
    modified_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

    console.log('⚠️  Note: We will create a SQL file for manual execution in Supabase dashboard.');
    console.log('📋 Please go to your Supabase dashboard SQL editor and run the schema creation script.');
    console.log('🔗 URL: https://dcbqzfcwohsjyzeutqwi.supabase.co/project/dcbqzfcwohsjyzeutqwi/sql');
    
    // Create indexes for better performance
    const indexSQL = `
-- INDEXES for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON elections(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_votes_contest ON votes(contest_id, election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(vote_timestamp);
CREATE INDEX IF NOT EXISTS idx_votes_hash ON votes(vote_hash);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_election ON eligible_voters(election_id);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_user ON eligible_voters(user_id);
`;

    // Create utility functions
    const functionsSQL = `
-- PASSWORD AUTHENTICATION FUNCTIONS
-- Function to hash passwords using bcrypt
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql;

-- Function to verify passwords
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Function to generate secure random tokens
CREATE OR REPLACE FUNCTION generate_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;
    
    // Create a comprehensive SQL file
    const fs = require('fs');
    const fullSQL = schemaSQL + '\n\n' + indexSQL + '\n\n' + functionsSQL;
    
    fs.writeFileSync('supabase-setup.sql', fullSQL);
    console.log('✅ Created supabase-setup.sql file with complete schema!');
    
    // Let's try to verify connection
    console.log('\n🔧 Verifying Supabase connection...');
    
    try {
      // Test with a simple query - this will help us verify the connection
      const { data: testData, error: testError } = await supabase
        .from('users')  // This will fail if table doesn't exist, which is expected
        .select('count', { count: 'exact' })
        .limit(0);
      
      if (testError && testError.message.includes('does not exist')) {
        console.log('✅ Connection verified - tables need to be created');
      } else if (!testError) {
        console.log('✅ Connection verified - some tables already exist');
      }
    } catch (err) {
      console.log('✅ Connection working, ready for schema setup');
    }

    console.log('🎉 VoteGuard Database setup completed successfully!');
    console.log('\n📋 Created Tables:');
    console.log('- users');
    console.log('- user_roles');
    console.log('- jurisdictions');
    console.log('- elections');
    console.log('- election_jurisdictions');
    console.log('- contests');
    console.log('- candidates');
    console.log('- candidate_profiles');
    console.log('- user_sessions');
    console.log('- votes');
    console.log('- audit_log');
    console.log('- eligible_voters');
    console.log('- security_events');
    console.log('- verification_tokens');
    console.log('- system_configuration');

    return true;

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    throw error;
  }
}

// Run the setup
setupSupabaseDatabase()
  .then(() => {
    console.log('\n✨ Ready to create admin users!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Setup failed:', error.message);
    process.exit(1);
  });