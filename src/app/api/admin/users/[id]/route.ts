import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/database";

// Helper function to check user role
async function checkUserRole(userId: string, requiredRole: string): Promise<boolean> {
  const db = getDatabase();
  try {
    // First, let's see what roles this user has
    const userRoles = await db.query(
      `SELECT role_name FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    console.log(`User ${userId} has roles:`, userRoles.rows.map((r: any) => r.role_name));
    console.log(`Checking for role: ${requiredRole}`);
    
    // Check for the exact role (case-insensitive)
    const result = await db.query(
      `SELECT user_id FROM user_roles 
       WHERE user_id = $1 AND LOWER(role_name) = LOWER($2)`,
      [userId, requiredRole]
    );
    
    const hasRole = result.rows.length > 0;
    console.log(`User has ${requiredRole} role:`, hasRole);
    return hasRole;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

// Helper function to log audit events
async function logAudit(userId: string, action: string, resourceType: string, resourceId: string, details: any) {
  const db = getDatabase();
  try {
    // Note: Table is 'audit_log' (singular), not 'audit_logs'
    // Schema uses: operation_type, table_name, record_id, new_values
    await db.query(
      `INSERT INTO audit_log (user_id, operation_type, table_name, record_id, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, action, resourceType, resourceId, JSON.stringify(details)]
    );
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
  const db = getDatabase();
  
  try {
    // Verify user authentication
    const { user: authUser, error: authError } = verifyJWT(request);
    console.log("DELETE - Auth check:", { authUser: authUser?.userId, error: authError });
    
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin or superadmin permissions
    const hasAdminPermission = await checkUserRole(authUser.userId, "Admin");
    const hasSuperAdminPermission = await checkUserRole(authUser.userId, "SuperAdmin");
    
    console.log("DELETE - Permission check:", { hasAdminPermission, hasSuperAdminPermission });
    
    if (!hasAdminPermission && !hasSuperAdminPermission) {
      console.log("DELETE - Access denied for user:", authUser.userId);
      return NextResponse.json(
        { error: "Admin or SuperAdmin access required" },
        { status: 403 }
      );
    }

    const userId = id;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await db.query(
      `SELECT user_id, email FROM users WHERE user_id = $1`,
      [userId]
    );

    if (!existingUser.rows || existingUser.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = existingUser.rows[0];

    // Prevent deletion of current user
    if (user.user_id === authUser.userId) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    // Check the target user's role(s)
    const targetUserRoles = await db.query(
      `SELECT role_name FROM user_roles WHERE user_id = $1`,
      [userId]
    );

    const targetRoles = targetUserRoles.rows.map((r: any) => r.role_name.toLowerCase());
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
    // Order matters: delete from child tables first
    
    // 1. Delete from security_events (references user_sessions and users)
    try {
      const securityEventsResult = await db.query(
        `DELETE FROM security_events WHERE user_id = $1`,
        [userId]
      );
      console.log(`   Deleted ${securityEventsResult.rowCount || 0} security_events`);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log(`   Table security_events does not exist, skipping`);
      } else {
        throw error;
      }
    }

    // 2. Delete from anomaly_detections (references user_sessions and users) - if exists
    try {
      const anomalyResult = await db.query(
        `DELETE FROM anomaly_detections WHERE affected_user_id = $1`,
        [userId]
      );
      console.log(`   Deleted ${anomalyResult.rowCount || 0} anomaly_detections`);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log(`   Table anomaly_detections does not exist, skipping`);
      } else {
        throw error;
      }
    }

    // 3. Delete from verification_tokens - if exists
    try {
      const tokensResult = await db.query(
        `DELETE FROM verification_tokens WHERE user_id = $1`,
        [userId]
      );
      console.log(`   Deleted ${tokensResult.rowCount || 0} verification_tokens`);
    } catch (error: any) {
      if (error.code === '42P01') {
        console.log(`   Table verification_tokens does not exist, skipping`);
      } else {
        throw error;
      }
    }

    // 4. Delete from eligible_voters
    const eligibleResult = await db.query(
      `DELETE FROM eligible_voters WHERE user_id = $1 OR added_by = $1`,
      [userId]
    );
    console.log(`   Deleted ${eligibleResult.rowCount || 0} eligible_voters`);

    // 5. Delete from votes (if any - though this might be restricted for audit purposes)
    // Note: You may want to keep votes for audit trail, so commented out
    // const votesResult = await db.query(
    //   `DELETE FROM votes WHERE voter_id = $1`,
    //   [userId]
    // );
    // console.log(`   Deleted ${votesResult.rowCount || 0} votes`);

    // 6. Delete from user_sessions
    const sessionsResult = await db.query(
      `DELETE FROM user_sessions WHERE user_id = $1`,
      [userId]
    );
    console.log(`   Deleted ${sessionsResult.rowCount || 0} user_sessions`);

    // 7. Delete from audit_log (references user_id)
    const auditResult = await db.query(
      `DELETE FROM audit_log WHERE user_id = $1`,
      [userId]
    );
    console.log(`   Deleted ${auditResult.rowCount || 0} audit_log entries`);

    // 8. Handle elections created by this user
    // We need to either delete them or reassign them
    // For safety, we'll reassign to the current admin user
    const electionsResult = await db.query(
      `UPDATE elections SET creator = $1 WHERE creator = $2`,
      [authUser.userId, userId]
    );
    console.log(`   Reassigned ${electionsResult.rowCount || 0} elections to current admin`);

    // 9. Delete user_roles where this user assigned roles (assigned_by)
    const assignedRolesResult = await db.query(
      `UPDATE user_roles SET assigned_by = NULL WHERE assigned_by = $1`,
      [userId]
    );
    console.log(`   Nullified ${assignedRolesResult.rowCount || 0} role assignments`);

    // 10. Delete from user_roles
    const rolesResult = await db.query(
      `DELETE FROM user_roles WHERE user_id = $1`,
      [userId]
    );
    console.log(`   Deleted ${rolesResult.rowCount || 0} user_roles`);

    // 11. Finally, delete the user
    const deleteResult = await db.query(
      `DELETE FROM users WHERE user_id = $1`,
      [userId]
    );
    console.log(`   Deleted ${deleteResult.rowCount || 0} user(s)`);

    if (deleteResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete user" },
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

    // Check if user has admin or superadmin permissions
    const hasAdminPermission = await checkUserRole(authUser.userId, "Admin");
    const hasSuperAdminPermission = await checkUserRole(authUser.userId, "SuperAdmin");
    
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
    const { status, first_name, last_name } = body;

    const db = await getDatabase();

    // Check if user exists
    const existingUserResult = await db.query(
      "SELECT user_id, email, status FROM users WHERE user_id = $1",
      [userId]
    );

    if (existingUserResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const existingUser = existingUserResult.rows[0];

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;
    
    if (status && ["Active", "Inactive", "Suspended"].includes(status)) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }
    if (first_name) {
      updateFields.push(`first_name = $${paramIndex++}`);
      updateValues.push(first_name);
    }
    if (last_name) {
      updateFields.push(`last_name = $${paramIndex++}`);
      updateValues.push(last_name);
    }
    
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }
    
    updateValues.push(userId);
    const updateQuery = `UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = $${paramIndex} RETURNING *`;
    
    const updateResult = await db.query(updateQuery, updateValues);

    if (updateResult.rows.length === 0) {
      console.error("Error updating user");
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }
    const updatedUser = updateResult.rows[0];

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

    // Check if user has admin or superadmin permissions
    const hasAdminPermission = await checkUserRole(authUser.userId, "Admin");
    const hasSuperAdminPermission = await checkUserRole(authUser.userId, "SuperAdmin");
    
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

    const db = await getDatabase();

    // Get user details
    const userResult = await db.query(
      `SELECT user_id, email, first_name, last_name, status, last_login, created_at 
       FROM users WHERE user_id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const userData = userResult.rows[0];

    // Get user roles
    const rolesResult = await db.query(
      `SELECT role_name FROM user_roles WHERE user_id = $1`,
      [userId]
    );

    // Combine user data with roles
    const user = {
      ...userData,
      roles: rolesResult.rows.map((role: any) => role.role_name),
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