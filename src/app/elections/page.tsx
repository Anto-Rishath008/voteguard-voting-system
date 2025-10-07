"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  Vote,
  Calendar,
  Clock,
  Users,
  Search,
  Filter,
  CheckCircle,
  Shield,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  description: string;
  status: "upcoming" | "active" | "completed";
  startDate: string;
  endDate: string;
  totalVoters: number;
  myVoteStatus: "not_voted" | "voted" | "ineligible";
  organizationName: string;
}

export default function ElectionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [elections, setElections] = useState<Election[]>([]);
  const [filteredElections, setFilteredElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && user) {
      // Elections page is accessible by all authenticated users
      fetchElections();
    } else if (!authLoading && !user) {
      // Redirect to login if not authenticated
      window.location.href = "/login";
    }
  }, [authLoading, user]);

  useEffect(() => {
    filterElections();
  }, [elections, searchTerm, statusFilter]);

  const fetchElections = async () => {
    try {
      const response = await fetch("/api/elections", {
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
      case "upcoming":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "completed":
        return "text-gray-600 bg-gray-50 border-gray-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getVoteStatusIcon = (status: string) => {
    switch (status) {
      case "voted":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "not_voted":
        return <Vote className="h-5 w-5 text-blue-600" />;
      case "ineligible":
        return <Shield className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getVoteStatusText = (status: string) => {
    switch (status) {
      case "voted":
        return "Voted";
      case "not_voted":
        return "Not Voted";
      case "ineligible":
        return "Not Eligible";
      default:
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading elections...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Back Navigation */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Elections</h1>
          <p className="mt-1 text-sm text-gray-600">
            View and participate in available elections
          </p>
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
              <Vote className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                {elections.length === 0
                  ? "No elections available"
                  : "No elections match your filters"}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {elections.length === 0
                  ? "Check back later for upcoming elections or contact your administrator."
                  : "Try adjusting your search or filter criteria."}
              </p>
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
                        <div className="flex items-center gap-2">
                          {getVoteStatusIcon(election.myVoteStatus)}
                          <span className="text-sm text-gray-600">
                            {getVoteStatusText(election.myVoteStatus)}
                          </span>
                        </div>
                      </div>

                      <p className="text-gray-600 mb-4 line-clamp-2">
                        {election.description}
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Starts</div>
                            <div>{formatDate(election.startDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Ends</div>
                            <div>{formatDate(election.endDate)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <div>
                            <div className="font-medium">Eligible Voters</div>
                            <div>{(election.totalVoters || 0).toLocaleString()}</div>
                          </div>
                        </div>
                      </div>

                      {election.organizationName && (
                        <div className="mt-3 text-sm text-gray-500">
                          Organization: {election.organizationName}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-6 flex-shrink-0">
                      {election.status?.toLowerCase() === "active" &&
                        election.myVoteStatus === "not_voted" && (
                          <Link href={`/elections/${election.id}/vote`}>
                            <Button size="sm" className="w-full">
                              Cast Vote
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          </Link>
                        )}

                      {election.myVoteStatus === "voted" && (
                        <Link href={`/elections/${election.id}/results`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            View Results
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </Link>
                      )}

                      <Link href={`/elections/${election.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          View Details
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        <div className="mt-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Election Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {elections.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Elections</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {elections.filter((e) => e.status?.toLowerCase() === "active").length}
                  </div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {elections.filter((e) => e.status === "upcoming").length}
                  </div>
                  <div className="text-sm text-gray-600">Upcoming</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {elections.filter((e) => e.myVoteStatus === "voted").length}
                  </div>
                  <div className="text-sm text-gray-600">Participated</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
