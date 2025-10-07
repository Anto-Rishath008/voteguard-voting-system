-- VoteGuard System Database Schema
-- This file contains all the database tables and constraints

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET row_security = on;

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
    max_selections INTEGER DEFAULT 1 CHECK (max_selections > 0),
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

-- 11. ELIGIBLE VOTERS TABLE
CREATE TABLE IF NOT EXISTS eligible_voters (
    id SERIAL PRIMARY KEY,
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    added_by UUID REFERENCES users(user_id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'eligible' CHECK (status IN ('eligible', 'voted', 'disabled')),
    UNIQUE(election_id, user_id)
);

-- 12. AUDIT LOG TABLE
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

-- 12. SECURITY EVENTS TABLE
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

-- 13. ANOMALY DETECTIONS TABLE
CREATE TABLE IF NOT EXISTS anomaly_detections (
    anomaly_id SERIAL PRIMARY KEY,
    detection_type VARCHAR(50) CHECK (detection_type IN ('VotingPattern', 'LoginPattern', 'DataAccess')) NOT NULL,
    anomaly_score DECIMAL(5,4) CHECK (anomaly_score >= 0 AND anomaly_score <= 1),
    detection_data JSONB,
    status VARCHAR(20) CHECK (status IN ('NeedsReview', 'Resolved', 'FalsePositive')) DEFAULT 'NeedsReview',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    affected_user_id UUID REFERENCES users(user_id),
    affected_session_id UUID REFERENCES user_sessions(session_id)
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

-- INDEXES for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
-- Password authentication indexes
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
-- Eligible voters indexes
CREATE INDEX IF NOT EXISTS idx_eligible_voters_election ON eligible_voters(election_id);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_user ON eligible_voters(user_id);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_status ON eligible_voters(status);
-- Existing indexes
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON elections(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_votes_contest ON votes(contest_id, election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(vote_timestamp);
CREATE INDEX IF NOT EXISTS idx_votes_hash ON votes(vote_hash);
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);

-- TRIGGERS for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- PASSWORD AUTHENTICATION FUNCTIONS
-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

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

-- Apply triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON elections FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_contests_updated_at BEFORE UPDATE ON contests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_jurisdictions_updated_at BEFORE UPDATE ON jurisdictions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_system_configuration_updated_at BEFORE UPDATE ON system_configuration FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- AUDIT TRIGGER FUNCTION (Secure - excludes sensitive fields)
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id_var UUID;
    old_record JSONB;
    new_record JSONB;
BEGIN
    -- Get current user ID from session or use system user
    user_id_var := current_setting('app.current_user_id', true)::UUID;
    
    IF TG_OP = 'INSERT' THEN
        -- Remove sensitive fields from audit log
        new_record := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'users' THEN
            new_record := new_record - 'password_hash' - 'password_salt' - 'password_reset_token' - 'email_verification_token';
        END IF;
        
        INSERT INTO audit_log (user_id, operation_type, table_name, record_id, new_values, ip_address)
        VALUES (user_id_var, 'INSERT', TG_TABLE_NAME, COALESCE(NEW.user_id::TEXT, NEW.id::TEXT), new_record, current_setting('app.current_ip', true));
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        -- Remove sensitive fields from audit log
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
        IF TG_TABLE_NAME = 'users' THEN
            old_record := old_record - 'password_hash' - 'password_salt' - 'password_reset_token' - 'email_verification_token';
            new_record := new_record - 'password_hash' - 'password_salt' - 'password_reset_token' - 'email_verification_token';
        END IF;
        
        INSERT INTO audit_log (user_id, operation_type, table_name, record_id, old_values, new_values, ip_address)
        VALUES (user_id_var, 'UPDATE', TG_TABLE_NAME, COALESCE(NEW.user_id::TEXT, NEW.id::TEXT), old_record, new_record, current_setting('app.current_ip', true));
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        -- Remove sensitive fields from audit log
        old_record := to_jsonb(OLD);
        IF TG_TABLE_NAME = 'users' THEN
            old_record := old_record - 'password_hash' - 'password_salt' - 'password_reset_token' - 'email_verification_token';
        END IF;
        
        INSERT INTO audit_log (user_id, operation_type, table_name, record_id, old_values, ip_address)
        VALUES (user_id_var, 'DELETE', TG_TABLE_NAME, COALESCE(OLD.user_id::TEXT, OLD.id::TEXT), old_record, current_setting('app.current_ip', true));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;