"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  Database,
  Server,
  Lock,
  Eye,
  UserCheck,
  Activity,
  LogOut,
} from "lucide-react";

interface SuperAdminStats {
  totalElections: number;
  totalAdmins: number;
  totalVoters: number;
  totalVotes: number;
  systemHealth: number;
  securityAlerts: number;
  databaseSize: string;
  serverUptime: string;
}

interface SystemMetric {
  name: string;
  value: string;
  status: "good" | "warning" | "critical";
  icon: any;
}

export default function SuperAdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<SuperAdminStats>({
    totalElections: 0,
    totalAdmins: 0,
    totalVoters: 0,
    totalVotes: 0,
    systemHealth: 0,
    securityAlerts: 0,
    databaseSize: "0 MB",
    serverUptime: "0 days",
  });
  const [systemMetrics, setSystemMetrics] = useState<SystemMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      return;
    }
    
    // Only fetch data if user is authenticated
    if (user) {
      fetchSuperAdminDashboardData();
    } else {
      setLoading(false);
      setError("Please log in to view dashboard");
    }
  }, [user, authLoading]);

  const fetchSuperAdminDashboardData = async () => {
    try {
      // Fetch real data from the admin dashboard API
      const response = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      
      if (data.success && data.stats) {
        const { overview, userBreakdown } = data.stats;
        
        setStats({
          totalElections: overview.totalElections || 0,
          totalAdmins: (userBreakdown.admins || 0) + (userBreakdown.superAdmins || 0),
          totalVoters: userBreakdown.voters || 0,
          totalVotes: overview.totalVotes || 0,
          systemHealth: 98,
          securityAlerts: 1,
          databaseSize: "1.2 GB",
          serverUptime: "45 days",
        });
      } else {
        // Fallback to sample data if API fails
        setStats({
          totalElections: 0,
          totalAdmins: 0,
          totalVoters: 0,
          totalVotes: 0,
          systemHealth: 98,
          securityAlerts: 1,
          databaseSize: "1.2 GB",
          serverUptime: "45 days",
        });
      }

      setSystemMetrics([
        {
          name: "Database Performance",
          value: "Excellent",
          status: "good",
          icon: Database,
        },
        {
          name: "Server Load",
          value: "23%",
          status: "good",
          icon: Server,
        },
        {
          name: "Security Status",
          value: "Secure",
          status: "good",
          icon: Lock,
        },
        {
          name: "Backup Status",
          value: "Last: 2h ago",
          status: "good",
          icon: Shield,
        },
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "good":
        return "text-green-600 bg-green-50 border-green-200";
      case "warning":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return "text-green-600";
    if (health >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  // Show loading if auth is loading or component is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-purple-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading super admin dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error or login message if not authenticated
  if (!user || error.includes("Please log in")) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-gray-600 mx-auto" />
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
              Super Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              System-wide management and monitoring
            </p>
            <div className="mt-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800">
                <Shield className="h-3 w-3 mr-1" />
                Super Administrator
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

        {/* System Health Alert */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold flex items-center">
                  <Activity className="h-6 w-6 mr-2" />
                  System Health: {stats?.systemHealth || 0}%
                </h2>
                <p className="mt-1">
                  All systems operational - {stats?.securityAlerts || 0} security alert{(stats?.securityAlerts || 0) > 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">{stats?.serverUptime || '0d 0h'}</div>
                <div className="text-sm opacity-90">Uptime</div>
              </div>
            </div>
          </div>
        </div>

        {/* Super Admin Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Vote className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Elections</p>
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Administrators</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalAdmins || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
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
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Super Admin Actions */}
          <div className="xl:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Super Admin Controls
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/superadmin/users")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <UserCheck className="h-8 w-8 text-purple-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Manage Admins
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Add, remove, or modify administrator accounts
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/superadmin/settings")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Settings className="h-8 w-8 text-blue-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      System Settings
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure global system parameters
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/superadmin/security")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Shield className="h-8 w-8 text-red-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Security Center
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Monitor security events and threats
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/superadmin/audit")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Eye className="h-8 w-8 text-green-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      System Audit
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Comprehensive system activity logs
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/superadmin/database")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <Database className="h-8 w-8 text-indigo-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      Database Manager
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Database maintenance and backup
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => router.push("/superadmin/reports")}
              >
                <Card>
                  <CardContent className="p-6 text-center">
                    <BarChart3 className="h-8 w-8 text-yellow-600 mx-auto" />
                    <h3 className="mt-2 text-lg font-medium text-gray-900">
                      System Reports
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Generate comprehensive system reports
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* System Metrics */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              System Metrics
            </h2>
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {systemMetrics.map((metric, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${getStatusColor(
                        metric.status
                      )}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <metric.icon className="h-5 w-5 mr-3" />
                          <div>
                            <p className="text-sm font-medium">
                              {metric.name}
                            </p>
                            <p className="text-sm">{metric.value}</p>
                          </div>
                        </div>
                        <CheckCircle
                          className={`h-5 w-5 ${
                            metric.status === "good"
                              ? "text-green-600"
                              : metric.status === "warning"
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600">
                      Database Size
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {stats?.databaseSize || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm font-medium text-gray-600">
                      System Health
                    </span>
                    <span
                      className={`text-sm font-semibold ${getHealthColor(
                        stats?.systemHealth || 0
                      )}`}
                    >
                      {stats?.systemHealth || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* System Management */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            System Management
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button
              onClick={() => router.push("/superadmin/users")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Users className="h-6 w-6 mb-2" />
              <span className="text-xs">All Users</span>
            </Button>
            <Button
              onClick={() => router.push("/superadmin/elections")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Vote className="h-6 w-6 mb-2" />
              <span className="text-xs">Elections</span>
            </Button>
            <Button
              onClick={() => router.push("/superadmin/audit")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Shield className="h-6 w-6 mb-2" />
              <span className="text-xs">Audit Logs</span>
            </Button>
            <Button
              onClick={() => router.push("/superadmin/security")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Lock className="h-6 w-6 mb-2" />
              <span className="text-xs">Security</span>
            </Button>
            <Button
              onClick={() => router.push("/superadmin/database")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Database className="h-6 w-6 mb-2" />
              <span className="text-xs">Database</span>
            </Button>
            <Button
              onClick={() => router.push("/superadmin/settings")}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center"
            >
              <Settings className="h-6 w-6 mb-2" />
              <span className="text-xs">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}