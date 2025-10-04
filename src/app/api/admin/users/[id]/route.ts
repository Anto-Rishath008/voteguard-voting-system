import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/database";

// Helper function to check user role
async function checkUserRole(userId: string, requiredRole: string): Promise<boolean> {
  const db = getDatabase();
  try {
    const result = await db.query(
      `SELECT ur.user_id 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1 AND r.role_name = $2`,
      [userId, requiredRole]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error("Error checking user role:", error);
    return false;
  }
}

// Helper function to log audit events
async function logAudit(userId: string, action: string, resourceType: string, resourceId: string, details: any) {
  const db = getDatabase();
  try {
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details, timestamp)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
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
    if (authError || !authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user has admin permissions
    const hasAdminPermission = await checkUserRole(authUser.userId, "Admin");
    if (!hasAdminPermission) {
      return NextResponse.json(
        { error: "Admin access required" },
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

    // Delete user roles first (foreign key constraint)
    await db.query(
      `DELETE FROM user_roles WHERE user_id = $1`,
      [userId]
    );

    // Delete the user
    const deleteResult = await db.query(
      `DELETE FROM users WHERE user_id = $1`,
      [userId]
    );

    if (deleteResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to delete user" },
        { status: 500 }
      );
    }

    // Log the deletion
    await logAudit(authUser.userId, "DELETE_USER", "USER", userId, {
      deletedUser: user.email,
      deletedBy: authUser.email
    });

    return NextResponse.json({
      success: true,
      message: `User ${user.email} deleted successfully`,
    });

  } catch (error) {
    console.error("Error deleting user:", error);
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
    const hasAdminPermission = await checkUserRole(
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

    // Check if user has admin permissions
    const hasAdminPermission = await checkUserRole(
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
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
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