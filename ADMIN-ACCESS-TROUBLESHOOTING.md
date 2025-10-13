# Admin Access Troubleshooting Guide

## Problem: "Admin or SuperAdmin access required" Error

You're seeing this error even though you think you're an admin. Here's why and how to fix it.

## Why This Happens

The voting system uses a **two-part authentication system**:

1. **JWT Token** - Created when you log in, contains your roles
2. **Database Roles** - Stored in the `user_roles` table

When you log in, the system:
- Checks your password ✅
- Looks up your roles in the `user_roles` table
- Creates a JWT token with those roles
- Stores the JWT token in a cookie

**The Problem**: If your account doesn't have an "Admin" or "SuperAdmin" role in the `user_roles` table, your JWT token won't include admin permissions.

## Quick Fix: Using the Web Interface

### Option 1: Automatic Fix (Easiest)

1. **Make sure you're logged in** to your application
2. **Visit this URL**: `http://localhost:8000/api/diagnostics/fix-my-role?add=true`
3. You'll see a JSON response confirming the Admin role was added
4. **Log out** of your application
5. **Log back in** - Your JWT token will now include the Admin role
6. ✅ You now have admin access!

### Option 2: Check Your Current Roles

1. **Visit**: `http://localhost:8000/api/diagnostics/fix-my-role`
2. This will show you:
   - Your current roles
   - Whether you have admin access
   - Instructions on how to fix it

## SQL Fix: Using Supabase SQL Editor

If you prefer to use SQL, or the API method doesn't work:

### Step 1: Open Supabase SQL Editor

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click on "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Find Your User ID

Run this query to see all users and their roles:

```sql
SELECT 
  u.user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.status,
  COALESCE(
    array_agg(ur.role_name ORDER BY ur.role_name) FILTER (WHERE ur.role_name IS NOT NULL), 
    ARRAY[]::text[]
  ) as current_roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at
ORDER BY u.created_at DESC;
```

Look for your email in the results and note your `user_id`.

### Step 3: Add Admin Role

**Method A: If you know your email** (easiest):

```sql
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'your-email@example.com'; -- ⚠️ CHANGE THIS!
BEGIN
  SELECT user_id INTO v_user_id FROM users WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found with email: %', v_email;
  END IF;
  
  INSERT INTO user_roles (user_id, role_name, assigned_at)
  VALUES (v_user_id, 'Admin', CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, role_name) DO NOTHING;
  
  RAISE NOTICE 'Admin role added successfully!';
END $$;
```

**Method B: If you know your user_id**:

```sql
INSERT INTO user_roles (user_id, role_name, assigned_at)
VALUES ('your-user-id-here', 'Admin', CURRENT_TIMESTAMP)
ON CONFLICT (user_id, role_name) DO NOTHING;
```

### Step 4: Verify the Role Was Added

```sql
SELECT 
  u.user_id,
  u.email,
  array_agg(ur.role_name ORDER BY ur.role_name) as all_roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
WHERE u.email = 'your-email@example.com'  -- ⚠️ CHANGE THIS!
GROUP BY u.user_id, u.email;
```

### Step 5: Log Out and Log Back In

**CRITICAL**: Your JWT token is created during login. You MUST:
1. Log out of your application
2. Log back in
3. Your new JWT token will include the Admin role
4. ✅ You now have admin access!

## Understanding the Role System

### Available Roles

- **Admin** - Full administrative access to most features
- **SuperAdmin** - Highest level access, can manage other admins
- **Voter** - Regular user with voting privileges (default)

### How Roles Work

1. When you register, you get the "Voter" role by default
2. Admin/SuperAdmin roles must be manually assigned
3. A user can have multiple roles simultaneously
4. The JWT token contains ALL your roles
5. API endpoints check for specific roles (Admin OR SuperAdmin)

## Common Issues

### Issue 1: "I added the role but still get 403 error"

**Solution**: Did you log out and log back in? The JWT token is only created during login, so you must:
1. Log out completely
2. Clear your cookies (optional but recommended)
3. Log back in
4. Try accessing the admin page again

### Issue 2: "The API endpoint returns 401 Unauthorized"

**Solution**: You're not logged in. Log in first, then try the fix endpoint.

### Issue 3: "I ran the SQL but nothing changed"

**Solution**: Check if the SQL actually succeeded:
- Look for any error messages in red
- Verify with the verification query (Step 4 above)
- Make sure you changed the email/user_id in the SQL

### Issue 4: "There are no users in my database"

**Solution**: You haven't registered yet!
1. Go to the registration page
2. Create your account
3. Then follow this guide to add the Admin role

## Prevention: Setting Up First Admin

When setting up a new system, always create the first admin:

```sql
-- Run this after creating your first user account
DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get the first user (you!)
  SELECT user_id INTO v_user_id 
  FROM users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  -- Add Admin role
  INSERT INTO user_roles (user_id, role_name, assigned_at)
  VALUES (v_user_id, 'Admin', CURRENT_TIMESTAMP)
  ON CONFLICT (user_id, role_name) DO NOTHING;
  
  RAISE NOTICE 'First user is now an Admin!';
END $$;
```

## Need More Help?

- Check the console logs in your browser (F12 → Console tab)
- Check the server logs in your terminal
- Look for error messages that mention "role", "admin", or "403"
- Make sure your database connection is working

## Files Related to This Issue

- `/src/lib/auth.ts` - JWT verification
- `/src/lib/supabase-auth.ts` - Role fetching from database
- `/src/app/api/admin/users/[id]/route.ts` - Admin endpoint with role check
- `/database/fix-my-admin-access.sql` - SQL script to fix roles
- `/src/app/api/diagnostics/fix-my-role/route.ts` - Web-based fix tool
