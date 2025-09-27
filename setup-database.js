#!/usr/bin/env node

/**
 * Quick Database Setup Script for Azure PostgreSQL
 * This script connects to your Azure database and sets up the schema
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Azure PostgreSQL connection configuration
const config = {
  host: 'voteguard-db-4824.postgres.database.azure.com',
  user: 'voteguardadmin',
  password: 'VoteGuard123!',
  database: 'voteguarddb',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

async function setupDatabase() {
  const client = new Client(config);
  
  try {
    console.log('🔌 Connecting to Azure PostgreSQL database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Test basic connection
    const testResult = await client.query('SELECT NOW() as current_time, version() as pg_version');
    console.log('🕒 Database time:', testResult.rows[0].current_time);
    console.log('📊 PostgreSQL version:', testResult.rows[0].pg_version.split(' ')[0]);

    // Check if tables already exist
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    if (tableCheck.rows.length > 0) {
      console.log('📋 Existing tables found:');
      tableCheck.rows.forEach(row => console.log(`  - ${row.table_name}`));
      console.log('⚠️  Database already has tables. Schema setup may have been completed.');
      return;
    }

    // Read and execute Azure-compatible schema file
    const schemaPath = path.join(__dirname, 'src', 'database', 'azure-schema.sql');
    if (!fs.existsSync(schemaPath)) {
      console.log('❌ Azure schema file not found at:', schemaPath);
      return;
    }

    console.log('📄 Reading Azure-compatible schema file...');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🚀 Executing schema...');
    await client.query(schemaSQL);
    console.log('✅ Schema created successfully!');

    // Verify tables were created
    const newTableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log('🎉 Database setup completed! Tables created:');
    newTableCheck.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));

    // Optional: Add sample data
    const seedPath = path.join(__dirname, 'src', 'database', 'seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('🌱 Adding sample data...');
      const seedSQL = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSQL);
      console.log('✅ Sample data added!');
    }

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    if (error.message.includes('connection')) {
      console.log('💡 Make sure your IP is allowed in Azure PostgreSQL firewall rules');
    }
  } finally {
    await client.end();
    console.log('🔌 Database connection closed.');
  }
}

// Run the setup
console.log('🚀 Starting VoteGuard Database Setup...');
setupDatabase()
  .then(() => {
    console.log('✨ Database setup completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });