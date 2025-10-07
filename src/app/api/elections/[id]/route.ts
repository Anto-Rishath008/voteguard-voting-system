import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const electionId = resolvedParams.id;

    console.log("📊 Getting election details for ID:", electionId);

    // Verify user authentication using local auth
    const { user: authUser, error: authError } = verifyJWT(request);
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get election details from Supabase
    const { data: electionData, error: electionError } = await supabaseAdmin
      .from('elections')
      .select('election_id, election_name, description, status, start_date, end_date, creator')
      .eq('election_id', electionId)
      .single();

    if (electionError || !electionData) {
      console.error("Election not found:", electionError);
      return NextResponse.json(
        { error: "Election not found" },
        { status: 404 }
      );
    }

    // Get eligible voters count for this election
    const { count: totalVoters } = await supabaseAdmin
      .from('eligible_voters')
      .select('*', { count: 'exact', head: true })
      .eq('election_id', electionId)
      .eq('status', 'eligible');

    // Check if current user is eligible for this election
    const { data: userEligibility } = await supabaseAdmin
      .from('eligible_voters')
      .select('status')
      .eq('election_id', electionId)
      .eq('user_id', authUser.userId)
      .maybeSingle();

    // Check if user has voted
    const { data: userVote } = await supabaseAdmin
      .from('votes')
      .select('vote_id')
      .eq('election_id', electionId)
      .eq('voter_id', authUser.userId)
      .maybeSingle();

    // Check if user is a candidate in any contest for this election
    const { data: candidateCheck } = await supabaseAdmin
      .from('candidates')
      .select('candidate_id')
      .eq('election_id', electionId)
      .eq('user_id', authUser.userId)
      .maybeSingle();

    // Check if user has admin or superadmin role
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role_name')
      .eq('user_id', authUser.userId)
      .in('role_name', ['Admin', 'SuperAdmin']);

    const isAdminOrSuperAdmin = userRoles && userRoles.length > 0;
    const isCandidate = candidateCheck !== null;

    // Determine vote status based on eligibility, voting history, role, and candidate status
    let myVoteStatus: "not_voted" | "voted" | "ineligible" = "not_voted";
    
    // Check eligibility first - if user is explicitly marked as eligible, they can vote
    if (userEligibility && userEligibility.status === 'eligible') {
      // User is eligible, check if they've voted
      if (userVote) {
        myVoteStatus = "voted";
      } else {
        myVoteStatus = "not_voted";
      }
    } else {
      // User is not eligible (either not in eligible_voters table or status is not 'eligible')
      myVoteStatus = "ineligible";
    }

    // Get contests for this election
    const { data: contestsData, error: contestsError } = await supabaseAdmin
      .from('contests')
      .select('contest_id, contest_title, contest_type, max_selections')
      .eq('election_id', electionId)
      .order('contest_id', { ascending: true });

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
        const { data: candidatesData, error: candidatesError } = await supabaseAdmin
          .from('candidates')
          .select('candidate_id, candidate_name, party')
          .eq('contest_id', contest.contest_id)
          .eq('election_id', electionId)
          .order('candidate_name', { ascending: true });

        if (candidatesError) {
          console.error("Error fetching candidates:", candidatesError);
        }

        return {
          id: contest.contest_id,
          title: contest.contest_title,
          contestType: contest.contest_type,
          maxSelections: contest.max_selections || 1,
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
