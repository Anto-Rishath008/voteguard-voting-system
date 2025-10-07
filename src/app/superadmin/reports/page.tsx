'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, BarChart3, Download, Calendar, TrendingUp } from 'lucide-react';

export default function SuperAdminReportsPage() {
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

  const reportMetrics = {
    availableReports: 6,
    generatedToday: 3,
    dataPoints: '15.4K',
    downloads: 127
  };

  const availableReports = [
    {
      id: '1',
      title: 'Election Summary Report',
      description: 'Comprehensive overview of all elections, votes, and participation rates',
      category: 'election',
      lastGenerated: '5/10/2025, 2:00:00 pm',
      icon: '📊'
    },
    {
      id: '2',
      title: 'User Activity Report',
      description: 'User registration, login patterns, and engagement metrics',
      category: 'user',
      lastGenerated: '4/10/2025, 7:52:00 pm',
      icon: '👥'
    },
    {
      id: '3',
      title: 'System Performance Report',
      description: 'Database performance, response times, and system health metrics',
      category: 'system',
      lastGenerated: '5/10/2025, 11:45:00 am',
      icon: '📈'
    },
    {
      id: '4',
      title: 'Security Audit Report',
      description: 'Security events, failed login attempts, and access patterns',
      category: 'security',
      lastGenerated: '5/10/2025, 3:15:00 pm',
      icon: '🔒'
    },
    {
      id: '5',
      title: 'Voting Patterns Analysis',
      description: 'Detailed analysis of voting behaviors and trends',
      category: 'election',
      lastGenerated: '3/10/2025, 10:00:00 pm',
      icon: '📊'
    },
    {
      id: '6',
      title: 'Complete Audit Trail',
      description: 'Full system audit log with all user actions and changes',
      category: 'system',
      lastGenerated: '5/10/2025, 3:00:00 pm',
      icon: '📋'
    }
  ];

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'election':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-green-100 text-green-800';
      case 'system':
        return 'bg-purple-100 text-purple-800';
      case 'security':
        return 'bg-red-100 text-red-800';
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
            <BarChart3 className="h-8 w-8 text-orange-600" />
            SuperAdmin System Reports
          </h1>
          <p className="mt-2 text-gray-600">
            Generate comprehensive system reports and analytics
          </p>
        </div>

        {/* Report Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Reports</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reportMetrics.availableReports}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Generated Today</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reportMetrics.generatedToday}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Data Points</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reportMetrics.dataPoints}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Download className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Downloads</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {reportMetrics.downloads}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Available Reports */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Available Reports
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableReports.map((report) => (
                <Card key={report.id} className="border border-gray-200">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{report.icon}</span>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {report.title}
                          </h3>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(report.category)}`}>
                            {report.category}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {report.description}
                    </p>
                    <div className="text-xs text-gray-500 mb-3">
                      Last generated: {report.lastGenerated}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 flex items-center gap-1">
                        <BarChart3 className="h-3 w-3" />
                        Generate
                      </Button>
                      <Button size="sm" variant="outline" className="flex items-center gap-1">
                        <Download className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}