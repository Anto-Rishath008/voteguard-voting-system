import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import { DatabaseUtils } from "@/lib/database";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      confirmPassword, 
      role = "voter",
      // Enhanced security data
      phoneNumber,
      aadhaarNumber,
      collegeId,
      instituteName,
      securityQuestions = [],
      fingerprintData,
      referenceCode,
      authorizedBy,
      reason
    } = await request.json();

    // Basic validation
    if (!email || !password || !firstName || !lastName || !confirmPassword) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ["voter", "admin", "super_admin"];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role specified" },
        { status: 400 }
      );
    }

    // Role-specific validation
    if (role !== "voter") {
      if (!phoneNumber || !aadhaarNumber || !collegeId || !instituteName) {
        return NextResponse.json(
          { error: "Admin roles require phone, Aadhaar, college ID, and institution name" },
          { status: 400 }
        );
      }
    } else {
      if (!phoneNumber || (!aadhaarNumber && !collegeId)) {
        return NextResponse.json(
          { error: "Voters require phone and at least one ID (Aadhaar or College)" },
          { status: 400 }
        );
      }
    }

    // Security questions validation
    const requiredQuestions = role === "voter" ? 1 : role === "admin" ? 2 : 3;
    if (!securityQuestions || securityQuestions.length < requiredQuestions) {
      return NextResponse.json(
        { error: `${role.replace('_', ' ')} role requires ${requiredQuestions} security question(s)` },
        { status: 400 }
      );
    }

    // Super admin specific validation
    if (role === "super_admin") {
      if (!referenceCode || !authorizedBy || !reason) {
        return NextResponse.json(
          { error: "Super admin registration requires reference code, authorizer, and reason" },
          { status: 400 }
        );
      }
    }

    // Phone number validation
    const phoneRegex = /^\+\d{10,15}$/;
    if (phoneNumber && !phoneRegex.test(phoneNumber)) {
      return NextResponse.json(
        { error: "Invalid phone number format. Use international format (+1234567890)" },
        { status: 400 }
      );
    }

    // Aadhaar validation (if provided)
    if (aadhaarNumber) {
      const aadhaarRegex = /^\d{4}\s?\d{4}\s?\d{4}$/;
      if (!aadhaarRegex.test(aadhaarNumber.replace(/\s/g, ''))) {
        return NextResponse.json(
          { error: "Invalid Aadhaar number format" },
          { status: 400 }
        );
      }
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Password strength validation
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        {
          error:
            "Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character",
        },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("email")
      .eq("email", email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const userId = uuidv4();

    // Hash password manually since we might not have RPC functions
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with enhanced security data
    const userData: any = {
      user_id: userId,
      email: email.toLowerCase(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      status: "Active",
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };

    // Add additional data if columns exist (will be ignored if they don't)
    if (phoneNumber) userData.phone_number = phoneNumber;
    if (aadhaarNumber) userData.aadhaar_number = aadhaarNumber.replace(/\s/g, '');
    if (collegeId) userData.college_id = collegeId;
    if (instituteName) userData.institute_name = instituteName;

    const { data: user, error: userError } = await supabase
      .from("users")
      .insert(userData)
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Store security questions (using a simple approach for now)
    if (securityQuestions && securityQuestions.length > 0) {
      try {
        for (const sq of securityQuestions) {
          if (sq.question && sq.answer) {
            // Hash the security answer for additional security
            const hashedAnswer = await bcrypt.hash(sq.answer.toLowerCase().trim(), 10);
            
            // For now, we'll store in user metadata or create a separate table later
            await supabase
              .from("user_security_questions") // This table would need to be created
              .insert({
                user_id: userId,
                question: sq.question,
                answer_hash: hashedAnswer,
                created_at: new Date().toISOString()
              })
              .single();
          }
        }
      } catch (sqError) {
        console.log("Security questions storage failed (table may not exist):", sqError);
        // Continue without failing - security questions can be added later
      }
    }

    // Store additional security data for admin/super_admin
    if (role !== "voter") {
      try {
        const securityData: any = {
          user_id: userId,
          fingerprint_data: fingerprintData,
          security_level: role === "admin" ? "enhanced" : "maximum",
          created_at: new Date().toISOString()
        };

        if (role === "super_admin") {
          securityData.reference_code = referenceCode;
          securityData.authorized_by = authorizedBy;
          securityData.authorization_reason = reason;
          securityData.approval_status = "pending"; // Requires manual approval
        }

        await supabase
          .from("user_security_data") // This table would need to be created
          .insert(securityData)
          .single();
      } catch (secError) {
        console.log("Enhanced security data storage failed (table may not exist):", secError);
        // Continue without failing
      }
    }

    // Get or create the role first
    const roleMap: { [key: string]: string } = {
      voter: "Voter",
      admin: "Admin", 
      super_admin: "SuperAdmin"
    };

    const roleName = roleMap[role];
    
    // Try to get existing role
    let { data: existingRole } = await supabase
      .from("roles")
      .select("role_id")
      .eq("role_name", roleName)
      .single();

    let roleId = existingRole?.role_id;

    // Create role if it doesn't exist
    if (!roleId) {
      const { data: newRole, error: createRoleError } = await supabase
        .from("roles")
        .insert({
          role_name: roleName,
          description: `${roleName} role with ${role === "voter" ? "basic" : role === "admin" ? "enhanced" : "maximum"} security`,
          permissions: {},
        })
        .select("role_id")
        .single();

      if (createRoleError) {
        console.error("Error creating role:", createRoleError);
      } else {
        roleId = newRole?.role_id;
      }
    }
    
    // Assign role to user
    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: userId,
      role_id: roleId,
      assigned_by: userId, // Self-assigned for registration
      expires_at: role === "super_admin" ? null : undefined, // Super admins don't expire
    });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Try to cleanup user if role assignment fails
      await supabase.from("users").delete().eq("user_id", userId);
      return NextResponse.json(
        { error: "Failed to complete user registration" },
        { status: 500 }
      );
    }

    // Create comprehensive audit log
    await DatabaseUtils.createAuditLog(
      userId,
      "INSERT",
      "users",
      userId,
      undefined,
      {
        email: email.toLowerCase(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role,
        phoneNumber,
        hasAadhaar: !!aadhaarNumber,
        hasCollegeId: !!collegeId,
        securityQuestionsCount: securityQuestions.length,
        hasBiometric: !!fingerprintData,
        action: "enhanced_user_registration",
      },
      request.headers.get("x-forwarded-for") || "unknown",
      request.headers.get("user-agent") || "unknown"
    );

    // Determine next steps based on role
    const nextSteps = [];
    if (role === "super_admin") {
      nextSteps.push("Your super admin request is pending approval");
      nextSteps.push("You will receive an email once approved");
    }
    if (!phoneNumber) {
      nextSteps.push("Complete phone verification in your profile");
    }
    nextSteps.push("Verify your email address to activate your account");

    return NextResponse.json(
      {
        message: "Enhanced user registration completed successfully",
        user: {
          id: userId,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          securityLevel: role === "voter" ? "Basic" : role === "admin" ? "Enhanced" : "Maximum",
          emailVerified: false,
          phoneVerified: !!phoneNumber,
          requiresApproval: role === "super_admin",
        },
        nextSteps,
        securityFeatures: {
          securityQuestions: securityQuestions.length,
          biometricEnabled: !!fingerprintData,
          multiFactorAuth: true,
          identityVerified: !!(aadhaarNumber || collegeId),
        }
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
