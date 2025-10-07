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
  BarChart3,
  Download,
  TrendingUp,
  Users,
  Award,
  Settings,
  Eye,
  Calendar,
  CheckCircle,
} from "lucide-react";

interface ElectionResult {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  contests: Contest[];
}

interface Contest {
  id: string;
  title: string;
  contestType: string;
  candidates: CandidateResult[];
}

interface CandidateResult {
  id: string;
  name: string;
  party?: string;
  votes: number;
  percentage: number;
  isWinner: boolean;
}

export default function AdminElectionResultsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [results, setResults] = useState<ElectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const electionId = params?.id as string;

  useEffect(() => {
    if (electionId) {
      fetchElectionResults();
    }
  }, [electionId]);

  const fetchElectionResults = async () => {
    try {
      const response = await fetch(`/api/elections/${electionId}/results`, {
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch results");
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "text-green-600 bg-green-50 border-green-200";
      case "active":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const exportResults = () => {
    if (!results) return;

    // Create CSV content
    const csvContent = [
      [
        "Election",
        "Contest",
        "Candidate",
        "Party",
        "Votes",
        "Percentage",
        "Winner",
      ],
      ...results.contests.flatMap((contest) =>
        contest.candidates.map((candidate) => [
          results.title,
          contest.title,
          candidate.name,
          candidate.party || "",
          candidate.votes.toString(),
          `${candidate.percentage.toFixed(1)}%`,
          candidate.isWinner ? "Yes" : "No",
        ])
      ),
    ];

    const csv = csvContent
      .map((row) => row.map((field) => `"${field}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `election-results-${results.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading election results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Alert type="error" onClose={() => setError("")}>
            {error || "Results not available"}
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
            <Link href={`/admin/elections/${electionId}`}>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Election
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  Election Results
                </h1>
                <span
                  className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor(
                    results.status
                  )}`}
                >
                  {results.status}
                </span>
              </div>
              <p className="mt-1 text-gray-600">{results.title}</p>
              {results.description && (
                <p className="text-sm text-gray-500">{results.description}</p>
              )}
            </div>
            <Button onClick={exportResults} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Results
            </Button>
          </div>
        </div>

        {/* Election Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Election Period
                  </p>
                  <p className="text-sm text-gray-900">
                    {formatDate(results.startDate)}
                  </p>
                  <p className="text-xs text-gray-500">to</p>
                  <p className="text-sm text-gray-900">
                    {formatDate(results.endDate)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Total Eligible
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {results.totalEligibleVoters.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Votes Cast
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {results.totalVotesCast.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Turnout</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {results.turnoutPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contest Results */}
        <div className="space-y-8">
          {results.contests && results.contests.length > 0 ? (
            results.contests.map((contest) => (
              <Card key={contest.id}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {contest.title}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        Contest Type: {contest.contestType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600">
                        Total Candidates
                      </p>
                      <p className="text-lg font-semibold text-gray-900">
                        {contest.candidates.length}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {contest.candidates
                      .sort((a, b) => b.votes - a.votes)
                      .map((candidate, index) => (
                        <div
                          key={candidate.id}
                          className={`p-4 rounded-lg border-2 ${
                            candidate.isWinner
                              ? "border-green-200 bg-green-50"
                              : "border-gray-200 bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {candidate.isWinner && (
                                <Award className="h-5 w-5 text-green-600" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-lg font-semibold text-gray-900">
                                    {candidate.name}
                                  </span>
                                  {candidate.isWinner && (
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                      Winner
                                    </span>
                                  )}
                                </div>
                                {candidate.party && (
                                  <p className="text-sm text-gray-600">
                                    {candidate.party}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-gray-900">
                                {candidate.votes.toLocaleString()}
                              </div>
                              <div className="text-sm text-gray-600">
                                {candidate.percentage.toFixed(1)}% of votes
                              </div>
                            </div>
                          </div>

                          {/* Vote percentage bar */}
                          <div className="mt-3">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  candidate.isWinner
                                    ? "bg-green-500"
                                    : "bg-blue-500"
                                }`}
                                style={{ width: `${candidate.percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Contest Results Available
                </h3>
                <p className="text-gray-600 mb-4">
                  This election doesn't have any contests configured yet, or
                  results are not available.
                </p>
                <Link href={`/admin/elections/${electionId}/edit`}>
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Election
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Additional Information */}
        {results.status === "Completed" && (
          <Card className="mt-8">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Election Completed
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <p className="text-sm font-medium text-green-800">
                      This election has been completed and results are final.
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      All votes have been tallied and verified.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
