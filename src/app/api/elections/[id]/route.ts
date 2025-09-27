import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get election details
    const { data: electionData, error: electionError } = await supabase
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
      .eq("election_id", electionId)
      .single();

    if (electionError || !electionData) {
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Get voter count for this election (simplified - no eligibility table for now)
    const { count: totalVoters } = await supabase
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("election_id", electionId);

    // Check if user has voted
    const { data: userVote } = await supabase
      .from("votes")
      .select("vote_id")
      .eq("election_id", electionId)
      .eq("user_id", authUser.userId)
      .single();

    // For now, assume all authenticated users are eligible
    let myVoteStatus = userVote ? "voted" : "not_voted";

    // Get contests for this election
    const { data: contestsData, error: contestsError } = await supabase
      .from("contests")
      .select(
        `
        contest_id,
        contest_title,
        contest_type
      `
      )
      .eq("election_id", electionId)
      .order("contest_id", { ascending: true });

    if (contestsError) {
      console.error("Error fetching contests:", contestsError);
      return NextResponse.json(
        { error: "Failed to fetch contests" },
        { status: 500 }
      );
    }

    // Get candidates for each contest
    const contests = await Promise.all(
      (contestsData || []).map(async (contest: any) => {
        const { data: candidatesData } = await supabase
          .from("candidates")
          .select(
            `
          candidate_id,
          candidate_name,
          party
        `
          )
          .eq("contest_id", contest.contest_id)
          .eq("election_id", electionId)
          .order("candidate_name", { ascending: true });

        return {
          id: contest.contest_id,
          title: contest.contest_title,
          contestType: contest.contest_type,
          candidates: (candidatesData || []).map((candidate: any) => ({
            id: candidate.candidate_id,
            name: candidate.candidate_name,
            party: candidate.party,
          })),
        };
      })
    );

    const election = {
      id: electionData.election_id,
      title: electionData.election_name,
      description: electionData.description,
      status: electionData.status,
      startDate: electionData.start_date,
      endDate: electionData.end_date,
      totalVoters: totalVoters || 0,
      myVoteStatus,
      contests,
    };

    return NextResponse.json({ election });
  } catch (error) {
    console.error("Election details API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
