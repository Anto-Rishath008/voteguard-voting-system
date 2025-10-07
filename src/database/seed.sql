-- Seed data for VoteGuard System

-- Insert default jurisdictions
INSERT INTO jurisdictions (jurisdiction_name, parent_jurisdiction_id) VALUES
('United States', NULL),
('California', 1),
('Los Angeles County', 2),
('New York', 1),
('New York City', 4),
('Texas', 1),
('Harris County', 6);

-- Insert system configuration
INSERT INTO system_configuration (config_key, config_value, is_encrypted, modified_by) VALUES
('system_name', 'VoteGuard Electronic Voting System', false, NULL),
('max_login_attempts', '3', false, NULL),
('session_timeout_minutes', '30', false, NULL),
('vote_verification_enabled', 'true', false, NULL),
('audit_retention_days', '2555', false, NULL), -- 7 years
('min_password_length', '8', false, NULL),
('require_two_factor', 'false', false, NULL);

-- Create default admin user
INSERT INTO users (user_id, email, first_name, last_name, status, password_hash, email_verified) VALUES
('00000000-0000-0000-0000-000000000001', 'admin@voteguard.system', 'System', 'Administrator', 'Active', hash_password('Admin123!'), true);

-- Create additional dummy users for testing
-- All passwords are: Password123! (for easy testing)
INSERT INTO users (user_id, email, first_name, last_name, status, password_hash, email_verified) VALUES
('11111111-1111-1111-1111-111111111111', 'john.admin@example.com', 'John', 'Admin', 'Active', hash_password('Password123!'), true),
('22222222-2222-2222-2222-222222222222', 'jane.user@example.com', 'Jane', 'Smith', 'Active', hash_password('Password123!'), true),
('33333333-3333-3333-3333-333333333333', 'bob.voter@example.com', 'Bob', 'Johnson', 'Active', hash_password('Password123!'), true),
('44444444-4444-4444-4444-444444444444', 'alice.voter@example.com', 'Alice', 'Williams', 'Active', hash_password('Password123!'), true),
('55555555-5555-5555-5555-555555555555', 'charlie.admin@example.com', 'Charlie', 'Brown', 'Active', hash_password('Password123!'), true),
('66666666-6666-6666-6666-666666666666', 'diana.voter@example.com', 'Diana', 'Davis', 'Active', hash_password('Password123!'), true),
('77777777-7777-7777-7777-777777777777', 'test.user@example.com', 'Test', 'User', 'Active', hash_password('Password123!'), true);

-- Assign roles to users
INSERT INTO user_roles (user_id, role_name, assigned_by) VALUES
-- System admin (SuperAdmin)
('00000000-0000-0000-0000-000000000001', 'SuperAdmin', '00000000-0000-0000-0000-000000000001'),
-- Additional admins
('11111111-1111-1111-1111-111111111111', 'Admin', '00000000-0000-0000-0000-000000000001'),
('55555555-5555-5555-5555-555555555555', 'Admin', '00000000-0000-0000-0000-000000000001'),
-- Regular voters
('22222222-2222-2222-2222-222222222222', 'Voter', '00000000-0000-0000-0000-000000000001'),
('33333333-3333-3333-3333-333333333333', 'Voter', '00000000-0000-0000-0000-000000000001'),
('44444444-4444-4444-4444-444444444444', 'Voter', '00000000-0000-0000-0000-000000000001'),
('66666666-6666-6666-6666-666666666666', 'Voter', '00000000-0000-0000-0000-000000000001'),
('77777777-7777-7777-7777-777777777777', 'Voter', '00000000-0000-0000-0000-000000000001');

-- Sample election data (for testing purposes)
INSERT INTO elections (election_id, election_name, description, start_date, end_date, status, creator) VALUES
('11111111-1111-1111-1111-111111111111', '2024 General Election', 'Annual general election for local and state positions', '2024-11-05 06:00:00-08', '2024-11-05 20:00:00-08', 'Draft', '00000000-0000-0000-0000-000000000001'),
('22222222-2222-2222-2222-222222222222', '2024 Primary Election', 'Primary election for candidate selection', '2024-06-05 06:00:00-08', '2024-06-05 20:00:00-08', 'Completed', '00000000-0000-0000-0000-000000000001');

-- Link elections to jurisdictions
INSERT INTO election_jurisdictions (election_id, jurisdiction_id) VALUES
('11111111-1111-1111-1111-111111111111', 3), -- LA County
('11111111-1111-1111-1111-111111111111', 5), -- NYC
('22222222-2222-2222-2222-222222222222', 7); -- Harris County

-- Sample contests
INSERT INTO contests (contest_id, election_id, contest_title, contest_type) VALUES
(1, '11111111-1111-1111-1111-111111111111', 'Mayor of Los Angeles', 'ChooseOne'),
(2, '11111111-1111-1111-1111-111111111111', 'Proposition 1: School Bond Measure', 'YesNo'),
(1, '22222222-2222-2222-2222-222222222222', 'District Attorney Primary', 'ChooseOne');

-- Sample candidates
INSERT INTO candidates (candidate_id, contest_id, election_id, candidate_name, party) VALUES
-- Mayor race candidates
('33333333-3333-3333-3333-333333333331', 1, '11111111-1111-1111-1111-111111111111', 'John Smith', 'Democratic'),
('33333333-3333-3333-3333-333333333332', 1, '11111111-1111-1111-1111-111111111111', 'Jane Doe', 'Republican'),
('33333333-3333-3333-3333-333333333333', 1, '11111111-1111-1111-1111-111111111111', 'Mike Johnson', 'Independent'),
-- Proposition candidates (Yes/No)
('33333333-3333-3333-3333-333333333334', 2, '11111111-1111-1111-1111-111111111111', 'Yes', NULL),
('33333333-3333-3333-3333-333333333335', 2, '11111111-1111-1111-1111-111111111111', 'No', NULL),
-- DA Primary candidates
('33333333-3333-3333-3333-333333333336', 1, '22222222-2222-2222-2222-222222222222', 'Sarah Wilson', 'Democratic'),
('33333333-3333-3333-3333-333333333337', 1, '22222222-2222-2222-2222-222222222222', 'Robert Brown', 'Democratic');

-- Sample candidate profiles
INSERT INTO candidate_profiles (candidate_id, profile_key, profile_value) VALUES
('33333333-3333-3333-3333-333333333331', 'biography', 'Experienced city council member with 10 years of public service.'),
('33333333-3333-3333-3333-333333333331', 'website', 'https://johnsmith2024.com'),
('33333333-3333-3333-3333-333333333332', 'biography', 'Business leader and community advocate focused on economic development.'),
('33333333-3333-3333-3333-333333333332', 'website', 'https://janedoe2024.com'),
('33333333-3333-3333-3333-333333333333', 'biography', 'Independent candidate supporting transparency and accountability.'),
('33333333-3333-3333-3333-333333333336', 'biography', 'Former prosecutor with 15 years experience in criminal justice.'),
('33333333-3333-3333-3333-333333333337', 'biography', 'Current assistant DA specializing in white-collar crime.');

COMMIT;