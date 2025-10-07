"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  Settings,
  Users,
  BarChart3,
  Shield,
  TrendingUp,
  Calendar,
  Vote,
  AlertTriangle,
  CheckCircle,
  Clock,
  LogOut,
} from "lucide-react";

interface AdminStats {
  totalElections: number;
  activeElections: number;
  totalVoters: number;
  totalVotes: number;
  pendingApprovals: number;
  systemAlerts: number;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  severity: "low" | "medium" | "high";
}

export default function AdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<AdminStats>({
    totalElections: 0,
    activeElections: 0,
    totalVoters: 0,
    totalVotes: 0,
    pendingApprovals: 0,
    systemAlerts: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    // Only fetch data if user is authenticated
    if (user) {
      fetchAdminDashboardData();
    } else {
      setLoading(false);
      setError("Please log in to view dashboard");
    }
  }, [user, authLoading]);

  const fetchAdminDashboardData = async () => {
    try {
      const response = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch admin dashboard data");
      }

      const data = await response.json();
      
      // Map the API response to the expected stats format
      if (data.stats && data.stats.overview) {
        setStats({
          totalElections: data.stats.overview.totalElections || 0,
          activeElections: data.stats.overview.activeElections || 0,
          totalVoters: data.stats.overview.totalUsers || 0,
          totalVotes: data.stats.votingMetrics?.totalVotes || data.stats.overview.totalVotes || 0,
          pendingApprovals: data.stats.overview.scheduledElections || 0,
          systemAlerts: 0, // This would need to be added to the API response
        });
      } else {
        // Fallback to default values
        setStats({
          totalElections: 0,
          activeElections: 0,
          totalVoters: 0,
          totalVotes: 0,
          pendingApprovals: 0,
          systemAlerts: 0,
        });
      }
      
      // Map recent activity
      if (data.stats && data.stats.recentActivity) {
        setRecentActivity(data.stats.recentActivity.map((activity: any) => ({
          id: activity.id,
          type: activity.action || "activity",
          description: activity.details || activity.description || "Activity logged",
          timestamp: activity.timestamp,
          severity: "low" as const
        })));
      } else {
        setRecentActivity([]);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "low":
        return "text-green-600 bg-green-50 border-green-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  // Show loading if auth is loading or component is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error or login message if not authenticated
  if (!user || error.includes("Please log in")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-gray-600 mx-auto" />
          <p className="mt-4 text-gray-600">Please log in to view your dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage elections, users, and system settings
            </p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                <Shield className="h-3 w-3 mr-1" />
                Administrator
              </span>
            </div>
          </div>
          <Button
            onClick={signOut}
            variant="outline"
            className="flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* System Alerts */}
        {(stats?.systemAlerts || 0) > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold flex items-center">
                    <AlertTriangle className="h-6 w-6 mr-2" />
                    System Alerts
                  </h2>
                  <p className="mt-1">
                    {stats?.systemAlerts || 0} issue{(stats?.systemAlerts || 0) > 1 ? 's' : ''} require{(stats?.systemAlerts || 0) === 1 ? 's' : ''} your attention
                  </p>
                </div>
                <Button
                  onClick={() => (window.location.href = "/admin/alerts")}
                  variant="secondary"
                  size="lg"
                >
                  Review Alerts
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Admin Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Vote className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Elections</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalElections || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.activeElections || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Voters</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalVoters || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Votes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalVotes || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.pendingApprovals || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Alerts</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.systemAlerts || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="xl:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Admin Quick Actions
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => (window.location.href = "/admin/elections/new")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Vote className="h-8 w-8 text-blue-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Create Election
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Set up a new election with candidates and contests
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => (window.location.href = "/admin/users")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Users className="h-8 w-8 text-green-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Manage Users
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add, edit, or remove voter accounts
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => (window.location.href = "/admin/elections")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-8 w-8 text-purple-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      View Results
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Monitor election results and analytics
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => (window.location.href = "/admin/audit")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="h-8 w-8 text-orange-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Audit Logs
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Review system activity and security events
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Recent Activity
            </h2>
            <Card>
              <CardContent className="p-6">
                {recentActivity.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">
                    No recent activity
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className={`p-3 rounded-lg border ${getSeverityColor(
                          activity.severity
                        )}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {activity.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {formatTimeAgo(activity.timestamp)}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              activity.severity === "high"
                                ? "bg-red-100 text-red-800"
                                : activity.severity === "medium"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-green-100 text-green-800"
                            }`}
                          >
                            {activity.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Management Links */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            System Management
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Button
              onClick={() => (window.location.href = "/admin/elections")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Vote className="h-6 w-6 mb-2" />
              Elections
            </Button>
            <Button
              onClick={() => (window.location.href = "/admin/users")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Users className="h-6 w-6 mb-2" />
              Users
            </Button>
            <Button
              onClick={() => (window.location.href = "/admin/audit")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Shield className="h-6 w-6 mb-2" />
              Audit Logs
            </Button>
            <Button
              onClick={() => (window.location.href = "/admin/settings")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Settings className="h-6 w-6 mb-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}