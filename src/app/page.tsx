"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import { Vote, Shield, Users, BarChart3, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showHomepage, setShowHomepage] = useState(true);

  useEffect(() => {
    // Show homepage for at least 2 seconds, then allow redirect for authenticated users
    const timer = setTimeout(() => {
      if (!loading && user && showHomepage) {
        // Only redirect if user clicks "Go to Dashboard" or after delay
        setShowHomepage(false);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [user, loading, showHomepage]);

  const handleGoToDashboard = () => {
    router.push("/dashboard");
  };

  // Only show loading for a brief moment to prevent long blank screens
  // After 1 second, show the homepage regardless to improve UX
  const [showLoading, setShowLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false);
    }, 800); // Show loading for max 800ms
    
    return () => clearTimeout(timer);
  }, []);

  if (loading && showLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Always show the homepage content - let the useEffect handle redirection
  // This ensures unauthenticated users see the landing page

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Vote className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                VoteGuard
              </span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                // Authenticated user options
                <>
                  <span className="text-sm text-gray-600">
                    Welcome, {user.firstName || user.email}
                  </span>
                  <Button onClick={handleGoToDashboard} variant="primary">
                    Go to Dashboard
                  </Button>
                </>
              ) : (
                // Unauthenticated user options
                <>
                  <Link href="/login">
                    <Button variant="ghost">Login</Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary">Get Started</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Secure Electronic Voting
            <span className="text-blue-600 block">Made Simple</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            VoteGuard provides a comprehensive electronic voting platform with
            advanced security features.
          </p>
        </div>
      </div>
    </div>
  );
}
