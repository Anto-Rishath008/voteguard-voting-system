import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

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

    // Get Azure Database instance
    const db = getDatabase();
    
    // Test connection first
    const isConnected = await db.testConnection();
    if (!isConnected) {
      return NextResponse.json({ 
        error: "Database connection failed",
        message: "Azure Database is currently unavailable"
      }, { status: 503 });
    }

    // Get user profile from Azure Database
    const userProfile = await db.getUserByEmail(authUser.email);
    
    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get comprehensive dashboard stats using Azure Database
    console.log('📊 Getting dashboard stats for user:', userProfile.user_id);
    const dashboardStats = await db.getDashboardStats(userProfile.user_id);
    console.log('📈 Dashboard stats:', dashboardStats);
    
    // Get active elections using Azure Database
    console.log('🗳️  Getting active elections');
    const activeElections = await db.getActiveElections();
    console.log('🎯 Active elections count:', activeElections.length);
    
    // Get user's voting history
    console.log('📋 Getting user voting history');
    const userVotingHistory = await db.getVoterHistory(userProfile.user_id);
    console.log('🗳️  User voting history count:', userVotingHistory.length);

    // Process elections data for user context
    const processedElections = activeElections.map((election: any) => {
      const hasVoted = userVotingHistory.some(
        (vote: any) => vote.election_name === election.election_name
      );
      
      return {
        id: election.election_id,
        name: election.election_name,
        description: election.description,
        status: election.status || 'active',
        startDate: election.voting_start,
        endDate: election.voting_end,
        organization: election.org_name,
        contestCount: election.contest_count || 0,
        candidateCount: election.candidate_count || 0,
        voterCount: election.voter_count || 0,
        hasVoted,
        canVote: !hasVoted && election.status === 'active'
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
        // Voter Dashboard expects these flat properties - convert strings to numbers
        totalElections: parseInt(dashboardStats.elections.total_elections) || 0,
        activeElections: parseInt(dashboardStats.elections.active_elections) || 0,
        votedElections: parseInt(dashboardStats.userVotes.user_votes) || 0,
        upcomingElections: (parseInt(dashboardStats.elections.draft_elections) || 0) + 
                          (parseInt(dashboardStats.elections.scheduled_elections) || 0),
        
        // Keep nested structure for admin dashboards compatibility
        users: {
          total: parseInt(dashboardStats.users.total_users) || 0,
          active: parseInt(dashboardStats.users.active_users) || 0,
        },
        elections: {
          total: parseInt(dashboardStats.elections.total_elections) || 0,
          active: parseInt(dashboardStats.elections.active_elections) || 0,
          completed: parseInt(dashboardStats.elections.completed_elections) || 0,
          draft: parseInt(dashboardStats.elections.draft_elections) || 0,
          scheduled: parseInt(dashboardStats.elections.scheduled_elections) || 0
        },
        votes: {
          totalToday: parseInt(dashboardStats.votes.today_votes) || 0,
          totalVotes: parseInt(dashboardStats.votes.total_votes) || 0,
          uniqueVoters: parseInt(dashboardStats.votes.unique_voters) || 0,
          userVotes: parseInt(dashboardStats.userVotes.user_votes) || 0,
          participationRate: activeElections.length > 0 
            ? ((parseInt(dashboardStats.userVotes.user_votes) || 0) / activeElections.length * 100)
            : 0
        }
      },
      elections: processedElections.slice(0, 5), // Show first 5 elections
      performance: await db.getQueryMetrics()
    };

    // Add role-specific data
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
      dashboardData.adminData = {
        systemHealth: await db.healthCheck(),
        recentSecurityEvents: await db.query(`
          SELECT action, details, created_at, ip_address
          FROM audit_logs 
          WHERE action LIKE '%SECURITY%' OR action LIKE '%LOGIN%'
          ORDER BY created_at DESC 
          LIMIT 10
        `).then((result: any) => result.rows),
        
        databaseMetrics: {
          queryPerformance: await db.getQueryMetrics(),
          connectionStatus: 'connected'
        }
      };
      
      if (userProfile.role === 'super_admin') {
        dashboardData.superAdminData = {
          managedElections: await db.query(`
            SELECT e.*, COUNT(v.vote_id) as vote_count
            FROM elections e
            LEFT JOIN contests c ON e.election_id = c.election_id
            LEFT JOIN votes v ON c.contest_id = v.contest_id
            WHERE e.created_by = $1
            GROUP BY e.election_id
            ORDER BY e.created_at DESC
          `, [userProfile.user_id]).then((result: any) => result.rows)
        };
      }
    }

    console.log('📤 Final dashboard response stats:', dashboardData.stats);
    
    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      source: 'Azure Database for PostgreSQL'
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