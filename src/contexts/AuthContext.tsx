"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { AuthService, type LocalAuthUser } from "@/lib/auth";

interface AuthContextType {
  user: LocalAuthUser | null;
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
  signOut: () => Promise<void>;
  hasRole: (role: "Voter" | "Admin" | "SuperAdmin") => boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<LocalAuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      const currentUser = await AuthService.getCurrentUserLocal();
      setUser(currentUser);
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Get initial session for local auth
    const getInitialSession = async () => {
      try {
        const currentUser = await AuthService.getCurrentUserLocal();
        setUser(currentUser);
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
      const result = await AuthService.signIn(email, password);

      if (result.error) {
        throw new Error(result.error);
      }

      // Update user state with the returned user
      setUser(result.user);
      return result;
    } catch (error) {
      console.error("Sign in error:", error);
      throw error;
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
      const result = await AuthService.registerLocal(
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        role
      );

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await AuthService.signOut();
      setUser(null);
    } catch (error) {
      console.error("Sign out error:", error);
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

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isAdmin,
    isSuperAdmin,
    refreshUser,
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
