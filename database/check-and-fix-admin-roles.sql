-- Script to check and fix admin user roles
-- Run this to ensure your admin user has the proper role

-- STEP 1: Check all users and their roles
SELECT 
  u.user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.status,
  COALESCE(array_agg(ur.role_name) FILTER (WHERE ur.role_name IS NOT NULL), ARRAY[]::text[]) as roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status
ORDER BY u.created_at;

-- STEP 2: Find your user (replace 'your-email@example.com' with your actual email)
-- SELECT user_id, email, first_name, last_name FROM users WHERE email = 'your-email@example.com';

-- STEP 3: Check if your user has the Admin role
-- SELECT * FROM user_roles WHERE user_id = 'your-user-id-here';

-- STEP 4: If you don't have the Admin role, add it (replace 'your-user-id-here' with your actual user_id)
-- INSERT INTO user_roles (user_id, role_name, assigned_at)
-- VALUES ('your-user-id-here', 'Admin', CURRENT_TIMESTAMP)
-- ON CONFLICT (user_id, role_name) DO NOTHING;

-- STEP 5: Verify the role was added
-- SELECT 
--   u.user_id,
--   u.email,
--   array_agg(ur.role_name) as roles
-- FROM users u
-- LEFT JOIN user_roles ur ON u.user_id = ur.user_id
-- WHERE u.user_id = 'your-user-id-here'
-- GROUP BY u.user_id, u.email;

-- Quick fix: If you know your email, uncomment and modify this:
/*
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user ID by email (CHANGE THIS EMAIL!)
  SELECT user_id INTO v_user_id FROM users WHERE email = 'admin@example.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Add Admin role if not exists
    INSERT INTO user_roles (user_id, role_name, assigned_at)
    VALUES (v_user_id, 'Admin', CURRENT_TIMESTAMP)
    ON CONFLICT (user_id, role_name) DO NOTHING;
    
    RAISE NOTICE 'Admin role added to user %', v_user_id;
  ELSE
    RAISE NOTICE 'User not found with that email';
  END IF;
END $$;
*/
