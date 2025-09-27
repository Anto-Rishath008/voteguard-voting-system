import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

export async function GET(request: NextRequest) {
  try {
    // Verify user authentication using local auth
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

    // Get all elections (admin can see all elections)
    const { data: electionsData, error: electionsError } = await supabase
      .from("elections")
      .select(
        `
        election_id,
        election_name,
        description,
        status,
        start_date,
        end_date,
        creator,
        created_at
      `
      )
      .order("created_at", { ascending: false });

    if (electionsError) {
      console.error("Error fetching elections:", electionsError);
      return NextResponse.json(
        { error: "Failed to fetch elections" },
        { status: 500 }
      );
    }

    // Get vote counts for each election (simplified without eligibility table)
    const elections = await Promise.all(
      (electionsData || []).map(async (election: any) => {
        // Get vote count
        const { count: totalVotes } = await supabase
          .from("votes")
          .select("*", { count: "exact", head: true })
          .eq("election_id", election.election_id);

        // Get total eligible voters (users with Voter role)
        const { count: totalVoters } = await supabase
          .from("user_roles")
          .select("*", { count: "exact", head: true })
          .eq("role_name", "Voter");

        // Map database status to frontend status
        let mappedStatus = election.status.toLowerCase();

        // Derive 'upcoming' status from dates if election is Draft but start date is in future
        const now = new Date();
        const startDate = new Date(election.start_date);
        const endDate = new Date(election.end_date);

        if (election.status === "Draft" && startDate > now) {
          mappedStatus = "upcoming";
        } else if (
          election.status === "Active" ||
          (startDate <= now && endDate > now)
        ) {
          mappedStatus = "active";
        } else if (election.status === "Completed" || endDate <= now) {
          mappedStatus = "completed";
        } else {
          mappedStatus = "draft";
        }

        return {
          id: election.election_id,
          title: election.election_name,
          description: election.description,
          status: mappedStatus,
          startDate: election.start_date,
          endDate: election.end_date,
          totalVoters: totalVoters || 0,
          totalVotes: totalVotes || 0,
          createdAt: election.created_at,
        };
      })
    );

    return NextResponse.json({ elections });
  } catch (error) {
    console.error("Admin elections API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication using local auth
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

    const { title, description, startDate, endDate } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Title, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Create new election
    const { data: election, error: electionError } = await supabase
      .from("elections")
      .insert({
        election_name: title,
        description: description || "",
        start_date: startDate,
        end_date: endDate,
        status: "Draft",
        creator: authUser.userId,
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

    return NextResponse.json({ election });
  } catch (error) {
    console.error("Create election API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
