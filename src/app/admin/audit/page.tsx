"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import {
  ArrowLeft,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Activity,
  Shield,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  X,
} from "lucide-react";

interface AuditLog {
  audit_log_id: string;
  operation_type: string;
  table_name?: string;
  resource_type?: string;
  resource_id?: string;
  details?: any;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  user_id: string;
  users?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
}

interface SummaryData {
  totalLogs: number;
  last24Hours: number;
  last7Days: number;
  firstLogDate: string | null;
  lastLogDate: string | null;
  actionBreakdown: Record<string, number>;
  topUsers: Array<{ user_id: string; name: string; email: string; count: number }>;
  topTables: Array<{ table: string; count: number }>;
  uniqueUsers: number;
  uniqueTables: number;
}

interface UserOption {
  user_id: string;
  name: string;
  email: string;
  display: string;
}

export default function AdminAuditPage() {
  const router = useRouter();
  const { user, hasRole, loading: authLoading } = useAuth();
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [operationFilter, setOperationFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const itemsPerPage = 50;

  useEffect(() => {
    // Wait for auth to load
    if (authLoading) return;
    
    // Redirect if not admin or superadmin
    if (!hasRole("Admin") && !hasRole("SuperAdmin")) {
      router.push("/dashboard");
      return;
    }
    fetchAuditLogs();
  }, [authLoading, hasRole, router, currentPage, operationFilter, userFilter, dateFilter]);

  useEffect(() => {
    // Fetch users list for the dropdown
    if (authLoading) return;
    if (!hasRole("Admin") && !hasRole("SuperAdmin")) return;
    fetchUsers();
  }, [authLoading, hasRole]);

  // Early return after all hooks have been called
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }
  
  if (!hasRole("Admin") && !hasRole("SuperAdmin")) {
    return null;
  }

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (operationFilter !== "all") {
        params.append("operation", operationFilter);
      }
      if (userFilter) {
        params.append("userId", userFilter);
      }
      if (dateFilter) {
        params.append("startDate", dateFilter);
        // Add end date as the next day
        const endDate = new Date(dateFilter);
        endDate.setDate(endDate.getDate() + 1);
        params.append("endDate", endDate.toISOString().split("T")[0]);
      }

      const response = await fetch(
        `/api/admin/audit-logs?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setTotalLogs(data.total || 0);
      setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await fetch("/api/admin/users/list", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err.message);
    } finally {
      setUsersLoading(false);
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation.toUpperCase()) {
      case "LOGIN":
        return "text-green-700 bg-green-100";
      case "LOGOUT":
        return "text-gray-700 bg-gray-100";
      case "CREATE":
        return "text-blue-700 bg-blue-100";
      case "UPDATE":
        return "text-yellow-700 bg-yellow-100";
      case "DELETE":
        return "text-red-700 bg-red-100";
      case "VOTE":
        return "text-purple-700 bg-purple-100";
      default:
        return "text-gray-700 bg-gray-100";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatDetails = (details: any) => {
    if (!details) return "No details available";
    if (typeof details === "string") return details;
    return JSON.stringify(details, null, 2);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchAuditLogs();
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    alert("Export functionality will be implemented");
  };

  const fetchSummary = async () => {
    try {
      setSummaryLoading(true);
      const response = await fetch("/api/admin/audit-logs/summary", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch summary");
      }

      const data = await response.json();
      setSummary(data.summary);
      setShowSummary(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
              <p className="mt-1 text-sm text-gray-600">
                Monitor system activities and security events
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchSummary} variant="outline" disabled={summaryLoading}>
                <BarChart3 className="h-4 w-4 mr-2" />
                {summaryLoading ? "Loading..." : "Summary"}
              </Button>
              <Button onClick={handleExport} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">{error}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Operation Filter */}
              <select
                value={operationFilter}
                onChange={(e) => setOperationFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Operations</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="VOTE">Vote</option>
              </select>

              {/* User Filter */}
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={usersLoading}
              >
                <option value="">All Users</option>
                {usersLoading ? (
                  <option disabled>Loading users...</option>
                ) : (
                  users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.display}
                    </option>
                  ))
                )}
              </select>

              {/* Date Filter */}
              <Input
                type="date"
                placeholder="Filter by date..."
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />

              {/* Search Button */}
              <Button onClick={handleSearch}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs List */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Operation
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        {loading
                          ? "Loading audit logs..."
                          : "No audit logs found."}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.audit_log_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {log.users
                              ? `${log.users.first_name} ${log.users.last_name}`
                              : "Unknown User"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {log.users?.email || log.user_id}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getOperationColor(
                              log.operation_type
                            )}`}
                          >
                            {log.operation_type}
                          </span>
                          {log.resource_type && (
                            <div className="text-xs text-gray-500 mt-1">
                              {log.resource_type}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {formatDetails(log.details)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.ip_address || "N/A"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
              {Math.min(currentPage * itemsPerPage, totalLogs)} of {totalLogs}{" "}
              results
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="px-3 py-1 text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Summary Modal */}
        {showSummary && summary && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Audit Logs Summary</h2>
                <button
                  onClick={() => setShowSummary(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Overview Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-gray-500">Total Logs</div>
                      <div className="mt-2 text-3xl font-bold text-gray-900">
                        {summary.totalLogs.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-gray-500">Last 24 Hours</div>
                      <div className="mt-2 text-3xl font-bold text-blue-600">
                        {summary.last24Hours.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-sm font-medium text-gray-500">Last 7 Days</div>
                      <div className="mt-2 text-3xl font-bold text-green-600">
                        {summary.last7Days.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Time Range */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Time Range</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">First Log</div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(summary.firstLogDate)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Latest Log</div>
                        <div className="text-sm font-medium text-gray-900">
                          {formatDate(summary.lastLogDate)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Action Breakdown */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Action Breakdown
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {Object.entries(summary.actionBreakdown).map(([action, count]) => (
                        <div
                          key={action}
                          className="bg-gray-50 rounded-lg p-3 border border-gray-200"
                        >
                          <div className="text-xs text-gray-500 uppercase">{action}</div>
                          <div className="text-2xl font-bold text-gray-900 mt-1">
                            {count.toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top Active Users */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Top Active Users ({summary.uniqueUsers} total)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              User
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Email
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Activities
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summary.topUsers.length > 0 ? (
                            summary.topUsers.map((user, idx) => (
                              <tr key={user.user_id}>
                                <td className="px-4 py-2 text-sm text-gray-900">
                                  {user.name}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-500">
                                  {user.email}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                                  {user.count.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3} className="px-4 py-4 text-sm text-gray-500 text-center">
                                No user activity found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Top Tables */}
                <Card>
                  <CardContent className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Most Modified Tables ({summary.uniqueTables} total)
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Table Name
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Modifications
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {summary.topTables.length > 0 ? (
                            summary.topTables.map((table, idx) => (
                              <tr key={table.table}>
                                <td className="px-4 py-2 text-sm text-gray-900 font-mono">
                                  {table.table || "N/A"}
                                </td>
                                <td className="px-4 py-2 text-sm text-gray-900 text-right font-semibold">
                                  {table.count.toLocaleString()}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={2} className="px-4 py-4 text-sm text-gray-500 text-center">
                                No table activity found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
                <Button onClick={() => setShowSummary(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
