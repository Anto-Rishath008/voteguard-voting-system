"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  Vote,
  Calendar,
  Clock,
  Users,
  MapPin,
  Info,
  CheckCircle,
  Shield,
  ArrowLeft,
  ArrowRight,
  Award,
  FileText,
} from "lucide-react";

interface Contest {
  id: string;
  title: string;
  description: string;
  maxSelections: number;
  contestType: string;
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  party: string;
  description: string;
  imageUrl?: string;
}

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
  location?: string;
  instructions?: string;
  contests: Contest[];
}

export default function ElectionDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchElectionDetails();
    }
  }, [params.id]);

  const fetchElectionDetails = async () => {
    try {
      const response = await fetch(`/api/elections/${params.id}`, {
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
    const statusLower = status?.toLowerCase();
    switch (statusLower) {
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
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "not_voted":
        return <Vote className="h-6 w-6 text-blue-600" />;
      case "ineligible":
        return <Shield className="h-6 w-6 text-gray-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading election details...</p>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Alert type="error">{error || "Election not found"}</Alert>
          <div className="mt-4">
            <Link href="/elections">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Elections
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/elections">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Elections
            </Button>
          </Link>
        </div>

        {/* Election Header */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h1 className="text-3xl font-bold text-gray-900">
                      {election.title}
                    </h1>
                    <span
                      className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                        election.status
                      )}`}
                    >
                      {election.status.charAt(0).toUpperCase() +
                        election.status.slice(1)}
                    </span>
                  </div>

                  <p className="text-lg text-gray-600 mb-6">
                    {election.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-blue-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Start Date
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDateShort(election.startDate)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Clock className="h-6 w-6 text-green-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          End Date
                        </div>
                        <div className="text-sm text-gray-600">
                          {formatDateShort(election.endDate)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Users className="h-6 w-6 text-purple-600" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Eligible Voters
                        </div>
                        <div className="text-sm text-gray-600">
                          {election.totalVoters.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getVoteStatusIcon(election.myVoteStatus)}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          Your Status
                        </div>
                        <div className="text-sm text-gray-600">
                          {election.myVoteStatus === "voted"
                            ? "Voted"
                            : election.myVoteStatus === "not_voted"
                            ? "Not Voted"
                            : "Not Eligible"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {election.location && (
                    <div className="flex items-center gap-3 mt-4">
                      <MapPin className="h-5 w-5 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        {election.location}
                      </span>
                    </div>
                  )}
                </div>

                <div className="ml-8 flex flex-col gap-3">
                  {election.status?.toLowerCase() === "active" &&
                    election.myVoteStatus === "not_voted" && (
                      <Link href={`/elections/${election.id}/vote`}>
                        <Button size="lg" className="w-full">
                          Cast Your Vote
                          <ArrowRight className="h-5 w-5 ml-2" />
                        </Button>
                      </Link>
                    )}

                  {election.myVoteStatus === "voted" && (
                    <Link href={`/elections/${election.id}/results`}>
                      <Button variant="outline" size="lg" className="w-full">
                        View Results
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </Button>
                    </Link>
                  )}

                  {election.status?.toLowerCase() === "completed" && (
                    <Link href={`/elections/${election.id}/results`}>
                      <Button variant="outline" size="lg" className="w-full">
                        Final Results
                        <Award className="h-5 w-5 ml-2" />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Election Instructions */}
        {election.instructions && (
          <div className="mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <Info className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-2">
                      Voting Instructions
                    </h2>
                    <div className="text-gray-600 whitespace-pre-wrap">
                      {election.instructions}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Contests and Candidates */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">
            Contests & Candidates ({election.contests.length})
          </h2>

          {election.contests.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No contests available
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Contests and candidates will be available soon.
                </p>
              </CardContent>
            </Card>
          ) : (
            election.contests.map((contest) => (
              <Card key={contest.id}>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {contest.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{contest.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Type: {contest.contestType}</span>
                      <span>Max Selections: {contest.maxSelections}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contest.candidates.map((candidate) => (
                      <Card
                        key={candidate.id}
                        className="border border-gray-200"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                              {candidate.imageUrl ? (
                                <img
                                  src={candidate.imageUrl}
                                  alt={candidate.name}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <Users className="h-6 w-6 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {candidate.name}
                              </h4>
                              {candidate.party && (
                                <p className="text-sm text-gray-600 mb-1">
                                  {candidate.party}
                                </p>
                              )}
                              {candidate.description && (
                                <p className="text-sm text-gray-500 line-clamp-2">
                                  {candidate.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Election Timeline */}
        <div className="mt-12">
          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">
                Election Timeline
              </h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-blue-600"></div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Election Starts
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(election.startDate)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full bg-red-600"></div>
                  <div>
                    <div className="font-medium text-gray-900">
                      Election Ends
                    </div>
                    <div className="text-sm text-gray-600">
                      {formatDate(election.endDate)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center">
          <div className="flex gap-4">
            <Link href="/elections">
              <Button variant="outline">View All Elections</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
