# Admin Access Fix - Summary

## Issue Identified
The error "Admin or SuperAdmin access required" was appearing when trying to access `/admin/users` because of an overly restrictive middleware redirect rule.

## Root Cause
The middleware at `src/middleware.ts` was automatically redirecting **ALL** SuperAdmin users from `/admin/*` routes to `/superadmin/*` routes, even when they wanted to explicitly access admin pages.

```typescript
// OLD CODE (problematic):
if (userRoles.includes("SuperAdmin") && pathname.startsWith("/admin") && !pathname.startsWith("/admin/api")) {
  const superAdminEquivalent = pathname.replace("/admin", "/superadmin");
  return NextResponse.redirect(new URL(superAdminEquivalent, request.url));
}
```

This meant:
- SuperAdmins trying to access `/admin/users` → redirected to `/superadmin/users`
- This redirect happened BEFORE the page could check authentication
- The page logic was correct, but users never reached it

## Fixes Applied

### 1. **Updated Middleware Redirect Logic** (`src/middleware.ts`)
Changed the SuperAdmin redirect to only trigger for the exact `/admin` route, not all admin sub-routes:

```typescript
// NEW CODE (fixed):
if (userRoles.includes("SuperAdmin") && pathname === "/admin") {
  return NextResponse.redirect(new URL("/superadmin", request.url));
}
```

Now:
- `/admin` → redirects to `/superadmin` (dashboard)
- `/admin/users` → allowed (no redirect)
- `/admin/elections` → allowed (no redirect)
- SuperAdmins can access both admin and superadmin pages

### 2. **Fixed Login API Response Format** (`src/app/api/auth/login/route.ts`)
Added missing fields to ensure AuthContext receives the data correctly:

```typescript
const response = NextResponse.json({
  success: true,  // Added
  message: "Login successful",
  user: {
    userId: user.user_id,  // Added
    id: user.user_id,
    // ... other fields
  },
  token: token  // Added for client-side reference
});
```

### 3. **Fixed Profile API Response Format** (`src/app/api/auth/profile/route.ts`)
Added `success: true` flag for consistency:

```typescript
return NextResponse.json({
  success: true,  // Added
  user: {
    // ... user fields
  }
});
```

### 4. **Added Cookie Path** (`src/app/api/auth/login/route.ts`)
Ensured the auth-token cookie is accessible across all routes:

```typescript
response.cookies.set('auth-token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 86400,
  path: '/'  // Added explicit path
});
```

### 5. **Created Debug Page** (`src/app/auth-debug/page.tsx`)
Added a diagnostic page at `/auth-debug` to help troubleshoot authentication issues:
- Shows current user from AuthContext
- Shows role checks (Voter, Admin, SuperAdmin)
- Shows Profile API response
- Shows Diagnostic check results
- Shows browser cookies

## How to Use

### Access Admin Pages
1. **As Admin user**: Navigate to `/admin/users` - should work directly
2. **As SuperAdmin user**: Navigate to `/admin/users` - should work directly (no longer redirected)
3. **As Voter**: Will be redirected to `/dashboard`

### Debug Authentication Issues
Visit `http://localhost:8000/auth-debug` to see:
- Your current authentication state
- Your roles
- Token information
- Cookie values

## Testing Steps

1. **Clear browser cache and cookies** (or use incognito mode)
2. **Login** with your admin/superadmin account
3. **Navigate to** `http://localhost:8000/admin/users`
4. **Expected result**: Should see the users page without any redirect

If issues persist:
1. Visit `/auth-debug` to check your role assignments
2. Verify your user has Admin or SuperAdmin role in the database:
   ```sql
   SELECT u.email, ur.role_name 
   FROM users u 
   LEFT JOIN user_roles ur ON u.user_id = ur.user_id 
   WHERE u.email = 'your-email@example.com';
   ```

## Database Role Check
If you still can't access admin pages, you might not have the Admin/SuperAdmin role assigned. Run this SQL to assign the role:

```sql
-- Replace 'your-email@example.com' with your actual email
INSERT INTO user_roles (user_id, role_name)
SELECT user_id, 'Admin'
FROM users
WHERE email = 'your-email@example.com'
ON CONFLICT (user_id, role_name) DO NOTHING;
```

## Files Modified
1. `src/middleware.ts` - Fixed SuperAdmin redirect logic
2. `src/app/api/auth/login/route.ts` - Fixed response format & cookie path
3. `src/app/api/auth/profile/route.ts` - Fixed response format
4. `src/app/auth-debug/page.tsx` - Created debug page (new file)

---

**Status**: ✅ Fixed and ready for testing
**Next Steps**: 
1. Restart the dev server (already done)
2. Clear browser cache/cookies
3. Test admin access
4. Use `/auth-debug` if issues persist
