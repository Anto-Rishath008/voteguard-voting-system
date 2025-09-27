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

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  console.error("URL:", supabaseUrl);
  console.error("Key:", supabaseServiceKey ? "Present" : "Missing");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function testConnection() {
  console.log("🔄 Testing Supabase connection...");

  try {
    // Test basic connection
    const { data, error } = await supabase
      .from("pg_tables")
      .select("tablename")
      .limit(1);

    if (error) {
      console.error("❌ Connection test failed:", error.message);
      return false;
    } else {
      console.log("✅ Connection successful!");
      return true;
    }
  } catch (error) {
    console.error("❌ Connection error:", error.message);
    return false;
  }
}

async function createTablesDirectly() {
  console.log("\n🔄 Creating tables using individual queries...");

  const createTableQueries = [
    `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,

    `CREATE TABLE IF NOT EXISTS users (
      user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      azure_ad_user_id VARCHAR(255) UNIQUE,
      email VARCHAR(255) UNIQUE NOT NULL,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      status VARCHAR(20) CHECK (status IN ('Active', 'Inactive', 'Suspended')) DEFAULT 'Active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS user_roles (
      user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
      role_name VARCHAR(20) CHECK (role_name IN ('Voter', 'Admin', 'SuperAdmin')) NOT NULL,
      assigned_by UUID REFERENCES users(user_id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (user_id, role_name)
    );`,

    `CREATE TABLE IF NOT EXISTS jurisdictions (
      jurisdiction_id SERIAL PRIMARY KEY,
      jurisdiction_name VARCHAR(255) NOT NULL,
      parent_jurisdiction_id INTEGER REFERENCES jurisdictions(jurisdiction_id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,

    `CREATE TABLE IF NOT EXISTS system_configuration (
      config_key VARCHAR(255) PRIMARY KEY,
      config_value TEXT NOT NULL,
      is_encrypted BOOLEAN DEFAULT false,
      modified_by UUID REFERENCES users(user_id),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );`,
  ];

  let successCount = 0;
  let errorCount = 0;

  for (const [index, query] of createTableQueries.entries()) {
    try {
      console.log(
        `   [${index + 1}/${createTableQueries.length}] Creating table...`
      );
      const { error } = await supabase.rpc("exec", { sql: query });

      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Success`);
        successCount++;
      }
    } catch (error) {
      console.log(`   ❌ Exception: ${error.message}`);
      errorCount++;
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(
    `✅ Table creation completed: ${successCount} successful, ${errorCount} errors`
  );
  return { successCount, errorCount };
}

async function setupDatabase() {
  console.log("🚀 Setting up VoteGuard database...");

  // Test connection first
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Cannot proceed without database connection");
    process.exit(1);
  }

  // Try to create basic tables
  await createTablesDirectly();

  console.log(
    "\n📝 Note: For full schema setup, you may need to run the SQL files manually in Supabase dashboard"
  );
  console.log(
    `   Dashboard: ${supabaseUrl.replace("/rest/v1", "")}/project/${
      supabaseUrl.split(".")[0].split("//")[1]
    }/sql`
  );
}

setupDatabase().catch((error) => {
  console.error("❌ Setup failed:", error);
  process.exit(1);
});
