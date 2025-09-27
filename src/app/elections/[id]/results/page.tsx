"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  BarChart3,
  TrendingUp,
  Users,
  Award,
  ArrowLeft,
  Download,
  RefreshCw,
  CheckCircle,
  Calendar,
  Clock,
} from "lucide-react";

interface CandidateResult {
  id: string;
  name: string;
  party: string;
  votes: number;
  percentage: number;
  isWinner: boolean;
}

interface ContestResult {
  id: string;
  title: string;
  description: string;
  totalVotes: number;
  candidates: CandidateResult[];
}

interface ElectionResults {
  id: string;
  title: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  totalEligibleVoters: number;
  totalVotesCast: number;
  turnoutPercentage: number;
  contests: ContestResult[];
  isFinalized: boolean;
  finalizedAt?: string;
}

export default function ElectionResultsPage() {
  const params = useParams();
  const { user } = useAuth();
  const [results, setResults] = useState<ElectionResults | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchResults();
    }
  }, [params.id]);

  const fetchResults = async () => {
    try {
      const response = await fetch(`/api/elections/${params.id}/results`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch results");
      }

      const data = await response.json();
      setResults(data.results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchResults();
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

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !results) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Alert type="error" className="mb-6">
            {error || "Results not found"}
          </Alert>
          <Link href="/elections">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Elections
            </Button>
          </Link>
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
            <Link href="/elections">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Elections
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Election Results
              </h1>
              <p className="mt-1 text-lg text-gray-600">{results.title}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Election Status */}
        <div className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Election Period
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {new Date(results.startDate).toLocaleDateString()} -{" "}
                      {new Date(results.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Voter Turnout
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatPercentage(results.turnoutPercentage)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {results.totalVotesCast.toLocaleString()} of{" "}
                      {results.totalEligibleVoters.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      results.isFinalized ? "bg-purple-100" : "bg-yellow-100"
                    }`}
                  >
                    {results.isFinalized ? (
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    ) : (
                      <Clock className="h-6 w-6 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <p
                      className={`text-lg font-semibold ${
                        results.isFinalized
                          ? "text-purple-600"
                          : "text-yellow-600"
                      }`}
                    >
                      {results.isFinalized ? "Finalized" : "Preliminary"}
                    </p>
                    {results.finalizedAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate(results.finalizedAt)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Contests
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {results.contests.length}
                    </p>
                    <p className="text-xs text-gray-500">Total contests</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contest Results */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-gray-900">Contest Results</h2>

          {results.contests.map((contest) => (
            <Card key={contest.id}>
              <CardContent className="p-6">
                <div className="mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {contest.title}
                  </h3>
                  <p className="text-gray-600 mb-2">{contest.description}</p>
                  <p className="text-sm text-gray-500">
                    Total votes: {contest.totalVotes.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-4">
                  {contest.candidates.map((candidate, index) => (
                    <div key={candidate.id} className="relative">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          {candidate.isWinner && (
                            <Award className="h-5 w-5 text-yellow-500" />
                          )}
                          <div>
                            <h4
                              className={`font-semibold ${
                                candidate.isWinner
                                  ? "text-yellow-700"
                                  : "text-gray-900"
                              }`}
                            >
                              {candidate.name}
                              {index === 0 && " 🏆"}
                            </h4>
                            {candidate.party && (
                              <p className="text-sm text-gray-600">
                                {candidate.party}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {candidate.votes.toLocaleString()} votes
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatPercentage(candidate.percentage)}
                          </p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            candidate.isWinner
                              ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                              : index === 0
                              ? "bg-gradient-to-r from-green-400 to-green-600"
                              : index === 1
                              ? "bg-gradient-to-r from-blue-400 to-blue-600"
                              : "bg-gradient-to-r from-gray-400 to-gray-600"
                          }`}
                          style={{ width: `${candidate.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Results Disclaimer */}
        <div className="mt-12">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    About These Results
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    {!results.isFinalized && (
                      <p>
                        • These are preliminary results and may change as more
                        votes are counted.
                      </p>
                    )}
                    <p>
                      • Results are updated in real-time as votes are processed.
                    </p>
                    <p>
                      • All votes are encrypted and anonymized to protect voter
                      privacy.
                    </p>
                    <p>
                      • Vote totals are verified using cryptographic audit
                      trails.
                    </p>
                    {results.isFinalized && (
                      <p className="text-green-600 font-medium">
                        • These results have been finalized and certified.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
