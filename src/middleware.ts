import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";

// Define protected routes and their required roles
const protectedRoutes = {
  "/admin": ["Admin", "SuperAdmin"],
  "/super-admin": ["SuperAdmin"],
  "/dashboard": ["Voter", "Admin", "SuperAdmin"],
  "/vote": ["Voter", "Admin", "SuperAdmin"],
} as const;

// Public routes that don't require authentication
const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/about",
  "/api/auth/callback",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  // Skip middleware for static files and API routes (except protected API routes)
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return response;
  }

  // Check if route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return response;
  }

  try {
    const supabase = createMiddlewareClient(request, response);

    // Get session
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Auth error in middleware:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // If no session, redirect to login
    if (!session?.user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // Check if route requires specific role
    const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
      pathname.startsWith(route)
    )?.[1];

    if (requiredRoles) {
      // Get user with roles from database
      const userWithRoles = await DatabaseUtils.getUserWithRoles(
        session.user.id
      );

      if (!userWithRoles) {
        return NextResponse.redirect(new URL("/login", request.url));
      }

      // Check if user has any of the required roles
      const hasRequiredRole = requiredRoles.some((role) =>
        userWithRoles.roles.includes(role as any)
      );

      if (!hasRequiredRole) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }

      // Get IP address from headers
      const ipAddress =
        request.headers.get("x-forwarded-for") ||
        request.headers.get("x-real-ip") ||
        "unknown";

      // Update session activity
      const sessionId = await DatabaseUtils.createUserSession(
        session.user.id,
        ipAddress
      );

      if (sessionId) {
        await DatabaseUtils.updateSessionActivity(sessionId);
      }

      // Create audit log for page access
      await DatabaseUtils.createAuditLog(
        session.user.id,
        "LOGIN",
        "page_access",
        pathname,
        null,
        { pathname, timestamp: new Date().toISOString() },
        ipAddress,
        request.headers.get("user-agent") || "unknown"
      );
    }

    return response;
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
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
