-- =====================================================
-- VoteGuard Voting System - Enhanced Database Schema
-- Database Management System Academic Project
-- =====================================================
-- This schema demonstrates advanced database concepts:
-- - Proper normalization (3NF)
-- - Complex relationships and constraints
-- - Triggers for audit logging
-- - Stored procedures and functions
-- - Views for reporting
-- - Indexes for performance
-- - Advanced data types and constraints
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. CORE USER MANAGEMENT TABLES
-- =====================================================

-- Users table with enhanced fields
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    national_id VARCHAR(50) UNIQUE, -- For voter identification
    status user_status DEFAULT 'active',
    password_hash VARCHAR(255) NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    
    -- Constraints
    CONSTRAINT check_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_phone_format CHECK (phone_number ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT check_names_not_empty CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0),
    CONSTRAINT check_birth_date CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

-- Custom enum types for better data integrity
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'pending_verification');
CREATE TYPE user_role AS ENUM ('voter', 'admin', 'super_admin', 'election_officer');
CREATE TYPE election_status AS ENUM ('draft', 'published', 'active', 'completed', 'cancelled');
CREATE TYPE vote_status AS ENUM ('pending', 'cast', 'verified', 'invalid');

-- User roles with additional metadata
CREATE TABLE user_roles (
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role user_role NOT NULL,
    assigned_by UUID REFERENCES users(user_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    permissions JSONB DEFAULT '{}',
    
    UNIQUE(user_id, role)
);

-- =====================================================
-- 2. ELECTION MANAGEMENT TABLES
-- =====================================================

-- Organizations/Institutions table
CREATE TABLE organizations (
    org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_name VARCHAR(255) NOT NULL,
    org_code VARCHAR(50) UNIQUE NOT NULL,
    org_type VARCHAR(100), -- University, Company, Government, etc.
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id)
);

-- Elections with enhanced fields
CREATE TABLE elections (
    election_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_name VARCHAR(255) NOT NULL,
    election_code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    election_type VARCHAR(100), -- Presidential, Parliamentary, Student Council, etc.
    org_id UUID REFERENCES organizations(org_id),
    status election_status DEFAULT 'draft',
    
    -- Timing
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    voting_start TIMESTAMP WITH TIME ZONE NOT NULL,
    voting_end TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Settings
    max_votes_per_voter INTEGER DEFAULT 1,
    allow_abstention BOOLEAN DEFAULT TRUE,
    require_voter_verification BOOLEAN DEFAULT TRUE,
    results_public BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES users(user_id),
    
    -- Constraints
    CONSTRAINT check_election_dates CHECK (voting_start < voting_end),
    CONSTRAINT check_registration_dates CHECK (registration_start < registration_end),
    CONSTRAINT check_max_votes CHECK (max_votes_per_voter > 0)
);

-- Election positions/contests
CREATE TABLE contests (
    contest_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    contest_name VARCHAR(255) NOT NULL,
    contest_description TEXT,
    position_name VARCHAR(255) NOT NULL, -- President, Secretary, etc.
    max_candidates INTEGER DEFAULT 10,
    max_winners INTEGER DEFAULT 1,
    min_votes_required INTEGER DEFAULT 1,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    CONSTRAINT check_winners_vs_candidates CHECK (max_winners <= max_candidates),
    CONSTRAINT check_positive_values CHECK (max_candidates > 0 AND max_winners > 0)
);

-- Candidates
CREATE TABLE candidates (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contest_id UUID NOT NULL REFERENCES contests(contest_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id), -- Null if external candidate
    candidate_name VARCHAR(255) NOT NULL,
    candidate_bio TEXT,
    candidate_photo_url VARCHAR(500),
    party_affiliation VARCHAR(255),
    candidate_number INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    nomination_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nominated_by UUID REFERENCES users(user_id),
    
    UNIQUE(contest_id, candidate_number),
    UNIQUE(contest_id, user_id) -- One person can't run for same position twice
);

-- =====================================================
-- 3. VOTING SYSTEM TABLES
-- =====================================================

-- Voter eligibility
CREATE TABLE voter_eligibility (
    eligibility_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_eligible BOOLEAN DEFAULT TRUE,
    eligibility_reason TEXT,
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(election_id, user_id)
);

-- Vote records with enhanced security
CREATE TABLE votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(election_id),
    contest_id UUID NOT NULL REFERENCES contests(contest_id),
    voter_id UUID NOT NULL REFERENCES users(user_id),
    candidate_id UUID REFERENCES candidates(candidate_id), -- Null for abstention
    
    -- Security and integrity
    vote_hash VARCHAR(64) NOT NULL, -- Hash for vote verification
    encrypted_vote TEXT, -- Encrypted vote data
    status vote_status DEFAULT 'cast',
    
    -- Metadata
    cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    
    -- Verification
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(user_id),
    
    UNIQUE(election_id, contest_id, voter_id) -- One vote per contest per voter
);

-- =====================================================
-- 4. AUDIT AND LOGGING TABLES
-- =====================================================

-- Comprehensive audit log
CREATE TABLE audit_logs (
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
    
    -- Index for performance
    CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT', 'LOGIN', 'LOGOUT'))
);

-- Security events log
CREATE TABLE security_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES users(user_id),
    event_description TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'INFO', -- INFO, WARNING, ERROR, CRITICAL
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CHECK (severity IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL'))
);

-- Election events and timeline
CREATE TABLE election_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    election_id UUID NOT NULL REFERENCES elections(election_id),
    event_type VARCHAR(100) NOT NULL,
    event_description TEXT,
    event_data JSONB,
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 5. PERFORMANCE INDEXES
-- =====================================================

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_national_id ON users(national_id) WHERE national_id IS NOT NULL;

-- Election indexes
CREATE INDEX idx_elections_status ON elections(status);
CREATE INDEX idx_elections_dates ON elections(voting_start, voting_end);
CREATE INDEX idx_elections_org ON elections(org_id);

-- Vote indexes
CREATE INDEX idx_votes_election ON votes(election_id);
CREATE INDEX idx_votes_voter ON votes(voter_id);
CREATE INDEX idx_votes_candidate ON votes(candidate_id);
CREATE INDEX idx_votes_cast_at ON votes(cast_at);
CREATE INDEX idx_votes_status ON votes(status);

-- Audit indexes
CREATE INDEX idx_audit_logs_table_action ON audit_logs(table_name, action);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);

-- Security indexes
CREATE INDEX idx_security_events_type ON security_events(event_type);
CREATE INDEX idx_security_events_user ON security_events(user_id);
CREATE INDEX idx_security_events_severity ON security_events(severity);

-- =====================================================
-- 6. DATABASE FUNCTIONS AND STORED PROCEDURES
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to generate vote hash
CREATE OR REPLACE FUNCTION generate_vote_hash(
    p_election_id UUID,
    p_voter_id UUID,
    p_candidate_id UUID,
    p_timestamp TIMESTAMP WITH TIME ZONE
)
RETURNS VARCHAR(64) AS $$
BEGIN
    RETURN encode(
        digest(
            CONCAT(p_election_id, p_voter_id, COALESCE(p_candidate_id::text, 'abstain'), p_timestamp),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check voter eligibility
CREATE OR REPLACE FUNCTION check_voter_eligibility(
    p_user_id UUID,
    p_election_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_eligible BOOLEAN := FALSE;
    v_user_active BOOLEAN := FALSE;
    v_election_active BOOLEAN := FALSE;
BEGIN
    -- Check if user is active
    SELECT (status = 'active') INTO v_user_active
    FROM users WHERE user_id = p_user_id;
    
    -- Check if election is active
    SELECT (status = 'active' AND voting_start <= NOW() AND voting_end > NOW())
    INTO v_election_active
    FROM elections WHERE election_id = p_election_id;
    
    -- Check specific eligibility record
    SELECT COALESCE(is_eligible, TRUE) INTO v_eligible
    FROM voter_eligibility
    WHERE user_id = p_user_id AND election_id = p_election_id;
    
    RETURN v_user_active AND v_election_active AND v_eligible;
END;
$$ LANGUAGE plpgsql;

-- Function to get election results
CREATE OR REPLACE FUNCTION get_election_results(p_election_id UUID)
RETURNS TABLE (
    contest_name VARCHAR(255),
    candidate_name VARCHAR(255),
    vote_count BIGINT,
    percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH vote_counts AS (
        SELECT 
            c.contest_name,
            COALESCE(cand.candidate_name, 'Abstention') as candidate_name,
            COUNT(v.vote_id) as vote_count,
            COUNT(v.vote_id) * 100.0 / SUM(COUNT(v.vote_id)) OVER (PARTITION BY c.contest_id) as percentage
        FROM contests c
        LEFT JOIN votes v ON c.contest_id = v.contest_id
        LEFT JOIN candidates cand ON v.candidate_id = cand.candidate_id
        WHERE c.election_id = p_election_id
        GROUP BY c.contest_id, c.contest_name, cand.candidate_name
    )
    SELECT * FROM vote_counts
    ORDER BY contest_name, vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. TRIGGERS FOR AUDIT LOGGING
-- =====================================================

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, user_id)
        VALUES (TG_TABLE_NAME, OLD.user_id, TG_OP, row_to_json(OLD), OLD.user_id);
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.user_id, TG_OP, row_to_json(OLD), row_to_json(NEW), NEW.user_id);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (table_name, record_id, action, new_values, user_id)
        VALUES (TG_TABLE_NAME, NEW.user_id, TG_OP, row_to_json(NEW), NEW.user_id);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elections_updated_at BEFORE UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply audit triggers
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- 8. REPORTING VIEWS
-- =====================================================

-- Active elections view
CREATE VIEW active_elections AS
SELECT 
    e.election_id,
    e.election_name,
    e.description,
    e.voting_start,
    e.voting_end,
    o.org_name,
    COUNT(DISTINCT c.contest_id) as contest_count,
    COUNT(DISTINCT cand.candidate_id) as candidate_count,
    COUNT(DISTINCT v.voter_id) as voter_count
FROM elections e
LEFT JOIN organizations o ON e.org_id = o.org_id
LEFT JOIN contests c ON e.election_id = c.election_id
LEFT JOIN candidates cand ON c.contest_id = cand.contest_id
LEFT JOIN votes v ON e.election_id = v.election_id
WHERE e.status = 'active'
GROUP BY e.election_id, e.election_name, e.description, e.voting_start, e.voting_end, o.org_name;

-- User statistics view
CREATE VIEW user_statistics AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE email_verified = true) as verified_users
FROM users
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;

-- Voting statistics view
CREATE VIEW voting_statistics AS
SELECT 
    e.election_name,
    COUNT(DISTINCT v.voter_id) as total_voters,
    COUNT(v.vote_id) as total_votes,
    COUNT(v.vote_id) FILTER (WHERE v.candidate_id IS NULL) as abstentions,
    ROUND(
        COUNT(v.vote_id) * 100.0 / NULLIF(COUNT(DISTINCT ve.user_id), 0), 2
    ) as turnout_percentage
FROM elections e
LEFT JOIN votes v ON e.election_id = v.election_id
LEFT JOIN voter_eligibility ve ON e.election_id = ve.election_id
WHERE e.status IN ('active', 'completed')
GROUP BY e.election_id, e.election_name;

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Create default organization
INSERT INTO organizations (org_name, org_code, org_type, contact_email) 
VALUES ('Default Organization', 'DEFAULT', 'Educational', 'admin@voteguard.com');

-- This schema provides a comprehensive foundation for a Database Management System project,
-- demonstrating advanced concepts like normalization, constraints, triggers, functions,
-- views, and performance optimization through indexing.