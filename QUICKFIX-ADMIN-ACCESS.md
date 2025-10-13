# 🚨 URGENT: Fix Your Admin Access in 5 Minutes

## Current Situation
- ✅ You CAN log in to the app
- ✅ Your server is running
- ❌ You get "403 Forbidden" when trying to access admin pages
- ❌ You don't have the Admin role in the database

## Quick Fix Steps

### Step 1: Open Supabase SQL Editor (30 seconds)

1. Go to: **https://supabase.com/dashboard**
2. Sign in if needed
3. Click on your project (should be named something like "voting-system")
4. On the left sidebar, click **"SQL Editor"**
5. Click **"New Query"** button

### Step 2: Run the SQL Script (1 minute)

1. Open this file: **`database/URGENT-FIX-ADMIN-NOW.sql`**
2. Find **STEP 1** - Run it to see all users
3. Look for YOUR email in the results - note the user_id
4. Go to **STEP 2** in the SQL file
5. Choose ONE of these options:

   **Option A: Give admin to first user (easiest)**
   - Find the commented block starting with `/* DO $$`
   - **Remove ONLY the `/*` at the start and `*/` at the end**
   - Leave the code inside as-is
   - Click **"Run"** button
   - You should see: "✅ SUCCESS! Admin role added to..."

   **Option B: Use your specific email**
   - Scroll to the "ALTERNATIVE" section
   - Replace `'your-email@example.com'` with YOUR actual email (keep the quotes!)
   - Remove the `/*` and `*/` to uncomment
   - Click **"Run"** button

### Step 3: Verify It Worked (30 seconds)

In the SQL Editor, run this (replace with your email):

```sql
SELECT 
  u.email,
  array_agg(ur.role_name) as roles
FROM users u
LEFT JOIN user_roles ur ON u.user_id = ur.user_id
WHERE u.email = 'your-email@example.com'
GROUP BY u.email;
```

You should see your email with `{Admin}` in the roles column.

### Step 4: Refresh Your Login (1 minute)

**THIS IS CRITICAL - Don't skip!**

Your current login session doesn't know you're an admin yet. You MUST:

1. Go to your app: **http://localhost:8000**
2. **Click "Log Out"** (or go to http://localhost:8000/api/auth/logout)
3. **Log back in** with your email and password
4. During login, the system will fetch your NEW Admin role and put it in your JWT token

### Step 5: Test Admin Access (10 seconds)

1. Go to: **http://localhost:8000/admin/users**
2. You should see the admin users page
3. ✅ No more 403 error!

## Troubleshooting

### "I ran the SQL but still get 403"
**Did you log out and back in?** This is REQUIRED. Your JWT token is only created during login.

### "The SQL gave an error"
Check:
- Did you replace `'your-email@example.com'` with your ACTUAL email?
- Did you keep the single quotes around the email?
- Did you remove both `/*` AND `*/`?

### "I don't see any users in STEP 1"
You need to register first:
1. Go to: http://localhost:8000/register
2. Create your account
3. Then come back and run the SQL

### "I see 'duplicate key value violates unique constraint'"
This means you ALREADY have the Admin role! Just log out and back in.

## Why This Happened

When you registered, your account was created with the default "Voter" role. Admin roles must be manually assigned for security reasons. This is normal for first-time setup.

## What Each File Does

- **`database/URGENT-FIX-ADMIN-NOW.sql`** - The SQL script to add Admin role
- **`database/fix-my-admin-access.sql`** - Detailed version with explanations
- **`ADMIN-ACCESS-TROUBLESHOOTING.md`** - Complete troubleshooting guide
- **`src/app/api/diagnostics/fix-my-role/route.ts`** - Web-based fix (requires login)

## Still Stuck?

Check the server console logs:
1. Look at your terminal where `npm run dev` is running
2. When you try to access the admin page, you'll see logs like:
   - `"🔍 DELETE - Auth check"` 
   - `"❌ This user needs either Admin or SuperAdmin role"`
3. This confirms the role is missing

## After You Fix It

Once you have admin access, you can:
- Create/edit elections
- Manage other users  
- View audit logs
- Access all admin features

The admin panel is at: **http://localhost:8000/admin**
