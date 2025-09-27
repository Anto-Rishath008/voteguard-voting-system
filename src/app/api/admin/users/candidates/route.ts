import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

// GET users that can be added as candidates
export async function GET(request: NextRequest) {
  try {
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

    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("user_id, first_name, last_name, email")
      .eq("status", "Active")
      .order("first_name");

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    const formattedUsers =
      users?.map((user) => ({
        id: user.user_id,
        name: `${user.first_name} ${user.last_name}`,
        email: user.email,
      })) || [];

    return NextResponse.json({ users: formattedUsers });
  } catch (error) {
    console.error("Get users API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
