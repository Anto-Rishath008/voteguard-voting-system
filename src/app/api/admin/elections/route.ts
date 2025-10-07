import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    // Check for auth token
    const authToken = request.cookies.get("auth-token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      
      decoded = verify(authToken, jwtSecret);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get current user with roles to check permissions
    const currentUser = await supabaseAuth.getUserWithRolesByEmail(decoded.email);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin permissions
    if (!currentUser.roles || !currentUser.roles.some((role: string) => ['Admin', 'SuperAdmin'].includes(role))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Get all elections using Supabase
    const { data: electionsData, error: electionsError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .select('election_id, election_name, description, status, start_date, end_date, creator, created_at')
      .order('created_at', { ascending: false });
    
    if (electionsError || !electionsData) {
      console.error("Error fetching elections:", electionsError);
      return NextResponse.json(
        { error: "Failed to fetch elections" },
        { status: 500 }
      );
    }

    // Get vote counts for each election
    const elections = await Promise.all(
      (electionsData || []).map(async (election: any) => {
        // Get vote count using Supabase
        const { count: voteCount } = await supabaseAuth.supabaseAdmin
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('election_id', election.election_id);
        const totalVotes = voteCount || 0;

        // Get total eligible voters (users with Voter role)
        const { count: voterCount } = await supabaseAuth.supabaseAdmin
          .from('user_roles')
          .select('*', { count: 'exact', head: true })
          .eq('role_name', 'Voter');
        
        const totalVoters = voterCount || 0;

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

    const response = NextResponse.json({ elections });

    // Prevent caching to ensure users always get fresh election data
    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
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
    // Check for auth token
    const authToken = request.cookies.get("auth-token")?.value;
    if (!authToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      
      decoded = verify(authToken, jwtSecret);
    } catch (error) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Get current user with roles to check permissions
    const currentUser = await supabaseAuth.getUserWithRolesByEmail(decoded.email);
    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user has admin permissions
    if (!currentUser.roles || !currentUser.roles.some((role: string) => ['Admin', 'SuperAdmin'].includes(role))) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, description, startDate, endDate } = body;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Title, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Create new election using Supabase
    const { data: election, error: electionError } = await supabaseAuth.supabaseAdmin
      .from('elections')
      .insert([{
        election_name: title,
        description: description || "",
        start_date: startDate,
        end_date: endDate,
        status: "Draft",
        creator: decoded.userId
      }])
      .select('election_id, election_name, description, start_date, end_date, status, creator, created_at')
      .single();

    if (electionError || !election) {
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
