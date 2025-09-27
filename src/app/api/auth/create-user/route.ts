import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const { userId, email, firstName, lastName } = await request.json();

    if (!userId || !email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Create user in our custom users table
    const { data: user, error: userError } = await supabase
      .from("users")
      .insert({
        user_id: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        status: "Active",
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      );
    }

    // Assign default voter role
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role_name: "Voter",
      assigned_by: userId, // Self-assigned for registration
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      return NextResponse.json(
        { error: "Failed to assign user role" },
        { status: 500 }
      );
    }

    // Create audit log
    await DatabaseUtils.createAuditLog(
      userId,
      "INSERT",
      "users",
      userId,
      undefined,
      { email, firstName, lastName, action: "user_registration" },
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    console.error("User creation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
