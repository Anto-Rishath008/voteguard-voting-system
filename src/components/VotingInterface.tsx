import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Candidate {
  candidate_id: number;
  candidate_name: string;
  party: string;
  description: string;
}

interface Contest {
  contest_id: number;
  contest_name: string;
  description: string;
  max_selections: number;
  candidates: Candidate[];
}

interface VotingInterfaceProps {
  electionId: string;
  electionName: string;
  onVoteComplete: () => void;
}

export default function VotingInterface({ electionId, electionName, onVoteComplete }: VotingInterfaceProps) {
  const [contests, setContests] = useState<Contest[]>([]);
  const [selectedVotes, setSelectedVotes] = useState<{ [contestId: number]: number }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    loadContests();
  }, [electionId]);

  const loadContests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/elections/${electionId}/contests`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setContests(data.contests || []);
        setIsEligible(data.eligible);
        setHasVoted(data.hasVoted);
        
        if (!data.eligible) {
          setError('You are not eligible to vote in this election');
        } else if (data.hasVoted) {
          setError('You have already voted in this election');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load contests');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error loading contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCandidateSelect = (contestId: number, candidateId: number) => {
    setSelectedVotes(prev => ({
      ...prev,
      [contestId]: candidateId
    }));
  };

  const handleSubmitVote = async () => {
    if (Object.keys(selectedVotes).length === 0) {
      setError('Please make at least one selection before submitting');
      return;
    }

    // Check if all contests have selections (optional - depends on your rules)
    const unvotedContests = contests.filter(contest => !(contest.contest_id in selectedVotes));
    if (unvotedContests.length > 0) {
      const proceed = confirm(`You haven't voted in ${unvotedContests.length} contest(s). Submit anyway?`);
      if (!proceed) return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const response = await fetch(`/api/elections/${electionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ votes: selectedVotes })
      });

      if (response.ok) {
        alert('Your vote has been submitted successfully!');
        onVoteComplete();
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to submit vote');
      }
    } catch (err) {
      setError('Network error occurred while submitting vote');
      console.error('Error submitting vote:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg">Loading voting interface...</div>
      </div>
    );
  }

  if (!isEligible || hasVoted) {
    return (
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded">
        <p className="font-medium">Unable to vote</p>
        <p>{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="mt-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6 text-center">
          Voting for: {electionName}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {contests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No contests available for this election</p>
          </div>
        ) : (
          <div className="space-y-6">
            {contests.map((contest) => (
              <div key={contest.contest_id} className="border rounded-lg p-4">
                <h3 className="text-xl font-semibold mb-2">{contest.contest_name}</h3>
                <p className="text-gray-600 mb-4">{contest.description}</p>
                <p className="text-sm text-blue-600 mb-3">
                  Select up to {contest.max_selections} candidate(s)
                </p>

                <div className="space-y-2">
                  {contest.candidates.map((candidate) => (
                    <label
                      key={candidate.candidate_id}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                        selectedVotes[contest.contest_id] === candidate.candidate_id
                          ? 'bg-blue-50 border-blue-500'
                          : 'border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`contest-${contest.contest_id}`}
                        value={candidate.candidate_id}
                        checked={selectedVotes[contest.contest_id] === candidate.candidate_id}
                        onChange={() => handleCandidateSelect(contest.contest_id, candidate.candidate_id)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{candidate.candidate_name}</div>
                        <div className="text-sm text-gray-500">{candidate.party}</div>
                        {candidate.description && (
                          <div className="text-sm text-gray-600 mt-1">{candidate.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center pt-6 border-t">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-6 rounded"
              >
                Cancel
              </button>

              <div className="text-sm text-gray-600">
                Selections made: {Object.keys(selectedVotes).length} / {contests.length}
              </div>

              <button
                onClick={handleSubmitVote}
                disabled={submitting || Object.keys(selectedVotes).length === 0}
                className={`font-bold py-2 px-6 rounded ${
                  submitting || Object.keys(selectedVotes).length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                {submitting ? 'Submitting...' : 'Submit Vote'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}