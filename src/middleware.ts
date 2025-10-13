import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Define protected routes and their required roles
const protectedRoutes = {
  // Admin routes - require Admin or SuperAdmin
  "/admin": ["Admin", "SuperAdmin"],
  
  // SuperAdmin routes - require SuperAdmin only
  "/superadmin": ["SuperAdmin"],
  
  // User dashboard - require any authenticated user
  "/dashboard": ["Voter", "Admin", "SuperAdmin"],
  
  // Voting routes - require any authenticated user
  "/vote": ["Voter", "Admin", "SuperAdmin"],
  "/elections": ["Voter", "Admin", "SuperAdmin"],
  
  // Profile routes - require any authenticated user
  "/profile": ["Voter", "Admin", "SuperAdmin"],
} as const;

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/about",
  "/api/auth/callback",
  "/api/auth/login",
  "/api/auth/register",
  "/api/test-connection",
];

// Protected API routes that require authentication
const protectedApiRoutes = [
  "/api/admin",
  "/api/elections",
  "/api/vote",
  "/api/profile",
];

async function getUserRoleFromToken(token: string): Promise<string[] | null> {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key');
    const { payload } = await jwtVerify(token, secret);
    return (payload as any).roles || [];
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

function isRouteProtected(pathname: string): { isProtected: boolean; requiredRoles?: string[] } {
  // Check exact matches first
  for (const [route, roles] of Object.entries(protectedRoutes)) {
    if (pathname.startsWith(route)) {
      return { isProtected: true, requiredRoles: [...roles] };
    }
  }
  
  // Check if it's a protected API route
  for (const route of protectedApiRoutes) {
    if (pathname.startsWith(route)) {
      return { isProtected: true, requiredRoles: ["Voter", "Admin", "SuperAdmin"] };
    }
  }
  
  return { isProtected: false };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`🔒 Middleware checking: ${pathname}`);
  
  // Early debug for admin routes
  if (pathname.startsWith("/admin")) {
    console.log(`🔍 ADMIN ROUTE DETECTED: ${pathname}`);
  }
  
  // Skip middleware for static files and some API routes
  if (
    pathname.startsWith("/_next/") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublic = publicRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/"; // Only match exact root, not all paths
    }
    return pathname === route || pathname.startsWith(route + "/") || pathname.startsWith(route + "?");
  });
  console.log(`🔍 Is public route? ${isPublic} for ${pathname}`);
  
  if (isPublic) {
    return NextResponse.next();
  }

  // Check if route needs protection
  const { isProtected, requiredRoles } = isRouteProtected(pathname);
  console.log(`🔍 Is protected route? ${isProtected}, Required roles: ${requiredRoles?.join(', ') || 'none'} for ${pathname}`);
  
  if (!isProtected) {
    console.log(`🔍 Route not protected, allowing access: ${pathname}`);
    return NextResponse.next();
  }

  try {
    // Check for JWT token in cookies
    const token = request.cookies.get("auth-token")?.value;
    
    if (!token) {
      console.log(`No auth token found for protected route: ${pathname}, redirecting to login`);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Verify token and get user roles
    const userRoles = await getUserRoleFromToken(token);
    
    console.log(`🔒 DEBUG - Token found: ${!!token}, User roles: ${userRoles ? userRoles.join(', ') : 'none'} for route: ${pathname}`);
    
    if (!userRoles || userRoles.length === 0) {
      console.log(`Invalid token or no roles found for route: ${pathname}, redirecting to login`);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    console.log(`🔒 User roles: ${userRoles.join(', ')} for route: ${pathname}`);

    // Special handling: Redirect SuperAdmin users away from regular admin pages to SuperAdmin equivalents
    // ONLY if explicitly accessing /admin root, not sub-pages
    console.log(`🔒 DEBUG - Checking SuperAdmin redirect: hasToken=${!!token}, isSuperAdmin=${userRoles.includes("SuperAdmin")}, isExactAdminPath=${pathname === "/admin"}`);
    
    if (userRoles.includes("SuperAdmin") && pathname === "/admin") {
      console.log(`🚀 REDIRECTING SuperAdmin from ${pathname} to /superadmin`);
      return NextResponse.redirect(new URL("/superadmin", request.url));
    }

    // Special handling: Prevent regular Admin users from accessing SuperAdmin pages
    if (pathname.startsWith("/superadmin") && userRoles.includes("Admin") && !userRoles.includes("SuperAdmin")) {
      console.log(`Blocking Admin user from SuperAdmin route: ${pathname}`);
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Check if user has required role for this route
    if (requiredRoles && !requiredRoles.some(role => userRoles.includes(role))) {
      console.log(`Access denied for route: ${pathname}. User roles: ${userRoles}, Required: ${requiredRoles}`);
      
      // Redirect based on user's highest role
      if (userRoles.includes("SuperAdmin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else if (userRoles.includes("Admin")) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // User has required role, allow access
    return NextResponse.next();

  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};