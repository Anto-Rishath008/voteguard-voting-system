"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Calendar,
  Users,
  Vote,
  Activity,
  FileText,
  TrendingUp,
  PieChart,
} from "lucide-react";

interface ReportData {
  id: string;
  name: string;
  description: string;
  type: "election" | "user" | "system" | "security";
  lastGenerated: string;
  icon: any;
}

export default function SystemReportsPage() {
  const { user, isSuperAdmin } = useAuth();
  const router = useRouter();
  const [reports, setReports] = useState<ReportData[]>([]);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Only SuperAdmins can access this page
  useEffect(() => {
    if (user && !isSuperAdmin) {
      router.push("/admin");
      return;
    }
    
    initializeReports();
  }, [user, isSuperAdmin, router]);

  const initializeReports = () => {
    setReports([
      {
        id: "election-summary",
        name: "Election Summary Report",
        description: "Comprehensive overview of all elections, votes, and participation rates",
        type: "election",
        lastGenerated: "2025-10-05T08:30:00Z",
        icon: Vote,
      },
      {
        id: "user-activity",
        name: "User Activity Report",
        description: "User registration, login patterns, and engagement metrics",
        type: "user",
        lastGenerated: "2025-10-04T14:22:00Z",
        icon: Users,
      },
      {
        id: "system-performance",
        name: "System Performance Report",
        description: "Database performance, response times, and system health metrics",
        type: "system",
        lastGenerated: "2025-10-05T06:15:00Z",
        icon: TrendingUp,
      },
      {
        id: "security-audit",
        name: "Security Audit Report",
        description: "Security events, failed login attempts, and access patterns",
        type: "security",
        lastGenerated: "2025-10-05T09:45:00Z",
        icon: Activity,
      },
      {
        id: "voting-patterns",
        name: "Voting Patterns Analysis",
        description: "Detailed analysis of voting behaviors and trends",
        type: "election",
        lastGenerated: "2025-10-03T16:30:00Z",
        icon: PieChart,
      },
      {
        id: "audit-trail",
        name: "Complete Audit Trail",
        description: "Full system audit log with all user actions and changes",
        type: "system",
        lastGenerated: "2025-10-05T10:00:00Z",
        icon: FileText,
      },
    ]);
  };

  const generateReport = async (reportId: string) => {
    setGenerating(reportId);
    setError("");
    
    try {
      // TODO: Implement actual report generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Update the report's last generated time
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, lastGenerated: new Date().toISOString() }
          : report
      ));
    } catch (err: any) {
      setError(err.message || "Failed to generate report");
    } finally {
      setGenerating(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "election":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-green-100 text-green-800";
      case "system":
        return "bg-purple-100 text-purple-800";
      case "security":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (!user || !isSuperAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-red-600 mx-auto" />
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
            <BarChart3 className="h-8 w-8 text-yellow-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Reports</h1>
              <p className="mt-1 text-sm text-gray-600">
                Generate comprehensive system reports
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert className="mb-6">
            <div className="text-red-600">{error}</div>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Available Reports</p>
                  <p className="text-2xl font-semibold text-gray-900">{reports.length}</p>
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
                  <p className="text-2xl font-semibold text-gray-900">3</p>
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
                  <p className="text-2xl font-semibold text-gray-900">15.4K</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Download className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Downloads</p>
                  <p className="text-2xl font-semibold text-gray-900">127</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => {
            const IconComponent = report.icon;
            const isGenerating = generating === report.id;
            
            return (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <IconComponent className="h-6 w-6 text-gray-600" />
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(report.type)}`}>
                      {report.type}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2">{report.name}</h3>
                  <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                  
                  <div className="mb-4">
                    <p className="text-xs text-gray-500">
                      Last generated: {new Date(report.lastGenerated).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => generateReport(report.id)}
                      disabled={isGenerating}
                      className="flex-1"
                    >
                      {isGenerating ? (
                        <>
                          <Activity className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Generate
                        </>
                      )}
                    </Button>
                    
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Scheduled Reports */}
        <Card className="mt-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Scheduled Reports</h2>
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Manage Schedule
              </Button>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">Daily System Health</p>
                    <p className="text-sm text-gray-600">Every day at 6:00 AM</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Vote className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-gray-900">Weekly Election Summary</p>
                    <p className="text-sm text-gray-600">Every Sunday at 11:00 PM</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-gray-900">Monthly Security Audit</p>
                    <p className="text-sm text-gray-600">1st of every month at 2:00 AM</p>
                  </div>
                </div>
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Active
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}