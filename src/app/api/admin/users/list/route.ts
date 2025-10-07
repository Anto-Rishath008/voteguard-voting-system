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
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    try {
      // Fetch all users with basic information
      const { data: users, error: usersError } = await supabaseAuth.supabaseAdmin
        .from('users')
        .select('user_id, first_name, last_name, email')
        .order('first_name', { ascending: true });

      if (usersError) {
        console.error("Error fetching users:", usersError);
        throw usersError;
      }

      // Transform the data
      const usersList = (users || []).map((user: any) => ({
        user_id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
        display: `${user.first_name} ${user.last_name} (${user.email})`
      }));

      return NextResponse.json({
        users: usersList,
        total: usersList.length
      });
    } catch (error) {
      console.error("Error fetching users list:", error);
      return NextResponse.json({
        users: [],
        total: 0
      });
    }
  } catch (error) {
    console.error("Users list API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
