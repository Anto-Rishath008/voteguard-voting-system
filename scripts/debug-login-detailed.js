const { Client } = require("pg");
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

// Create database client
const client = new Client({
  connectionString: envVars.DATABASE_URL,
});

async function debugLogin() {
  console.log("🔍 Debugging Login Issues...\n");

  // Test with admin account
  const testEmail = "admin@voteguard.system";
  const testPassword = "Admin123!";

  console.log(`Testing login for: ${testEmail}`);
  console.log(`Using password: ${testPassword}\n`);

  try {
    // Connect to database
    await client.connect();
    console.log("✅ Connected to Azure PostgreSQL database\n");

    // 1. Check if user exists
    const userResult = await client.query(
      "SELECT * FROM users WHERE email = $1",
      [testEmail.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      console.log("❌ User not found");
      return;
    }

    const user = userResult.rows[0];

    console.log("✅ User found:");
    console.log(`   ID: ${user.user_id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Status: ${user.status}`);
    console.log(`   Has password hash: ${user.password_hash ? "Yes" : "No"}`);
    console.log(`   Failed attempts: ${user.failed_login_attempts || 0}`);
    console.log(`   Locked until: ${user.locked_until || "Not locked"}\n`);

    // 2. Test password verification with bcrypt
    console.log("🔐 Testing password verification...");
    
    if (user.password_hash) {
      const bcryptValid = await bcrypt.compare(testPassword, user.password_hash);
      console.log(`   Bcrypt result: ${bcryptValid ? "✅ Valid" : "❌ Invalid"}`);
    } else {
      console.log("   ❌ No password hash found");
    }

    // 3. Check if pgcrypto extension is enabled
    console.log("\n🔧 Checking database extensions...");
    try {
      const extensionsResult = await client.query(
        "SELECT extname FROM pg_extension WHERE extname IN ('pgcrypto', 'uuid-ossp')"
      );
      
      if (extensionsResult.rows.length > 0) {
        console.log("   Installed extensions:", extensionsResult.rows.map(e => e.extname).join(", "));
      } else {
        console.log("   ⚠️  No required extensions found");
      }
    } catch (extError) {
      console.log("   ⚠️  Could not check extensions:", extError.message);
    }

  } catch (error) {
    console.log("❌ Debug failed:", error.message);
  } finally {
    await client.end();
  }
}

debugLogin();