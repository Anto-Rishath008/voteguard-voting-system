import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

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

    const db = getDatabase();
    
    // Check if user has admin permissions
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get contests with candidates using direct SQL
    const contestsResult = await db.query(`
      SELECT 
        c.contest_id,
        c.contest_title,
        c.contest_type,
        COALESCE(
          json_agg(
            json_build_object(
              'candidate_id', cand.candidate_id,
              'candidate_name', cand.candidate_name,
              'party', cand.party
            )
            ORDER BY cand.candidate_name
          ) FILTER (WHERE cand.candidate_id IS NOT NULL),
          '[]'
        ) as candidates
      FROM contests c
      LEFT JOIN candidates cand ON c.contest_id = cand.contest_id AND c.election_id = cand.election_id
      WHERE c.election_id = $1
      GROUP BY c.contest_id, c.contest_title, c.contest_type
      ORDER BY c.contest_id
    `, [electionId]);

    // Format the response
    const formattedContests = contestsResult.rows.map((contest) => ({
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

    const db = getDatabase();
    
    // Check if user has admin permissions
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
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

    // Create contest using direct SQL
    const contestResult = await db.query(
      `INSERT INTO contests (election_id, contest_title, contest_type)
       VALUES ($1, $2, $3)
       RETURNING contest_id, contest_title, contest_type`,
      [electionId, title, contestType]
    );

    const contest = contestResult.rows[0];

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
