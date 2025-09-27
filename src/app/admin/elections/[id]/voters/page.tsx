"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Search,
  Plus,
  Users,
  Mail,
  UserCheck,
  UserX,
  Download,
  Upload,
  Settings,
} from "lucide-react";

interface Voter {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: "Active" | "Inactive" | "Suspended";
  hasVoted: boolean;
  eligibilityStatus: "eligible" | "ineligible";
}

interface Election {
  id: string;
  title: string;
  status: string;
}

export default function AdminElectionVotersPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [voters, setVoters] = useState<Voter[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<Voter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eligibilityFilter, setEligibilityFilter] = useState<string>("all");

  const electionId = params?.id as string;

  useEffect(() => {
    if (electionId) {
      fetchElectionAndVoters();
    }
  }, [electionId]);

  useEffect(() => {
    filterVoters();
  }, [voters, searchTerm, statusFilter, eligibilityFilter]);

  const fetchElectionAndVoters = async () => {
    try {
      // Fetch election details
      const electionResponse = await fetch(`/api/elections/${electionId}`, {
        credentials: "include",
      });

      if (electionResponse.ok) {
        const electionData = await electionResponse.json();
        setElection({
          id: electionData.election.id,
          title: electionData.election.title,
          status: electionData.election.status,
        });
      }

      // Fetch voters (for now, we'll get all users - in a real system this would be filtered)
      const votersResponse = await fetch("/api/admin/users", {
        credentials: "include",
      });

      if (votersResponse.ok) {
        const votersData = await votersResponse.json();
        // Transform user data to voter format
        const votersList = votersData.users.map((user: any) => ({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          status: user.status,
          hasVoted: false, // TODO: Check actual vote status
          eligibilityStatus: "eligible" as const, // TODO: Check actual eligibility
        }));
        setVoters(votersList);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const filterVoters = () => {
    let filtered = voters;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (voter) =>
          voter.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          voter.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          voter.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((voter) => voter.status === statusFilter);
    }

    // Filter by eligibility
    if (eligibilityFilter !== "all") {
      filtered = filtered.filter(
        (voter) => voter.eligibilityStatus === eligibilityFilter
      );
    }

    setFilteredVoters(filtered);
  };

  const handleToggleEligibility = async (
    voterId: string,
    currentStatus: string
  ) => {
    try {
      const newStatus =
        currentStatus === "eligible" ? "ineligible" : "eligible";

      // TODO: Implement API call to update voter eligibility
      console.log(`Toggle eligibility for voter ${voterId} to ${newStatus}`);

      // Update local state for now
      setVoters((prev) =>
        prev.map((voter) =>
          voter.id === voterId
            ? {
                ...voter,
                eligibilityStatus: newStatus as "eligible" | "ineligible",
              }
            : voter
        )
      );
    } catch (err: any) {
      setError(err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "text-green-600 bg-green-50";
      case "Inactive":
        return "text-gray-600 bg-gray-50";
      case "Suspended":
        return "text-red-600 bg-red-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getEligibilityColor = (status: string) => {
    return status === "eligible"
      ? "text-green-600 bg-green-50"
      : "text-red-600 bg-red-50";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Users className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading voters...</p>
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
            <Link href={`/admin/elections/${electionId}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Election
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Voters
              </h1>
              {election && (
                <p className="mt-1 text-sm text-gray-600">
                  Election: {election.title}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import Voters
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export List
              </Button>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Voter
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError("")} className="mb-6">
            {error}
          </Alert>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search voters by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-48">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
              <div className="w-48">
                <select
                  value={eligibilityFilter}
                  onChange={(e) => setEligibilityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Eligibility</option>
                  <option value="eligible">Eligible</option>
                  <option value="ineligible">Ineligible</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Voters
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {voters.length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Eligible</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      voters.filter((v) => v.eligibilityStatus === "eligible")
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Have Voted
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {voters.filter((v) => v.hasVoted).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Ineligible
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {
                      voters.filter((v) => v.eligibilityStatus === "ineligible")
                        .length
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Voters List */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Voters ({filteredVoters.length})
              </h2>
            </div>

            {filteredVoters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No voters found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Voter
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Eligibility
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vote Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVoters.map((voter) => (
                      <tr key={voter.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {voter.firstName} {voter.lastName}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {voter.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              voter.status
                            )}`}
                          >
                            {voter.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getEligibilityColor(
                              voter.eligibilityStatus
                            )}`}
                          >
                            {voter.eligibilityStatus}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {voter.hasVoted ? (
                              <div className="flex items-center text-green-600">
                                <UserCheck className="h-4 w-4 mr-1" />
                                <span className="text-sm">Voted</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-600">
                                <UserX className="h-4 w-4 mr-1" />
                                <span className="text-sm">Not Voted</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleToggleEligibility(
                                  voter.id,
                                  voter.eligibilityStatus
                                )
                              }
                            >
                              {voter.eligibilityStatus === "eligible" ? (
                                <>
                                  <UserX className="h-3 w-3 mr-1" />
                                  Remove
                                </>
                              ) : (
                                <>
                                  <UserCheck className="h-3 w-3 mr-1" />
                                  Add
                                </>
                              )}
                            </Button>
                            <Button variant="outline" size="sm">
                              <Settings className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
