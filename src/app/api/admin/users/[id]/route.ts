import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { verifyJWT } from "@/lib/auth";
import { DatabaseUtils } from "@/lib/database";

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("user_id, email")
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent deletion of current user
    if (existingUser.user_id === authUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Delete user roles first (due to foreign key constraints)
    const { error: roleDeleteError } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId);

    if (roleDeleteError) {
      console.error("Error deleting user roles:", roleDeleteError);
      return NextResponse.json(
        { error: "Failed to delete user roles" },
        { status: 500 }
      );
    }

    // Delete the user
    const { error: deleteError } = await supabase
      .from("users")
      .delete()
      .eq("user_id", userId);

    if (deleteError) {
      console.error("Error deleting user:", deleteError);
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "User deleted successfully",
      deletedUser: existingUser.email
    });

  } catch (error) {
    console.error("Delete user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update user status or other fields
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, first_name, last_name } = body;

    const supabase = createAdminClient();

    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("user_id, email, status")
      .eq("user_id", userId)
      .single();

    if (fetchError || !existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    if (status && ["Active", "Inactive", "Suspended"].includes(status)) {
      updateData.status = status;
    }
    if (first_name) {
      updateData.first_name = first_name;
    }
    if (last_name) {
      updateData.last_name = last_name;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update the user
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating user:", updateError);
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error("Update user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/admin/users/[id] - Get specific user details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const userId = params.id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select(`
        user_id,
        email,
        first_name,
        last_name,
        status,
        last_login,
        created_at
      `)
      .eq("user_id", userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user roles
    const { data: rolesData, error: rolesError } = await supabase
      .from("user_roles")
      .select("role_name")
      .eq("user_id", userId);

    if (rolesError) {
      console.error("Error fetching user roles:", rolesError);
      return NextResponse.json(
        { error: "Failed to fetch user roles" },
        { status: 500 }
      );
    }

    // Combine user data with roles
    const user = {
      ...userData,
      roles: (rolesData || []).map((role: any) => role.role_name),
    };

    return NextResponse.json({ user });

  } catch (error) {
    console.error("Get user API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}