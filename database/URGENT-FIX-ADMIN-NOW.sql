-- ============================================================
-- URGENT: FIX ADMIN ACCESS NOW
-- ============================================================
-- Copy this entire script and paste it into Supabase SQL Editor
-- ============================================================

-- STEP 1: See ALL users and their roles
-- This shows everyone in your system
SELECT 
  u.user_id,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  u.status,
  COALESCE(
    array_agg(ur.role_name ORDER BY ur.role_name) FILTER (WHERE ur.role_name IS NOT NULL), 
    ARRAY[]::text[]
  ) as current_roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at
ORDER BY u.created_at;

-- ============================================================
-- STEP 2: QUICK FIX - Give Admin role to the FIRST user
-- (This is probably you!)
-- ============================================================
-- Uncomment the lines below (remove the -- at the start of each line)
-- Then click "Run" in Supabase SQL Editor
-- ============================================================

/*
DO $$
DECLARE
  v_user_id uuid;
  v_email text;
  v_name text;
BEGIN
  -- Get the first user created
  SELECT user_id, email, first_name || ' ' || last_name 
  INTO v_user_id, v_email, v_name
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No users found in the system!';
  END IF;
  
  -- Add Admin role
  INSERT INTO user_roles (user_id, role_name, assigned_at)
  VALUES (v_user_id, 'Admin', CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, role_name) DO NOTHING;
  
  -- Show success message
  RAISE NOTICE '✅ SUCCESS! Admin role added to:';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Email: %', v_email;
  RAISE NOTICE 'Name: %', v_name;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT: Log out and log back in to activate admin access!';
END $$;
*/

-- ============================================================
-- ALTERNATIVE: If you know your email, use this instead
-- ============================================================
-- Replace 'your-email@example.com' with YOUR actual email
-- Then uncomment and run
-- ============================================================

/*
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'your-email@example.com';  -- ⚠️ CHANGE THIS EMAIL!
BEGIN
  -- Find your user
  SELECT user_id INTO v_user_id 
  FROM users 
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_email;
  END IF;
  
  -- Add Admin role
  INSERT INTO user_roles (user_id, role_name, assigned_at)
  VALUES (v_user_id, 'Admin', CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, role_name) DO NOTHING;
  
  RAISE NOTICE '✅ SUCCESS! Admin role added to: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANT: Log out and log back in to activate admin access!';
END $$;
*/

-- ============================================================
-- STEP 3: VERIFY it worked
-- Replace 'your-email@example.com' with your email
-- ============================================================

/*
SELECT 
  u.user_id,
  u.email,
  u.first_name || ' ' || u.last_name as name,
  array_agg(ur.role_name ORDER BY ur.role_name) as roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
WHERE u.email = 'your-email@example.com'  -- ⚠️ CHANGE THIS!
GROUP BY u.user_id, u.email, u.first_name, u.last_name;
*/

-- ============================================================
-- AFTER RUNNING THIS:
-- 1. Log out of your application (http://localhost:8000)
-- 2. Log back in with your email and password
-- 3. Try accessing: http://localhost:8000/admin/users
-- 4. The 403 error should be GONE! ✅
-- ============================================================
