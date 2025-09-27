const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

async function debugLogin() {
  console.log("🔍 Debugging login process...\n");

  // Create Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  );

  const testEmail = "admin@voteguard.system";
  const testPassword = "Admin123!";

  console.log(`Testing email: ${testEmail}`);
  console.log(`Testing password: ${testPassword}\n`);

  try {
    // 1. Check if user exists
    console.log("Step 1: Checking if user exists...");
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", testEmail.toLowerCase())
      .single();

    if (userError) {
      console.error("❌ User lookup error:", userError);
      return;
    }

    if (!user) {
      console.error("❌ User not found");
      return;
    }

    console.log("✅ User found:", {
      id: user.user_id,
      email: user.email,
      status: user.status,
      hasPasswordHash: !!user.password_hash,
      failedAttempts: user.failed_login_attempts,
      lockedUntil: user.locked_until,
    });

    // 2. Check password hash format
    console.log("\nStep 2: Checking password hash...");
    console.log(
      "Password hash starts with:",
      user.password_hash?.substring(0, 10)
    );
    console.log("Password hash length:", user.password_hash?.length);

    // 3. Test password verification using database function
    console.log("\nStep 3: Testing password verification...");
    const { data: passwordValid, error: verifyError } = await supabase.rpc(
      "verify_password",
      {
        password: testPassword,
        hash: user.password_hash,
      }
    );

    if (verifyError) {
      console.error("❌ Password verification error:", verifyError);
    } else {
      console.log("Password verification result:", passwordValid);
    }

    // 4. Test direct bcrypt comparison (if needed)
    console.log("\nStep 4: Testing direct hash creation...");
    const { data: newHash, error: hashError } = await supabase.rpc(
      "hash_password",
      { password: testPassword }
    );

    if (hashError) {
      console.error("❌ Hash creation error:", hashError);
    } else {
      console.log("✅ New hash created:", newHash.substring(0, 20) + "...");

      // Test verification with new hash
      const { data: newVerify, error: newVerifyError } = await supabase.rpc(
        "verify_password",
        {
          password: testPassword,
          hash: newHash,
        }
      );

      if (newVerifyError) {
        console.error("❌ New hash verification error:", newVerifyError);
      } else {
        console.log("✅ New hash verification result:", newVerify);
      }
    }
  } catch (error) {
    console.error("❌ Debug error:", error);
  }
}

debugLogin();
