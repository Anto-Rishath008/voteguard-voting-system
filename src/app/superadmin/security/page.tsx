'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Shield, AlertTriangle, Lock, CheckCircle } from 'lucide-react';

export default function SuperAdminSecurityPage() {
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

  const securityMetrics = {
    status: 'Secure',
    activeAlerts: 1,
    failedLogins: 5,
    securityScore: 98
  };

  const recentSecurityEvents = [
    {
      id: '1',
      type: 'Failed Login',
      description: 'Multiple failed login attempts detected',
      timestamp: '2025-01-05 14:30:00',
      severity: 'medium'
    },
    {
      id: '2',
      type: 'Password Change',
      description: 'Admin password changed successfully',
      timestamp: '2025-01-05 12:15:00',
      severity: 'low'
    },
    {
      id: '3',
      type: 'Suspicious Activity',
      description: 'Unusual access pattern detected',
      timestamp: '2025-01-05 10:45:00',
      severity: 'high'
    }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
            <Shield className="h-8 w-8 text-red-600" />
            SuperAdmin Security Center
          </h1>
          <p className="mt-2 text-gray-600">
            Monitor security events and system threats
          </p>
        </div>

        {/* Security Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Status</p>
                  <p className="text-2xl font-semibold text-green-600">
                    {securityMetrics.status}
                  </p>
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
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityMetrics.activeAlerts}
                  </p>
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
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityMetrics.failedLogins}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Score</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {securityMetrics.securityScore}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Security Events */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Recent Security Events
            </h2>
            <div className="space-y-4">
              {recentSecurityEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(event.severity)}`}>
                        {event.type}
                      </span>
                      <span className="text-sm text-gray-500">
                        {event.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">
                      {event.description}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    View Details
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}