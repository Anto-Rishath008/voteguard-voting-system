"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  CheckCircle,
  Lock,
  Eye,
  Activity,
  Bell,
  UserX,
  FileText,
} from "lucide-react";

interface SecurityEvent {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

export default function SecurityCenterPage() {
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Only SuperAdmins can access this page
  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.push("/admin");
      return;
    }
    
    // Load security events
    fetchSecurityEvents();
  }, [user, isSuperAdmin, router]);

  const fetchSecurityEvents = async () => {
    try {
      // Mock security events for now
      setSecurityEvents([
        {
          id: "1",
          type: "warning",
          title: "Multiple failed login attempts",
          description: "5 failed login attempts from IP 192.168.1.100",
          timestamp: new Date().toISOString(),
          resolved: false,
        },
        {
          id: "2",
          type: "info",
          title: "New admin user created",
          description: "Admin user 'test.admin@example.com' was created",
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          resolved: true,
        },
        {
          id: "3",
          type: "error",
          title: "Database connection issue",
          description: "Temporary database connection timeout resolved",
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          resolved: true,
        },
      ]);
    } catch (err: any) {
      setError(err.message || "Failed to load security events");
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "error":
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case "warning":
        return <Bell className="h-5 w-5 text-yellow-600" />;
      default:
        return <Activity className="h-5 w-5 text-blue-600" />;
    }
  };

  const getEventBgColor = (type: string) => {
    switch (type) {
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-red-600 mx-auto" />
          <p className="mt-4 text-gray-600">Access denied. SuperAdmin role required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="outline"
            onClick={() => router.push("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin
          </Button>
          
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-red-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Security Center</h1>
              <p className="mt-1 text-sm text-gray-600">
                Monitor security events and threats
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6">
            <div className="text-red-600">{error}</div>
          </Alert>
        )}

        {/* Security Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Status</p>
                  <p className="text-2xl font-semibold text-green-600">Secure</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                  <p className="text-2xl font-semibold text-yellow-600">1</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Failed Logins</p>
                  <p className="text-2xl font-semibold text-blue-600">5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Eye className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Audit Events</p>
                  <p className="text-2xl font-semibold text-purple-600">324</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Security Events */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Recent Security Events</h2>
              <Button variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <Activity className="h-8 w-8 text-gray-400 mx-auto animate-pulse" />
                <p className="mt-4 text-gray-600">Loading security events...</p>
              </div>
            ) : securityEvents.length > 0 ? (
              <div className="space-y-4">
                {securityEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`p-4 rounded-lg border ${getEventBgColor(event.type)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getEventIcon(event.type)}
                        <div>
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {event.resolved ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resolved
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Active
                          </span>
                        )}
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Shield className="h-8 w-8 text-gray-400 mx-auto" />
                <p className="mt-4 text-gray-600">No security events found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6 text-center">
              <Lock className="h-8 w-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Change Security Settings</h3>
              <p className="text-sm text-gray-600 mb-4">Configure password policies and security rules</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push("/admin/settings")}
              >
                Open Settings
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Eye className="h-8 w-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">View Audit Logs</h3>
              <p className="text-sm text-gray-600 mb-4">Review detailed system activity logs</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push("/admin/audit")}
              >
                View Logs
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <UserX className="h-8 w-8 text-red-600 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Manage User Access</h3>
              <p className="text-sm text-gray-600 mb-4">Control user permissions and access levels</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => router.push("/admin/users")}
              >
                Manage Users
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}