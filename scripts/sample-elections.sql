-- Insert Sample Elections for Testing
-- Run this SQL in your Azure Database

-- First, get the SuperAdmin user ID (replace with actual UUID)
-- You can find this by running: SELECT user_id FROM users WHERE email = 'admin@voteguard.system';

-- Insert a sample election (you'll need to replace the creator UUID with the actual SuperAdmin user_id)
INSERT INTO elections (election_name, description, start_date, end_date, status, creator)
VALUES 
  ('2024 General Election', 'General election for mayor and city council', NOW() - INTERVAL '1 day', NOW() + INTERVAL '6 days', 'Active', (SELECT user_id FROM users WHERE email = 'admin@voteguard.system')),
  ('School Board Election', 'Election for school board members', NOW() + INTERVAL '1 day', NOW() + INTERVAL '10 days', 'Active', (SELECT user_id FROM users WHERE email = 'admin@voteguard.system'));

-- Get the election IDs for contests
-- You'll need to run this to get the actual election_id values, then update the contest inserts

-- Sample contest inserts (replace election_id with actual UUIDs from above)
-- INSERT INTO contests (election_id, contest_title, contest_type) VALUES 
--   ('your-election-uuid-here', 'Mayor', 'ChooseOne'),
--   ('your-election-uuid-here', 'City Council', 'ChooseOne');

-- Sample candidate inserts (replace contest_id and election_id with actual values)
-- INSERT INTO candidates (contest_id, election_id, candidate_name, party_affiliation, candidate_description) VALUES 
--   (contest_id, 'election-uuid', 'John Smith', 'Democratic Party', 'Experienced leader'),
--   (contest_id, 'election-uuid', 'Jane Doe', 'Republican Party', 'Business owner');