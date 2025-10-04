const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: ".env.local" });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("Missing DATABASE_URL environment variable");
  console.error("Please set DATABASE_URL in your .env.local file");
  process.exit(1);
}

// Create PostgreSQL client
const client = new Client({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function executeSQLStatement(statement) {
  try {
    console.log("Executing SQL statement...");
    const result = await client.query(statement);
    console.log("✅ SQL statement executed successfully");
    return result;
  } catch (error) {
    console.error("❌ Error executing SQL statement:", error.message);
    throw error;
  }
}

async function connectToDatabase() {
  try {
    await client.connect();
    console.log("✅ Connected to Azure PostgreSQL database");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error.message);
    throw error;
  }
}

async function disconnectFromDatabase() {
  try {
    await client.end();
    console.log("✅ Disconnected from database");
  } catch (error) {
    console.error("❌ Error disconnecting from database:", error.message);
  }
}

async function checkDatabaseConnection() {
  try {
    const result = await client.query('SELECT version()');
    console.log("✅ Database connection successful");
    console.log("📊 PostgreSQL version:", result.rows[0].version);
    return { success: true };
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
  console.log("🚀 Setting up VoteGuard database with Azure PostgreSQL...");

  try {
    // Connect to database
    await connectToDatabase();

    // Check connection
    await checkDatabaseConnection();

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
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log(`✅ Found ${result.rows.length} tables in database`);
    console.log("Tables:", result.rows.map((t) => t.table_name).join(", "));

  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    process.exit(1);
  } finally {
    // Always disconnect
    await disconnectFromDatabase();
  }
}

// Run setup
setupDatabase().catch(error => {
  console.error("❌ Unhandled error:", error);
  process.exit(1);
});
