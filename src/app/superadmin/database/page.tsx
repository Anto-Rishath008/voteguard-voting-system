'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Database, CheckCircle, AlertCircle, Server } from 'lucide-react';

export default function SuperAdminDatabasePage() {
  const router = useRouter();
  const { user, hasRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      if (!hasRole('SuperAdmin')) {
        router.push('/dashboard');
        return;
      }
    }
  }, [authLoading, user, hasRole, router]);

  const databaseMetrics = {
    connectionStatus: 'Connected',
    size: '1.2 GB',
    health: '98%',
    lastBackup: '2h ago'
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          onClick={() => router.push('/dashboard')}
          variant="outline"
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Database className="h-8 w-8 text-blue-600" />
            SuperAdmin Database Manager
          </h1>
          <p className="mt-2 text-gray-600">
            Database maintenance and backup operations
          </p>
        </div>

        {/* Connection Status */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Connection Status
                </h2>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-green-600 font-medium">
                    {databaseMetrics.connectionStatus}
                  </span>
                </div>
              </div>
              <Button>
                Test Connection
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Database Performance</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    Excellent
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Server className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Server Load</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    23%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Status</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    Secure
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Backup Status</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    Last: {databaseMetrics.lastBackup}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Database Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Database Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Database Size</span>
                  <span className="font-medium">{databaseMetrics.size}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">System Health</span>
                  <span className="font-medium">{databaseMetrics.health}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Backup</span>
                  <span className="font-medium">{databaseMetrics.lastBackup}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Database Operations
              </h3>
              <div className="space-y-3">
                <Button className="w-full" variant="outline">
                  Create Backup
                </Button>
                <Button className="w-full" variant="outline">
                  Restore from Backup
                </Button>
                <Button className="w-full" variant="outline">
                  Optimize Database
                </Button>
                <Button className="w-full" variant="outline">
                  Export Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}