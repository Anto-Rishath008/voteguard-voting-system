"use client";

import { useAuth } from "@/contexts/AuthContext";
import VoterDashboard from "@/components/dashboards/VoterDashboard";
import AdminDashboard from "@/components/dashboards/AdminDashboard";
import SuperAdminDashboard from "@/components/dashboards/SuperAdminDashboard";
import { Vote } from "lucide-react";

export default function DashboardPage() {
  const { user, hasRole, isAdmin, isSuperAdmin, loading } = useAuth();

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
          <p className="mt-4 text-gray-600">Please log in to access your dashboard</p>
        </div>
      </div>
    );
  }

  // Render role-specific dashboard
  if (isSuperAdmin) {
    return <SuperAdminDashboard />;
  }

  if (isAdmin) {
    return <AdminDashboard />;
  }

  // Default to voter dashboard
  return <VoterDashboard />;
}
