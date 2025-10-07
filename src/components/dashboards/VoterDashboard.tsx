"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Modal";
import {
  Vote,
  Calendar,
  Clock,
  Users,
  TrendingUp,
  CheckCircle,
  Shield,
  Award,
  LogOut,
} from "lucide-react";

interface Election {
  id: string;
  title: string;
  description: string;
  status: "upcoming" | "active" | "completed";
  startDate: string;
  endDate: string;
  totalVoters: number;
  myVoteStatus: "not_voted" | "voted" | "ineligible";
}

interface VoterStats {
  totalElections: number;
  activeElections: number;
  votedElections: number;
  upcomingElections: number;
}

export default function VoterDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [stats, setStats] = useState<VoterStats>({
    totalElections: 0,
    activeElections: 0,
    votedElections: 0,
    upcomingElections: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    console.log('🔄 VoterDashboard useEffect triggered', { user: !!user, authLoading, loading });
    
    // Wait for auth to finish loading
    if (authLoading) {
      console.log('⏳ Auth still loading, waiting...');
      return;
    }
    
    // Only fetch data if user is authenticated and has proper role
    if (user) {
      console.log('✅ User found, fetching dashboard data');
      fetchVoterDashboardData();
    } else {
      console.log('❌ No user, setting error');
      setLoading(false);
      setError("Please log in to view dashboard");
    }
  }, [user, authLoading]);

  // Early return if not authenticated - don't render anything that could trigger API calls
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-gray-600 mx-auto" />
          <p className="mt-4 text-gray-600">Please log in to view your dashboard</p>
          <p className="mt-2 text-sm text-gray-500">You will be redirected to login automatically</p>
        </div>
      </div>
    );
  }

  const fetchVoterDashboardData = async () => {
    console.log('🚀 fetchVoterDashboardData called', { user: !!user, loading, authLoading });
    
    // Don't make API calls if user is not authenticated
    if (!user) {
      console.log('❌ No user found, setting error');
      setLoading(false);
      setError("Please log in to view dashboard");
      return;
    }

    try {
      console.log('📡 Making fetch request to /api/dashboard');
      const response = await fetch("/api/dashboard", {
        credentials: "include",
      });
      
      console.log('📊 Dashboard API response:', response.status, response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Dashboard API error:", response.status, errorText);
        
        // If 401, user is not authenticated - don't retry
        if (response.status === 401) {
          setError("Please log in to view dashboard");
          setLoading(false);
          return;
        }
        
        throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('📊 Dashboard API response data:', data);
      console.log('📈 Stats structure:', data.stats);
      console.log('� Data structure:', data.data);
      console.log('�🔍 Looking for totalElections in data.stats:', data.stats?.totalElections);
      console.log('🔍 Looking for totalElections in data.data.stats:', data.data?.stats?.totalElections);
      
      // Handle nested response structure - API returns { success: true, data: { ... } }
      const responseData = data.data || data;
      
      // Safely set elections with fallback
      setElections(responseData.elections || []);
      
      // Safely set stats with fallback to default values
      setStats({
        totalElections: responseData.stats?.totalElections || 0,
        activeElections: responseData.stats?.activeElections || 0,
        votedElections: responseData.stats?.votedElections || 0,
        upcomingElections: responseData.stats?.upcomingElections || 0,
      });
      
      console.log('✅ Stats set to:', {
        totalElections: responseData.stats?.totalElections || 0,
        activeElections: responseData.stats?.activeElections || 0,
        votedElections: responseData.stats?.votedElections || 0,
        upcomingElections: responseData.stats?.upcomingElections || 0,
      });
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
      if (err.message.includes("401")) {
        setError("Please log in to view dashboard");
      } else {
        setError(err.message);
      }
      // Keep default values for stats on error
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "text-blue-600 bg-blue-50";
      case "active":
        return "text-green-600 bg-green-50";
      case "completed":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getVoteStatusIcon = (status: string) => {
    switch (status) {
      case "voted":
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case "not_voted":
        return <Vote className="h-5 w-5 text-blue-600" />;
      case "ineligible":
        return <Shield className="h-5 w-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Show loading if component is still loading data
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Vote className="h-12 w-12 text-blue-600 mx-auto animate-pulse" />
          <p className="mt-4 text-gray-600">Loading your voter dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user?.firstName} {user?.lastName}!
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Your personal voting dashboard - cast your votes and stay informed
              </p>
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  <Vote className="h-3 w-3 mr-1" />
                  Voter
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={signOut}
              className="flex items-center gap-2 text-red-600 border-red-300 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>

        {error && (
          <Alert type="error" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Voter Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Vote className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Available Elections
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.totalElections || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">
                    Active Now
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.activeElections || 0}
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
                  <p className="text-sm font-medium text-gray-600">My Votes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.votedElections || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Upcoming</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {stats?.upcomingElections || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Elections - Priority Section */}
        {(stats?.activeElections || 0) > 0 && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">🗳️ Ready to Vote!</h2>
                  <p className="mt-1">
                    You have {stats?.activeElections || 0} active election{(stats?.activeElections || 0) > 1 ? 's' : ''} waiting for your vote
                  </p>
                </div>
                <Button
                  onClick={() => (window.location.href = "/elections")}
                  variant="secondary"
                  size="lg"
                >
                  Vote Now
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Elections List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Your Elections</h2>
            <Button
              onClick={() => (window.location.href = "/elections")}
              variant="outline"
            >
              View All Elections
            </Button>
          </div>

          {elections.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Vote className="h-12 w-12 text-gray-400 mx-auto" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  No elections available
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Check back later for upcoming elections or contact your administrator.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {elections.map((election) => (
                <Card
                  key={election.id}
                  className={`hover:shadow-md transition-shadow ${
                    election.status?.toLowerCase() === "active" && election.myVoteStatus === "not_voted"
                      ? "ring-2 ring-blue-200 bg-blue-50"
                      : ""
                  }`}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {election.title}
                          </h3>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                              election.status
                            )}`}
                          >
                            {election.status.charAt(0).toUpperCase() +
                              election.status.slice(1)}
                          </span>
                          {getVoteStatusIcon(election.myVoteStatus)}
                          {election.status?.toLowerCase() === "active" && election.myVoteStatus === "not_voted" && (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 animate-pulse">
                              Action Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                          {election.description}
                        </p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>
                              Starts: {formatDate(election.startDate)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>Ends: {formatDate(election.endDate)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            <span>{election.totalVoters} eligible voters</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-6">
                        {election.status?.toLowerCase() === "active" &&
                          election.myVoteStatus === "not_voted" && (
                            <Button
                              onClick={() =>
                                (window.location.href = `/elections/${election.id}/vote`)
                              }
                              size="sm"
                              className="animate-pulse"
                            >
                              🗳️ Cast Your Vote
                            </Button>
                          )}
                        {election.myVoteStatus === "voted" && (
                          <Button
                            onClick={() =>
                              (window.location.href = `/elections/${election.id}/results`)
                            }
                            variant="outline"
                            size="sm"
                          >
                            View Results
                          </Button>
                        )}
                        <Button
                          onClick={() =>
                            (window.location.href = `/elections/${election.id}`)
                          }
                          variant="outline"
                          size="sm"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions for Voters */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => (window.location.href = "/elections")}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <Vote className="h-8 w-8 text-blue-600 mx-auto" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    Browse Elections
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    View all available elections and cast your votes
                  </p>
                </CardContent>
              </Card>
            </div>

            <div
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => (window.location.href = "/profile")}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <Users className="h-8 w-8 text-green-600 mx-auto" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    My Profile
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Update your voter information and preferences
                  </p>
                </CardContent>
              </Card>
            </div>

            <div
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => (window.location.href = "/elections?filter=results")}
            >
              <Card>
                <CardContent className="p-6 text-center">
                  <Award className="h-8 w-8 text-purple-600 mx-auto" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    View Results
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Check results of elections you've participated in
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}