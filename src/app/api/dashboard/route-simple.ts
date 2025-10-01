import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  let authUser: any = null;
  
  try {
    // Verify JWT token
    const { user: authUserData, error: authError } = verifyJWT(request);
    authUser = authUserData;

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Create Supabase client for basic dashboard data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('email', authUser.email)
      .single();

    if (!userProfile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get basic elections data
    const { data: elections } = await supabase
      .from('elections')
      .select('*')
      .order('created_at', { ascending: false });

    // Get user's voting history
    const { data: votes } = await supabase
      .from('votes')
      .select('*, elections(*)')
      .eq('user_id', userProfile.id);

    // Process elections data for user context
    const processedElections = (elections || []).map((election: any) => {
      const hasVoted = (votes || []).some(
        (vote: any) => vote.election_id === election.id
      );
      
      return {
        id: election.id,
        name: election.title || election.name,
        description: election.description,
        status: election.status || 'active',
        startDate: election.start_date || election.voting_start,
        endDate: election.end_date || election.voting_end,
        hasVoted,
        canVote: !hasVoted && election.status === 'active'
      };
    });

    // Basic dashboard response
    const dashboardData = {
      user: {
        id: userProfile.id,
        email: userProfile.email,
        name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim(),
        role: userProfile.role || 'voter'
      },
      stats: {
        totalElections: elections?.length || 0,
        activeElections: elections?.filter((e: any) => e.status === 'active').length || 0,
        userVotes: votes?.length || 0,
        participationRate: elections?.length ? 
          Math.round((votes?.length || 0) / elections.length * 100) : 0
      },
      elections: processedElections.slice(0, 5), // Show first 5 elections
      recentActivity: {
        lastLogin: new Date().toISOString(),
        recentVotes: votes?.slice(0, 3) || []
      }
    };

    // Add role-specific data
    if (userProfile.role === 'admin' || userProfile.role === 'super_admin') {
      // Get admin-specific data
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, email, role, created_at')
        .order('created_at', { ascending: false });

      dashboardData.adminData = {
        totalUsers: allUsers?.length || 0,
        recentUsers: allUsers?.slice(0, 5) || [],
        systemStatus: 'operational'
      };
    }

    return NextResponse.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString(),
      message: 'Dashboard data retrieved successfully'
    });

  } catch (error) {
    console.error('Dashboard API Error:', error);
    
    // Return a basic error response that won't crash the app
    return NextResponse.json({
      success: false,
      error: 'Failed to load dashboard data',
      data: {
        user: { 
          email: authUser?.email || 'unknown',
          role: 'voter',
          name: 'User'
        },
        stats: {
          totalElections: 0,
          activeElections: 0,
          userVotes: 0,
          participationRate: 0
        },
        elections: [],
        message: 'Dashboard is temporarily unavailable. Please try again later.'
      }
    }, { status: 500 });
  }
}