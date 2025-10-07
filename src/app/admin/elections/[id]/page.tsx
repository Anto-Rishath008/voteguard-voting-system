"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Edit,
  Users,
  BarChart3,
  Calendar,
  Clock,
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Vote,
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  description: string;
  status: "Draft" | "Active" | "Completed" | "Cancelled";
  startDate: string;
  endDate: string;
  totalVoters: number;
  myVoteStatus: "not_voted" | "voted" | "ineligible";
  contests: Contest[];
}

interface Contest {
  id: string;
  title: string;
  contestType: string;
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  party: string;
}

export default function AdminElectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const electionId = params?.id as string;

  useEffect(() => {
    if (electionId) {
      fetchElectionDetails();
    }
  }, [electionId]);

  const fetchElectionDetails = async () => {
    try {
      const response = await fetch(`/api/elections/${electionId}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch election details");
      }

      const data = await response.json();
      setElection(data.election);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "text-green-600 bg-green-50 border-green-200";
      case "completed":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "draft":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "cancelled":
        return "text-red-600 bg-red-50 border-red-200";
      default:
        return "text-blue-600 bg-blue-50 border-blue-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading election details...</p>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="error" onClose={() => router.push("/admin/elections")}>
            {error || "Election not found"}
          </Alert>
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
            <Link href="/admin/elections">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Elections
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  {election.title}
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                    election.status
                  )}`}
                >
                  {election.status}
                </span>
              </div>
              {election.description && (
                <p className="mt-2 text-gray-600">{election.description}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 flex-wrap">
            {/* Vote Button - Show prominently if eligible and hasn't voted */}
            {election.status === "Active" && election.myVoteStatus === "not_voted" && (
              <Link href={`/elections/${election.id}/vote`}>
                <Button className="bg-green-600 hover:bg-green-700 text-white">
                  <Vote className="h-4 w-4 mr-2" />
                  Cast My Vote
                </Button>
              </Link>
            )}
            <Link href={`/admin/elections/${election.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit Election
              </Button>
            </Link>
            <Link href={`/admin/elections/${election.id}/contests`}>
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage Contests
              </Button>
            </Link>
            <Link href={`/admin/elections/${election.id}/voters`}>
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Voters
              </Button>
            </Link>
            <Link href={`/admin/elections/${election.id}/results`}>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Results
              </Button>
            </Link>
          </div>
        </div>

        {/* Election Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Basic Information */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Election Schedule
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Start Date
                  </div>
                  <div className="text-gray-900">
                    {formatDate(election.startDate)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    End Date
                  </div>
                  <div className="text-gray-900">
                    {formatDate(election.endDate)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Participation Stats */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Participation
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Total Voters
                  </div>
                  <div className="text-2xl font-bold text-gray-900">
                    {election.totalVoters.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    My Vote Status
                  </div>
                  <div className="flex items-center gap-2">
                    {election.myVoteStatus === "voted" ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Voted</span>
                      </>
                    ) : election.myVoteStatus === "not_voted" ? (
                      <>
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        <span className="text-yellow-600">Not Voted</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600">Ineligible</span>
                      </>
                    )}
                  </div>
                  {/* Vote Now Button */}
                  {election.status === "Active" && election.myVoteStatus === "not_voted" && (
                    <Link href={`/elections/${election.id}/vote`}>
                      <Button className="mt-3 w-full bg-green-600 hover:bg-green-700">
                        <Vote className="h-4 w-4 mr-2" />
                        Cast My Vote
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Eye className="h-5 w-5 mr-2" />
                Status
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-700">
                    Current Status
                  </div>
                  <div
                    className={`inline-block px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                      election.status
                    )}`}
                  >
                    {election.status}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contests */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Contests ({election.contests?.length || 0})
            </h2>
            {election.contests && election.contests.length > 0 ? (
              <div className="space-y-6">
                {election.contests.map((contest) => (
                  <div key={contest.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {contest.title}
                      </h3>
                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {contest.contestType}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {contest.candidates?.map((candidate) => (
                        <div
                          key={candidate.id}
                          className="p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="font-medium text-gray-900">
                            {candidate.name}
                          </div>
                          {candidate.party && (
                            <div className="text-sm text-gray-600">
                              {candidate.party}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No contests configured for this election yet.</p>
                <Link href={`/admin/elections/${election.id}/contests`}>
                  <Button className="mt-4">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Contests
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
