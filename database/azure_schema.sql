-- Enhanced Database Schema for VoteGuard
-- Azure Database for PostgreSQL Compatible Version
-- Database Management System Academic Project

-- Create ENUM types for better data integrity
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('voter', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE election_status_enum AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE organization_type_enum AS ENUM ('government', 'corporate', 'educational', 'non_profit', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Note: pgcrypto extension not available in Azure Database for PostgreSQL
-- Using alternative hashing methods in application layer

-- 1. Organizations Table
CREATE TABLE IF NOT EXISTS organizations (
    org_id SERIAL PRIMARY KEY,
    org_name VARCHAR(255) NOT NULL UNIQUE,
    org_type organization_type_enum DEFAULT 'other',
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    address TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users Table (Enhanced with security features)
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role user_role_enum DEFAULT 'voter',
    phone VARCHAR(50),
    date_of_birth DATE,
    address TEXT,
    org_id INTEGER REFERENCES organizations(org_id),
    is_active BOOLEAN DEFAULT TRUE,
    email_verified BOOLEAN DEFAULT FALSE,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login TIMESTAMP WITH TIME ZONE,
    password_changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Roles (Flexible role assignment)
CREATE TABLE IF NOT EXISTS user_roles (
    role_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL,
    granted_by INTEGER REFERENCES users(user_id),
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, role_name)
);

-- 4. Elections Table (Enhanced with organization support)
CREATE TABLE IF NOT EXISTS elections (
    election_id SERIAL PRIMARY KEY,
    election_name VARCHAR(255) NOT NULL,
    description TEXT,
    org_id INTEGER REFERENCES organizations(org_id),
    status election_status_enum DEFAULT 'draft',
    voting_start TIMESTAMP WITH TIME ZONE,
    voting_end TIMESTAMP WITH TIME ZONE,
    created_by INTEGER NOT NULL REFERENCES users(user_id),
    allow_multiple_votes BOOLEAN DEFAULT FALSE,
    require_verification BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    max_votes_per_user INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_voting_period CHECK (voting_end > voting_start)
);

-- 5. Contests Table (Individual contests within elections)
CREATE TABLE IF NOT EXISTS contests (
    contest_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    contest_name VARCHAR(255) NOT NULL,
    description TEXT,
    max_selections INTEGER DEFAULT 1,
    min_selections INTEGER DEFAULT 0,
    contest_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_selections CHECK (max_selections >= min_selections AND min_selections >= 0)
);

-- 6. Candidates Table (Enhanced with metadata)
CREATE TABLE IF NOT EXISTS candidates (
    candidate_id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL REFERENCES contests(contest_id) ON DELETE CASCADE,
    candidate_name VARCHAR(255) NOT NULL,
    description TEXT,
    party_affiliation VARCHAR(100),
    image_url VARCHAR(500),
    website VARCHAR(255),
    candidate_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Voter Eligibility Table
CREATE TABLE IF NOT EXISTS voter_eligibility (
    eligibility_id SERIAL PRIMARY KEY,
    election_id INTEGER NOT NULL REFERENCES elections(election_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    is_eligible BOOLEAN DEFAULT TRUE,
    eligibility_verified BOOLEAN DEFAULT FALSE,
    verified_by INTEGER REFERENCES users(user_id),
    verified_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(election_id, user_id)
);

-- 8. Votes Table (Enhanced security and integrity)
CREATE TABLE IF NOT EXISTS votes (
    vote_id SERIAL PRIMARY KEY,
    contest_id INTEGER NOT NULL REFERENCES contests(contest_id) ON DELETE CASCADE,
    candidate_id INTEGER NOT NULL REFERENCES candidates(candidate_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vote_hash VARCHAR(255) NOT NULL,
    encrypted_vote TEXT,
    vote_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    verification_code VARCHAR(100),
    
    -- Ensure one vote per user per contest (unless multiple votes allowed)
    UNIQUE(contest_id, user_id, candidate_id)
);

-- 9. Audit Logs Table (Comprehensive activity tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    record_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    event_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'info',
    description TEXT,
    ip_address INET,
    user_agent TEXT,
    additional_data JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by INTEGER REFERENCES users(user_id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_elections_status ON elections(status);
CREATE INDEX IF NOT EXISTS idx_elections_dates ON elections(voting_start, voting_end);
CREATE INDEX IF NOT EXISTS idx_elections_org ON elections(org_id);
CREATE INDEX IF NOT EXISTS idx_contests_election ON contests(election_id);
CREATE INDEX IF NOT EXISTS idx_candidates_contest ON candidates(contest_id);
CREATE INDEX IF NOT EXISTS idx_votes_contest ON votes(contest_id);
CREATE INDEX IF NOT EXISTS idx_votes_user ON votes(user_id);
CREATE INDEX IF NOT EXISTS idx_votes_timestamp ON votes(vote_timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_security_events_user ON security_events(user_id);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_voter_eligibility_election_user ON voter_eligibility(election_id, user_id);

-- Stored Procedures

-- 1. Check Voter Eligibility
CREATE OR REPLACE FUNCTION check_voter_eligibility(p_user_id INTEGER, p_election_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    is_eligible BOOLEAN := FALSE;
    election_active BOOLEAN := FALSE;
BEGIN
    -- Check if election is active
    SELECT (status = 'active' AND voting_start <= NOW() AND voting_end > NOW())
    INTO election_active
    FROM elections
    WHERE election_id = p_election_id;
    
    IF NOT election_active THEN
        RETURN FALSE;
    END IF;
    
    -- Check voter eligibility
    SELECT COALESCE(ve.is_eligible, TRUE) AND u.is_active
    INTO is_eligible
    FROM users u
    LEFT JOIN voter_eligibility ve ON ve.user_id = u.user_id AND ve.election_id = p_election_id
    WHERE u.user_id = p_user_id;
    
    RETURN COALESCE(is_eligible, FALSE);
END;
$$ LANGUAGE plpgsql;

-- 2. Generate Vote Hash
CREATE OR REPLACE FUNCTION generate_vote_hash(p_user_id INTEGER, p_candidate_id INTEGER, p_timestamp TIMESTAMP)
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(digest(p_user_id::text || p_candidate_id::text || p_timestamp::text || random()::text, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql;

-- 3. Get Election Results
CREATE OR REPLACE FUNCTION get_election_results(p_election_id INTEGER)
RETURNS TABLE(
    contest_name VARCHAR(255),
    candidate_name VARCHAR(255),
    vote_count BIGINT,
    percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.contest_name,
        cand.candidate_name,
        COUNT(v.vote_id) as vote_count,
        ROUND(
            (COUNT(v.vote_id)::NUMERIC / NULLIF(
                (SELECT COUNT(*) FROM votes v2 
                 JOIN contests c2 ON v2.contest_id = c2.contest_id 
                 WHERE c2.election_id = p_election_id), 0
            ) * 100), 2
        ) as percentage
    FROM contests c
    JOIN candidates cand ON c.contest_id = cand.contest_id
    LEFT JOIN votes v ON cand.candidate_id = v.candidate_id
    WHERE c.election_id = p_election_id
    GROUP BY c.contest_name, c.contest_id, cand.candidate_name, cand.candidate_id
    ORDER BY c.contest_id, vote_count DESC;
END;
$$ LANGUAGE plpgsql;

-- Triggers for Audit Logging

-- Users audit trigger
CREATE OR REPLACE FUNCTION audit_users_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (NEW.user_id, 'INSERT', 'users', NEW.user_id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values)
        VALUES (NEW.user_id, 'UPDATE', 'users', NEW.user_id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values)
        VALUES (OLD.user_id, 'DELETE', 'users', OLD.user_id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_users
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_users_changes();

-- Votes audit trigger
CREATE OR REPLACE FUNCTION audit_votes_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values)
        VALUES (NEW.user_id, 'VOTE_CAST', 'votes', NEW.vote_id, to_jsonb(NEW));
        
        -- Also log security event
        INSERT INTO security_events (user_id, event_type, description, additional_data)
        VALUES (NEW.user_id, 'VOTE_CAST', 'User cast a vote', jsonb_build_object(
            'vote_id', NEW.vote_id,
            'contest_id', NEW.contest_id,
            'candidate_id', NEW.candidate_id
        ));
        
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_audit_votes
    AFTER INSERT ON votes
    FOR EACH ROW EXECUTE FUNCTION audit_votes_changes();

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers to relevant tables
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_elections_updated_at BEFORE UPDATE ON elections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_contests_updated_at BEFORE UPDATE ON contests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_candidates_updated_at BEFORE UPDATE ON candidates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER trigger_voter_eligibility_updated_at BEFORE UPDATE ON voter_eligibility FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Reporting Views

-- Election Statistics View
CREATE OR REPLACE VIEW election_statistics AS
SELECT 
    e.election_id,
    e.election_name,
    e.status,
    e.voting_start,
    e.voting_end,
    o.org_name,
    COUNT(DISTINCT c.contest_id) as total_contests,
    COUNT(DISTINCT cand.candidate_id) as total_candidates,
    COUNT(DISTINCT ve.user_id) as eligible_voters,
    COUNT(DISTINCT v.user_id) as voted_users,
    COUNT(v.vote_id) as total_votes,
    CASE 
        WHEN COUNT(DISTINCT ve.user_id) > 0 
        THEN ROUND((COUNT(DISTINCT v.user_id)::NUMERIC / COUNT(DISTINCT ve.user_id)) * 100, 2)
        ELSE 0 
    END as turnout_percentage
FROM elections e
LEFT JOIN organizations o ON e.org_id = o.org_id
LEFT JOIN contests c ON e.election_id = c.election_id
LEFT JOIN candidates cand ON c.contest_id = cand.contest_id
LEFT JOIN voter_eligibility ve ON e.election_id = ve.election_id AND ve.is_eligible = TRUE
LEFT JOIN votes v ON c.contest_id = v.contest_id
GROUP BY e.election_id, e.election_name, e.status, e.voting_start, e.voting_end, o.org_name
ORDER BY e.created_at DESC;

-- User Activity Summary View
CREATE OR REPLACE VIEW user_activity_summary AS
SELECT 
    u.user_id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.last_login,
    COUNT(DISTINCT v.vote_id) as votes_cast,
    COUNT(DISTINCT al.log_id) as total_activities,
    MAX(al.created_at) as last_activity
FROM users u
LEFT JOIN votes v ON u.user_id = v.user_id
LEFT JOIN audit_logs al ON u.user_id = al.user_id
WHERE u.is_active = TRUE
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.role, u.last_login
ORDER BY last_activity DESC NULLS LAST;

-- Security Events Summary View
CREATE OR REPLACE VIEW security_events_summary AS
SELECT 
    DATE(created_at) as event_date,
    event_type,
    severity,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN resolved = FALSE THEN 1 END) as unresolved_count
FROM security_events
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), event_type, severity
ORDER BY event_date DESC, event_count DESC;

-- Performance and Query Optimization View (simplified for Azure)
CREATE OR REPLACE VIEW database_performance_metrics AS
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    n_distinct,
    correlation
FROM pg_stats 
WHERE schemaname = 'public'
ORDER BY tablename, attname;

-- Grant permissions for application user
-- These would be run by database administrator
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO application_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO application_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO application_user;

-- Insert sample data for testing
INSERT INTO organizations (org_name, org_type, contact_email) 
VALUES ('VoteGuard University', 'educational', 'admin@voteguard.edu')
ON CONFLICT (org_name) DO NOTHING;

-- Success message
SELECT 'Enhanced VoteGuard schema deployed successfully to Azure Database for PostgreSQL!' as status;