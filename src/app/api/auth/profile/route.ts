import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient, createAdminClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    // Check for local auth token first
    const authToken = request.cookies.get("auth_token")?.value;

    if (authToken) {
      return await handleLocalAuth(request, authToken);
    }

    // Fall back to Supabase auth
    return await handleSupabaseAuth(request);
  } catch (error) {
    console.error("Profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleLocalAuth(request: NextRequest, authToken: string) {
  // Verify JWT token
  let decoded: any;
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    decoded = verify(authToken, jwtSecret);
  } catch (error) {
    console.error("JWT verification failed:", error);
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    console.error("Failed to create Supabase client");
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }

  // Get user details from database
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", decoded.userId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Check if account is still active
  if (user.status !== "Active") {
    return NextResponse.json(
      { error: "Account is not active" },
      { status: 403 }
    );
  }

  // Get user roles
  const { data: roles } = await supabase
    .from("user_roles")
    .select("role_name")
    .eq("user_id", user.user_id);

  const userRoles = roles?.map((r) => r.role_name) || [];

  // Update last seen timestamp
  await supabase
    .from("user_sessions")
    .update({
      last_seen_timestamp: new Date().toISOString(),
    })
    .eq("user_id", user.user_id)
    .eq("is_active", true);

  return NextResponse.json({
    user: {
      id: user.user_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      roles: userRoles,
      status: user.status,
      emailVerified: user.email_verified,
      lastLogin: user.last_login,
      authMode: "local",
    },
  });
}

async function handleSupabaseAuth(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);
  if (!supabase) {
    console.error("Failed to create Supabase route handler client");
    return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
  }

  // Get current user from session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user details with roles from our database
  const userWithRoles = await DatabaseUtils.getUserWithRoles(user.id);

  if (!userWithRoles) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 }
    );
  }

  // Return user data
  return NextResponse.json({
    user: {
      ...user,
      roles: userWithRoles.roles,
      firstName: userWithRoles.first_name,
      lastName: userWithRoles.last_name,
      status: userWithRoles.status,
      authMode: "supabase",
    },
  });
}

export async function PUT(request: NextRequest) {
  try {
    // Check for local auth token first
    const authToken = request.cookies.get("auth_token")?.value;

    if (authToken) {
      return await handleLocalProfileUpdate(request, authToken);
    }

    // Fall back to Supabase auth profile update
    return await handleSupabaseProfileUpdate(request);
  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

async function handleLocalProfileUpdate(
  request: NextRequest,
  authToken: string
) {
  // Verify JWT token
  let decoded: any;
  try {
    decoded = verify(authToken, process.env.JWT_SECRET!);
  } catch (error) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { firstName, lastName } = await request.json();
  const supabase = createAdminClient();

  // Update user profile
  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", decoded.userId)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating profile:", updateError);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  // Create audit log
  await DatabaseUtils.createAuditLog(
    decoded.userId,
    "UPDATE",
    "users",
    decoded.userId,
    undefined,
    { firstName, lastName, action: "profile_update" },
    request.headers.get("x-forwarded-for") || "unknown",
    request.headers.get("user-agent") || "unknown"
  );

  return NextResponse.json({ user: updatedUser });
}

async function handleSupabaseProfileUpdate(request: NextRequest) {
  const supabase = createRouteHandlerClient(request);
  const { firstName, lastName } = await request.json();

  // Get current user from session
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Update user profile
  const { data: updatedUser, error: updateError } = await supabase
    .from("users")
    .update({
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", user.id)
    .select()
    .single();

  if (updateError) {
    console.error("Error updating profile:", updateError);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  // Create audit log
  await DatabaseUtils.createAuditLog(
    user.id,
    "UPDATE",
    "users",
    user.id,
    undefined,
    { firstName, lastName, action: "profile_update" },
    request.headers.get("x-forwarded-for") || "unknown",
    request.headers.get("user-agent") || "unknown"
  );

  return NextResponse.json({ user: updatedUser });
}
