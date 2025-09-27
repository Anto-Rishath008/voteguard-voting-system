import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

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

    // Check if user has admin permissions
    const hasAdminPermission = await DatabaseUtils.checkUserRole(
      authUser.userId,
      "Admin"
    );
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();

    // Get contests with candidates
    const { data: contests, error: contestError } = await supabase
      .from("contests")
      .select(
        `
        contest_id,
        contest_title,
        contest_type,
        candidates (
          candidate_id,
          candidate_name,
          party
        )
      `
      )
      .eq("election_id", electionId)
      .order("contest_id");

    if (contestError) {
      console.error("Error fetching contests:", contestError);
      return NextResponse.json(
        { error: "Failed to fetch contests" },
        { status: 500 }
      );
    }

    // Format the response
    const formattedContests =
      contests?.map((contest) => ({
        id: contest.contest_id,
        title: contest.contest_title,
        contestType: contest.contest_type,
        candidates:
          contest.candidates?.map((candidate: any) => ({
            id: candidate.candidate_id,
            name: candidate.candidate_name,
            party: candidate.party,
          })) || [],
      })) || [];

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

    // Check if user has admin permissions
    const hasAdminPermission = await DatabaseUtils.checkUserRole(
      authUser.userId,
      "Admin"
    );
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
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

    // Create contest
    const { data: contest, error: contestError } = await supabase
      .from("contests")
      .insert({
        election_id: electionId,
        contest_title: title,
        contest_type: contestType,
      })
      .select()
      .single();

    if (contestError) {
      console.error("Error creating contest:", contestError);
      return NextResponse.json(
        { error: "Failed to create contest" },
        { status: 500 }
      );
    }

    // Create audit log
    await DatabaseUtils.createAuditLog(
      authUser.userId,
      "INSERT",
      "contest_create",
      contest.contest_id.toString(),
      null,
      {
        election_id: electionId,
        contest_title: title,
        contest_type: contestType,
      },
      "unknown",
      "unknown"
    );

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
