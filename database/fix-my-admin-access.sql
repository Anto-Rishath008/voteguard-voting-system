-- ========================================
-- ADMIN ACCESS FIX SCRIPT
-- ========================================
-- This script will help you diagnose and fix admin access issues
-- Run this script in your Supabase SQL editor or psql terminal
-- ========================================

-- STEP 1: List ALL users and their current roles
-- This helps you find your user_id
SELECT 
  u.user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.status,
  u.created_at,
  COALESCE(
    array_agg(ur.role_name ORDER BY ur.role_name) FILTER (WHERE ur.role_name IS NOT NULL), 
    ARRAY[]::text[]
  ) as current_roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at
ORDER BY u.created_at DESC;

-- ========================================
-- STEP 2: Check specific user by email
-- Replace 'your-email@example.com' with YOUR actual email
-- ========================================
/*
SELECT 
  u.user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.status,
  COALESCE(
    array_agg(ur.role_name) FILTER (WHERE ur.role_name IS NOT NULL), 
    ARRAY[]::text[]
  ) as current_roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
WHERE u.email = 'your-email@example.com'
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status;
*/

-- ========================================
-- STEP 3: ADD ADMIN ROLE TO YOUR USER
-- ========================================
-- METHOD 1: If you know your email, use this (EASIEST)
-- Replace 'your-email@example.com' with YOUR actual email
-- ========================================
/*
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'your-email@example.com'; -- CHANGE THIS!
BEGIN
  -- Get user ID by email
  SELECT user_id INTO v_user_id FROM users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_email;
  END IF;
  
  -- Add Admin role
  INSERT INTO user_roles (user_id, role_name, assigned_at)
  VALUES (v_user_id, 'Admin', CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, role_name) DO NOTHING;
  
  -- Verify it was added
  RAISE NOTICE 'Admin role added to user % (email: %)', v_user_id, v_email;
  RAISE NOTICE 'User now has roles: %', (
    SELECT array_agg(role_name) FROM user_roles WHERE user_id = v_user_id
  );
END $$;
*/

-- ========================================
-- METHOD 2: If you know your user_id, use this
-- Replace 'your-user-id-here' with your actual UUID
-- ========================================
/*
INSERT INTO user_roles (user_id, role_name, assigned_at)
VALUES ('your-user-id-here', 'Admin', CURRENT_TIMESTAMP)
ON CONFLICT (user_id, role_name) DO NOTHING;
*/

-- ========================================
-- STEP 4: VERIFY the role was added
-- Replace with your email or user_id
-- ========================================
/*
SELECT 
  u.user_id,
  u.email,
  u.first_name || ' ' || u.last_name as full_name,
  array_agg(ur.role_name ORDER BY ur.role_name) as all_roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
WHERE u.email = 'your-email@example.com'  -- or use: u.user_id = 'your-user-id'
GROUP BY u.user_id, u.email, u.first_name, u.last_name;
*/

-- ========================================
-- QUICK FIX: Give Admin role to FIRST user in system
-- (Only use this if you're the only user!)
-- ========================================
/*
DO $$
DECLARE
  v_user_id uuid;
  v_email text;
BEGIN
  -- Get the first user created in the system
  SELECT user_id, email INTO v_user_id, v_email 
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
  
  RAISE NOTICE 'Admin role added to first user: % (email: %)', v_user_id, v_email;
END $$;
*/

-- ========================================
-- OPTIONAL: Add SuperAdmin role instead of Admin
-- (SuperAdmin has more permissions than Admin)
-- ========================================
/*
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'your-email@example.com'; -- CHANGE THIS!
BEGIN
  SELECT user_id INTO v_user_id FROM users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_email;
  END IF;
  
  -- Add SuperAdmin role
  INSERT INTO user_roles (user_id, role_name, assigned_at)
  VALUES (v_user_id, 'SuperAdmin', CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, role_name) DO NOTHING;
  
  RAISE NOTICE 'SuperAdmin role added to user % (email: %)', v_user_id, v_email;
END $$;
*/

-- ========================================
-- AFTER RUNNING: Log out and log back in!
-- The JWT token is created during login, so you need to:
-- 1. Log out of your application
-- 2. Log back in
-- 3. The new Admin role will be in your JWT token
-- ========================================
