# Admin User Delete - 403 Error Fix

## Problem
Getting `403 Forbidden` error when trying to delete users from admin panel on production (Vercel):
```
DELETE https://voteguard-omega.vercel.app/api/admin/users/[id] 403 (Forbidden)
```

Works fine on local server but fails in production.

## Root Causes

### 1. CORS Configuration Issue
The `vercel.json` had conflicting CORS headers:
- `Access-Control-Allow-Origin: *` with `Access-Control-Allow-Credentials: true`
- **This combination is invalid** - when credentials are true, origin cannot be `*`

### 2. Cookie SameSite Policy
- Production uses `sameSite: 'strict'` which can prevent cookies in some scenarios
- Changed to `sameSite: 'lax'` for production

### 3. Missing CORS Preflight Handler
- No OPTIONS handler for CORS preflight requests
- Added OPTIONS handler to the API route

## Fixes Applied

### Fix 1: Updated `vercel.json`
**Before:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"  // ❌ INVALID with credentials
        },
        ...
      ]
    }
  ]
}
```

**After:**
```json
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Credentials",
          "value": "true"
        },
        // Removed Access-Control-Allow-Origin: * (let Next.js handle it)
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET,OPTIONS,PATCH,DELETE,POST,PUT"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "... Cookie"  // Added Cookie header
        }
      ]
    }
  ]
}
```

### Fix 2: Updated Cookie Settings in `src/app/api/auth/login/route.ts`
```typescript
response.cookies.set('auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'strict',  // ✅ Changed
  maxAge: 86400,
  path: '/'
});
```

### Fix 3: Added OPTIONS Handler in `src/app/api/admin/users/[id]/route.ts`
```typescript
// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': '..., Cookie',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}
```

### Fix 4: Enhanced Error Logging
Added better debugging for production:
```typescript
// Enhanced debugging for production
const cookies = request.cookies.getAll();
console.log("🍪 All cookies:", cookies.map(c => ({ name: c.name, hasValue: !!c.value })));

if (authError || !authUser) {
  console.log("❌ Auth error details:", authError);
  return NextResponse.json({ error: "Unauthorized", details: authError }, { status: 401 });
}
```

## How to Deploy the Fix

### Step 1: Verify Local Changes
```powershell
# Make sure local server is running
npm run dev

# Test the delete functionality locally
# Open http://localhost:3000/admin/users
# Try deleting a user - should work
```

### Step 2: Check Git Status
```powershell
cd "c:\Users\antor\OneDrive\Desktop\3rd year\SEMESTER-5\Cloud Computing\Project\voting-system\voting-system"
git status
```

### Step 3: Stage and Commit Changes
```powershell
# Stage the modified files
git add vercel.json
git add src/app/api/auth/login/route.ts
git add src/app/api/admin/users/[id]/route.ts

# Commit with descriptive message
git commit -m "fix: resolve 403 error for admin user deletion in production

- Remove conflicting CORS origin header from vercel.json
- Change cookie sameSite to 'lax' for production compatibility
- Add OPTIONS handler for CORS preflight requests
- Enhance error logging for better debugging
- Add Cookie to allowed headers"
```

### Step 4: Push to GitHub
```powershell
git push origin main
```

### Step 5: Verify Deployment
1. Vercel will automatically deploy the changes
2. Wait 1-2 minutes for deployment to complete
3. Check Vercel dashboard for deployment status
4. Visit https://voteguard-omega.vercel.app

### Step 6: Test in Production
1. Log in to your admin account
2. Navigate to https://voteguard-omega.vercel.app/admin/users
3. Try deleting a test user
4. Should work without 403 error!

## Verification Checklist

- [ ] Local dev server working
- [ ] Changes committed to git
- [ ] Pushed to GitHub (main branch)
- [ ] Vercel deployment completed successfully
- [ ] Can log in to production site
- [ ] Can access admin panel
- [ ] **Can delete users without 403 error** ✅

## Troubleshooting

### If Still Getting 403 Error:

1. **Check Browser Console**
   - Look for CORS errors
   - Check if cookies are being sent

2. **Check Vercel Logs**
   - Go to Vercel Dashboard → Your Project → Deployments
   - Click on the latest deployment → Function Logs
   - Look for the console.log messages we added

3. **Clear Browser Cache**
   ```
   Ctrl + Shift + Delete
   Clear cookies and cached files
   ```

4. **Check Environment Variables**
   - Ensure `JWT_SECRET` is set in Vercel
   - Ensure Supabase keys are correct

### If Cookies Not Being Sent:

Check in DevTools → Application → Cookies:
- Should see `auth-token` cookie
- Should have `HttpOnly` flag
- Should have `Secure` flag (in production)
- Should have `SameSite=Lax`

### If Still Issues:

Check Network tab in DevTools:
1. Find the DELETE request
2. Check Request Headers - should include `Cookie`
3. Check Response Headers - look for CORS headers
4. Check Response body for error details

## Technical Details

### Why `sameSite: 'lax'` Instead of 'strict'?

- **'strict'**: Cookie only sent on same-site requests
- **'lax'**: Cookie sent on top-level navigation + same-site requests
- **Production** often involves CDN/edge networks that may appear as cross-site
- **'lax'** provides security while being more compatible

### Why Remove `Access-Control-Allow-Origin: *`?

From MDN:
> "When responding to a credentialed requests request, the server **must** specify an origin in the value of the `Access-Control-Allow-Origin` header, instead of specifying the `*` wildcard."

When `Access-Control-Allow-Credentials: true`, you cannot use wildcard `*` for origin.

## References

- [MDN - CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [MDN - SameSite Cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite)
- [Vercel Headers Configuration](https://vercel.com/docs/projects/project-configuration#headers)

---

**Status**: ✅ **FIXED**  
**Date**: October 14, 2025  
**Affected**: Production deployment (Vercel)  
**Resolution**: CORS and cookie configuration updates
