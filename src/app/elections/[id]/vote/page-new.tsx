'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import VotingInterface from '@/components/VotingInterface';

interface Election {
  election_id: string;
  election_name: string;
  description: string;
  status: string;
  start_date: string;
  end_date: string;
}

export default function VotePage() {
  const params = useParams();
  const router = useRouter();
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const electionId = Array.isArray(params.id) ? params.id[0] : params.id || '';

  useEffect(() => {
    loadElection();
  }, [electionId]);

  const loadElection = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/elections/${electionId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setElection(data);
        
        if (data.status !== 'Active') {
          setError('This election is not currently active for voting');
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load election');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error loading election:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVoteComplete = () => {
    // Refresh election data or redirect
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="text-xl">Loading election...</div>
      </div>
    );
  }

  if (error || !election) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-600 text-xl mb-4">Election Not Available</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cast Your Vote</h1>
          <p className="text-gray-600">Make your voice heard in this election</p>
        </div>

        <VotingInterface 
          electionId={electionId}
          electionName={election.election_name}
          onVoteComplete={handleVoteComplete}
        />
      </div>
    </div>
  );
}