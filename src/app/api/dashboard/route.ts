import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Verify JWT token
    const { user: authUser, error: authError } = verifyJWT(request);

    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // For now, return a simple dashboard response using JWT data
    // This bypasses database issues and allows testing
    const userProfile = {
      user_id: authUser.userId,
      first_name: "Test",
      last_name: "User",
      email: authUser.email,
      status: "Active"
    };

    // Mock elections data for testing
    const elections = [
      {
        id: "1",
        name: "Student Council Election 2025",
        description: "Annual student council election",
        status: "Active",
        startDate: "2025-10-01T00:00:00Z",
        endDate: "2025-10-07T23:59:59Z",
        totalVotes: 0,
        hasVoted: false,
        canVote: true,
      },
      {
        id: "2",
        name: "Class Representative Election",
        description: "Quarterly class representative selection",
        status: "Upcoming",
        startDate: "2025-10-15T00:00:00Z",
        endDate: "2025-10-20T23:59:59Z",
        totalVotes: 0,
        hasVoted: false,
        canVote: false,
      }
    ];

    // Get all elections
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
