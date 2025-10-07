import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/enhanced-database";

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
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (roleResult.rows.length === 0) {
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
    console.log(`User ${user.email} deleted by ${authUser.email || authUser.userId}`);

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

// PUT /api/admin/users/[id] - Update a user
export async function PUT(
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
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (!roleResult.rows || roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const userId = id;
    const body = await request.json();
    const { email, firstName, lastName, role, status } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { error: "Email, first name, and last name are required" },
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

    // Update user information
    const updateResult = await db.query(
      `UPDATE users 
       SET email = $1, first_name = $2, last_name = $3, status = COALESCE($4, status), updated_at = CURRENT_TIMESTAMP 
       WHERE user_id = $5 
       RETURNING user_id, email, first_name, last_name, status, created_at, updated_at`,
      [email, firstName, lastName, status, userId]
    );

    if (updateResult.rowCount === 0) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 }
      );
    }

    const updatedUser = updateResult.rows[0];

    // Update role if provided
    if (role) {
      // Remove existing roles
      await db.query(
        `DELETE FROM user_roles WHERE user_id = $1`,
        [userId]
      );

      // Get role ID
      const roleResult = await db.query(
        `SELECT role_id FROM roles WHERE role_name = $1`,
        [role]
      );

      if (roleResult.rows && roleResult.rows.length > 0) {
        // Add new role
        await db.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [userId, roleResult.rows[0].role_id]
        );
      }
    }

    // Get updated user with roles
    const userWithRoles = await db.query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at, u.updated_at,
              COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, u.created_at, u.updated_at`,
      [userId]
    );

    // Log the update
    console.log(`User ${email} updated by ${authUser.email || authUser.userId}`);

    return NextResponse.json({
      success: true,
      user: userWithRoles.rows[0],
      message: "User updated successfully",
    });

  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/admin/users/[id] - Get user details
export async function GET(
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
    const roleResult = await db.query(
      "SELECT role_name FROM user_roles WHERE user_id = $1 AND role_name IN ('Admin', 'SuperAdmin')",
      [authUser.userId]
    );
    
    if (!roleResult.rows || roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const userId = id;

    // Get user with roles
    const userResult = await db.query(
      `SELECT u.user_id, u.email, u.first_name, u.last_name, u.status, u.last_login, u.created_at, u.updated_at,
              COALESCE(array_agg(r.role_name) FILTER (WHERE r.role_name IS NOT NULL), '{}') as roles
       FROM users u
       LEFT JOIN user_roles ur ON u.user_id = ur.user_id
       LEFT JOIN roles r ON ur.role_id = r.role_id
       WHERE u.user_id = $1
       GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, u.last_login, u.created_at, u.updated_at`,
      [userId]
    );

    if (!userResult.rows || userResult.rows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: userResult.rows[0],
    });

  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}