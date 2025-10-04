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

    // Get all users with their roles using Supabase
    const { data: usersData, error: usersError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('user_id, email, first_name, last_name, status, last_login, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error("Error fetching users:", usersError);
      return NextResponse.json(
        { error: "Failed to fetch users" },
        { status: 500 }
      );
    }

    // Get all user roles
    const { data: rolesData, error: rolesError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .select('user_id, role_name');

    if (rolesError) {
      console.log("User roles table may not exist:", rolesError);
    }

    // Create a map of user roles
    const userRolesMap = new Map<string, string[]>();
    (rolesData || []).forEach((role: any) => {
      if (!userRolesMap.has(role.user_id)) {
        userRolesMap.set(role.user_id, []);
      }
      userRolesMap.get(role.user_id)?.push(role.role_name);
    });

    // Transform the data to include roles as an array
    const users = (usersData || []).map((user: any) => ({
      user_id: user.user_id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      status: user.status,
      last_login: user.last_login,
      created_at: user.created_at,
      roles: userRolesMap.get(user.user_id) || [],
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Admin users API error:", error);
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
    const { email, firstName, lastName, password, roles = ["Voter"] } = body;

    if (!email || !firstName || !lastName || !password) {
      return NextResponse.json(
        { error: "Email, first name, last name, and password are required" },
        { status: 400 }
      );
    }

    // Create user using the auth service
    const response = await fetch(
      `${request.nextUrl.origin}/api/auth/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: request.headers.get("cookie") || "",
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          password,
          roles,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to create user" },
        { status: response.status }
      );
    }

    const userData = await response.json();
    return NextResponse.json({ user: userData.user });
  } catch (error) {
    console.error("Create user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
