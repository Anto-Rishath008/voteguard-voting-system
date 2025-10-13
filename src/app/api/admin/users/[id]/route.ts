import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";

// CORS headers helper
function getCorsHeaders() {
  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,OPTIONS,PATCH,DELETE,POST,PUT',
    'Access-Control-Allow-Headers': 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, Cookie',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

// Helper function to check user role using Supabase
async function checkUserRole(userId: string, requiredRole: string): Promise<boolean> {
  try {
    console.log(`🔍 checkUserRole - Checking if user ${userId} has role: ${requiredRole}`);
    
    // First, let's see what roles this user has
    const { data: userRoles, error: rolesError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId);
    
    if (rolesError) {
      console.error("❌ Error fetching user roles:", rolesError);
      return false;
    }
    
    console.log(`👤 User ${userId} has ${userRoles?.length || 0} role(s):`, userRoles?.map((r: any) => r.role_name));
    
    // Check for the exact role (case-insensitive)
    const hasRole = userRoles?.some((r: any) => r.role_name.toLowerCase() === requiredRole.toLowerCase()) || false;
    console.log(`✅ User has ${requiredRole} role:`, hasRole ? 'YES' : 'NO');
    return hasRole;
  } catch (error) {
    console.error("❌ Error checking user role:", error);
    return false;
  }
}

// Helper function to log audit events
async function logAudit(userId: string, action: string, resourceType: string, resourceId: string, details: any) {
  try {
    // Note: Table is 'audit_log' (singular), not 'audit_logs'
    // Schema uses: operation_type, table_name, record_id, new_values
    await supabaseAuth.supabaseAdmin
      .from('audit_log')
      .insert({
        user_id: userId,
        operation_type: action,
        table_name: resourceType,
        record_id: resourceId,
        new_values: details
      });
  } catch (error) {
    console.error("Error logging audit event:", error);
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Enhanced debugging for production
    const cookies = request.cookies.getAll();
    console.log("🍪 All cookies:", cookies.map(c => ({ name: c.name, hasValue: !!c.value })));
    
    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    console.log("🔍 DELETE - Auth check:", { 
      hasUser: !!authUser, 
      userId: authUser?.userId, 
      email: authUser?.email,
      rolesFromJWT: authUser?.roles,
      error: authError 
    });
    
    if (authError || !authUser) {
      console.log("❌ DELETE - No auth user, returning 401");
      console.log("❌ Auth error details:", authError);
      return NextResponse.json({ error: "Unauthorized", details: authError }, { status: 401 });
    }

    // Debug: Check roles from JWT first
    console.log("🔑 Roles from JWT token:", authUser.roles);

    // Check if user has admin or superadmin permissions from JWT
    // No need to query database again since JWT already has roles
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    console.log("🎭 DELETE - Permission check results:", { 
      hasAdminPermission, 
      hasSuperAdminPermission,
      userId: authUser.userId,
      email: authUser.email
    });
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      console.log("❌ DELETE - Access denied for user:", authUser.userId);
      console.log("❌ This user needs either Admin or SuperAdmin role");
      console.log("❌ Current roles:", authUser.roles);
      return NextResponse.json(
        { error: "Admin or SuperAdmin access required", userRoles: authUser.roles },
        { status: 403 }
      );
    }
    
    console.log("✅ DELETE - Permission granted, proceeding with deletion");

    const userId = id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('user_id, email')
      .eq('user_id', userId)
      .single();

    if (userError || !existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = existingUser;

    // Prevent deletion of current user
    if (user.user_id === authUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check the target user's role(s)
    const { data: targetUserRoles, error: rolesError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId);

    const targetRoles = (targetUserRoles || []).map((r: any) => r.role_name.toLowerCase());
    console.log(`Target user ${user.email} has roles:`, targetRoles);

    // Check if target user is a SuperAdmin or Admin
    const isTargetSuperAdmin = targetRoles.includes('superadmin');
    const isTargetAdmin = targetRoles.includes('admin');

    // If current user is only an Admin (not SuperAdmin)
    if (hasAdminPermission && !hasSuperAdminPermission) {
      // Admin can only delete Voter accounts
      if (isTargetSuperAdmin || isTargetAdmin) {
        console.log(`❌ Admin tried to delete ${isTargetSuperAdmin ? 'SuperAdmin' : 'Admin'} account`);
        return NextResponse.json(
          { error: "Admins can only delete Voter accounts. SuperAdmin access required to delete Admin or SuperAdmin accounts." },
          { status: 403 }
        );
      }
    }

    // SuperAdmin can delete anyone (except themselves, already checked above)
    console.log(`✅ Permission granted to delete user: ${user.email}`);
    console.log(`🗑️  Starting cascading delete for user: ${user.email}`);

    // Delete all foreign key references before deleting the user
    // Using Supabase, which handles cascading deletes automatically
    
    // Delete user_roles first
    const { error: rolesDeleteError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (rolesDeleteError) {
      console.log(`   Error deleting user_roles:`, rolesDeleteError);
    } else {
      console.log(`   Deleted user_roles for user`);
    }

    // Delete user_sessions
    const { error: sessionsDeleteError } = await supabaseAuth.supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('user_id', userId);
    
    if (sessionsDeleteError) {
      console.log(`   Error deleting user_sessions:`, sessionsDeleteError);
    } else {
      console.log(`   Deleted user_sessions for user`);
    }

    // Finally, delete the user (Supabase will handle remaining cascades)
    const { error: deleteError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error(`❌ Failed to delete user:`, deleteError);
      return NextResponse.json(
        { error: "Failed to delete user: " + deleteError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Successfully deleted user: ${user.email}`);

    // Log the deletion
    await logAudit(authUser.userId, "DELETE", "users", userId, {
      deletedUser: user.email,
      deletedBy: authUser.email
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} deleted successfully`,
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    
    // Provide more detailed error message
    let errorMessage = "Internal server error";
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Error stack:", error.stack);
      
      // Check for specific database errors
      if (error.message.includes("foreign key constraint")) {
        errorMessage = "Cannot delete user due to foreign key constraint. Please check related records.";
      } else if (error.message.includes("violates")) {
        errorMessage = "Database constraint violation: " + error.message;
      }
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : String(error) },
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

    // Check if user has admin or superadmin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin or SuperAdmin access required" },
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
    const { status, first_name, last_name, full_name, email, role } = body;

    // Check if user exists
    const { data: existingUser, error: userError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('user_id, email, status, full_name')
      .eq('user_id', userId)
      .single();

    if (userError || !existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build update object
    const updateData: any = {};
    
    if (status && ["active", "inactive", "suspended", "pending", "Active", "Inactive", "Suspended", "Pending"].includes(status)) {
      updateData.status = status.toLowerCase();
    }
    if (first_name) {
      updateData.first_name = first_name;
    }
    if (last_name) {
      updateData.last_name = last_name;
    }
    if (full_name) {
      updateData.full_name = full_name;
    }
    if (email && email !== existingUser.email) {
      updateData.email = email;
    }
    
    if (Object.keys(updateData).length === 0 && !role) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    
    // Update user in users table
    if (Object.keys(updateData).length > 0) {
      const { data: updatedUser, error: updateError } = await supabaseAuth.supabaseAdmin
        .from('users')
        .update(updateData)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating user:", updateError);
        return NextResponse.json(
          { error: "Failed to update user" },
          { status: 500 }
        );
      }
    }

    // Update role if provided
    if (role && hasSuperAdminPermission) {
      // Delete existing roles
      await supabaseAuth.supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Insert new role
      const { error: roleError } = await supabaseAuth.supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userId,
          role_name: role
        });

      if (roleError) {
        console.error("Error updating user role:", roleError);
        return NextResponse.json(
          { error: "Failed to update user role" },
          { status: 500 }
        );
      }
    }

    // Log audit
    await logAudit(authUser.userId, "UPDATE", "users", userId, {
      updatedFields: updateData,
      updatedRole: role,
      updatedBy: authUser.email
    });

    return NextResponse.json({ 
      message: "User updated successfully",
      user: { ...existingUser, ...updateData }
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

    // Check if user has admin or superadmin permissions from JWT
    const hasAdminPermission = authUser.roles?.includes("Admin") || false;
    const hasSuperAdminPermission = authUser.roles?.includes("SuperAdmin") || false;
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      return NextResponse.json(
        { error: "Admin or SuperAdmin access required" },
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

    // Get user details
    const { data: userData, error: userError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('user_id, email, first_name, last_name, status, last_login, created_at')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user roles
    const { data: rolesData, error: rolesError } = await supabaseAuth.supabaseAdmin
      .from('user_roles')
      .select('role_name')
      .eq('user_id', userId);

    // Combine user data with roles
    const user = {
      ...userData,
      roles: rolesData?.map((role: any) => role.role_name) || [],
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