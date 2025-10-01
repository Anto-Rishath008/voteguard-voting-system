import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

export async function GET(request: NextRequest) {
  const db = getDatabase();
  let authUser: any = null;
  
  try {
    // Verify JWT token
    const { user: authUserData, error: authError } = verifyJWT(request);
    authUser = authUserData;

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get comprehensive dashboard stats using enhanced database
    const dashboardStats = await db.getDashboardStats(authUser.userId);
    
    // Get user profile from database
    const userProfile = await db.getUserByEmail(authUser.email);
    
    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get active elections using the enhanced database
    const activeElections = await db.getActiveElections();
    
    // Get user's voting history
    const userVotingHistory = await db.getVoterHistory(authUser.userId);

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

    // Enhanced statistics with detailed breakdown
    const enhancedStats = {
      // User statistics
      users: {
        total: dashboardStats.users.total_users || 0,
        active: dashboardStats.users.active_users || 0,
        newToday: 0 // Can be calculated from enhanced queries
      },
      
      // Election statistics
      elections: {
        total: dashboardStats.elections.total_elections || 0,
        active: dashboardStats.elections.active_elections || 0,
        completed: dashboardStats.elections.completed_elections || 0,
        draft: dashboardStats.elections.total_elections - 
               dashboardStats.elections.active_elections - 
               dashboardStats.elections.completed_elections || 0
      },
      
      // Voting statistics
      votes: {
        totalToday: dashboardStats.votes.total_votes || 0,
        userVotes: dashboardStats.userVotes.user_votes || 0,
        turnoutRate: activeElections.length > 0 
          ? ((dashboardStats.userVotes.user_votes || 0) / activeElections.length * 100) 
          : 0
      },
      
      // System performance metrics
      performance: await db.getQueryMetrics()
    };

    // Role-specific data
    let roleSpecificData = {};
    
    if (authUser.roles.includes('admin') || authUser.roles.includes('super_admin')) {
      // Admin can see system-wide statistics
      roleSpecificData = {
        systemHealth: await db.healthCheck(),
        recentSecurityEvents: await db.query(`
          SELECT event_type, description, severity, created_at
          FROM security_events 
          ORDER BY created_at DESC 
          LIMIT 10
        `).then(result => result.rows),
        
        systemMetrics: enhancedStats.performance
      };
    }

    if (authUser.roles.includes('election_officer')) {
      // Election officers can see election management data
      roleSpecificData = {
        ...roleSpecificData,
        managedElections: await db.query(`
          SELECT election_name, status, voting_start, voting_end
          FROM elections
          WHERE created_by = $1
          ORDER BY created_at DESC
          LIMIT 5
        `, [authUser.userId]).then(result => result.rows)
      };
    }

    // Prepare user information with enhanced details
    const userInfo = {
      id: userProfile.user_id,
      name: `${userProfile.first_name} ${userProfile.last_name}`,
      email: userProfile.email,
      roles: authUser.roles,
      primaryRole: authUser.primaryRole,
      status: userProfile.status,
      lastLogin: userProfile.last_login,
      joinDate: userProfile.created_at,
      verificationStatus: {
        email: userProfile.email_verified || false,
        phone: userProfile.phone_verified || false
      }
    };

    // Return comprehensive dashboard data
    return NextResponse.json({
      user: userInfo,
      elections: processedElections,
      votingHistory: userVotingHistory.slice(0, 5), // Recent voting history
      stats: enhancedStats,
      roleSpecificData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Enhanced Dashboard API error:", error);
    
    // Log the error for monitoring
    try {
      await db.logSecurityEvent({
        eventType: 'DASHBOARD_ERROR',
        userId: authUser ? authUser.userId : undefined,
        description: `Dashboard API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'ERROR',
        additionalData: { 
          endpoint: '/api/dashboard',
          method: 'GET',
          error: error instanceof Error ? error.stack : 'Unknown error'
        }
      });
    } catch (logError) {
      console.error("Failed to log dashboard error:", logError);
    }

    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === "development" ? 
          (error instanceof Error ? error.message : "Unknown error") : undefined
      },
      { status: 500 }
    );
  }
}