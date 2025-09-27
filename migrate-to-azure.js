#!/usr/bin/env node

/**
 * Azure Database Migration Script for VoteGuard
 * This script migrates your database schema to Azure PostgreSQL
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration - Update these with your Azure database details
const config = {
  host: process.env.AZURE_DB_HOST || 'your-server-name.postgres.database.azure.com',
  user: process.env.AZURE_DB_USER || 'voteguardadmin',
  password: process.env.AZURE_DB_PASSWORD || 'your-password',
  database: process.env.AZURE_DB_NAME || 'voteguarddb',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

async function migrateDatabase() {
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to Azure PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read schema file
    const schemaPath = path.join(__dirname, 'src', 'database', 'schema.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📄 Running database schema migration...');
    await client.query(schemaSQL);
    console.log('✅ Schema migration completed!');

    // Optional: Run seed data
    const seedPath = path.join(__dirname, 'src', 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Running seed data...');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSQL);
      console.log('✅ Seed data inserted!');
    }

    // Test the connection with a simple query
    console.log('🧪 Testing database...');
    const result = await client.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log(`✅ Database ready! Found ${result.rows[0].table_count} tables.`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run migration
if (require.main === module) {
  console.log('🚀 Starting VoteGuard Database Migration to Azure...');
  migrateDatabase()
    .then(() => {
      console.log('🎉 Migration completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateDatabase };