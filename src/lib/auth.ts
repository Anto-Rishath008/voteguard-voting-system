import { User } from "@supabase/supabase-js";
import { createClientComponentClient } from "@/lib/supabase";
import { verify } from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AuthUser {
  id: string;
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
  private static supabase = createClientComponentClient();

  // Supabase Authentication Methods
  static async loginWithSupabase(
    email: string,
    password: string
  ): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Use our custom login API that handles Supabase authentication
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
          localStorage.setItem("auth_token", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        return {
          user: {
            id: data.user.id,
            email: data.user.email,
            roles: data.user.roles || [data.user.role],
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            status: "Active"
          },
          error: null
        };
      }

      return { user: null, error: "Invalid response from server" };
    } catch (error) {
      console.error("Supabase login error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      // Check if we're in the browser environment
      if (typeof window === 'undefined') {
        return null; // Return null on server-side
      }

      // First check if user is stored in localStorage
      const storedUser = localStorage.getItem("user");
      const storedToken = localStorage.getItem("auth_token");

      if (storedUser && storedToken) {
        // Verify the token is still valid
        const user = JSON.parse(storedUser);
        
        // Optionally verify token with server
        try {
          const response = await fetch("/api/auth/profile", {
            headers: {
              "Authorization": `Bearer ${storedToken}`
            }
          });

          if (response.ok) {
            return user;
          } else {
            // Token is invalid, clear storage
            this.clearAuthData();
            return null;
          }
        } catch (error) {
          // If profile check fails, but we have stored data, return it
          // This allows offline functionality
          console.warn("Profile check failed, using stored user data");
          return user;
        }
      }

      return null;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  static async logout(): Promise<void> {
    try {
      // Call logout API
      const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      // Always clear local storage
      this.clearAuthData();
    }
  }

  private static clearAuthData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
    }
  }

  // Register method
  static async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: data.error || "Registration failed" };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Registration error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }
}

// Server-side JWT verification function
export function verifyJWT(request: NextRequest): { user: JWTPayload | null; error: string | null } {
  try {
    const authHeader = request.headers.get("authorization");
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return { user: null, error: "No valid authorization header" };
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    const jwtSecret = process.env.JWT_SECRET || "voteguard_secret_key_2024";
    
    const decoded = verify(token, jwtSecret) as JWTPayload;
    return { user: decoded, error: null };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { user: null, error: "Invalid or expired token" };
  }
}