import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
import { verify } from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    console.log("Profile API called - checking authentication...");
    
    // Debug: Log all cookies
    const allCookies = request.cookies.getAll();
    console.log("All cookies received:", allCookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    
    // Check for local auth token
    const authToken = request.cookies.get("auth-token")?.value;
    console.log("Auth token present:", !!authToken);
    if (authToken) {
      console.log("Auth token length:", authToken.length);
    }

    if (!authToken) {
      return NextResponse.json({ 
        error: "No authentication token found",
        authRequired: true 
      }, { status: 401 });
    }

    // Verify JWT token
    let decoded: any;
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error("JWT_SECRET is not set in environment variables");
        return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
      }
      
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

    console.log("Querying user details from Supabase for user_id:", decoded.userId);
    
    // Get user details from Supabase
    const { data: userData, error: userError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('*')
      .eq('user_id', decoded.userId)
      .single();
    
    if (userError || !userData) {
      console.error("User not found in database:", decoded.userId, userError);
      return NextResponse.json({ 
        error: "User not found",
        authRequired: true
      }, { status: 404 });
    }
    
    console.log("User found:", { userId: userData.user_id, email: userData.email });

    // Get user roles
    const { data: rolesData, error: rolesError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userData.user_id);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return NextResponse.json({ error: "Error fetching user roles" }, { status: 500 });
    }

    const userRoles = rolesData?.map(r => r.role_name) || [];
    console.log("User roles:", userRoles);

    return NextResponse.json({
      success: true,
      user: {
        userId: userData.user_id,
        email: userData.email,
        firstName: userData.first_name,
        lastName: userData.last_name,
        phoneNumber: userData.phone_number,
        roles: userRoles,
        status: userData.status,
        createdAt: userData.created_at,
        lastLogin: userData.last_login
      }
    });

  } catch (error) {
    console.error("Profile API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check for auth token
    const authToken = request.cookies.get("auth-token")?.value;
    if (!authToken) {
      return NextResponse.json({ 
        error: "No authentication token found",
        authRequired: true 
      }, { status: 401 });
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
      return NextResponse.json({ 
        error: "Invalid token",
        authRequired: true
      }, { status: 401 });
    }

    const body = await request.json();
    const { firstName, lastName, phoneNumber } = body;

    // Update user profile using Supabase
    const { data: updatedUser, error: updateError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', decoded.userId)
      .select()
      .single();

    if (updateError || !updatedUser) {
      console.error("Error updating user profile:", updateError);
      return NextResponse.json({ error: "User not found or update failed" }, { status: 404 });
    }

    // Create audit log
    await supabaseAuth.supabaseAdmin
      .from('audit_log')
      .insert([{
        user_id: decoded.userId,
        operation_type: 'UPDATE',
        table_name: 'users',
        record_id: decoded.userId,
        new_values: { firstName, lastName, phoneNumber },
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }]);

    return NextResponse.json({
      user: {
        userId: updatedUser.user_id,
        email: updatedUser.email,
        firstName: updatedUser.first_name,
        lastName: updatedUser.last_name,
        phoneNumber: updatedUser.phone_number,
        status: updatedUser.status,
        updatedAt: updatedUser.updated_at
      }
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}