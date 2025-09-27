const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function executeSQLStatement(statement) {
  try {
    // Use the raw SQL execution
    const { data, error } = await supabase.rpc("exec_sql", {
      sql: statement.trim(),
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function runSQLFile(filePath, description) {
  try {
    console.log(`\n🔄 ${description}...`);

    const sql = fs.readFileSync(filePath, "utf8");

    // Remove comments and split by semicolons
    const cleanSQL = sql
      .replace(/--.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    const statements = cleanSQL
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    let successCount = 0;
    let errorCount = 0;

    console.log(`   Processing ${statements.length} SQL statements...`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(
          `   [${i + 1}/${statements.length}] ${statement.substring(0, 50)}...`
        );

        const { error } = await executeSQLStatement(statement);

        if (error) {
          console.log(`   ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          successCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `✅ ${description} completed: ${successCount} successful, ${errorCount} errors`
    );
    return { successCount, errorCount };
  } catch (error) {
    console.error(`❌ Error running ${description}:`, error.message);
    throw error;
  }
}

async function setupDatabase() {
  console.log("🚀 Setting up VoteGuard database...");

  try {
    // Run schema first
    await runSQLFile(
      path.join(__dirname, "../src/database/schema.sql"),
      "Creating database schema"
    );

    // Run seed data
    await runSQLFile(
      path.join(__dirname, "../src/database/seed.sql"),
      "Inserting seed data"
    );

    console.log("\n✅ Database setup completed successfully!");

    // Verify setup by checking some tables
    console.log("\n🔍 Verifying setup...");
    const { data: tables, error } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (error) {
      console.log("❌ Could not verify tables:", error.message);
    } else {
      console.log(`✅ Found ${tables.length} tables in database`);
      console.log("Tables:", tables.map((t) => t.table_name).join(", "));
    }
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
