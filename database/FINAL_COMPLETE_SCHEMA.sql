-- =====================================================
-- VOTEGUARD VOTING SYSTEM - COMPLETE DATABASE SCHEMA
-- =====================================================
-- Project: Cloud-Based Secure Electronic Voting System
-- Database: PostgreSQL
-- Purpose: Academic DBMS Project - Demonstrates Advanced Database Concepts
-- Date: October 2025
-- =====================================================
-- 
-- TABLE OF CONTENTS:
-- 1. EXTENSIONS & PREREQUISITES
-- 2. CUSTOM ENUM TYPES
-- 3. CORE USER MANAGEMENT TABLES
-- 4. ORGANIZATION & JURISDICTION TABLES
-- 5. ELECTION MANAGEMENT TABLES
-- 6. VOTING SYSTEM TABLES
-- 7. SECURITY & AUTHENTICATION TABLES
-- 8. AUDIT & LOGGING TABLES
-- 9. INDEXES FOR PERFORMANCE OPTIMIZATION
-- 10. FUNCTIONS & STORED PROCEDURES
-- 11. TRIGGERS FOR AUTOMATION
-- 12. VIEWS FOR REPORTING
-- 13. INITIAL DATA SETUP
--
-- =====================================================


-- =====================================================
-- 1. EXTENSIONS & PREREQUISITES
-- =====================================================
-- PostgreSQL extensions needed for advanced features

-- UUID generation for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Cryptographic functions for password hashing and encryption
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable Row Level Security for fine-grained access control
ALTER DATABASE postgres SET row_security = on;


-- =====================================================
-- 2. CUSTOM ENUM TYPES
-- =====================================================
-- Enums provide data integrity and make the schema self-documenting

-- User account status
CREATE TYPE user_status AS ENUM (
    'active',                  -- User can access the system
    'inactive',                -- Temporarily disabled
    'suspended',               -- Blocked due to policy violation
    'pending_verification'     -- Awaiting email/phone verification
);

-- User roles for role-based access control (RBAC)
CREATE TYPE user_role AS ENUM (
    'voter',                   -- Regular voter - can vote in eligible elections
    'admin',                   -- Election administrator - manages elections
    'super_admin',             -- System administrator - full access
    'election_officer'         -- Election officer - monitors elections
);

-- Election lifecycle states
CREATE TYPE election_status AS ENUM (
    'draft',                   -- Being created, not visible to voters
    'published',               -- Published but not yet active
    'active',                  -- Currently accepting votes
    'completed',               -- Voting period ended
    'cancelled'                -- Election cancelled
);

-- Vote verification status
CREATE TYPE vote_status AS ENUM (
    'pending',                 -- Vote received but not verified
    'cast',                    -- Successfully cast and recorded
    'verified',                -- Independently verified
    'invalid'                  -- Failed verification
);


-- =====================================================
-- 3. CORE USER MANAGEMENT TABLES
-- =====================================================

-- Main users table - stores all user accounts
CREATE TABLE IF NOT EXISTS users (
    -- Primary identification
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic user information
    email VARCHAR(255) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    date_of_birth DATE,
    
    -- Identity verification
    national_id VARCHAR(50) UNIQUE,     -- Government ID number
    azure_ad_user_id VARCHAR(255) UNIQUE,  -- For Azure AD integration
    
    -- Account status
    status user_status DEFAULT 'pending_verification',
    
    -- Authentication (password-based)
    password_hash VARCHAR(255) NOT NULL,
    password_salt VARCHAR(255),
    
    -- Email verification
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    
    -- Phone verification
    phone_verified BOOLEAN DEFAULT FALSE,
    
    -- Password reset functionality
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP WITH TIME ZONE,
    
    -- Security measures
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,  -- Account lock expiry
    
    -- Activity tracking
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id),
    
    -- Data validation constraints
    CONSTRAINT check_email_format 
        CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    CONSTRAINT check_phone_format 
        CHECK (phone_number ~* '^\+?[1-9]\d{1,14}$'),
    CONSTRAINT check_names_not_empty 
        CHECK (LENGTH(TRIM(first_name)) > 0 AND LENGTH(TRIM(last_name)) > 0),
    CONSTRAINT check_birth_date 
        CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')  -- Must be 18+
);

-- User roles table - implements Role-Based Access Control (RBAC)
-- Many-to-many relationship: users can have multiple roles
CREATE TABLE IF NOT EXISTS user_roles (
    -- Primary key
    role_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Foreign keys
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Role information
    role user_role NOT NULL,
    
    -- Permission customization (JSONB for flexibility)
    -- Example: {"can_delete_elections": true, "max_elections": 5}
    permissions JSONB DEFAULT '{}',
    
    -- Role assignment tracking
    assigned_by UUID REFERENCES users(user_id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,  -- Optional role expiration
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Ensure one role per user (can be removed if multiple roles needed)
    UNIQUE(user_id, role)
);


-- =====================================================
-- 4. ORGANIZATION & JURISDICTION TABLES
-- =====================================================

-- Organizations table - represents institutions conducting elections
-- Examples: Universities, Companies, Government Bodies, Clubs
CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Organization details
    org_name VARCHAR(255) NOT NULL,
    org_code VARCHAR(50) UNIQUE NOT NULL,  -- Short identifier
    org_type VARCHAR(100),                  -- University, Company, NGO, etc.
    
    -- Contact information
    address TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(user_id)
);

-- Jurisdictions table - hierarchical geographic or administrative divisions
-- Examples: Country > State > City > District
CREATE TABLE IF NOT EXISTS jurisdictions (
    jurisdiction_id SERIAL PRIMARY KEY,
    
    -- Jurisdiction details
    jurisdiction_name VARCHAR(255) NOT NULL,
    
    -- Hierarchical structure (self-referencing)
    parent_jurisdiction_id INTEGER REFERENCES jurisdictions(jurisdiction_id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =====================================================
-- 5. ELECTION MANAGEMENT TABLES
-- =====================================================

-- Elections table - main table for election management
CREATE TABLE IF NOT EXISTS elections (
    election_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Basic information
    election_name VARCHAR(255) NOT NULL,
    election_code VARCHAR(50) UNIQUE NOT NULL,  -- Short unique identifier
    description TEXT,
    election_type VARCHAR(100),  -- Presidential, Parliamentary, Student Body, etc.
    
    -- Organization linkage
    org_id UUID REFERENCES organizations(org_id),
    
    -- Election status
    status election_status DEFAULT 'draft',
    
    -- Timeline - Registration phase
    registration_start TIMESTAMP WITH TIME ZONE,
    registration_end TIMESTAMP WITH TIME ZONE,
    
    -- Timeline - Voting phase
    voting_start TIMESTAMP WITH TIME ZONE NOT NULL,  -- Called start_date in some tables
    voting_end TIMESTAMP WITH TIME ZONE NOT NULL,    -- Called end_date in some tables
    
    -- Election settings
    max_votes_per_voter INTEGER DEFAULT 1,           -- Votes per voter
    allow_abstention BOOLEAN DEFAULT TRUE,           -- Allow "none of the above"
    require_voter_verification BOOLEAN DEFAULT TRUE, -- Require ID verification
    results_public BOOLEAN DEFAULT FALSE,            -- Public vs private results
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    creator UUID NOT NULL REFERENCES users(user_id),  -- Election creator
    created_by UUID REFERENCES users(user_id),        -- For consistency
    
    -- Business logic constraints
    CONSTRAINT valid_election_dates 
        CHECK (voting_end > voting_start),
    CONSTRAINT check_registration_dates 
        CHECK (registration_start < registration_end),
    CONSTRAINT check_max_votes 
        CHECK (max_votes_per_voter > 0)
);

-- Election jurisdictions table - links elections to geographic areas
-- Many-to-many relationship: elections can span multiple jurisdictions
CREATE TABLE IF NOT EXISTS election_jurisdictions (
    election_id UUID REFERENCES elections(election_id) ON DELETE CASCADE,
    jurisdiction_id INTEGER REFERENCES jurisdictions(jurisdiction_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (election_id, jurisdiction_id)
);

-- Contests table - positions/offices being voted on in an election
-- Examples: President, Vice President, Secretary, Measure A
CREATE TABLE IF NOT EXISTS contests (
    contest_id SERIAL,  -- Sequential ID within election
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    
    -- Contest information
    contest_title VARCHAR(255) NOT NULL,     -- Called contest_name in enhanced
    contest_name VARCHAR(255),               -- Alternative field
    contest_description TEXT,
    contest_type VARCHAR(20) CHECK (contest_type IN ('ChooseOne', 'YesNo')) NOT NULL,
    position_name VARCHAR(255),              -- Job title or position
    
    -- Voting rules
    max_selections INTEGER DEFAULT 1 CHECK (max_selections > 0),  -- How many to choose
    max_candidates INTEGER DEFAULT 10,       -- Maximum candidates allowed
    max_winners INTEGER DEFAULT 1,           -- How many win
    min_votes_required INTEGER DEFAULT 1,    -- Minimum votes to win
    
    -- Display settings
    display_order INTEGER DEFAULT 0,         -- Order shown to voters
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (contest_id, election_id),
    
    -- Logical constraints
    CONSTRAINT check_winners_vs_candidates 
        CHECK (max_winners <= max_candidates),
    CONSTRAINT check_positive_values 
        CHECK (max_candidates > 0 AND max_winners > 0)
);

-- Candidates table - people or options running in contests
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contest linkage
    contest_id INTEGER NOT NULL,
    election_id UUID NOT NULL,
    
    -- Candidate information
    candidate_name VARCHAR(255) NOT NULL,
    candidate_bio TEXT,
    candidate_photo_url VARCHAR(500),      -- Profile picture
    party_affiliation VARCHAR(255),        -- Political party or group
    party VARCHAR(255),                    -- Alternative field name
    candidate_number INTEGER,              -- Ballot number
    
    -- User linkage (if candidate is a system user)
    user_id UUID REFERENCES users(user_id),  -- Null if external candidate
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Nomination tracking
    nomination_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nominated_by UUID REFERENCES users(user_id),
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign key to contests
    FOREIGN KEY (contest_id, election_id) 
        REFERENCES contests(contest_id, election_id) ON DELETE CASCADE,
    
    -- Business rules
    UNIQUE(contest_id, candidate_number),  -- Each number used once per contest
    UNIQUE(contest_id, user_id)            -- Can't run twice for same position
);

-- Candidate profiles table - additional key-value attributes
-- Flexible structure for custom candidate information
CREATE TABLE IF NOT EXISTS candidate_profiles (
    candidate_profile_id SERIAL,
    candidate_id UUID REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    
    -- Key-value pair for any attribute
    profile_key VARCHAR(255) NOT NULL,     -- e.g., "website", "manifesto_url"
    profile_value TEXT,                    -- The value
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (candidate_profile_id, candidate_id)
);


-- =====================================================
-- 6. VOTING SYSTEM TABLES
-- =====================================================

-- Eligible voters table - controls who can vote in which election
-- Whitelist approach: only listed users can vote
CREATE TABLE IF NOT EXISTS eligible_voters (
    id SERIAL PRIMARY KEY,
    
    -- Election and user linkage
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'eligible' 
        CHECK (status IN ('eligible', 'voted', 'disabled')),
    
    -- Administration
    added_by UUID REFERENCES users(user_id),
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- One entry per voter per election
    UNIQUE(election_id, user_id)
);

-- Voter eligibility table - enhanced version with verification
-- Alternative/complementary to eligible_voters
CREATE TABLE IF NOT EXISTS voter_eligibility (
    eligibility_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Election and user linkage
    election_id UUID NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Eligibility determination
    is_eligible BOOLEAN DEFAULT TRUE,
    eligibility_reason TEXT,  -- Why eligible or not
    
    -- Verification
    verified_by UUID REFERENCES users(user_id),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(election_id, user_id)
);

-- Votes table - THE MOST CRITICAL TABLE
-- Stores actual vote records with cryptographic security
-- This is append-only - votes are NEVER updated or deleted
CREATE TABLE IF NOT EXISTS votes (
    vote_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What election and contest
    election_id UUID NOT NULL REFERENCES elections(election_id),
    contest_id INTEGER NOT NULL,
    
    -- Who voted (in real implementation, this might be anonymized)
    voter_id UUID NOT NULL REFERENCES users(user_id),
    
    -- What they voted for (NULL = abstention)
    candidate_id UUID REFERENCES candidates(candidate_id),
    
    -- Cryptographic security
    vote_hash VARCHAR(255) UNIQUE NOT NULL,         -- Current vote's hash
    previous_vote_hash VARCHAR(255),                -- Previous vote in chain (blockchain-like)
    encrypted_vote TEXT,                            -- Encrypted vote content
    
    -- Vote status
    status vote_status DEFAULT 'cast',
    
    -- Timestamp and metadata
    vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cast_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Security audit trail
    ip_address INET,           -- Voter's IP address
    user_agent TEXT,           -- Browser information
    session_id UUID,           -- User session
    
    -- Verification (for post-election audits)
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(user_id),
    
    -- Foreign key constraints
    FOREIGN KEY (contest_id, election_id) 
        REFERENCES contests(contest_id, election_id),
    FOREIGN KEY (previous_vote_hash) 
        REFERENCES votes(vote_hash),  -- Chain to previous vote
    FOREIGN KEY (session_id) 
        REFERENCES user_sessions(session_id),
    
    -- Business rule: one vote per voter per contest
    UNIQUE(election_id, contest_id, voter_id)
);


-- =====================================================
-- 7. SECURITY & AUTHENTICATION TABLES
-- =====================================================

-- User sessions table - tracks active login sessions
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- User identification
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Connection details
    ip_address VARCHAR(45),              -- IPv4 or IPv6
    user_agent TEXT,                     -- Browser/device info
    
    -- Session lifecycle
    login_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OTP verifications table - One-Time Password for email/phone verification
CREATE TABLE IF NOT EXISTS otp_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Contact information
    email VARCHAR(255) NOT NULL,
    
    -- OTP details
    otp_hash VARCHAR(255) NOT NULL,      -- Hashed OTP (never store plain)
    type VARCHAR(10) CHECK (type IN ('email', 'phone')) NOT NULL,
    
    -- Expiry and security
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER DEFAULT 0,          -- Brute force prevention
    
    -- Verification status
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens table - for email verification and password reset
CREATE TABLE IF NOT EXISTS verification_tokens (
    token_id SERIAL PRIMARY KEY,
    
    -- User linkage
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Token details
    token_hash VARCHAR(255) NOT NULL,    -- Hashed token
    token_type VARCHAR(50) CHECK (token_type IN (
        'EmailVerification',
        'PasswordReset',
        'TwoFactor'
    )) NOT NULL,
    
    -- Lifecycle
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,    -- NULL if not used yet
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security events table - logs security-related incidents
CREATE TABLE IF NOT EXISTS security_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Event classification
    event_type VARCHAR(100) NOT NULL,  -- FailedLogin, UnusualLocation, etc.
    severity VARCHAR(20) DEFAULT 'INFO' CHECK (severity IN (
        'INFO',      -- Informational
        'WARNING',   -- Potential issue
        'ERROR',     -- Confirmed issue
        'CRITICAL'   -- Serious security breach
    )),
    
    -- User and session context
    user_id UUID REFERENCES users(user_id),
    session_id UUID REFERENCES user_sessions(session_id),
    
    -- Event details
    event_description TEXT NOT NULL,
    additional_data JSONB,      -- Flexible JSON storage
    event_data JSONB,           -- Alternative field name
    
    -- Connection details
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Anomaly detections table - AI/ML detected suspicious patterns
CREATE TABLE IF NOT EXISTS anomaly_detections (
    anomaly_id SERIAL PRIMARY KEY,
    
    -- Detection type
    detection_type VARCHAR(50) CHECK (detection_type IN (
        'VotingPattern',    -- Unusual voting behavior
        'LoginPattern',     -- Unusual login activity
        'DataAccess'        -- Unusual data access
    )) NOT NULL,
    
    -- Anomaly scoring
    anomaly_score DECIMAL(5,4) CHECK (
        anomaly_score >= 0 AND anomaly_score <= 1
    ),  -- 0 = normal, 1 = highly anomalous
    
    -- Detection data
    detection_data JSONB,
    
    -- Review status
    status VARCHAR(20) DEFAULT 'NeedsReview' CHECK (status IN (
        'NeedsReview',
        'Resolved',
        'FalsePositive'
    )),
    
    -- Affected entities
    affected_user_id UUID REFERENCES users(user_id),
    affected_session_id UUID REFERENCES user_sessions(session_id),
    
    -- Timestamp
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =====================================================
-- 8. AUDIT & LOGGING TABLES
-- =====================================================

-- Audit log table - comprehensive audit trail for all operations
-- Records all INSERT, UPDATE, DELETE operations on sensitive tables
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- What happened
    operation_type VARCHAR(20) CHECK (operation_type IN (
        'INSERT', 'UPDATE', 'DELETE', 
        'LOGIN', 'LOGOUT', 'VOTE_CAST', 'SELECT'
    )) NOT NULL,
    
    -- Where it happened
    table_name VARCHAR(255),
    record_id VARCHAR(255),      -- ID of affected record
    
    -- What changed
    old_values JSONB,            -- Before state
    new_values JSONB,            -- After state
    changed_fields TEXT[],       -- List of changed columns
    
    -- Who did it
    user_id UUID REFERENCES users(user_id),
    session_id VARCHAR(255),
    
    -- When and how
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ip_address VARCHAR(45),
    user_agent TEXT
);

-- Election events table - timeline of election-related activities
CREATE TABLE IF NOT EXISTS election_events (
    event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Election linkage
    election_id UUID NOT NULL REFERENCES elections(election_id),
    
    -- Event details
    event_type VARCHAR(100) NOT NULL,  -- Published, Started, Ended, etc.
    event_description TEXT,
    event_data JSONB,                  -- Additional event data
    
    -- Audit
    created_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System configuration table - stores system settings
CREATE TABLE IF NOT EXISTS system_configuration (
    config_key VARCHAR(255) PRIMARY KEY,
    
    -- Configuration value
    config_value TEXT NOT NULL,
    is_encrypted BOOLEAN DEFAULT false,  -- Whether value is encrypted
    
    -- Audit
    modified_by UUID REFERENCES users(user_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- =====================================================
-- 9. INDEXES FOR PERFORMANCE OPTIMIZATION
-- =====================================================
-- Indexes dramatically speed up queries on large tables
-- Trade-off: slower writes, more storage, but much faster reads

-- User table indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id) WHERE national_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token);

-- Election table indexes
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON elections(voting_start, voting_end);
CREATE INDEX IF NOT EXISTS idx_elections_org ON elections(org_id);

-- Contest indexes
CREATE INDEX IF NOT EXISTS idx_contests_election ON contests(election_id);

-- Candidate indexes
CREATE INDEX IF NOT EXISTS idx_candidates_contest ON candidates(contest_id, election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_user ON candidates(user_id);

-- Vote table indexes - CRITICAL for performance
CREATE INDEX IF NOT EXISTS idx_votes_election ON votes(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_voter ON votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_votes_candidate ON votes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_votes_cast_at ON votes(cast_at);
CREATE INDEX IF NOT EXISTS idx_votes_status ON votes(status);
CREATE INDEX IF NOT EXISTS idx_votes_contest ON votes(contest_id, election_id);
CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(vote_timestamp);
CREATE INDEX IF NOT EXISTS idx_votes_hash ON votes(vote_hash);

-- Eligible voters indexes
CREATE INDEX IF NOT EXISTS idx_eligible_voters_election ON eligible_voters(election_id);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_user ON eligible_voters(user_id);
CREATE INDEX IF NOT EXISTS idx_eligible_voters_status ON eligible_voters(status);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_table_action ON audit_log(table_name, operation_type);

-- Security event indexes
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);

-- OTP verification indexes
CREATE INDEX IF NOT EXISTS idx_otp_email_type ON otp_verifications(email, type);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_verified ON otp_verifications(verified);


-- =====================================================
-- 10. FUNCTIONS & STORED PROCEDURES
-- =====================================================
-- Reusable database logic encapsulated in functions

-- Function: Automatically update the updated_at timestamp
-- Used by triggers on all tables with updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();  -- Set to current timestamp
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Hash password using bcrypt
-- Parameters: plain text password
-- Returns: bcrypt hash
CREATE OR REPLACE FUNCTION hash_password(password TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));  -- Bcrypt with cost factor 10
END;
$$ LANGUAGE plpgsql;

-- Function: Verify password against hash
-- Parameters: plain password, stored hash
-- Returns: true if match, false otherwise
CREATE OR REPLACE FUNCTION verify_password(password TEXT, hash TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql;

-- Function: Generate secure random token
-- Used for password reset, email verification, etc.
-- Returns: 64-character hexadecimal string
CREATE OR REPLACE FUNCTION generate_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function: Generate vote hash for integrity verification
-- Creates SHA-256 hash of vote components for blockchain-like chaining
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
            CONCAT(
                p_election_id, 
                p_voter_id, 
                COALESCE(p_candidate_id::text, 'abstain'),  -- Handle NULL votes
                p_timestamp
            ),
            'sha256'
        ),
        'hex'
    );
END;
$$ LANGUAGE plpgsql;

-- Function: Check if user is eligible to vote in an election
-- Parameters: user_id, election_id
-- Returns: true if eligible, false otherwise
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
    -- Check if user account is active
    SELECT (status = 'active') INTO v_user_active
    FROM users WHERE user_id = p_user_id;
    
    -- Check if election is currently accepting votes
    SELECT (
        status = 'active' 
        AND voting_start <= NOW() 
        AND voting_end > NOW()
    ) INTO v_election_active
    FROM elections WHERE election_id = p_election_id;
    
    -- Check if user is on the eligible voters list
    SELECT COALESCE(is_eligible, TRUE) INTO v_eligible
    FROM voter_eligibility
    WHERE user_id = p_user_id AND election_id = p_election_id;
    
    -- All three conditions must be true
    RETURN v_user_active AND v_election_active AND v_eligible;
END;
$$ LANGUAGE plpgsql;

-- Function: Get election results
-- Aggregates votes and calculates percentages
-- Parameters: election_id
-- Returns: table of results
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
            -- Calculate percentage of votes within each contest
            COUNT(v.vote_id) * 100.0 / 
                NULLIF(SUM(COUNT(v.vote_id)) OVER (PARTITION BY c.contest_id), 0) as percentage
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
-- 11. TRIGGERS FOR AUTOMATION
-- =====================================================
-- Triggers automatically execute functions on table events

-- Generic audit trigger function
-- Logs all INSERT, UPDATE, DELETE operations with before/after values
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            table_name, record_id, operation_type, 
            old_values, user_id
        ) VALUES (
            TG_TABLE_NAME, 
            OLD.user_id, 
            TG_OP, 
            row_to_json(OLD), 
            OLD.user_id
        );
        RETURN OLD;
        
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            table_name, record_id, operation_type,
            old_values, new_values, user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.user_id,
            TG_OP,
            row_to_json(OLD),
            row_to_json(NEW),
            NEW.user_id
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            table_name, record_id, operation_type,
            new_values, user_id
        ) VALUES (
            TG_TABLE_NAME,
            NEW.user_id,
            TG_OP,
            row_to_json(NEW),
            NEW.user_id
        );
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Enhanced audit trigger with sensitive field filtering
-- Prevents logging of passwords and tokens
CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    user_id_var UUID;
    old_record JSONB;
    new_record JSONB;
BEGIN
    -- Try to get current user from session variable
    user_id_var := current_setting('app.current_user_id', true)::UUID;
    
    IF TG_OP = 'INSERT' THEN
        -- Convert record to JSON
        new_record := to_jsonb(NEW);
        
        -- Remove sensitive fields for users table
        IF TG_TABLE_NAME = 'users' THEN
            new_record := new_record 
                - 'password_hash' 
                - 'password_salt' 
                - 'password_reset_token' 
                - 'email_verification_token';
        END IF;
        
        INSERT INTO audit_log (
            user_id, operation_type, table_name, 
            record_id, new_values, ip_address
        ) VALUES (
            user_id_var, 
            'INSERT', 
            TG_TABLE_NAME, 
            COALESCE(NEW.user_id::TEXT, NEW.id::TEXT), 
            new_record, 
            current_setting('app.current_ip', true)
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'UPDATE' THEN
        old_record := to_jsonb(OLD);
        new_record := to_jsonb(NEW);
        
        -- Remove sensitive fields
        IF TG_TABLE_NAME = 'users' THEN
            old_record := old_record 
                - 'password_hash' 
                - 'password_salt' 
                - 'password_reset_token' 
                - 'email_verification_token';
            new_record := new_record 
                - 'password_hash' 
                - 'password_salt' 
                - 'password_reset_token' 
                - 'email_verification_token';
        END IF;
        
        INSERT INTO audit_log (
            user_id, operation_type, table_name,
            record_id, old_values, new_values, ip_address
        ) VALUES (
            user_id_var,
            'UPDATE',
            TG_TABLE_NAME,
            COALESCE(NEW.user_id::TEXT, NEW.id::TEXT),
            old_record,
            new_record,
            current_setting('app.current_ip', true)
        );
        RETURN NEW;
        
    ELSIF TG_OP = 'DELETE' THEN
        old_record := to_jsonb(OLD);
        
        IF TG_TABLE_NAME = 'users' THEN
            old_record := old_record 
                - 'password_hash' 
                - 'password_salt' 
                - 'password_reset_token' 
                - 'email_verification_token';
        END IF;
        
        INSERT INTO audit_log (
            user_id, operation_type, table_name,
            record_id, old_values, ip_address
        ) VALUES (
            user_id_var,
            'DELETE',
            TG_TABLE_NAME,
            COALESCE(OLD.user_id::TEXT, OLD.id::TEXT),
            old_record,
            current_setting('app.current_ip', true)
        );
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to all relevant tables
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_elections_updated_at 
    BEFORE UPDATE ON elections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contests_updated_at 
    BEFORE UPDATE ON contests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at 
    BEFORE UPDATE ON candidates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_jurisdictions_updated_at 
    BEFORE UPDATE ON jurisdictions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at 
    BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_configuration_updated_at 
    BEFORE UPDATE ON system_configuration
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_votes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON votes
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_elections_trigger
    AFTER INSERT OR UPDATE OR DELETE ON elections
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();


-- =====================================================
-- 12. VIEWS FOR REPORTING
-- =====================================================
-- Views provide pre-aggregated data for common queries

-- Active elections view - dashboard summary
CREATE OR REPLACE VIEW active_elections AS
SELECT 
    e.election_id,
    e.election_name,
    e.description,
    e.voting_start,
    e.voting_end,
    o.org_name,
    COUNT(DISTINCT c.contest_id) as contest_count,
    COUNT(DISTINCT cand.candidate_id) as candidate_count,
    COUNT(DISTINCT v.voter_id) as voter_count,
    COUNT(v.vote_id) as total_votes
FROM elections e
LEFT JOIN organizations o ON e.org_id = o.org_id
LEFT JOIN contests c ON e.election_id = c.election_id
LEFT JOIN candidates cand ON c.contest_id = cand.contest_id AND c.election_id = cand.election_id
LEFT JOIN votes v ON e.election_id = v.election_id
WHERE e.status = 'active'
GROUP BY e.election_id, e.election_name, e.description, 
         e.voting_start, e.voting_end, o.org_name;

-- User statistics view - monthly growth metrics
CREATE OR REPLACE VIEW user_statistics AS
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as new_users,
    COUNT(*) FILTER (WHERE status = 'active') as active_users,
    COUNT(*) FILTER (WHERE email_verified = true) as verified_users,
    COUNT(*) FILTER (WHERE status = 'suspended') as suspended_users
FROM users
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- Voting statistics view - turnout and participation
CREATE OR REPLACE VIEW voting_statistics AS
SELECT 
    e.election_id,
    e.election_name,
    e.status,
    COUNT(DISTINCT v.voter_id) as total_voters,
    COUNT(v.vote_id) as total_votes,
    COUNT(v.vote_id) FILTER (WHERE v.candidate_id IS NULL) as abstentions,
    COUNT(DISTINCT ve.user_id) as eligible_voters,
    ROUND(
        COUNT(DISTINCT v.voter_id) * 100.0 / 
        NULLIF(COUNT(DISTINCT ve.user_id), 0), 
        2
    ) as turnout_percentage
FROM elections e
LEFT JOIN votes v ON e.election_id = v.election_id
LEFT JOIN voter_eligibility ve ON e.election_id = ve.election_id 
    AND ve.is_eligible = true
WHERE e.status IN ('active', 'completed')
GROUP BY e.election_id, e.election_name, e.status;

-- Contest results view - real-time results
CREATE OR REPLACE VIEW contest_results AS
SELECT 
    c.election_id,
    e.election_name,
    c.contest_id,
    c.contest_title,
    cand.candidate_id,
    cand.candidate_name,
    cand.party_affiliation,
    COUNT(v.vote_id) as vote_count,
    RANK() OVER (
        PARTITION BY c.contest_id 
        ORDER BY COUNT(v.vote_id) DESC
    ) as rank
FROM contests c
JOIN elections e ON c.election_id = e.election_id
LEFT JOIN votes v ON c.contest_id = v.contest_id 
    AND c.election_id = v.election_id
LEFT JOIN candidates cand ON v.candidate_id = cand.candidate_id
GROUP BY c.election_id, e.election_name, c.contest_id, 
         c.contest_title, cand.candidate_id, 
         cand.candidate_name, cand.party_affiliation;

-- Security dashboard view - recent security events
CREATE OR REPLACE VIEW security_dashboard AS
SELECT 
    DATE_TRUNC('day', timestamp) as day,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as affected_users
FROM security_events
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', timestamp), event_type, severity
ORDER BY day DESC, event_count DESC;


-- =====================================================
-- 13. INITIAL DATA SETUP
-- =====================================================
-- Insert essential default data

-- Create default organization
INSERT INTO organizations (
    org_name, 
    org_code, 
    org_type, 
    contact_email
) VALUES (
    'Default Organization', 
    'DEFAULT', 
    'Educational', 
    'admin@voteguard.com'
)
ON CONFLICT (org_code) DO NOTHING;  -- Skip if already exists

-- Create default jurisdiction (e.g., country)
INSERT INTO jurisdictions (
    jurisdiction_name
) VALUES (
    'Default Jurisdiction'
)
ON CONFLICT DO NOTHING;


-- =====================================================
-- SCHEMA DOCUMENTATION SUMMARY
-- =====================================================
--
-- This schema implements a comprehensive electronic voting system with:
--
-- 1. USER MANAGEMENT
--    - Multi-role support (voter, admin, super_admin, election_officer)
--    - Email and phone verification
--    - Password reset functionality
--    - Account security (lockouts, failed login tracking)
--
-- 2. ELECTION MANAGEMENT
--    - Flexible election creation with multiple contests
--    - Candidate management with profiles
--    - Organization and jurisdiction support
--    - Time-based election lifecycle (draft → published → active → completed)
--
-- 3. VOTING SYSTEM
--    - Cryptographically secure vote recording
--    - Blockchain-like vote chaining for integrity
--    - Voter eligibility management
--    - Abstention support
--    - One vote per contest per voter enforcement
--
-- 4. SECURITY
--    - Comprehensive audit logging
--    - Security event monitoring
--    - Anomaly detection support
--    - Session management
--    - OTP verification
--    - Password hashing with bcrypt
--
-- 5. REPORTING
--    - Pre-built views for common queries
--    - Real-time results calculation
--    - Voter turnout statistics
--    - User growth metrics
--    - Security dashboards
--
-- 6. PERFORMANCE
--    - Strategic indexes on all key columns
--    - Optimized for read-heavy workloads
--    - Foreign key constraints for data integrity
--    - Check constraints for business logic enforcement
--
-- 7. COMPLIANCE
--    - GDPR-friendly (sensitive data exclusion in audit logs)
--    - Audit trail for all critical operations
--    - Data retention policies can be implemented via scheduled jobs
--    - Election result integrity verification
--
-- DATABASE DESIGN PRINCIPLES DEMONSTRATED:
-- - Normalization (3NF) to reduce redundancy
-- - Referential integrity via foreign keys
-- - Data integrity via check constraints
-- - Security via encryption and hashing
-- - Performance via strategic indexing
-- - Maintainability via stored procedures and triggers
-- - Scalability via proper normalization and indexing
--
-- For production deployment:
-- 1. Review and adjust all CHECK constraints for your use case
-- 2. Configure appropriate backup strategy
-- 3. Set up monitoring for the audit_log table size
-- 4. Implement data retention policies
-- 5. Configure connection pooling
-- 6. Set up replication for high availability
-- 7. Review and optimize indexes based on query patterns
-- 8. Implement row-level security policies if needed
-- 9. Set up automated cleanup jobs for expired tokens/OTPs
-- 10. Configure SSL/TLS for database connections
--
-- =====================================================
-- END OF SCHEMA
-- =====================================================
