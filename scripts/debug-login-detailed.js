const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Load environment variables
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function debugLogin() {
  console.log("🔍 Debugging Login Issues...\n");

  // Test with admin account
  const testEmail = "admin@voteguard.system";
  const testPassword = "Admin123!";

  console.log(`Testing login for: ${testEmail}`);
  console.log(`Using password: ${testPassword}\n`);

  try {
    // 1. Check if user exists
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("email", testEmail.toLowerCase())
      .single();

    if (userError || !user) {
      console.log("❌ User not found:", userError?.message || "No user data");
      return;
    }

    console.log("✅ User found:");
    console.log(`   ID: ${user.user_id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Has password hash: ${user.password_hash ? "Yes" : "No"}`);
    console.log(`   Failed attempts: ${user.failed_login_attempts || 0}`);
    console.log(`   Locked until: ${user.locked_until || "Not locked"}\n`);

    // 2. Test password verification function
    console.log("🔐 Testing password verification function...");
    
    try {
      const { data: functionResult, error: functionError } = await supabase.rpc(
        "verify_password",
        {
          password: testPassword,
          hash: user.password_hash,
        }
      );

      if (functionError) {
        console.log("❌ Function error:", functionError.message);
        
        // Try bcrypt verification as fallback
        console.log("\n🔄 Trying bcrypt verification...");
        if (user.password_hash) {
          const bcryptValid = await bcrypt.compare(testPassword, user.password_hash);
          console.log(`   Bcrypt result: ${bcryptValid ? "✅ Valid" : "❌ Invalid"}`);
        }
      } else {
        console.log(`   Function result: ${functionResult ? "✅ Valid" : "❌ Invalid"}`);
      }
    } catch (err) {
      console.log("❌ Function call failed:", err.message);
    }

    // 3. Check if pgcrypto extension is enabled
    console.log("\n🔧 Checking database extensions...");
    const { data: extensions, error: extError } = await supabase
      .from("pg_extension")
      .select("extname")
      .in("extname", ["pgcrypto", "uuid-ossp"]);

    if (extError) {
      console.log("⚠️  Could not check extensions:", extError.message);
    } else {
      console.log("   Installed extensions:", extensions.map(e => e.extname).join(", "));
    }

  } catch (error) {
    console.log("❌ Debug failed:", error.message);
  }
}

debugLogin();