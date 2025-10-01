import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and API routes (except protected API routes)
  if (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check if route is public
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  try {
    // Check for JWT token in cookies
    const token = request.cookies.get("auth-token")?.value;
    
    if (!token) {
      console.log("No auth token found, redirecting to login");
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // For now, if there's a token, allow access
    // Role-based access control is handled at the API level
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