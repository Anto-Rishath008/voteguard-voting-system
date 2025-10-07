import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Build query
    let query = supabase.from("elections").select(`
        election_id,
        election_name,
        description,
        status,
        start_date,
        end_date,
        creator,
        contests (
          contest_id,
          contest_title,
          contest_type,
          candidates (
            candidate_id,
            candidate_name,
            party
          )
        )
      `);

    if (status) {
      query = query.eq("status", status);
    }

    // Get elections with pagination
    const {
      data: electionsData,
      error,
      count,
    } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching elections:", error);
      return NextResponse.json(
        { error: "Failed to fetch elections" },
        { status: 500 }
      );
    }

    // Process elections to match frontend expectations
    const elections = await Promise.all(
      (electionsData || []).map(async (election: any) => {
        // Get total votes for this election (as a proxy for eligible voters)
        const { count: totalVotes } = await supabase
          .from("votes")
          .select("*", { count: "exact" })
          .eq("election_id", election.election_id);

        // Check if current user has voted
        const { data: userVote } = await supabase
          .from("votes")
          .select("vote_id")
          .eq("election_id", election.election_id)
          .eq("user_id", authUser.userId)
          .single();

        // Determine vote status
        let myVoteStatus = "not_voted";
        if (userVote) {
          myVoteStatus = "voted";
        }

        return {
          id: election.election_id,
          title: election.election_name,
          description: election.description,
          status: election.status,
          startDate: election.start_date,
          endDate: election.end_date,
          totalVoters: totalVotes || 0,
          contests: election.contests || [],
          myVoteStatus: myVoteStatus,
          hasVoted: !!userVote,
          canVote: election.status === "Active" && !userVote,
        };
      })
    );

    return NextResponse.json({
      elections,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error("Elections API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify JWT token
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has Admin role
    if (
      !authUser.roles.includes("Admin") &&
      !authUser.roles.includes("SuperAdmin")
    ) {
      return NextResponse.json(
        { error: "Insufficient permissions. Admin role required." },
        { status: 403 }
      );
    }

    const supabase = createAdminClient();
    const body = await request.json();
    const {
      electionName,
      description,
      startDate,
      endDate,
      contests,
      jurisdictions,
    } = body;

    // Validate required fields
    if (!electionName || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create election
    const { data: election, error: electionError } = await supabase
      .from("elections")
      .insert({
        election_name: electionName,
        description,
        start_date: startDate,
        end_date: endDate,
        creator: authUser.userId,
        status: "Draft",
      })
      .select()
      .single();

    if (electionError) {
      console.error("Error creating election:", electionError);
      return NextResponse.json(
        { error: "Failed to create election" },
        { status: 500 }
      );
    }

    // Create contests if provided
    if (contests && contests.length > 0) {
      const contestsToInsert = contests.map((contest: any, index: number) => ({
        contest_id: index + 1,
        election_id: election.election_id,
        contest_title: contest.title,
        contest_type: contest.type,
      }));

      const { error: contestsError } = await supabase
        .from("contests")
        .insert(contestsToInsert);

      if (contestsError) {
        console.error("Error creating contests:", contestsError);
        // Continue with election creation even if contests fail
      }
    }

    // Link to jurisdictions if provided
    if (jurisdictions && jurisdictions.length > 0) {
      const jurisdictionLinks = jurisdictions.map((jurisdictionId: number) => ({
        election_id: election.election_id,
        jurisdiction_id: jurisdictionId,
      }));

      const { error: jurisdictionError } = await supabase
        .from("election_jurisdictions")
        .insert(jurisdictionLinks);

      if (jurisdictionError) {
        console.error("Error linking jurisdictions:", jurisdictionError);
      }
    }

    return NextResponse.json({ election }, { status: 201 });
  } catch (error) {
    console.error("Create election error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
