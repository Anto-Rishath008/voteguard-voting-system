"use client";

import { useAuth } from "@/contexts/AuthContext";
import VoterDashboard from "@/components/dashboards/VoterDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import { Vote } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { user, hasRole, isAdmin, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-gray-600 mx-auto" />
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard with explicit precedence
  // Only show SuperAdmin dashboard if user has ONLY SuperAdmin role or both roles
  // If user has only Admin role, show Admin dashboard
  const hasOnlyAdminRole = hasRole("Admin") && !hasRole("SuperAdmin");
  const hasOnlySuperAdminRole = hasRole("SuperAdmin") && !hasRole("Admin");
  const hasBothRoles = hasRole("Admin") && hasRole("SuperAdmin");

  if (hasOnlySuperAdminRole || hasBothRoles) {
    return <SuperAdminDashboard />;
  }

  if (hasOnlyAdminRole) {
    return <AdminDashboard />;
  }

  // Default to voter dashboard
  return <VoterDashboard />;
}
