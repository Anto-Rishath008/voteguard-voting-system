import { NextRequest, NextResponse } from "next/server";
import { supabaseAuth } from "@/lib/supabase-auth";
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
      role = "voter"
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

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match" },
        { status: 400 }
      );
    }

    // Simple password validation - at least 8 characters
    if (password.length < 8) {
      return NextResponse.json(
        {
          error: "Password must be at least 8 characters long",
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

    // Check if user already exists using Supabase client
    const { data: existingUser, error: checkError } = await supabaseAuth.supabaseAdmin
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    const userId = uuidv4();

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user using Supabase client
    try {
      const { data: newUser, error: insertError } = await supabaseAuth.supabaseAdmin
        .from('users')
        .insert([{
          user_id: userId,
          email: email.toLowerCase(),
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          status: 'Active',
          password_hash: passwordHash,
          created_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (insertError || !newUser) {
        console.error('Error creating user:', insertError);
        return NextResponse.json(
          { error: "Failed to create user account" },
          { status: 500 }
        );
      }
    } catch (userError) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 }
      );
    }

    // Assign role to user
    const roleMap: { [key: string]: string } = {
      voter: "Voter",
      admin: "Admin", 
      super_admin: "SuperAdmin"
    };

    const roleName = roleMap[role];
    
    try {
      // Assign role using Supabase client
      const { error: roleError } = await supabaseAuth.supabaseAdmin
        .from('user_roles')
        .insert([{
          user_id: userId,
          role_name: roleName,
          created_at: new Date().toISOString()
        }]);

      if (roleError) {
        console.error("Error assigning role:", roleError);
        // Try to cleanup user if role assignment fails
        await supabaseAuth.supabaseAdmin
          .from('users')
          .delete()
          .eq('user_id', userId);
        
        return NextResponse.json(
          { error: "Failed to complete user registration" },
          { status: 500 }
        );
      }
    } catch (roleError) {
      console.error("Error assigning role:", roleError);
      // Try to cleanup user if role assignment fails
      await supabaseAuth.supabaseAdmin
        .from('users')
        .delete()
        .eq('user_id', userId);
      
      return NextResponse.json(
        { error: "Failed to complete user registration" },
        { status: 500 }
      );
    }

    // Log user registration (simplified for now)
    console.log(`User registered successfully: ${email.toLowerCase()} with role: ${role}`);

    return NextResponse.json(
      {
        message: "User registration completed successfully",
        user: {
          id: userId,
          email: email.toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role
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
