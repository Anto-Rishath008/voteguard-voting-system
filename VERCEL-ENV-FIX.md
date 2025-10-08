# Vercel Environment Variables Fix

## Issue Detected
- ❌ Registration failing with 500 error on live server
- ❌ Profile API returning 401 error
- ✅ Works fine on local server

## Root Cause
Environment variables in Vercel may be incorrectly configured or the database connection is failing from Vercel's servers.

## Current Vercel Environment Variables
```
✓ NEXT_PUBLIC_APP_URL
✓ NODE_ENV
✓ JWT_SECRET
✓ DATABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
✓ NEXT_PUBLIC_SUPABASE_URL
```

## Required Environment Variables (from .env.local)

### 1. Database Connection
```bash
DATABASE_URL=postgresql://postgres:%40ctobeR%24002@db.dcbqzfcwohsjyzeutqwi.supabase.co:5432/postgres
```

### 2. Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://dcbqzfcwohsjyzeutqwi.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYnF6ZmN3b2hzanl6ZXV0cXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDI0MzMsImV4cCI6MjA3NTE3ODQzM30.YxHn3wzHSRoQPass1ZyLMh7gtgVir7GthU9nIrUWH1s
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYnF6ZmN3b2hzanl6ZXV0cXdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwMjQzMywiZXhwIjoyMDc1MTc4NDMzfQ.Tgux6s1Rt5_F3iLj_VFDrF723_fIH9TK2039or72_-s
```

### 3. JWT Secret
```bash
JWT_SECRET=jwt_secret_voting_system_2024
```

### 4. Next Auth (Optional but recommended)
```bash
NEXTAUTH_URL=https://voteguard-omega.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here_2024
```

## Quick Fix Steps

### Option 1: Update via Vercel CLI (Fastest)

```powershell
cd 'c:\Users\antor\OneDrive\Desktop\3rd year\SEMESTER-5\Cloud Computing\Project\voting-system\voting-system'

# Update each environment variable
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production

# When prompted, paste:
postgresql://postgres:%40ctobeR%24002@db.dcbqzfcwohsjyzeutqwi.supabase.co:5432/postgres

# Repeat for other variables if needed
vercel env rm JWT_SECRET production
vercel env add JWT_SECRET production
# Paste: jwt_secret_voting_system_2024

# Redeploy
vercel --prod
```

### Option 2: Update via Vercel Dashboard (Recommended for verification)

1. **Go to Vercel Dashboard**
   - Visit: https://vercel.com/dashboard
   - Select project: `voteguard`

2. **Navigate to Settings → Environment Variables**

3. **Verify/Update these variables for Production:**

   | Variable Name | Value |
   |--------------|-------|
   | `DATABASE_URL` | `postgresql://postgres:%40ctobeR%24002@db.dcbqzfcwohsjyzeutqwi.supabase.co:5432/postgres` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://dcbqzfcwohsjyzeutqwi.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYnF6ZmN3b2hzanl6ZXV0cXdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MDI0MzMsImV4cCI6MjA3NTE3ODQzM30.YxHn3wzHSRoQPass1ZyLMh7gtgVir7GthU9nIrUWH1s` |
   | `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjYnF6ZmN3b2hzanl6ZXV0cXdpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTYwMjQzMywiZXhwIjoyMDc1MTc4NDMzfQ.Tgux6s1Rt5_F3iLj_VFDrF723_fIH9TK2039or72_-s` |
   | `JWT_SECRET` | `jwt_secret_voting_system_2024` |
   | `NEXTAUTH_URL` | `https://voteguard-omega.vercel.app` |
   | `NEXTAUTH_SECRET` | `your_nextauth_secret_here_2024` |

4. **Important Notes:**
   - Make sure to select **Production** environment
   - Also add to **Preview** if you want it to work in preview deployments
   - Click "Save" after each variable

5. **Redeploy the application**
   - Go to Deployments tab
   - Click the three dots on the latest deployment
   - Click "Redeploy"
   - OR push a new commit to trigger auto-deployment

## Possible Issues & Solutions

### Issue 1: Database Connection Timeout
**Symptom:** 500 error on registration
**Solution:** Verify Supabase database is accessible from Vercel's servers
- Check Supabase dashboard → Settings → Database
- Ensure "Enable connection pooling" is ON
- Verify IP restrictions (should allow all IPs or Vercel's IP ranges)

### Issue 2: JWT Secret Mismatch
**Symptom:** 401 error on profile API
**Solution:** Ensure JWT_SECRET in Vercel matches the one used to create tokens
- Update JWT_SECRET in Vercel
- Users may need to login again after this change

### Issue 3: Environment Variable Not Loading
**Symptom:** Variables show as encrypted but still fail
**Solution:** 
- Delete and re-add the variable
- Make sure no extra spaces or quotes
- Redeploy after changes

## Testing After Fix

### Test Registration API:
```bash
curl -X POST https://voteguard-omega.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpass123",
    "confirmPassword": "testpass123",
    "firstName": "Test",
    "lastName": "User",
    "role": "voter"
  }'
```

### Test Profile API (after login):
```bash
curl https://voteguard-omega.vercel.app/api/auth/profile \
  -H "Cookie: auth-token=YOUR_TOKEN_HERE"
```

## Quick Redeploy Command

```powershell
cd 'c:\Users\antor\OneDrive\Desktop\3rd year\SEMESTER-5\Cloud Computing\Project\voting-system\voting-system'
vercel --prod
```

## Expected Result After Fix
- ✅ Registration should work without 500 error
- ✅ Profile API should return user data without 401
- ✅ Login should work and create proper JWT tokens
- ✅ All functionality working same as localhost

## Next Steps
1. Update environment variables in Vercel dashboard
2. Redeploy the application
3. Test registration on live site
4. Verify user can login after registration
5. Check profile API returns correct data

---

**Note:** After updating environment variables in Vercel, you MUST redeploy for changes to take effect. The easiest way is to push a small commit or use the Vercel dashboard to trigger a redeploy.
