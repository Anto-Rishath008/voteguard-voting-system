import { User } from "@supabase/supabase-js";
import { createClientComponentClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { verify } from "jsonwebtoken";
import { NextRequest } from "next/server";

export interface AuthUser extends User {
  roles?: string[];
  firstName?: string;
  lastName?: string;
  status?: "Active" | "Inactive" | "Suspended";
}

export interface LocalAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  status: "Active" | "Inactive" | "Suspended";
}

export type AuthMode = "supabase" | "local";

export class AuthService {
  private static supabase = createClientComponentClient();

  // Local Authentication Methods
  static async loginLocal(
    email: string,
    password: string
  ): Promise<{ user: LocalAuthUser | null; error: string | null }> {
    try {
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

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Login error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }

  static async registerLocal(
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string,
    role: string = "voter"
  ): Promise<{ user: LocalAuthUser | null; error: string | null }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          firstName,
          lastName,
          role,
        }),
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

  static async registerEnhanced(registrationData: any): Promise<{ user: LocalAuthUser | null; error: string | null }> {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        return { user: null, error: data.error || "Registration failed" };
      }

      return { user: data.user, error: null };
    } catch (error) {
      console.error("Enhanced registration error:", error);
      return { user: null, error: "Network error occurred" };
    }
  }

  static async logoutLocal(): Promise<void> {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });

      // Redirect to login page
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout error:", error);
      // Still redirect even if logout fails
      window.location.href = "/login";
    }
  }

  static async getCurrentUserLocal(): Promise<LocalAuthUser | null> {
    try {
      const response = await fetch("/api/auth/profile", {
        credentials: "same-origin",
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.user;
    } catch (error) {
      console.error("Get current user error:", error);
      return null;
    }
  }

  // Supabase Authentication Methods (existing)

  // Sign up new user
  static async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) {
    try {
      // Create user in Supabase Auth
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      // Wait for user to be created in auth, then create in our database
      // This might need to be done via a webhook or edge function in production
      const response = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: authData.user.id,
          email,
          firstName,
          lastName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create user profile");
      }

      return { user: authData.user, session: authData.session };
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  }

  // Sign in user (Local Authentication)
  static async signIn(email: string, password: string) {
    // Use the local authentication method we created
    const result = await this.loginLocal(email, password);

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  // Sign out user (Local Authentication)
  static async signOut() {
    // Use the local logout method we created
    await this.logoutLocal();
  }

  // Get current user with roles (Local Authentication)
  static async getCurrentUser(): Promise<LocalAuthUser | null> {
    // Use the local authentication method we created
    return await this.getCurrentUserLocal();
  }

  // Check if user has required role (Local Authentication)
  static async hasRole(
    requiredRole: "Voter" | "Admin" | "SuperAdmin"
  ): Promise<boolean> {
    try {
      const user = await this.getCurrentUserLocal();
      if (!user) return false;

      return user.roles.includes(requiredRole);
    } catch (error) {
      console.error("Check role error:", error);
      return false;
    }
  }

  // Reset password (Local Authentication - TODO: Implement email sending)
  static async resetPassword(email: string) {
    try {
      // TODO: Implement password reset with email
      // For now, just log the request
      console.log(`Password reset requested for: ${email}`);

      // In a real implementation, you would:
      // 1. Generate a reset token
      // 2. Store it in the database with expiration
      // 3. Send reset email with token link

      return { message: "Password reset functionality not yet implemented" };
    } catch (error) {
      console.error("Reset password error:", error);
      throw error;
    }
  }

  // Update password (Local Authentication - TODO: Implement)
  static async updatePassword(newPassword: string) {
    try {
      // TODO: Implement password update
      console.log("Password update not yet implemented");

      // In a real implementation, you would:
      // 1. Get current user from token
      // 2. Hash the new password
      // 3. Update in database
      // 4. Invalidate existing sessions

      return { message: "Password update functionality not yet implemented" };
    } catch (error) {
      console.error("Update password error:", error);
      throw error;
    }
  }

  // Listen to auth state changes (Local Authentication)
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    // For local auth, you would implement your own state change system
    // This is a placeholder for compatibility
    console.log("Auth state change listener not implemented for local auth");
    return { data: { subscription: null }, error: null };
  }
}

// JWT Verification Utility for API Routes
export interface JWTPayload {
  userId: string;
  email: string;
  roles: string[];
  firstName: string;
  lastName: string;
  iat?: number;
  exp?: number;
}

export function verifyJWT(request: NextRequest): {
  user: JWTPayload | null;
  error: string | null;
} {
  try {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
      return { user: null, error: "No authentication token provided" };
    }

    const decoded = verify(token, process.env.JWT_SECRET!) as JWTPayload;
    return { user: decoded, error: null };
  } catch (error) {
    console.error("JWT verification error:", error);
    return { user: null, error: "Invalid or expired token" };
  }
}
