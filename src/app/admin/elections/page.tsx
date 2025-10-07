"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Users,
  Calendar,
  Settings,
  BarChart3,
  ArrowLeft,
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  description: string;
  status: "draft" | "upcoming" | "active" | "completed";
  startDate: string;
  endDate: string;
  totalVoters: number;
  totalVotes: number;
  createdAt: string;
}

export default function AdminElectionsPage() {
  const { user, hasRole, loading: authLoading } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [filteredElections, setFilteredElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && user) {
      // Check if user has admin or superadmin role
      if (!hasRole("Admin") && !hasRole("SuperAdmin")) {
        window.location.href = "/dashboard"; // Redirect non-admin users
        return;
      }
      fetchElections();
    }
  }, [authLoading, user, hasRole]);

  useEffect(() => {
    filterElections();
  }, [elections, searchTerm, statusFilter]);

  const fetchElections = async () => {
    try {
      const response = await fetch("/api/admin/elections", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch elections");
      }

      const data = await response.json();
      setElections(data.elections);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterElections = () => {
    let filtered = elections;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (election) =>
          election.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          election.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter(
        (election) => election.status === statusFilter
      );
    }

    setFilteredElections(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "upcoming":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "completed":
        return "text-purple-600 bg-purple-50 border-purple-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleDeleteElection = async (electionId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this election? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/elections/${electionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete election");
      }

      setElections((prev) => prev.filter((e) => e.id !== electionId));
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
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
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Elections
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Create and manage your organization's elections
              </p>
            </div>
            <Link href="/admin/elections/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Election
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Search and Filter */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search elections..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    leftIcon={<Search className="h-5 w-5" />}
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Elections List */}
        {filteredElections.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {elections.length === 0
                  ? "No elections created yet"
                  : "No elections match your filters"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {elections.length === 0
                  ? "Get started by creating your first election."
                  : "Try adjusting your search or filter criteria."}
              </p>
              {elections.length === 0 && (
                <div className="mt-6">
                  <Link href="/admin/elections/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Election
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredElections.map((election) => (
              <Card
                key={election.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {election.title}
                        </h3>
                        <span
                          className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                            election.status
                          )}`}
                        >
                          {election.status.charAt(0).toUpperCase() +
                            election.status.slice(1)}
                        </span>
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {election.description}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm text-gray-500">
                        <div>
                          <div className="font-medium text-gray-700">
                            Start Date
                          </div>
                          <div>{formatDate(election.startDate)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">
                            End Date
                          </div>
                          <div>{formatDate(election.endDate)}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">
                            Eligible Voters
                          </div>
                          <div>{election.totalVoters.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">
                            Votes Cast
                          </div>
                          <div>{election.totalVotes.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-6 flex-shrink-0">
                      <Link href={`/admin/elections/${election.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </Link>

                      <Link href={`/admin/elections/${election.id}/edit`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>

                      <Link href={`/admin/elections/${election.id}/voters`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="h-4 w-4 mr-2" />
                          Voters
                        </Button>
                      </Link>

                      <Link href={`/admin/elections/${election.id}/results`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Results
                        </Button>
                      </Link>

                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteElection(election.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Election Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {elections.length}
                  </div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {elections.filter((e) => e.status === "draft").length}
                  </div>
                  <div className="text-sm text-gray-600">Draft</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {elections.filter((e) => e.status === "upcoming").length}
                  </div>
                  <div className="text-sm text-gray-600">Upcoming</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {elections.filter((e) => e.status?.toLowerCase() === "active").length}
                  </div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {elections.filter((e) => e.status === "completed").length}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
