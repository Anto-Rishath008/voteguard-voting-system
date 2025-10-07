"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { type AuthUser } from "@/lib/auth";

export interface EnhancedRegistrationData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  role: string;
  phoneNumber: string;
  aadhaarNumber: string;
  collegeId?: string;
  securityQuestions: { question: string; answer: string }[];
  fingerprintData: string;
  agreedToTerms: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string,
    role?: string
  ) => Promise<any>;
  signUpEnhanced: (data: EnhancedRegistrationData) => Promise<any>;
  signOut: () => Promise<void>;
  hasRole: (role: "Voter" | "Admin" | "SuperAdmin") => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshUser: () => Promise<void>;
  getDashboardPath: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Get initial session with timeout to prevent long loading states
    const getInitialSession = async () => {
      try {
        // Set a reasonable timeout for initial auth check
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Auth check timeout')), 2000)
        );
        
        const authPromise = fetch('/api/auth/profile', {
          method: 'GET',
          credentials: 'include',
        }).then(async (response) => {
          if (response.ok) {
            const data = await response.json();
            return { user: data.user, error: null };
          } else {
            return { user: null, error: 'Not authenticated' };
          }
        }).catch(() => ({ user: null, error: 'Network error' }));
        
        const result = await Promise.race([authPromise, timeoutPromise]);
        if (result && typeof result === 'object' && 'user' in result) {
          setUser((result as any).user);
        } else {
          setUser(result as AuthUser);
        }
      } catch (error) {
        console.error("Error getting initial session:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Update user state with the returned user
      setUser(data.user);
      return data;
    } catch (error) {
      console.error("Sign in error:", error);
      throw new Error("Network error occurred");
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    confirmPassword: string,
    firstName: string,
    lastName: string,
    role: string = "voter"
  ) => {
    setLoading(true);
    try {
      // Use the registration API directly since AuthService.registerLocal doesn't exist
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          confirmPassword,
          firstName,
          lastName,
          role
        }),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Registration failed');
      }

      return result;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpEnhanced = async (data: EnhancedRegistrationData) => {
    setLoading(true);
    try {
      // Use the enhanced registration API directly
      const response = await fetch('/api/auth/register-enhanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        throw new Error(result.error || 'Enhanced registration failed');
      }

      return result;
    } catch (error) {
      console.error("Enhanced sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      // Force a page refresh to clear all cached state
      if (typeof window !== 'undefined') {
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Sign out error:", error);
      // Still clear user state and redirect
      setUser(null);
      if (typeof window !== 'undefined') {
        window.location.href = "/";
      }
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: "Voter" | "Admin" | "SuperAdmin") => {
    if (!user?.roles) return false;

    // SuperAdmin has all permissions
    if (user.roles.includes("SuperAdmin")) return true;

    // Admin has Admin and Voter permissions
    if (role === "Voter" && user.roles.includes("Admin")) return true;

    return user.roles.includes(role);
  };

  const isAdmin = hasRole("Admin");
  const isSuperAdmin = hasRole("SuperAdmin");

  // Get the appropriate dashboard path based on user role
  const getDashboardPath = () => {
    if (!user) return "/login";
    if (hasRole("SuperAdmin") || hasRole("Admin")) return "/admin";
    return "/dashboard";
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signUpEnhanced,
    signOut,
    hasRole,
    isAdmin,
    isSuperAdmin,
    refreshUser,
    getDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
