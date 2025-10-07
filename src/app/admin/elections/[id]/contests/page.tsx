"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Modal, Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Users,
  Save,
  X,
  UserPlus,
  Settings,
} from "lucide-react";

interface Contest {
  id: number;
  title: string;
  contestType: "ChooseOne" | "YesNo";
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  party?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ManageContestsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [contests, setContests] = useState<Contest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [showContestModal, setShowContestModal] = useState(false);
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [editingContest, setEditingContest] = useState<Contest | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(
    null
  );
  const [activeContestId, setActiveContestId] = useState<number | null>(null);

  // Form states
  const [contestForm, setContestForm] = useState({
    title: "",
    contestType: "ChooseOne" as "ChooseOne" | "YesNo",
  });
  const [candidateForm, setCandidateForm] = useState({
    name: "",
    party: "",
    userId: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const electionId = params?.id as string;

  useEffect(() => {
    if (electionId) {
      fetchContests();
      fetchUsers();
    }
  }, [electionId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchContests = async () => {
    try {
      const response = await fetch(
        `/api/admin/elections/${electionId}/contests`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch contests");
      }

      const data = await response.json();
      setContests(data.contests || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch(`/api/admin/users/candidates`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users || []);
    } catch (err: any) {
      console.error("Error fetching users:", err);
    }
  };

  const handleCreateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/elections/${electionId}/contests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(contestForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create contest");
      }

      setSuccess("Contest created successfully!");
      setShowContestModal(false);
      setContestForm({ title: "", contestType: "ChooseOne" });
      await fetchContests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateContest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingContest) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/elections/${electionId}/contests/${editingContest.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(contestForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update contest");
      }

      setSuccess("Contest updated successfully!");
      setShowContestModal(false);
      setEditingContest(null);
      setContestForm({ title: "", contestType: "ChooseOne" });
      await fetchContests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContest = async (contestId: number) => {
    if (
      !confirm(
        "Are you sure you want to delete this contest? This will also delete all candidates."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/elections/${electionId}/contests/${contestId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete contest");
      }

      setSuccess("Contest deleted successfully!");
      await fetchContests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeContestId === null) return;

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/elections/${electionId}/contests/${activeContestId}/candidates`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(candidateForm),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add candidate");
      }

      setSuccess("Candidate added successfully!");
      setShowCandidateModal(false);
      setCandidateForm({ name: "", party: "", userId: "" });
      await fetchContests();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCandidate = async (
    contestId: number,
    candidateId: string
  ) => {
    if (!confirm("Are you sure you want to remove this candidate?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/elections/${electionId}/contests/${contestId}/candidates/${candidateId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete candidate");
      }

      setSuccess("Candidate removed successfully!");
      await fetchContests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openContestModal = (contest?: Contest) => {
    if (contest) {
      setEditingContest(contest);
      setContestForm({
        title: contest.title,
        contestType: contest.contestType,
      });
    } else {
      setEditingContest(null);
      setContestForm({ title: "", contestType: "ChooseOne" });
    }
    setShowContestModal(true);
  };

  const openCandidateModal = (contestId: number) => {
    setActiveContestId(contestId);
    setCandidateForm({ name: "", party: "", userId: "" });
    setSearchQuery("");
    setShowDropdown(false);
    setShowCandidateModal(true);
  };

  const handleUserSelect = (userId: string) => {
    const selectedUser = users.find((u) => u.id === userId);
    if (selectedUser) {
      setCandidateForm((prev) => ({
        ...prev,
        userId,
        name: selectedUser.name,
      }));
      setSearchQuery(selectedUser.name);
      setShowDropdown(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading contests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link href={`/admin/elections/${electionId}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Election
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Manage Contests & Candidates
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Add and configure contests and their candidates
              </p>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => openContestModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Contest
            </Button>
          </div>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError("")} className="mb-6">
            {error}
          </Alert>
        )}

        {success && (
          <Alert type="success" onClose={() => setSuccess("")} className="mb-6">
            {success}
          </Alert>
        )}

        {/* Contests List */}
        <div className="space-y-6">
          {contests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Settings className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No contests yet
                </h3>
                <p className="text-gray-500 mb-4">
                  Create your first contest to start adding candidates
                </p>
                <Button onClick={() => openContestModal()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Contest
                </Button>
              </CardContent>
            </Card>
          ) : (
            contests.map((contest) => (
              <Card key={contest.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {contest.title}
                      </h3>
                      <span className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {contest.contestType === "ChooseOne"
                          ? "Choose One"
                          : "Yes/No"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openCandidateModal(contest.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add Candidate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openContestModal(contest)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteContest(contest.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Candidates */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      Candidates ({contest.candidates.length})
                    </h4>
                    {contest.candidates.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">
                        No candidates added yet
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {contest.candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-medium text-gray-900">
                                {candidate.name}
                              </div>
                              {candidate.party && (
                                <div className="text-sm text-gray-600">
                                  {candidate.party}
                                </div>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleDeleteCandidate(contest.id, candidate.id)
                              }
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Contest Modal */}
        <Modal
          isOpen={showContestModal}
          onClose={() => setShowContestModal(false)}
          title={editingContest ? "Edit Contest" : "Add Contest"}
        >
          <form
            onSubmit={
              editingContest ? handleUpdateContest : handleCreateContest
            }
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contest Title *
                </label>
                <Input
                  type="text"
                  required
                  value={contestForm.title}
                  onChange={(e) =>
                    setContestForm((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Enter contest title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contest Type *
                </label>
                <select
                  required
                  value={contestForm.contestType}
                  onChange={(e) =>
                    setContestForm((prev) => ({
                      ...prev,
                      contestType: e.target.value as "ChooseOne" | "YesNo",
                    }))
                  }
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ChooseOne">Choose One</option>
                  <option value="YesNo">Yes/No</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowContestModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                    {editingContest ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {editingContest ? "Update Contest" : "Create Contest"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>

        {/* Candidate Modal */}
        <Modal
          isOpen={showCandidateModal}
          onClose={() => setShowCandidateModal(false)}
          title="Add Candidate"
        >
          <form onSubmit={handleCreateCandidate}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User from System
                </label>
                <div className="relative" ref={dropdownRef}>
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowDropdown(true);
                    }}
                    onFocus={() => setShowDropdown(true)}
                    placeholder="Search for a user by name or email..."
                    className="w-full"
                  />
                  
                  {showDropdown && filteredUsers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredUsers.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user.id)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-600">{user.email}</div>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {showDropdown && searchQuery && filteredUsers.length === 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500">
                      No users found matching "{searchQuery}"
                    </div>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Start typing to search, or enter details manually below
                </p>
              </div>

              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Candidate Name *
                </label>
                <Input
                  type="text"
                  required
                  value={candidateForm.name}
                  onChange={(e) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  placeholder="Enter candidate name"
                />
                <p className="mt-1 text-xs text-gray-500">
                  This will be auto-filled if you select a user above
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Party/Affiliation
                </label>
                <Input
                  type="text"
                  value={candidateForm.party}
                  onChange={(e) =>
                    setCandidateForm((prev) => ({
                      ...prev,
                      party: e.target.value,
                    }))
                  }
                  placeholder="Enter party or affiliation (optional)"
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCandidateModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 mr-2 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Candidate
                  </>
                )}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
