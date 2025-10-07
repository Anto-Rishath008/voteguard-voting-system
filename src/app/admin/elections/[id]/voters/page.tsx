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
  UserCheck,
  UserX,
  Trash2,
  AlertCircle,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface EligibleVoter {
  id: number;
  user_id: string;
  status: string;
  added_at: string;
  first_name: string;
  last_name: string;
  email: string;
  has_voted: boolean;
}

interface AvailableUser {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_eligible: boolean;
}

interface Election {
  election_name: string;
  status: string;
}

export default function AdminElectionVotersPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [election, setElection] = useState<Election | null>(null);
  const [eligibleVoters, setEligibleVoters] = useState<EligibleVoter[]>([]);
  const [allVoters, setAllVoters] = useState<AvailableUser[]>([]);
  const [filteredVoters, setFilteredVoters] = useState<EligibleVoter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const electionId = params?.id as string;

  useEffect(() => {
    if (electionId) {
      loadVotersData();
    }
  }, [electionId]);

  useEffect(() => {
    filterVoters();
  }, [eligibleVoters, searchTerm]);

  const loadVotersData = async () => {
    try {
      setLoading(true);
      setError("");
      
      const response = await fetch(`/api/admin/elections/${electionId}/voters`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to load voters");
      }

      const data = await response.json();
      setElection(data.election);
      setEligibleVoters(data.eligibleVoters || []);
      setAllVoters(data.allVoters || []);
    } catch (err: any) {
      setError(err.message || "Failed to load voters");
      console.error("Error loading voters:", err);
    } finally {
      setLoading(false);
    }
  };

  const filterVoters = () => {
    if (!searchTerm.trim()) {
      setFilteredVoters(eligibleVoters);
      return;
    }

    const term = searchTerm.toLowerCase();
    const filtered = eligibleVoters.filter(
      (voter) =>
        voter.first_name.toLowerCase().includes(term) ||
        voter.last_name.toLowerCase().includes(term) ||
        voter.email.toLowerCase().includes(term)
    );
    setFilteredVoters(filtered);
  };

  const handleAddVoters = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one voter to add");
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      // Add each selected user
      const promises = selectedUsers.map(async (userId) => {
        const response = await fetch(`/api/admin/elections/${electionId}/voters`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ userId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add voter");
        }

        return response.json();
      });

      await Promise.all(promises);

      setSuccess(`Successfully added ${selectedUsers.length} voter(s)`);
      setSelectedUsers([]);
      setShowAddModal(false);
      
      // Reload the voters list
      await loadVotersData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add voters");
      console.error("Error adding voters:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveVoter = async (userId: string, voterName: string) => {
    if (!confirm(`Are you sure you want to remove ${voterName} from eligible voters?`)) {
      return;
    }

    try {
      setActionLoading(true);
      setError("");
      setSuccess("");

      const response = await fetch(
        `/api/admin/elections/${electionId}/voters?userId=${userId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to remove voter");
      }

      setSuccess(`Successfully removed ${voterName} from eligible voters`);
      
      // Reload the voters list
      await loadVotersData();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to remove voter");
      console.error("Error removing voter:", err);
    } finally {
      setActionLoading(false);
    }
  };

  const getAvailableUsers = () => {
    return allVoters.filter((user) => !user.is_eligible);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "eligible":
        return "bg-green-100 text-green-800";
      case "voted":
        return "bg-blue-100 text-blue-800";
      case "disabled":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
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

  const stats = {
    total: eligibleVoters.length,
    voted: eligibleVoters.filter((v) => v.has_voted).length,
    notVoted: eligibleVoters.filter((v) => !v.has_voted).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <Link
            href={`/admin/elections/${electionId}`}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Election
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Manage Eligible Voters
          </h1>
          {election && (
            <p className="mt-1 text-sm text-gray-600">
              {election.election_name} • {election.status}
            </p>
          )}
        </div>

        {/* Alerts */}
        {error && (
          <Alert type="error" onClose={() => setError("")} className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="text-green-800">{success}</p>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Eligible Voters
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.total}
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
                  <p className="text-sm font-medium text-gray-600">Has Voted</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.voted}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <UserX className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Not Voted
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats.notVoted}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Search */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex-1 w-full sm:max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button
                onClick={() => setShowAddModal(true)}
                disabled={actionLoading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Eligible Voters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Voters Table */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Eligible Voters ({filteredVoters.length})
            </h2>

            {filteredVoters.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm
                    ? "No voters match your search"
                    : "No eligible voters yet. Click 'Add Eligible Voters' to get started."}
                </p>
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
                        Vote Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Added
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredVoters.map((voter) => (
                      <tr key={voter.user_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {voter.first_name} {voter.last_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {voter.email}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              voter.status
                            )}`}
                          >
                            {voter.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {voter.has_voted ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              <span className="text-sm">Voted</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-600">
                              <XCircle className="h-4 w-4 mr-1" />
                              <span className="text-sm">Not Voted</span>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(voter.added_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleRemoveVoter(
                                voter.user_id,
                                `${voter.first_name} ${voter.last_name}`
                              )
                            }
                            disabled={actionLoading || voter.has_voted}
                            className={
                              voter.has_voted
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Voters Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 max-w-2xl shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Add Eligible Voters
                  </h3>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedUsers([]);
                      setError("");
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    Select users to add as eligible voters for this election.
                    Users who are already eligible will not appear in this list.
                  </p>
                </div>

                <div className="max-h-96 overflow-y-auto border rounded-lg">
                  {getAvailableUsers().length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">
                        All voters have been added to this election
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {getAvailableUsers().map((user) => (
                        <label
                          key={user.user_id}
                          className="flex items-center p-4 hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([
                                  ...selectedUsers,
                                  user.user_id,
                                ]);
                              } else {
                                setSelectedUsers(
                                  selectedUsers.filter(
                                    (id) => id !== user.user_id
                                  )
                                );
                              }
                            }}
                            className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          />
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 flex gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedUsers([]);
                      setError("");
                    }}
                    disabled={actionLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddVoters}
                    disabled={actionLoading || selectedUsers.length === 0}
                  >
                    {actionLoading
                      ? "Adding..."
                      : `Add ${selectedUsers.length > 0 ? selectedUsers.length : ""} Voter${selectedUsers.length !== 1 ? "s" : ""}`}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
