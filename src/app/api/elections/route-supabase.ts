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

    // Transform data to match frontend interface
    const transformedElections = (elections || []).map((row: any) => ({
      id: row.election_id,
      title: row.election_name,
      description: row.description,
      status: row.status,
      startDate: row.start_date,
      endDate: row.end_date,
      totalVoters: 0, // Default value
      myVoteStatus: "not_voted", // Default value - could be calculated based on user
      organizationName: "",
      contestCount: 0 // Default value
    }));

    const response = NextResponse.json({
      elections: transformedElections,
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
        status: newElection.status,
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