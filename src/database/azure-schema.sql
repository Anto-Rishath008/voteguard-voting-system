-- VoteGuard System Database Schema - Azure PostgreSQL Compatible
-- This file contains all the database tables and constraints for Azure

-- Use gen_random_uuid() instead of uuid_generate_v4() for Azure compatibility

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
    election_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_title VARCHAR(255) NOT NULL,
    election_description TEXT,
    jurisdiction_id INTEGER REFERENCES jurisdictions(jurisdiction_id),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) CHECK (status IN ('Draft', 'Active', 'Completed', 'Cancelled')) DEFAULT 'Draft',
    election_type VARCHAR(50) CHECK (election_type IN ('General', 'Primary', 'Special', 'Local')) DEFAULT 'General',
    voting_method VARCHAR(20) CHECK (voting_method IN ('Online', 'Paper', 'Hybrid')) DEFAULT 'Online',
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT valid_election_dates CHECK (end_date > start_date)
);

-- 5. CONTESTS TABLE
CREATE TABLE IF NOT EXISTS contests (
    contest_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    contest_title VARCHAR(255) NOT NULL,
    contest_description TEXT,
    contest_type VARCHAR(20) CHECK (contest_type IN ('Single', 'Multiple', 'Ranked')) DEFAULT 'Single',
    max_selections INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT positive_max_selections CHECK (max_selections > 0)
);

-- 6. CANDIDATES TABLE
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contest_id UUID REFERENCES contests(contest_id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    candidate_party VARCHAR(100),
    candidate_description TEXT,
    display_order INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. VOTER REGISTRATIONS TABLE
CREATE TABLE IF NOT EXISTS voter_registrations (
    registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_eligible BOOLEAN DEFAULT true,
    registration_status VARCHAR(20) CHECK (registration_status IN ('Registered', 'Pending', 'Denied')) DEFAULT 'Registered',
    UNIQUE(user_id, election_id)
);

-- 8. VOTES TABLE
CREATE TABLE IF NOT EXISTS votes (
    vote_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voter_id UUID REFERENCES users(user_id),
    election_id UUID REFERENCES elections(election_id),
    contest_id UUID REFERENCES contests(contest_id),
    candidate_id UUID REFERENCES candidates(candidate_id),
    vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    vote_hash VARCHAR(255) NOT NULL,
    is_valid BOOLEAN DEFAULT true,
    ballot_sequence INTEGER,
    UNIQUE(voter_id, contest_id)
);

-- 9. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    action_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(50),
    record_id VARCHAR(255),
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(255)
);

-- 10. SYSTEM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS system_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    setting_description TEXT,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_name ON user_roles(role_name);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON elections(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_contests_election_id ON contests(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_contest_id ON candidates(contest_id);
CREATE INDEX IF NOT EXISTS idx_voter_registrations_user_election ON voter_registrations(user_id, election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter_election ON votes(voter_id, election_id);
CREATE INDEX IF NOT EXISTS idx_votes_contest ON votes(contest_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, setting_description, is_public) VALUES
('app_name', 'VoteGuard System', 'Application name', true),
('app_version', '1.0.0', 'Application version', true),
('max_login_attempts', '5', 'Maximum failed login attempts before account lockout', false),
('session_timeout', '60', 'Session timeout in minutes', false),
('enable_audit_logging', 'true', 'Enable comprehensive audit logging', false)
ON CONFLICT (setting_key) DO NOTHING;

-- Create a function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jurisdictions_updated_at BEFORE UPDATE ON jurisdictions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON elections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON contests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions (for application user)
-- These will be handled by the application connection user