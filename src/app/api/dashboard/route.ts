import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token instead of Supabase auth
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user profile using our local auth user ID
    const { data: userProfile, error: profileError } = await supabase
      .from("users")
      .select("user_id, first_name, last_name, email, status")
      .eq("user_id", authUser.userId)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    // Get all elections (simplified for now - can add jurisdiction filtering later)
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
        creator
      `
      )
      .order("start_date", { ascending: false })
      .limit(10);

    if (electionsError) {
      console.error("Error fetching elections:", electionsError);
      return NextResponse.json(
        { error: "Failed to fetch elections" },
        { status: 500 }
      );
    }

    // Process elections data
    const elections = await Promise.all(
      (electionsData || []).map(async (election: any) => {
        // Check if user has voted in this election
        const { data: userVote } = await supabase
          .from("votes")
          .select("vote_id")
          .eq("election_id", election.election_id)
          .eq("user_id", userProfile.user_id)
          .single();

        // Get total votes count for this election
        const { count: totalVotes } = await supabase
          .from("votes")
          .select("*", { count: "exact" })
          .eq("election_id", election.election_id);

        const hasVoted = !!userVote;
        const canVote = election.status === "Active" && !hasVoted;

        return {
          id: election.election_id,
          name: election.election_name,
          description: election.description,
          status: election.status,
          startDate: election.start_date,
          endDate: election.end_date,
          totalVotes: totalVotes || 0,
          hasVoted,
          canVote,
        };
      })
    );

    // Calculate stats based on all elections
    const { data: allElections } = await supabase
      .from("elections")
      .select("election_id, status");

    const totalElections = allElections?.length || 0;
    const activeElections =
      allElections?.filter((e: any) => e.status === "Active").length || 0;
    const completedElections =
      allElections?.filter((e: any) => e.status === "Completed").length || 0;
    const draftElections =
      allElections?.filter((e: any) => e.status === "Draft").length || 0;

    // Count voted elections for current user
    const { count: userVotedCount } = await supabase
      .from("votes")
      .select("*", { count: "exact" })
      .eq("user_id", userProfile.user_id);

    return NextResponse.json({
      user: {
        id: userProfile.user_id,
        name: `${userProfile.first_name} ${userProfile.last_name}`,
        email: userProfile.email,
        roles: authUser.roles,
      },
      elections,
      stats: {
        totalElections,
        activeElections,
        completedElections,
        draftElections,
        userVotedCount: userVotedCount || 0,
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
