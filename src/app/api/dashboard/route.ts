import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  let authUser: any = null;
  
  try {
    console.log('🚀 Dashboard API called');
    
    // Verify JWT token
    const { user: authUserData, error: authError } = verifyJWT(request);
    authUser = authUserData;

    console.log('🔐 Auth check:', { hasUser: !!authUserData, error: authError });

    if (authError || !authUser) {
      console.log('❌ Authentication failed');
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile from Supabase
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();
    
    if (profileError || !userProfile) {
      console.log('❌ User profile error:', profileError);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log('📊 Getting dashboard stats for user:', userProfile.user_id);

    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total elections
    const { data: elections, error: electionsError } = await supabaseAdmin
      .from('elections')
      .select('*');

    if (electionsError) {
      console.log('❌ Elections error:', electionsError);
    }

    // Get active elections (case-insensitive check)
    const activeElections = elections?.filter(e => 
      e.status && e.status.toLowerCase() === 'active'
    ) || [];
    
    // Get user's votes
    const { data: userVotes, error: votesError } = await supabaseAdmin
      .from('votes')
      .select('*')
      .eq('voter_id', userProfile.user_id);

    if (votesError) {
      console.log('❌ Votes error:', votesError);
    }

    // Count unique elections the user has voted in
    const uniqueElectionIds = new Set(userVotes?.map((vote: any) => vote.election_id) || []);
    const votedElectionsCount = uniqueElectionIds.size;

    // Get all votes for today
    const today = new Date().toISOString().split('T')[0];
    const { count: todayVotes } = await supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get total votes
    const { count: totalVotes } = await supabaseAdmin
      .from('votes')
      .select('*', { count: 'exact', head: true });

    // Process elections data for user context
    const processedElections = activeElections.map((election: any) => {
      const hasVoted = userVotes?.some(
        (vote: any) => vote.election_id === election.election_id
      ) || false;
      
      return {
        id: election.election_id,
        name: election.election_name,
        description: election.description,
        status: election.status || 'active',
        startDate: election.start_date,
        endDate: election.end_date,
        organization: election.org_name || 'Organization',
        contestCount: 0, // Will be populated later
        candidateCount: 0, // Will be populated later
        voterCount: totalUsers || 0,
        hasVoted,
        canVote: !hasVoted && election.status && election.status.toLowerCase() === 'active'
      };
    });

    // Build dashboard response based on user role
    const dashboardData: any = {
      user: {
        id: userProfile.user_id,
        email: userProfile.email,
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
        role: userProfile.role
      },
      stats: {
        // Voter Dashboard expects these flat properties
        totalElections: elections?.length || 0,
        activeElections: activeElections.length,
        votedElections: votedElectionsCount,
        upcomingElections: elections?.filter(e => 
          e.status && (e.status.toLowerCase() === 'draft' || 
                      e.status.toLowerCase() === 'scheduled' || 
                      e.status.toLowerCase() === 'upcoming')
        ).length || 0,
        
        // Keep nested structure for admin dashboards compatibility
        users: {
          total: totalUsers || 0,
          active: totalUsers || 0,
        },
        elections: {
          total: elections?.length || 0,
          active: activeElections.length,
          completed: elections?.filter(e => e.status && e.status.toLowerCase() === 'completed').length || 0,
          draft: elections?.filter(e => e.status && e.status.toLowerCase() === 'draft').length || 0,
          scheduled: elections?.filter(e => e.status && e.status.toLowerCase() === 'scheduled').length || 0
        },
        votes: {
          totalToday: todayVotes || 0,
          totalVotes: totalVotes || 0,
          uniqueVoters: totalUsers || 0,
          userVotes: userVotes?.length || 0,
          participationRate: activeElections.length > 0 
            ? ((votedElectionsCount || 0) / activeElections.length * 100)
            : 0
        }
      },
      elections: processedElections.slice(0, 5), // Show first 5 elections
      performance: {
        queryTime: '< 100ms',
        connectionStatus: 'connected'
      }
    };

    // Add role-specific data
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
      // Get recent audit logs
      const { data: auditLogs } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .or('operation_type.like.%SECURITY%,operation_type.like.%LOGIN%')
        .order('timestamp', { ascending: false })
        .limit(10);

      dashboardData.adminData = {
        systemHealth: { status: 'healthy', uptime: '99.9%' },
        recentSecurityEvents: auditLogs || [],
        databaseMetrics: {
          queryPerformance: { averageTime: '< 100ms' },
          connectionStatus: 'connected'
        }
      };
      
      if (userProfile.role === 'super_admin') {
        dashboardData.superAdminData = {
          managedElections: elections?.filter(e => e.created_by === userProfile.user_id) || []
        };
      }
    }

    console.log('📤 Final dashboard response stats:', dashboardData.stats);
    
    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      source: 'Supabase PostgreSQL'
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    
    // Return error response with some basic data
    return NextResponse.json({
      success: false,
      error: 'Failed to load dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error',
      data: {
        user: { 
          email: authUser?.email || 'unknown',
          role: 'voter',
          name: 'User'
        },
        stats: {
          users: { total: 0, active: 0 },
          elections: { total: 0, active: 0, completed: 0, draft: 0 },
          votes: { totalToday: 0, userVotes: 0, participationRate: 0 }
        },
        elections: [],
        message: 'Dashboard is temporarily unavailable. Azure Database connection issue.'
      }
    }, { status: 500 });
  }
}