'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface EligibleVoter {
  user_id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
  assigned_at: string;
}

interface VoterEligibilityManagerProps {
  electionId: string;
  electionName: string;
}

export default function VoterEligibilityManager({ electionId, electionName }: VoterEligibilityManagerProps) {
  const [eligibleVoters, setEligibleVoters] = useState<EligibleVoter[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [electionId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadEligibleVoters(), loadAllUsers()]);
    } catch (err) {
      setError('Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEligibleVoters = async () => {
    const response = await fetch(`/api/admin/elections/${electionId}/voters`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setEligibleVoters(data.voters || []);
    } else {
      throw new Error('Failed to load eligible voters');
    }
  };

  const loadAllUsers = async () => {
    const response = await fetch('/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      setAllUsers(data.users?.filter((user: User) => user.role === 'Voter') || []);
    } else {
      throw new Error('Failed to load users');
    }
  };

  const addVoterEligibility = async () => {
    if (selectedUsers.length === 0) {
      setError('Please select at least one voter');
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/elections/${electionId}/voters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userIds: selectedUsers })
      });

      if (response.ok) {
        await loadEligibleVoters();
        setShowAddModal(false);
        setSelectedUsers([]);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add voters');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error adding voters:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const removeVoterEligibility = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this voter\'s eligibility?')) {
      return;
    }

    try {
      setActionLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/elections/${electionId}/voters`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ userId })
      });

      if (response.ok) {
        await loadEligibleVoters();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to remove voter');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error removing voter:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getAvailableUsers = () => {
    const eligibleUserIds = eligibleVoters.map(v => v.user_id);
    return allUsers.filter(user => !eligibleUserIds.includes(user.user_id));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="text-lg">Loading voter eligibility data...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">Voter Eligibility Management</h2>
            <p className="text-gray-600">Election: {electionName}</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            disabled={actionLoading}
          >
            Add Eligible Voters
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">
            Eligible Voters ({eligibleVoters.length})
          </h3>
        </div>

        {eligibleVoters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">No eligible voters assigned yet</p>
            <p className="text-gray-400">Click "Add Eligible Voters" to get started</p>
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
                    Assigned
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {eligibleVoters.map((voter) => (
                  <tr key={voter.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {voter.first_name} {voter.last_name}
                        </div>
                        <div className="text-sm text-gray-500">@{voter.username}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {voter.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        voter.status === 'eligible' 
                          ? 'bg-green-100 text-green-800'
                          : voter.status === 'voted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {voter.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(voter.assigned_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => removeVoterEligibility(voter.user_id)}
                        className="text-red-600 hover:text-red-900"
                        disabled={actionLoading || voter.status === 'voted'}
                      >
                        {voter.status === 'voted' ? 'Already Voted' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add Voters Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Eligible Voters
                </h3>
                
                <div className="max-h-96 overflow-y-auto">
                  {getAvailableUsers().length === 0 ? (
                    <p className="text-gray-500 text-center py-4">
                      All voters are already eligible for this election
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getAvailableUsers().map((user) => (
                        <label key={user.user_id} className="flex items-center p-2 hover:bg-gray-50 rounded">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.user_id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.user_id]);
                              } else {
                                setSelectedUsers(selectedUsers.filter(id => id !== user.user_id));
                              }
                            }}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">
                              @{user.username} • {user.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      setSelectedUsers([]);
                      setError(null);
                    }}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addVoterEligibility}
                    disabled={selectedUsers.length === 0 || actionLoading}
                    className={`font-bold py-2 px-4 rounded ${
                      selectedUsers.length === 0 || actionLoading
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-500 hover:bg-blue-700'
                    } text-white`}
                  >
                    {actionLoading ? 'Adding...' : `Add ${selectedUsers.length} Voter(s)`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}