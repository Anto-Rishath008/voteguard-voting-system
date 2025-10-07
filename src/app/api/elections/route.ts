import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    console.log("📊 Getting elections with params:", { status, page, limit, offset });

    // Build Supabase query for elections
    let query = supabaseAdmin
      .from('elections')
      .select(`
        election_id,
        election_name,
        description,
        status,
        start_date,
        end_date,
        creator,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: elections, error: electionsError } = await query;

    if (electionsError) {
      console.error("Elections query error:", electionsError);
      return NextResponse.json({ 
        error: "Failed to fetch elections",
        details: electionsError.message 
      }, { status: 500 });
    }

    console.log("✅ Elections fetched:", elections?.length || 0);

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('elections')
      .select('*', { count: 'exact', head: true });

    if (status) {
      countQuery = countQuery.eq('status', status);
    }

    const { count: total, error: countError } = await countQuery;

    if (countError) {
      console.error("Count query error:", countError);
    }

    console.log(`Found ${elections?.length || 0} elections, total: ${total || 0}`);

    // For each election, get eligible voters count and user's vote status
    const enrichedElections = await Promise.all((elections || []).map(async (row: any) => {
      // Get total eligible voters count
      const { count: eligibleCount } = await supabaseAdmin
        .from('eligible_voters')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', row.election_id)
        .eq('status', 'eligible');

      // Check if current user is eligible for this election
      const { data: userEligibility } = await supabaseAdmin
        .from('eligible_voters')
        .select('status')
        .eq('election_id', row.election_id)
        .eq('user_id', authUser.userId)
        .single();

      // Check if user has voted
      const { data: userVote } = await supabaseAdmin
        .from('votes')
        .select('vote_id')
        .eq('election_id', row.election_id)
        .eq('voter_id', authUser.userId)
        .limit(1)
        .maybeSingle();

      // Determine vote status
      let myVoteStatus: string;
      // If user has actually voted (check votes table first for reliability)
      if (userVote) {
        myVoteStatus = "voted";
      } else if (!userEligibility || (userEligibility.status !== 'eligible' && userEligibility.status !== 'voted')) {
        // User is not eligible if no eligibility record OR status is neither 'eligible' nor 'voted'
        myVoteStatus = "ineligible";
      } else {
        // User is eligible but hasn't voted yet
        myVoteStatus = "not_voted";
      }

      // Get contest count
      const { count: contestCount } = await supabaseAdmin
        .from('contests')
        .select('*', { count: 'exact', head: true })
        .eq('election_id', row.election_id);

      return {
        id: row.election_id,
        title: row.election_name,
        description: row.description,
        status: row.status ? row.status.toLowerCase() : 'draft',
        startDate: row.start_date,
        endDate: row.end_date,
        totalVoters: eligibleCount || 0,
        myVoteStatus,
        organizationName: "",
        contestCount: contestCount || 0
      };
    }));

    const response = NextResponse.json({
      elections: enrichedElections,
      pagination: {
        page,
        limit,
        total: total || 0,
        totalPages: Math.ceil((total || 0) / limit)
      }
    });

    return response;
  } catch (error) {
    console.error("Elections API error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only admins and super admins can create elections
    if (!authUser.roles.includes('Admin') && !authUser.roles.includes('SuperAdmin')) {
      return NextResponse.json({ 
        error: "Forbidden - Admin access required" 
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      election_name, 
      description, 
      start_date, 
      end_date, 
      status = 'draft' 
    } = body;

    if (!election_name || !description || !start_date || !end_date) {
      return NextResponse.json({ 
        error: "Missing required fields" 
      }, { status: 400 });
    }

    console.log("📊 Creating new election:", election_name);

    // Insert new election
    const { data: newElection, error: insertError } = await supabaseAdmin
      .from('elections')
      .insert({
        election_name,
        description,
        start_date,
        end_date,
        status,
        creator: authUser.userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error("Election creation error:", insertError);
      return NextResponse.json({ 
        error: "Failed to create election",
        details: insertError.message 
      }, { status: 500 });
    }

    console.log("✅ Election created:", newElection.election_id);

    return NextResponse.json({
      success: true,
      election: {
        id: newElection.election_id,
        title: newElection.election_name,
        description: newElection.description,
        status: newElection.status ? newElection.status.toLowerCase() : 'draft',
        startDate: newElection.start_date,
        endDate: newElection.end_date,
        totalVoters: 0,
        myVoteStatus: "not_voted",
        organizationName: "",
        contestCount: 0
      }
    });
  } catch (error) {
    console.error("Elections POST error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}