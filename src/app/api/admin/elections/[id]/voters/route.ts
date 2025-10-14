import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";

// GET /api/admin/elections/[id]/voters - Get eligible voters for an election
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get election details
    const { data: election, error: electionError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .select('election_name, status')
      .eq('election_id', electionId)
      .single();

    if (electionError || !election) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Get eligible voters
    const { data: eligibleVoters, error: eligibleError } = await supabaseAuth.supabaseAdmin
      .from('eligible_voters')
      .select(`
        id,
        user_id,
        status,
        added_at,
        users:user_id (
          user_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('election_id', electionId);

    if (eligibleError) {
      console.error("Error fetching eligible voters:", eligibleError);
      return NextResponse.json(
        { 
          error: "Failed to fetch eligible voters",
          details: process.env.NODE_ENV === 'development' ? eligibleError.message : undefined
        },
        { status: 500 }
      );
    }

    // Check who has voted
    const { data: votes } = await supabaseAuth.supabaseAdmin
      .from('votes')
      .select('voter_id')
      .eq('election_id', electionId);

    const votedUserIds = new Set(votes?.map(v => v.voter_id) || []);

    // Format eligible voters
    const formattedEligible = (eligibleVoters || []).map((ev: any) => ({
      id: ev.id,
      user_id: ev.user_id,
      status: ev.status,
      added_at: ev.added_at,
      first_name: ev.users?.first_name,
      last_name: ev.users?.last_name,
      email: ev.users?.email,
      has_voted: votedUserIds.has(ev.user_id)
    }));

    // Get all voters (users with Voter role) for adding new eligible voters
    const { data: allVoterRoles, error: votersError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .select(`
        user_id,
        users:user_id (
          user_id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('role_name', 'Voter');

    if (votersError) {
      console.error("Error fetching all voters:", votersError);
      // Don't fail the request, just return empty voters list
    }

    const eligibleUserIds = new Set(eligibleVoters?.map((ev: any) => ev.user_id) || []);

    const allVoters = (allVoterRoles || [])
      .filter((role: any) => role.users) // Filter out any null users
      .map((role: any) => ({
        user_id: role.users.user_id,
        first_name: role.users.first_name,
        last_name: role.users.last_name,
        email: role.users.email,
        is_eligible: eligibleUserIds.has(role.users.user_id)
      }));

    return NextResponse.json({
      election,
      eligibleVoters: formattedEligible,
      allVoters
    });

  } catch (error: any) {
    console.error("Get eligible voters error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// POST /api/admin/elections/[id]/voters - Add eligible voter
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const { userId } = await request.json();

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Add eligible voter
    const { error: insertError } = await supabaseAuth.supabaseAdmin
      .from('eligible_voters')
      .upsert({
        election_id: electionId,
        user_id: userId,
        added_by: authUser.userId,
        status: 'eligible',
        added_at: new Date().toISOString()
      }, {
        onConflict: 'election_id,user_id'
      });

    if (insertError) {
      console.error("Error adding eligible voter:", insertError);
      throw insertError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Add eligible voter error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/elections/[id]/voters - Remove eligible voter
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Check if voter has already voted
    const { data: votes } = await supabaseAuth.supabaseAdmin
      .from('votes')
      .select('vote_id')
      .eq('voter_id', userId)
      .eq('election_id', electionId);

    if (votes && votes.length > 0) {
      return NextResponse.json(
        { error: "Cannot remove voter who has already voted" },
        { status: 400 }
      );
    }

    // Remove eligible voter
    const { error: deleteError } = await supabaseAuth.supabaseAdmin
      .from('eligible_voters')
      .delete()
      .eq('election_id', electionId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error("Error removing eligible voter:", deleteError);
      throw deleteError;
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Remove eligible voter error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail
    });
    return NextResponse.json(
      { 
        error: "Internal server error",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}