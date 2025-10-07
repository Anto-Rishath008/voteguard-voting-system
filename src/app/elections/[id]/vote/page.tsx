'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Modal';
import {
  Vote,
  Shield,
  Circle,
  CheckCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface Contest {
  id: string;
  title: string;
  description?: string;
  maxSelections: number;
  contestType: string;
  candidates: Candidate[];
}

interface Candidate {
  id: string;
  name: string;
  party?: string;
  description?: string;
  imageUrl?: string;
}

interface BallotSelection {
  contestId: string;
  candidateIds: string[];
}

interface Election {
  id: string;
  title: string;
  election_name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
  startDate: string;
  endDate: string;
  contests: Contest[];
}

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [election, setElection] = useState<Election | null>(null);
  const [selections, setSelections] = useState<BallotSelection[]>([]);
  const [currentContestIndex, setCurrentContestIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

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

      // Check if user can vote
      if (data.election.myVoteStatus === "voted") {
        router.push(`/elections/${params.id}/results`);
        return;
      }

      if (data.election.myVoteStatus === "ineligible") {
        setError("You are not eligible to vote in this election");
        return;
      }

      if (data.election.status?.toLowerCase() !== "active") {
        setError("This election is not currently active");
        return;
      }

      setElection(data.election);

      // Initialize selections
      const initialSelections = data.election.contests.map(
        (contest: Contest) => ({
          contestId: contest.id,
          candidateIds: [],
        })
      );
      setSelections(initialSelections);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelect = (contestId: string, candidateId: string) => {
    setSelections((prev) =>
      prev.map((selection) => {
        if (selection.contestId === contestId) {
          const contest = election?.contests.find((c) => c.id === contestId);
          const isSelected = selection.candidateIds.includes(candidateId);

          if (isSelected) {
            // Deselect
            return {
              ...selection,
              candidateIds: selection.candidateIds.filter(
                (id) => id !== candidateId
              ),
            };
          } else {
            // Select
            let newCandidateIds = [...selection.candidateIds, candidateId];

            // If max selections reached, remove oldest selection
            if (contest && newCandidateIds.length > contest.maxSelections) {
              newCandidateIds = newCandidateIds.slice(-contest.maxSelections);
            }

            return {
              ...selection,
              candidateIds: newCandidateIds,
            };
          }
        }
        return selection;
      })
    );
  };

  const getCurrentSelection = (contestId: string) => {
    return (
      selections.find((s) => s.contestId === contestId)?.candidateIds || []
    );
  };

  const canProceed = () => {
    const currentContest = election?.contests[currentContestIndex];
    if (!currentContest) return false;

    const currentSelection = getCurrentSelection(currentContest.id);

    // Allow proceeding even with no selection (abstain)
    return true;
  };

  const isLastContest = () => {
    return currentContestIndex === (election?.contests.length || 0) - 1;
  };

  const handleNext = () => {
    if (isLastContest()) {
      setShowConfirmation(true);
    } else {
      setCurrentContestIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentContestIndex((prev) => Math.max(0, prev - 1));
  };

  const handleSubmitBallot = async () => {
    if (!election) return;

    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/elections/${election.id}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ selections }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit ballot");
      }

      // Redirect to confirmation page
      router.push(`/elections/${election.id}/voted`);
    } catch (err: any) {
      setError(err.message);
      setShowConfirmation(false);
    } finally {
      setSubmitting(false);
    }
  };

  const getTotalSelections = () => {
    return selections.reduce(
      (total, selection) => total + selection.candidateIds.length,
      0
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading ballot...</p>
        </div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Alert type="error" className="mb-6">
            {error || "Election not found"}
          </Alert>
          <Button onClick={() => router.push("/elections")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Elections
          </Button>
        </div>
      </div>
    );
  }

  // Check if election has contests
  if (!election.contests || election.contests.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  No Contests Available
                </h1>
                <p className="text-gray-600 mb-6">
                  This election does not have any contests configured yet. Please check back later or contact the election administrator.
                </p>
                <div className="flex gap-4 justify-center">
                  <Button onClick={() => router.push("/elections")} variant="outline">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Elections
                  </Button>
                  <Button onClick={() => router.push(`/elections/${election.id}`)}>
                    View Election Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const currentContest = election.contests[currentContestIndex];

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto py-12 px-4">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Confirm Your Ballot
                </h1>
                <p className="text-gray-600">
                  Please review your selections before submitting your ballot
                </p>
              </div>

              <div className="space-y-6 mb-8">
                {election.contests.map((contest, index) => {
                  const contestSelections = getCurrentSelection(contest.id);
                  return (
                    <div
                      key={contest.id}
                      className="border-b border-gray-200 pb-4"
                    >
                      <h3 className="font-semibold text-gray-900 mb-2">
                        {contest.title}
                      </h3>
                      {contestSelections.length > 0 ? (
                        <div className="space-y-1">
                          {contestSelections.map((candidateId) => {
                            const candidate = contest.candidates.find(
                              (c) => c.id === candidateId
                            );
                            return (
                              <div
                                key={candidateId}
                                className="flex items-center gap-2 text-sm"
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <span>
                                  {candidate?.name}{" "}
                                  {candidate?.party && `(${candidate.party})`}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Circle className="h-4 w-4" />
                          <span>No selection (abstained)</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 mb-1">
                      Important Notice
                    </p>
                    <p className="text-yellow-700">
                      Once you submit your ballot, you cannot change your
                      selections. Please ensure all choices are correct before
                      proceeding.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <Alert type="error" className="mb-6">
                  {error}
                </Alert>
              )}

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmation(false)}
                  disabled={submitting}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Review Ballot
                </Button>
                <Button
                  onClick={handleSubmitBallot}
                  isLoading={submitting}
                  disabled={submitting}
                >
                  <Lock className="h-4 w-4 mr-2" />
                  Submit Ballot
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {election.title}
              </h1>
              <p className="text-gray-600">Cast Your Ballot</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                Contest {currentContestIndex + 1} of {election.contests.length}
              </div>
              <div className="w-48 bg-gray-200 rounded-full h-2 mt-1">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{
                    width: `${
                      ((currentContestIndex + 1) / election.contests.length) *
                      100
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contest Card */}
        <Card className="mb-6">
          <CardContent className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {currentContest.title}
              </h2>
              <p className="text-gray-600 mb-4">{currentContest.description}</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">Voting Instructions</p>
                    <p>
                      You may select up to {currentContest.maxSelections}{" "}
                      candidate
                      {currentContest.maxSelections > 1 ? "s" : ""} for this
                      contest. You may also choose to abstain by not selecting
                      any candidates.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Candidates */}
            <div className="space-y-4">
              {currentContest.candidates.map((candidate) => {
                const isSelected = getCurrentSelection(
                  currentContest.id
                ).includes(candidate.id);
                const currentSelectionCount = getCurrentSelection(
                  currentContest.id
                ).length;
                const canSelect =
                  isSelected ||
                  currentSelectionCount < currentContest.maxSelections;

                return (
                  <div
                    key={candidate.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : canSelect
                        ? "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        : "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
                    }`}
                    onClick={() =>
                      canSelect &&
                      handleCandidateSelect(currentContest.id, candidate.id)
                    }
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 mt-1">
                        {isSelected ? (
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Circle
                            className={`h-6 w-6 ${
                              canSelect ? "text-gray-400" : "text-gray-300"
                            }`}
                          />
                        )}
                      </div>

                      <div className="flex-1">
                        <h3
                          className={`font-semibold ${
                            canSelect ? "text-gray-900" : "text-gray-500"
                          }`}
                        >
                          {candidate.name}
                        </h3>
                        {candidate.party && (
                          <p
                            className={`text-sm ${
                              canSelect ? "text-gray-600" : "text-gray-400"
                            }`}
                          >
                            {candidate.party}
                          </p>
                        )}
                        {candidate.description && (
                          <p
                            className={`text-sm mt-2 ${
                              canSelect ? "text-gray-600" : "text-gray-400"
                            }`}
                          >
                            {candidate.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Selection Summary */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Selected: {getCurrentSelection(currentContest.id).length} of{" "}
                  {currentContest.maxSelections}
                </span>
                <span className="text-blue-600 font-medium">
                  Total ballot selections: {getTotalSelections()}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentContestIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <Button onClick={handleNext} disabled={!canProceed()}>
            {isLastContest() ? (
              <>
                <Vote className="h-4 w-4 mr-2" />
                Review Ballot
              </>
            ) : (
              <>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
