import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    // Check for auth token
    const authToken = request.cookies.get("auth-token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      
      decoded = verify(authToken, jwtSecret);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get current user with roles to check permissions
    const currentUser = await supabaseAuth.getUserWithRolesByEmail(decoded.email);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin permissions
    if (!currentUser.roles || !currentUser.roles.some((role: string) => ['Admin', 'SuperAdmin'].includes(role))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    try {
      // Get elections statistics
      const { data: electionsData, error: electionsError } = await supabaseAuth.supabaseAdmin
        .from('elections')
        .select('status');

      if (electionsError) {
        console.error("Error fetching elections:", electionsError);
        throw electionsError;
      }

      const totalElections = electionsData?.length || 0;
      const activeElections = electionsData?.filter(e => e.status === 'Active').length || 0;
      const completedElections = electionsData?.filter(e => e.status === 'Completed').length || 0;
      const scheduledElections = electionsData?.filter(e => e.status === 'Scheduled').length || 0;

      // Get voting statistics
      const { data: votesData, error: votesError } = await supabaseAuth.supabaseAdmin
        .from('votes')
        .select('vote_id, voter_id, election_id');

      if (votesError) {
        console.error("Error fetching votes:", votesError);
      }

      const totalVotes = votesData?.length || 0;
      const uniqueVoters = new Set(votesData?.map(v => v.voter_id)).size || 0;
      const electionsWithVotes = new Set(votesData?.map(v => v.election_id)).size || 0;

      // Get user statistics
      const { data: usersData, error: usersError } = await supabaseAuth.supabaseAdmin
        .from('users')
        .select('user_id, email_verified');

      if (usersError) {
        console.error("Error fetching users:", usersError);
      }

      const totalUsers = usersData?.length || 0;
      const verifiedUsers = usersData?.filter(u => u.email_verified).length || 0;

      // Get user roles statistics
      const { data: rolesData, error: rolesError } = await supabaseAuth.supabaseAdmin
        .from('user_roles')
        .select('role_name');

      if (rolesError) {
        console.error("Error fetching roles:", rolesError);
      }

      const adminUsers = rolesData?.filter(r => r.role_name === 'Admin').length || 0;
      const superAdminUsers = rolesData?.filter(r => r.role_name === 'SuperAdmin').length || 0;
      const voterUsers = rolesData?.filter(r => r.role_name === 'Voter').length || 0;

      // Get recent elections with vote counts
      const { data: recentElectionsData, error: recentElectionsError } = await supabaseAuth.supabaseAdmin
        .from('elections')
        .select(`
          election_id,
          election_name,
          status,
          start_date,
          end_date,
          created_at
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentElectionsError) {
        console.error("Error fetching recent elections:", recentElectionsError);
      }

      // Get vote counts for each recent election
      const recentElections = await Promise.all(
        (recentElectionsData || []).map(async (election: any) => {
          const { count: voteCount } = await supabaseAuth.supabaseAdmin
            .from('votes')
            .select('*', { count: 'exact', head: true })
            .eq('election_id', election.election_id);

          return {
            id: election.election_id,
            title: election.election_name,
            status: election.status,
            startDate: election.start_date,
            endDate: election.end_date,
            voteCount: voteCount || 0
          };
        })
      );

      // Get recent activity from audit logs
      let recentActivity: any[] = [];
      try {
        const { data: activityData, error: activityError } = await supabaseAuth.supabaseAdmin
          .from('audit_log')
          .select(`
            audit_id,
            operation_type,
            table_name,
            timestamp,
            user_id,
            users:user_id (
              first_name,
              last_name,
              email
            )
          `)
          .order('timestamp', { ascending: false })
          .limit(10);

        if (activityError) {
          console.error("Error fetching audit logs:", activityError);
        } else {
          recentActivity = (activityData || []).map((log: any) => ({
            id: log.audit_id,
            action: log.operation_type?.replace(/_/g, " ").toLowerCase() || "unknown",
            details: log.table_name ? `Operation on ${log.table_name}` : "No details available",
            timestamp: log.timestamp,
            user: log.users?.first_name && log.users?.last_name ? 
              `${log.users.first_name} ${log.users.last_name}` : 
              "Unknown User",
          }));
        }
      } catch (auditError) {
        console.log("Audit logs table may not exist:", auditError);
        recentActivity = [];
      }

      // Get system health indicators
      const systemHealth = {
        databaseConnected: true,
        activeElectionsRatio: totalElections > 0 ? (activeElections / totalElections) : 0,
        voterParticipationRate: totalUsers > 0 ? (uniqueVoters / totalUsers) : 0,
        averageVotesPerElection: electionsWithVotes > 0 ? (totalVotes / electionsWithVotes) : 0
      };

      const stats = {
        overview: {
          totalElections,
          activeElections,
          completedElections,
          scheduledElections,
          totalVotes,
          uniqueVoters,
          totalUsers,
          verifiedUsers
        },
        userBreakdown: {
          admins: adminUsers,
          superAdmins: superAdminUsers,
          voters: voterUsers,
          verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers) : 0
        },
        votingMetrics: {
          totalVotes,
          uniqueVoters,
          electionsWithVotes,
          participationRate: totalUsers > 0 ? (uniqueVoters / totalUsers) : 0,
          averageVotesPerElection: electionsWithVotes > 0 ? (totalVotes / electionsWithVotes) : 0
        },
        recentElections,
        recentActivity,
        systemHealth,
        lastUpdated: new Date().toISOString()
      };

      return NextResponse.json({ success: true, stats });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      return NextResponse.json(
        { 
          success: false,
          stats: {
            overview: {
              totalElections: 0,
              activeElections: 0,
              completedElections: 0,
              scheduledElections: 0,
              totalVotes: 0,
              uniqueVoters: 0,
              totalUsers: 0,
              verifiedUsers: 0
            },
            userBreakdown: {
              admins: 0,
              superAdmins: 0,
              voters: 0,
              verificationRate: 0
            },
            votingMetrics: {
              totalVotes: 0,
              uniqueVoters: 0,
              electionsWithVotes: 0,
              participationRate: 0,
              averageVotesPerElection: 0
            },
            recentElections: [],
            recentActivity: [],
            systemHealth: {
              databaseConnected: false,
              activeElectionsRatio: 0,
              voterParticipationRate: 0,
              averageVotesPerElection: 0
            },
            lastUpdated: new Date().toISOString()
          }
        }
      );
    }
  } catch (error) {
    console.error("Admin dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}