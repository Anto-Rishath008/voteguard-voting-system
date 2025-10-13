import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";

// GET contests for an election
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

    // Get contests with candidates using Supabase
    const { data: contests, error: contestsError } = await supabaseAuth.supabaseAdmin
      .from('contests')
      .select(`
        contest_id,
        contest_title,
        contest_type,
        candidates (
          candidate_id,
          candidate_name,
          party
        )
      `)
      .eq('election_id', electionId)
      .order('contest_id');

    if (contestsError) {
      console.error("Error fetching contests:", contestsError);
      throw contestsError;
    }

    // Format the response
    const formattedContests = (contests || []).map((contest: any) => ({
      id: contest.contest_id,
      title: contest.contest_title,
      contestType: contest.contest_type,
      candidates: (contest.candidates || []).map((candidate: any) => ({
        id: candidate.candidate_id,
        name: candidate.candidate_name,
        party: candidate.party,
      })),
    }));

    return NextResponse.json({ contests: formattedContests });
  } catch (error) {
    console.error("Get contests API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new contest
export async function POST(
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

    const body = await request.json();
    const { title, contestType } = body;

    if (!title || !contestType) {
      return NextResponse.json(
        { error: "Title and contest type are required" },
        { status: 400 }
      );
    }

    if (!["ChooseOne", "YesNo"].includes(contestType)) {
      return NextResponse.json(
        { error: "Contest type must be ChooseOne or YesNo" },
        { status: 400 }
      );
    }

    // Create contest using Supabase
    const { data: contest, error: contestError } = await supabaseAuth.supabaseAdmin
      .from('contests')
      .insert({
        election_id: electionId,
        contest_title: title,
        contest_type: contestType
      })
      .select('contest_id, contest_title, contest_type')
      .single();

    if (contestError) {
      console.error("Error creating contest:", contestError);
      throw contestError;
    }

    return NextResponse.json({
      message: "Contest created successfully",
      contest: {
        id: contest.contest_id,
        title: contest.contest_title,
        contestType: contest.contest_type,
        candidates: [],
      },
    });
  } catch (error) {
    console.error("Create contest API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}