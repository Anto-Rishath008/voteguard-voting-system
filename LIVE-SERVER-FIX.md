# 🔧 Live Server Registration Error - Quick Fix Guide

## 🐛 Problem Summary
- ✅ Registration works on **localhost:8000**
- ❌ Registration fails on **live server (Vercel)** with:
  - `500 Internal Server Error` on `/api/auth/register`
  - `401 Unauthorized` on `/api/auth/profile`

## 🎯 Root Cause
**Environment variables in Vercel are not properly configured or database connection is failing.**

---

## 🚀 IMMEDIATE FIX (Follow These Steps)

### Step 1: Check Diagnostics API (NEW!)
After the new deployment is ready (wait ~1 minute), visit:
```
https://voteguard-omega.vercel.app/api/diagnostics
```

This will show you which environment variables are missing or incorrectly set.

**Expected Output:**
```json
{
  "timestamp": "2025-10-08T...",
  "environment": "production",
  "checks": {
    "database_url": true,
    "supabase_url": true,
    "supabase_anon_key": true,
    "supabase_service_key": true,
    "jwt_secret": true
  },
  "database_url_preview": "postgresql://postgres:%40cto...",
  "supabase_url": "https://dcbqzfcwohsjyzeutqwi.supabase.co"
}
```

If any check shows `false`, that variable is missing!

---

### Step 2: Fix Environment Variables in Vercel

#### Option A: Via Vercel Dashboard (Easiest - RECOMMENDED)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Click on your project: **voteguard**

2. **Navigate to Settings**
   - Click **Settings** tab
   - Click **Environment Variables** in left sidebar

3. **Check Each Variable** (click to expand and verify values):

   **Required Variables:**

   | Variable Name | Value | Environment |
   |--------------|-------|-------------|
   | `DATABASE_URL` | `postgresql://postgres:%40ctobeR%24002@db.dcbqzfcwohsjyzeutqwi.supabase.co:5432/postgres` | Production |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://dcbqzfcwohsjyzeutqwi.supabase.co` | Production |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYnF6ZmN3b2hzanl6ZXV0cXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDI0MzMsImV4cCI6MjA3NTE3ODQzM30.YxHn3wzHSRoQPass1ZyLMh7gtgVir7GthU9nIrUWH1s` | Production |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYnF6ZmN3b2hzanl6ZXV0cXdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwMjQzMywiZXhwIjoyMDc1MTc4NDMzfQ.Tgux6s1Rt5_F3iLj_VFDrF723_fIH9TK2039or72_-s` | Production |
   | `JWT_SECRET` | `jwt_secret_voting_system_2024` | Production |

4. **If any variable is missing or wrong:**
   - Click **Edit** or **Add Environment Variable**
   - Paste the correct value
   - Select **Production** environment
   - Click **Save**

5. **After updating variables:**
   - Scroll to top
   - Click **Deployments** tab
   - Click the ⋮ (three dots) on the latest deployment
   - Click **Redeploy**
   - OR wait for next git push to trigger auto-deployment

#### Option B: Via CLI (Faster but requires more steps)

```powershell
cd 'c:\Users\antor\OneDrive\Desktop\3rd year\SEMESTER-5\Cloud Computing\Project\voting-system\voting-system'

# Check current variables
vercel env ls

# If DATABASE_URL is wrong, update it:
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
# When prompted, paste: postgresql://postgres:%40ctobeR%24002@db.dcbqzfcwohsjyzeutqwi.supabase.co:5432/postgres

# If JWT_SECRET is wrong:
vercel env rm JWT_SECRET production
vercel env add JWT_SECRET production
# When prompted, paste: jwt_secret_voting_system_2024

# Redeploy
vercel --prod
```

---

### Step 3: Verify Database Connectivity

**Check if Supabase allows Vercel connections:**

1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `dcbqzfcwohsjyzeutqwi`
3. Click **Settings** → **Database**
4. Scroll to **Connection pooling**
   - ✅ Ensure it's **ENABLED**
5. Check **Network Restrictions**
   - ✅ Should allow all IPs or include Vercel's IP ranges
6. If you see **Connection pool mode**, set it to **Transaction** mode

---

### Step 4: Test After Fix

Once deployment is complete:

1. **Test Diagnostics API:**
   ```
   https://voteguard-omega.vercel.app/api/diagnostics
   ```
   All checks should be `true`

2. **Test Registration:**
   - Go to: https://voteguard-omega.vercel.app/register
   - Fill in the form
   - Click "Create Account"
   - ✅ Should see success message (not 500 error)

3. **Test Login:**
   - Go to: https://voteguard-omega.vercel.app/login
   - Login with registered account
   - ✅ Should redirect to dashboard

---

## 🔍 Common Issues & Solutions

### Issue 1: Still getting 500 error after updating env vars
**Solution:**
- Make sure you redeployed after updating variables
- Check deployment logs in Vercel for specific errors
- Visit `/api/diagnostics` to verify all variables loaded

### Issue 2: Database connection timeout
**Solution:**
- Verify Supabase database is running
- Check connection pooling is enabled
- Verify the DATABASE_URL has correct URL encoding (%40 for @, %24 for $)

### Issue 3: 401 on profile API
**Solution:**
- This happens when JWT_SECRET doesn't match
- Update JWT_SECRET in Vercel
- Clear browser cookies
- Login again

### Issue 4: Variables show as "Encrypted" but still fail
**Solution:**
- Delete the variable completely
- Re-add with correct value
- Make sure no extra spaces or quotes
- Redeploy

---

## 📊 Current Deployment Status

**Latest Deployment:** Queued (building now)
**Commit:** `4ad10d9` - Added diagnostics API
**Expected completion:** ~1 minute

Once ready, you'll have:
- ✅ New `/api/diagnostics` endpoint to check env vars
- ✅ Documentation for fixing the issues

---

## 🎯 Quick Checklist

Before proceeding:
- [ ] Wait for latest deployment to complete (check https://vercel.com/dashboard)
- [ ] Visit https://voteguard-omega.vercel.app/api/diagnostics
- [ ] Check which env vars are missing (false)
- [ ] Update missing/wrong variables in Vercel dashboard
- [ ] Redeploy from Vercel dashboard
- [ ] Test registration on live site
- [ ] Verify profile API works after login

---

## 📞 If Still Not Working

If after following all steps registration still fails:

1. **Check Vercel Deployment Logs:**
   - Go to Vercel dashboard → Deployments
   - Click on latest deployment
   - Check "Build Logs" and "Function Logs"
   - Look for error messages

2. **Check Browser Console:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Try registration
   - Click on failed request
   - Check Response tab for detailed error

3. **Test Database Connection:**
   - Try connecting to the database from a different tool
   - Verify credentials are correct
   - Check if Supabase service is operational

---

## 🎉 Expected Result

After fixing environment variables:

✅ **Registration should work** - New users can create accounts
✅ **Login should work** - Users can login and get JWT token
✅ **Profile API should work** - Returns user data with valid token
✅ **No more 500 or 401 errors**

---

**Next:** Wait for deployment to complete, then check `/api/diagnostics` endpoint!
