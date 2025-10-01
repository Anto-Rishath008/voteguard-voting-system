import { NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/enhanced-database";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    console.log("Profile API called - checking authentication...");
    
    // Check for local auth token first
    const authToken = request.cookies.get("auth_token")?.value;
    console.log("Auth token present:", !!authToken);

    if (authToken) {
      console.log("Using local auth");
      return await handleLocalAuth(request, authToken);
    }

    // Fall back to Supabase auth
    console.log("Falling back to Supabase auth");
    return await handleSupabaseAuth(request);
  } catch (error) {
    console.error("Profile API error:", error);
    // Return a more specific error for debugging
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: "Internal server error", 
          message: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Internal server error", message: "Unknown error" },
      { status: 500 }
    );
  }
}

async function handleLocalAuth(request: NextRequest, authToken: string) {
  console.log("Handling local authentication...");
  
  // Verify JWT token
  let decoded: any;
  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not set in environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    
    console.log("Verifying JWT token...");
    decoded = verify(authToken, jwtSecret);
    console.log("JWT verification successful for user:", decoded.userId);
  } catch (error) {
    console.error("JWT verification failed:", error);
    return NextResponse.json({ 
      error: "Invalid token",
      message: "Authentication token is invalid or expired",
      authRequired: true
    }, { status: 401 });
  }

  const db = getDatabase();
  
  console.log("Querying user details from database for user_id:", decoded.userId);
  // Get user details from database
  try {
    const userResult = await db.query(
      'SELECT * FROM users WHERE user_id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      console.error("User not found in database:", decoded.userId);
      return NextResponse.json({ 
        error: "User not found",
        authRequired: true
      }, { status: 404 });
    }
    
    const user = userResult.rows[0];

  if (userError) {
    console.error("Database error when fetching user:", userError);
    return NextResponse.json({ error: "Database error", details: userError.message }, { status: 500 });
  }

  if (!user) {
    console.log("User not found in database for user_id:", decoded.userId);
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  console.log("User found in database:", user.email);

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
  console.log("Handling Supabase authentication...");
  
  try {
    const supabase = createRouteHandlerClient(request);
    if (!supabase) {
      console.error("Failed to create Supabase route handler client");
      return NextResponse.json({ error: "Database connection failed" }, { status: 500 });
    }

    console.log("Getting user from Supabase session...");
    // Get current user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("Supabase auth result:", { user: !!user, authError: !!authError });

    if (authError) {
      console.error("Supabase auth error:", authError);
      return NextResponse.json({ error: "Authentication failed", details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.log("No user found in session");
      return NextResponse.json({ 
        error: "No user session found", 
        message: "Please log in to access your profile",
        authRequired: true 
      }, { status: 401 });
    }
    // Get user details with roles from our database
    console.log("Getting user details with roles for user:", user.id);
    const userWithRoles = await DatabaseUtils.getUserWithRoles(user.id);

    if (!userWithRoles) {
      console.log("User profile not found in database for user:", user.id);
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    console.log("Successfully retrieved user profile");
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
  } catch (error) {
    console.error("Error in handleSupabaseAuth:", error);
    return NextResponse.json({ error: "Authentication error", details: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
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

  if (!supabase) {
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 }
    );
  }

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
  
  if (!supabase) {
    return NextResponse.json(
      { error: "Database connection failed" },
      { status: 500 }
    );
  }

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
