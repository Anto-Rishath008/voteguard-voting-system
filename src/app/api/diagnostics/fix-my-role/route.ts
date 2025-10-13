import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { supabaseAuth } from "@/lib/supabase-auth";

/**
 * Emergency endpoint to fix admin role issues
 * This endpoint will:
 * 1. Check if you're logged in
 * 2. Show your current roles
 * 3. Optionally add Admin role (if query param ?add=true)
 * 
 * Usage:
 * - GET /api/diagnostics/fix-my-role - Just check your roles
 * - GET /api/diagnostics/fix-my-role?add=true - Add Admin role to your account
 */
export async function GET(request: NextRequest) {
  try {
    // Step 1: Verify JWT
    const { user: authUser, error: authError } = verifyJWT(request);
    
    if (authError || !authUser) {
      return NextResponse.json({
        error: "Not authenticated",
        message: "You need to be logged in to use this endpoint",
        hint: "Please log in first, then visit this URL again"
      }, { status: 401 });
    }

    // Step 2: Get user from database with current roles
    const userWithRoles = await supabaseAuth.getUserWithRolesByEmail(authUser.email);
    
    if (!userWithRoles) {
      return NextResponse.json({
        error: "User not found in database",
        userId: authUser.userId,
        email: authUser.email
      }, { status: 404 });
    }

    // Step 3: Check if user wants to add the Admin role
    const shouldAddRole = request.nextUrl.searchParams.get('add') === 'true';

    if (shouldAddRole) {
      // Add Admin role to user
      const { error: roleError } = await supabaseAuth.supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: userWithRoles.user_id,
          role_name: 'Admin',
          assigned_at: new Date().toISOString()
        })
        .select();

      if (roleError) {
        // Check if it's a duplicate (role already exists)
        if (roleError.code === '23505') {
          return NextResponse.json({
            success: true,
            message: "You already have the Admin role!",
            user: {
              userId: userWithRoles.user_id,
              email: userWithRoles.email,
              fullName: `${userWithRoles.first_name} ${userWithRoles.last_name}`,
              currentRoles: userWithRoles.roles
            },
            nextStep: "Log out and log back in to refresh your JWT token with the new role"
          });
        }

        return NextResponse.json({
          error: "Failed to add Admin role",
          details: roleError.message,
          code: roleError.code
        }, { status: 500 });
      }

      // Role was added successfully
      return NextResponse.json({
        success: true,
        message: "Admin role added successfully! ✅",
        user: {
          userId: userWithRoles.user_id,
          email: userWithRoles.email,
          fullName: `${userWithRoles.first_name} ${userWithRoles.last_name}`,
          rolesBeforeUpdate: userWithRoles.roles,
          newRole: 'Admin'
        },
        importantNextStep: {
          step1: "Log out of your application",
          step2: "Log back in",
          step3: "Your JWT token will now include the Admin role",
          step4: "You'll have admin access"
        }
      });
    }

    // Step 4: Just showing current status (no role addition)
    const hasAdminRole = userWithRoles.roles.includes('Admin') || userWithRoles.roles.includes('admin');
    const hasSuperAdminRole = userWithRoles.roles.includes('SuperAdmin') || userWithRoles.roles.includes('superadmin');

    return NextResponse.json({
      success: true,
      user: {
        userId: userWithRoles.user_id,
        email: userWithRoles.email,
        fullName: `${userWithRoles.first_name} ${userWithRoles.last_name}`,
        status: userWithRoles.status,
        currentRoles: userWithRoles.roles,
        hasAdminAccess: hasAdminRole || hasSuperAdminRole
      },
      analysis: {
        hasAdminRole,
        hasSuperAdminRole,
        needsAdminRole: !hasAdminRole && !hasSuperAdminRole
      },
      howToFix: !hasAdminRole && !hasSuperAdminRole ? {
        message: "You don't have admin access",
        solution: `Visit: ${request.nextUrl.origin}/api/diagnostics/fix-my-role?add=true`,
        orUseSql: "Run the SQL script: database/fix-my-admin-access.sql"
      } : null
    });

  } catch (error) {
    console.error("Fix role diagnostic error:", error);
    return NextResponse.json({
      error: "Diagnostic failed",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
