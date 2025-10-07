"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Database,
  Server,
  HardDrive,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Activity,
} from "lucide-react";

interface DatabaseStats {
  connectionStatus: "connected" | "disconnected" | "warning";
  databaseType: string;
  version: string;
  size: string;
  lastBackup: string;
  tableCount: number;
  recordCount: number;
  uptime: string;
}

export default function DatabaseManagerPage() {
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [dbStats, setDbStats] = useState<DatabaseStats>({
    connectionStatus: "connected",
    databaseType: "PostgreSQL",
    version: "15.3",
    size: "1.2 GB",
    lastBackup: "2025-10-05T10:30:00Z",
    tableCount: 15,
    recordCount: 2547,
    uptime: "45 days, 12 hours",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [backingUp, setBackingUp] = useState(false);

  // Only SuperAdmins can access this page
  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.push("/admin");
      return;
    }
    
    fetchDatabaseStats();
  }, [user, isSuperAdmin, router]);

  const fetchDatabaseStats = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual database stats API
      // For now using mock data
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err: any) {
      setError(err.message || "Failed to fetch database stats");
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      // Test the database connection
      const response = await fetch("/api/admin/dashboard", {
        credentials: "include",
      });
      
      if (response.ok) {
        setDbStats(prev => ({ ...prev, connectionStatus: "connected" }));
      } else {
        setDbStats(prev => ({ ...prev, connectionStatus: "warning" }));
      }
    } catch (err) {
      setDbStats(prev => ({ ...prev, connectionStatus: "disconnected" }));
    } finally {
      setTestingConnection(false);
    }
  };

  const createBackup = async () => {
    setBackingUp(true);
    try {
      // TODO: Implement actual backup functionality
      await new Promise(resolve => setTimeout(resolve, 3000));
      setDbStats(prev => ({ 
        ...prev, 
        lastBackup: new Date().toISOString() 
      }));
    } catch (err: any) {
      setError(err.message || "Failed to create backup");
    } finally {
      setBackingUp(false);
    }
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case "connected":
        return "text-green-600 bg-green-100";
      case "warning":
        return "text-yellow-600 bg-yellow-100";
      case "disconnected":
        return "text-red-600 bg-red-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const getConnectionStatusIcon = (status: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle className="h-5 w-5" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5" />;
      case "disconnected":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Database className="h-5 w-5" />;
    }
  };

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Database className="h-12 w-12 text-red-600 mx-auto" />
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
            <Database className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Database Manager</h1>
              <p className="mt-1 text-sm text-gray-600">
                Database maintenance and backup
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6">
            <div className="text-red-600">{error}</div>
          </Alert>
        )}

        {/* Connection Status */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Connection Status</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
            
            <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${getConnectionStatusColor(dbStats.connectionStatus)}`}>
              {getConnectionStatusIcon(dbStats.connectionStatus)}
              <span className="font-medium capitalize">{dbStats.connectionStatus}</span>
            </div>
          </CardContent>
        </Card>

        {/* Database Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Database Type</p>
                  <p className="text-lg font-semibold text-gray-900">{dbStats.databaseType}</p>
                  <p className="text-xs text-gray-500">v{dbStats.version}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <HardDrive className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Database Size</p>
                  <p className="text-lg font-semibold text-gray-900">{dbStats.size}</p>
                  <p className="text-xs text-gray-500">{dbStats.tableCount} tables</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Activity className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-lg font-semibold text-gray-900">{dbStats.recordCount.toLocaleString()}</p>
                  <p className="text-xs text-gray-500">across all tables</p>
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
                  <p className="text-sm font-medium text-gray-600">Uptime</p>
                  <p className="text-lg font-semibold text-gray-900">45 days</p>
                  <p className="text-xs text-gray-500">12 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Backup Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Backup Management</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Last Backup</p>
                    <p className="text-sm text-gray-600">
                      {new Date(dbStats.lastBackup).toLocaleString()}
                    </p>
                  </div>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                
                <div className="flex gap-3">
                  <Button
                    onClick={createBackup}
                    disabled={backingUp}
                    className="flex-1"
                  >
                    {backingUp ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Creating Backup...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Create Backup
                      </>
                    )}
                  </Button>
                  
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Restore
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Database Health</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Connection Pool</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Healthy</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Query Performance</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">Optimal</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Index Usage</span>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-600">95%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Storage Usage</span>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm text-yellow-600">78%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4" />
                  <span className="font-medium">View Query Performance</span>
                </div>
                <p className="text-sm text-gray-600">Analyze slow queries and performance metrics</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <HardDrive className="h-4 w-4" />
                  <span className="font-medium">Storage Analysis</span>
                </div>
                <p className="text-sm text-gray-600">Review storage usage and optimization</p>
              </div>
            </Button>
            
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="flex items-center gap-2 mb-1">
                  <Server className="h-4 w-4" />
                  <span className="font-medium">Connection Monitor</span>
                </div>
                <p className="text-sm text-gray-600">Monitor active connections and sessions</p>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}