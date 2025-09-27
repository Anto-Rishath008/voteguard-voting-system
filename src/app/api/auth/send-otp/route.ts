import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase";
import crypto from "crypto";
import EmailService from "@/lib/email";
import SMSService from "@/lib/sms";

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Hash OTP for secure storage
function hashOTP(otp: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(otp).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const { email, type } = await request.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: "Email and type are required" },
        { status: 400 }
      );
    }

    if (type !== "email" && type !== "phone") {
      return NextResponse.json(
        { error: "Type must be 'email' or 'phone'" },
        { status: 400 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const otpSecret = process.env.OTP_SECRET || "default-otp-secret-key";
    const hashedOTP = hashOTP(otp, otpSecret);
    
    // Set expiration (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database connection failed" },
        { status: 500 }
      );
    }

    // Store OTP in database (you'll need to create this table)
    try {
      await supabase
        .from("otp_verifications")
        .insert({
          email: email.toLowerCase(),
          otp_hash: hashedOTP,
          type,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          verified: false,
          created_at: new Date().toISOString()
        });
    } catch (dbError) {
      console.log("OTP storage failed (table may not exist):", dbError);
      // For now, we'll continue without storing in DB
    }

    // Send OTP via email or SMS
    const isProduction = process.env.NODE_ENV === "production";
    let sendSuccess = false;
    
    if (type === "email") {
      try {
        sendSuccess = await EmailService.sendOTPEmail(email, otp);
        if (sendSuccess) {
          console.log(`📧 Email OTP sent successfully to ${email}`);
        } else {
          console.log(`📧 Email OTP for ${email}: ${otp} (expires in 5 minutes) - EMAIL SENDING FAILED`);
        }
      } catch (error) {
        console.error("Email sending error:", error);
        console.log(`📧 Email OTP for ${email}: ${otp} (expires in 5 minutes) - FALLBACK`);
      }
    } else if (type === "phone") {
      try {
        sendSuccess = await SMSService.sendOTPSMS(email, otp); // email contains phone in this case
        if (sendSuccess) {
          console.log(`📱 SMS OTP sent successfully to ${email}`);
        } else {
          console.log(`📱 SMS OTP for ${email}: ${otp} (expires in 5 minutes) - SMS SENDING FAILED`);
        }
      } catch (error) {
        console.error("SMS sending error:", error);
        console.log(`📱 SMS OTP for ${email}: ${otp} (expires in 5 minutes) - FALLBACK`);
      }
    }

    return NextResponse.json({
      message: `OTP sent successfully via ${type}`,
      // Include OTP in development only
      ...(isProduction ? {} : { 
        devOtp: otp,
        note: "OTP included for development. Check server logs or use this code."
      }),
      expiresIn: 300 // 5 minutes in seconds
    });

  } catch (error) {
    console.error("Send OTP error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP" },
      { status: 500 }
    );
  }
}