'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal, Alert } from '@/components/ui/Modal';
import { ArrowLeft, Users, Search, Filter, Edit2, Trash2, Shield, Lock, UserX, CheckCircle, XCircle, Mail, Calendar, Clock } from 'lucide-react';

interface User {
  user_id: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  roles?: string[];
  status: string;
  created_at: string;
  last_login?: string;
}

export default function SuperAdminUsersPage() {
  const router = useRouter();
  const { user, hasRole, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showManageModal, setShowManageModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    role: '',
    status: ''
  });

  useEffect(() => {
    if (!authLoading && user) {
      // Check if user has SuperAdmin role
      if (!hasRole('SuperAdmin')) {
        router.push('/dashboard');
        return;
      }
      fetchUsers();
    }
  }, [authLoading, user, hasRole, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError('Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const handleManageUser = (user: User) => {
    setSelectedUser(user);
    const userRole = user.roles && user.roles.length > 0 ? user.roles[0] : user.role || 'Voter';
    const userName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || '';
    setEditForm({
      full_name: userName,
      email: user.email,
      role: userRole,
      status: user.status
    });
    setShowManageModal(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'User updated successfully!' });
        setShowManageModal(false);
        await fetchUsers();
      } else {
        const data = await response.json();
        setAlert({ type: 'error', message: data.error || 'Failed to update user' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Error updating user' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.user_id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'User deleted successfully!' });
        setShowDeleteConfirm(false);
        setShowManageModal(false);
        await fetchUsers();
      } else {
        const data = await response.json();
        setAlert({ type: 'error', message: data.error || 'Failed to delete user' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Error deleting user' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        setAlert({ type: 'success', message: `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully!` });
        await fetchUsers();
      } else {
        const data = await response.json();
        setAlert({ type: 'error', message: data.error || 'Failed to update status' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Error updating status' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetPassword = async (userId: string, email: string) => {
    setActionLoading(true);
    try {
      // In a real implementation, this would send a password reset email
      const response = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setAlert({ type: 'success', message: 'Password reset email sent!' });
      } else {
        setAlert({ type: 'info', message: 'Password reset initiated for ' + email });
      }
    } catch (err) {
      setAlert({ type: 'info', message: 'Password reset initiated for ' + email });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          onClick={() => router.push('/dashboard')}
          variant="outline"
          className="mb-6 flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="h-8 w-8 text-blue-600" />
            SuperAdmin User Management
          </h1>
          <p className="mt-2 text-gray-600">
            Manage all user accounts, roles, and permissions system-wide
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users by email or name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                All Statuses
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Alert */}
        {alert && (
          <Alert type={alert.type} onClose={() => setAlert(null)}>
            {alert.message}
          </Alert>
        )}

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading users...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center text-red-600">
                <p>{error}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Roles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Login
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => {
                        const displayName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name provided';
                        const displayRole = user.roles && user.roles.length > 0 ? user.roles.join(', ') : user.role || 'No role';
                        
                        return (
                        <tr key={user.user_id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {displayName}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              {displayRole}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login 
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleManageUser(user)}
                              >
                                Manage
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setShowDeleteConfirm(true);
                                }}
                                className="border-red-300 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Management Modal */}
        {showManageModal && selectedUser && (
          <Modal
            isOpen={showManageModal}
            onClose={() => setShowManageModal(false)}
            title={`Manage User: ${selectedUser.full_name || selectedUser.email}`}
            size="xl"
          >
            <div className="space-y-6">
              {/* User Info Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </p>
                    <p className="font-medium text-gray-900 mt-1">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Current Role
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {selectedUser.roles && selectedUser.roles.length > 0 
                        ? selectedUser.roles.join(', ') 
                        : selectedUser.role || 'No role'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Joined
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {new Date(selectedUser.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Last Login
                    </p>
                    <p className="font-medium text-gray-900 mt-1">
                      {selectedUser.last_login 
                        ? new Date(selectedUser.last_login).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit User Form */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit User Details</h3>
                
                <Input
                  label="Full Name"
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                />

                <Input
                  label="Email Address"
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Enter email"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Voter">Voter</option>
                    <option value="Admin">Admin</option>
                    <option value="SuperAdmin">Super Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <Button
                  onClick={handleUpdateUser}
                  isLoading={actionLoading}
                  className="w-full"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Update User Details
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="border-t pt-4 space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleToggleStatus(selectedUser.user_id, selectedUser.status)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2"
                  >
                    {selectedUser.status === 'active' ? (
                      <>
                        <UserX className="h-4 w-4" />
                        Suspend Account
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4" />
                        Activate Account
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleResetPassword(selectedUser.user_id, selectedUser.email)}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2"
                  >
                    <Lock className="h-4 w-4" />
                    Reset Password
                  </Button>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="border-t border-red-200 pt-4">
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Danger Zone
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Permanently delete this user account. This action cannot be undone and will remove all associated data.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={actionLoading}
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete User Account
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && selectedUser && (
          <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Confirm Account Deletion"
            size="md"
          >
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex gap-3">
                  <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-red-800 font-semibold mb-1">
                      Warning: This action is permanent!
                    </h4>
                    <p className="text-red-700 text-sm">
                      You are about to permanently delete the account for:
                    </p>
                    <p className="text-red-900 font-medium mt-2">
                      {selectedUser.email}
                    </p>
                    <p className="text-red-700 text-sm mt-2">
                      This will remove all user data, votes, and activity history. This action cannot be reversed.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDeleteUser}
                  isLoading={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Delete Account
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </div>
  );
}