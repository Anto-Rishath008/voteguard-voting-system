const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables manually
const envPath = path.join(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
const envVars = {};

envContent.split("\n").forEach((line) => {
  const [key, value] = line.split("=");
  if (key && value) {
    envVars[key.trim()] = value.trim();
  }
});

console.log("🔧 Environment variables loaded:");
console.log("- URL:", envVars.NEXT_PUBLIC_SUPABASE_URL ? "Present" : "Missing");
console.log(
  "- Service Role Key:",
  envVars.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ? "Present" : "Missing"
);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Create admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "public",
  },
});

async function printInstructions() {
  console.log("\n📋 Manual Setup Instructions:");
  console.log("═══════════════════════════════════════════════════");

  const projectId = supabaseUrl.split("//")[1].split(".")[0];
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}`;

  console.log(`\n1. Open your Supabase project dashboard:`);
  console.log(`   ${dashboardUrl}/sql`);

  console.log(
    `\n2. Copy and paste the schema.sql file contents into the SQL editor`
  );
  console.log(`   File: src/database/schema.sql`);

  console.log(`\n3. Run the schema SQL to create all tables`);

  console.log(
    `\n4. Copy and paste the seed.sql file contents into the SQL editor`
  );
  console.log(`   File: src/database/seed.sql`);

  console.log(`\n5. Run the seed SQL to insert sample data`);

  console.log("\n📁 Alternatively, you can upload the files:");
  console.log("   - Go to SQL Editor in your Supabase dashboard");
  console.log('   - Click "New query" or upload the .sql files');

  console.log("\n🔗 Quick links:");
  console.log(`   Dashboard: ${dashboardUrl}`);
  console.log(`   SQL Editor: ${dashboardUrl}/sql`);
  console.log(`   Table Editor: ${dashboardUrl}/editor`);
}

async function createBasicTestTable() {
  console.log("\n🧪 Testing table creation with a simple example...");

  try {
    // Try to create a simple test table
    const { error } = await supabase.rpc("test_connection");

    if (
      error &&
      error.message.includes("function test_connection() does not exist")
    ) {
      console.log(
        "✅ Database connection is working (function not found error is expected)"
      );
      return true;
    } else if (error) {
      console.log(`❌ Connection error: ${error.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
    return false;
  }
}

async function checkExistingTables() {
  console.log("\n🔍 Checking for existing tables...");

  try {
    // Try to check if users table exists by selecting from it
    const { data, error } = await supabase
      .from("users")
      .select("user_id")
      .limit(1);

    if (!error) {
      console.log("✅ Users table already exists!");

      // Check how many users exist
      const { count } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      console.log(`   Found ${count} existing users`);
      return true;
    } else {
      console.log("ℹ️  Users table does not exist yet");
      return false;
    }
  } catch (error) {
    console.log("ℹ️  Tables not created yet");
    return false;
  }
}

async function main() {
  console.log("🚀 VoteGuard Database Setup Tool");
  console.log("═══════════════════════════════════════════════════");

  // Test basic connection
  await createBasicTestTable();

  // Check existing tables
  const tablesExist = await checkExistingTables();

  if (!tablesExist) {
    console.log("\n❗ Database setup required!");
    await printInstructions();
  } else {
    console.log("\n✅ Database appears to be set up already!");
    console.log(
      "\nIf you need to reset or update the database, follow the manual instructions above."
    );
  }

  console.log("\n✨ Setup check completed!");
}

main().catch((error) => {
  console.error("❌ Error:", error.message);
  process.exit(1);
});
