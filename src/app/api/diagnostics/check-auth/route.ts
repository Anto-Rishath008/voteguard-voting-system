import { NextRequest, NextResponse } from "next/server";
import { verifyJWT } from "@/lib/auth";
import { getDatabase } from "@/lib/database";

export async function GET(request: NextRequest) {
  const db = getDatabase();
  
  try {
    // Step 1: Check JWT verification
    const { user: authUser, error: authError } = verifyJWT(request);
    console.log("=== AUTH DIAGNOSTIC ===");
    console.log("1. JWT Verification:", { 
      hasUser: !!authUser, 
      error: authError,
      userId: authUser?.userId,
      email: authUser?.email,
      rolesFromJWT: authUser?.roles 
    });
    
    if (authError || !authUser) {
      return NextResponse.json({ 
        step: "JWT Verification",
        error: authError || "No user found",
        hasAuthToken: !!request.cookies.get("auth-token")?.value
      }, { status: 401 });
    }

    // Step 2: Check what's in the database for this user
    const userCheck = await db.query(
      `SELECT user_id, email, first_name, last_name, status FROM users WHERE user_id = $1`,
      [authUser.userId]
    );
    console.log("2. User in database:", userCheck.rows[0]);

    // Step 3: Check roles in database
    const rolesCheck = await db.query(
      `SELECT role_name, assigned_at, assigned_by FROM user_roles WHERE user_id = $1`,
      [authUser.userId]
    );
    console.log("3. Roles in database:", rolesCheck.rows);

    // Step 4: Check for Admin role specifically
    const adminCheck = await db.query(
      `SELECT user_id FROM user_roles 
       WHERE user_id = $1 AND LOWER(role_name) = LOWER($2)`,
      [authUser.userId, "Admin"]
    );
    console.log("4. Has Admin role (case-insensitive):", adminCheck.rows.length > 0);

    // Step 5: Check for SuperAdmin role specifically
    const superAdminCheck = await db.query(
      `SELECT user_id FROM user_roles 
       WHERE user_id = $1 AND LOWER(role_name) = LOWER($2)`,
      [authUser.userId, "SuperAdmin"]
    );
    console.log("5. Has SuperAdmin role (case-insensitive):", superAdminCheck.rows.length > 0);

    return NextResponse.json({
      success: true,
      diagnostic: {
        step1_jwt: {
          userId: authUser.userId,
          email: authUser.email,
          rolesFromJWT: authUser.roles
        },
        step2_userInDb: userCheck.rows[0] || null,
        step3_rolesInDb: rolesCheck.rows || [],
        step4_hasAdminRole: adminCheck.rows.length > 0,
        step5_hasSuperAdminRole: superAdminCheck.rows.length > 0,
        recommendation: adminCheck.rows.length === 0 && superAdminCheck.rows.length === 0 
          ? "User has no Admin or SuperAdmin role in the database. Please assign the role."
          : "User has the required role(s)."
      }
    });

  } catch (error) {
    console.error("Diagnostic error:", error);
    return NextResponse.json(
      { 
        error: "Diagnostic failed",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
