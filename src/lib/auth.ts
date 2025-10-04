import { verify } from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AuthUser {
  userId: string;
  email: string;
  roles?: string[];
  firstName?: string;
  lastName?: string;
  status?: "Active" | "Inactive" | "Suspended";
}

export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  primaryRole: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  // Azure Database Authentication Methods
  static async loginWithAzureDB(
    email: string,
    password: string
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Use our Azure Database login API
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: data.error || "Login failed" };
      }

      if (data.success && data.user && data.token) {
        // Store the JWT token (only in browser)
        if (typeof window !== 'undefined') {
          document.cookie = `auth-token=${data.token}; path=/; max-age=86400; secure; samesite=strict`;
        }

        return {
          user: {
            userId: data.user.userId || data.user.user_id,
            email: data.user.email,
            firstName: data.user.firstName || data.user.first_name,
            lastName: data.user.lastName || data.user.last_name,
            roles: data.user.roles || [],
            status: data.user.status,
          },
          error: null,
        };
      }

      return { user: null, error: "Authentication failed" };
    } catch (error) {
      console.error("Azure DB login error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }

  static async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: data.error || "Registration failed" };
      }

      if (data.success && data.user) {
        return {
          user: {
            userId: data.user.userId || data.user.user_id,
            email: data.user.email,
            firstName: data.user.firstName || data.user.first_name,
            lastName: data.user.lastName || data.user.last_name,
            roles: data.user.roles || [],
            status: data.user.status,
          },
          error: null,
        };
      }

      return { user: null, error: "Registration failed" };
    } catch (error) {
      console.error("Registration error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }

  static async logout(): Promise<void> {
    try {
      // Call logout API
      await fetch("/api/auth/logout", {
        method: "POST",
      });

      // Clear token cookie (only in browser)
      if (typeof window !== 'undefined') {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        // Don't redirect immediately - let the AuthContext handle state updates
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Still clear the cookie even if API call fails
      if (typeof window !== 'undefined') {
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      }
    }
  }

  static async getCurrentUser(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const response = await fetch("/api/auth/profile", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: data.error || "Failed to get user" };
      }

      if (data.success && data.user) {
        return {
          user: {
            userId: data.user.userId || data.user.user_id,
            email: data.user.email,
            firstName: data.user.firstName || data.user.first_name,
            lastName: data.user.lastName || data.user.last_name,
            roles: data.user.roles || [],
            status: data.user.status,
          },
          error: null,
        };
      }

      return { user: null, error: "User not found" };
    } catch (error) {
      console.error("Get current user error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }
}

// JWT Verification for server-side use
export function verifyJWT(request: NextRequest): { user: JWTPayload | null; error: string | null } {
  try {
    const token = request.cookies.get("auth-token")?.value;
    console.log("verifyJWT - Token present:", !!token);
    
    if (!token) {
      console.log("verifyJWT - No token found");
      return { user: null, error: "No authentication token" };
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.log("verifyJWT - JWT secret not configured");
      return { user: null, error: "JWT secret not configured" };
    }

    const decoded = verify(token, secret) as JWTPayload;
    console.log("verifyJWT - Successfully decoded for user:", decoded.userId);
    return { user: decoded, error: null };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { user: null, error: "Invalid token" };
  }
}

// Helper function to check if user has required role
export function hasRole(user: JWTPayload, requiredRole: string): boolean {
  return user.roles.includes(requiredRole);
}

export default AuthService;