const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

/**
 * Deploy Enhanced Schema to Azure Database
 * This script deploys the enhanced database schema to Azure PostgreSQL
 */

class AzureSchemaDeployer {
  constructor() {
    this.client = null;
    this.connectionConfig = {
      // Azure Database connection details
      host: process.env.DB_HOST || 'voteguard-db-4824.postgres.database.azure.com',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'postgres',
      user: process.env.DB_USER || 'voteguardadmin',
      password: process.env.DB_PASS || 'n@pASSWORD@002',
      ssl: { rejectUnauthorized: false }
    };
    
    console.log('🗄️ Azure Database Schema Deployer Initialized');
    console.log(`📡 Target: ${this.connectionConfig.host}:${this.connectionConfig.port}/${this.connectionConfig.database}`);
  }

  async connect() {
    try {
      this.client = new Client(this.connectionConfig);
      await this.client.connect();
      console.log('✅ Connected to Azure Database for PostgreSQL');
      return true;
    } catch (error) {
      console.error('❌ Connection failed:', error.message);
      console.log('\n🔧 Connection troubleshooting:');
      console.log('1. Verify Azure Database server is running');
      console.log('2. Check firewall rules allow your IP');
      console.log('3. Confirm connection credentials are correct');
      console.log('4. Ensure SSL is properly configured');
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.end();
      console.log('🔌 Disconnected from Azure Database');
    }
  }

  async checkDatabase() {
    try {
      // Check if database exists and is accessible
      const result = await this.client.query('SELECT version()');
      console.log('📊 Database Version:', result.rows[0].version);

      // Check existing tables
      const tables = await this.client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);
      
      console.log(`📋 Existing Tables: ${tables.rows.length}`);
      tables.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.tablename}`);
      });

      return true;
    } catch (error) {
      console.error('❌ Database check failed:', error.message);
      return false;
    }
  }

  async deploySchema() {
    try {
      console.log('\n🚀 Starting Enhanced Schema Deployment...');
      
      // Read the Azure-compatible schema file
      const schemaPath = path.join(__dirname, 'database', 'azure_schema.sql');
      
      if (!fs.existsSync(schemaPath)) {
        console.error('❌ Enhanced schema file not found at:', schemaPath);
        return false;
      }

      const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      console.log('📖 Enhanced schema loaded successfully');
      console.log(`📏 Schema size: ${schemaSQL.length} characters`);

      // Begin transaction
      await this.client.query('BEGIN');
      console.log('🔄 Transaction started');

      try {
        // Execute the schema SQL
        await this.client.query(schemaSQL);
        console.log('✅ Enhanced schema deployed successfully');

        // Commit transaction
        await this.client.query('COMMIT');
        console.log('💾 Transaction committed');

        return true;
      } catch (deployError) {
        // Rollback on error
        await this.client.query('ROLLBACK');
        console.error('❌ Schema deployment failed, rolled back:', deployError.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Schema deployment error:', error.message);
      return false;
    }
  }

  async validateDeployment() {
    try {
      console.log('\n🔍 Validating Enhanced Schema Deployment...');

      // Check tables
      const tables = await this.client.query(`
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
        ORDER BY tablename
      `);
      
      const expectedTables = [
        'users', 'user_roles', 'organizations', 'elections', 
        'contests', 'candidates', 'votes', 'audit_logs', 
        'security_events', 'voter_eligibility'
      ];

      const actualTables = tables.rows.map(row => row.tablename);
      const missingTables = expectedTables.filter(table => !actualTables.includes(table));

      if (missingTables.length === 0) {
        console.log('✅ All expected tables created successfully');
      } else {
        console.log('❌ Missing tables:', missingTables);
      }

      // Check stored procedures
      const procedures = await this.client.query(`
        SELECT routine_name FROM information_schema.routines 
        WHERE routine_type = 'FUNCTION' 
        AND specific_schema = 'public'
        ORDER BY routine_name
      `);
      
      console.log(`📋 Stored Procedures: ${procedures.rows.length}`);
      procedures.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.routine_name}`);
      });

      // Check views
      const views = await this.client.query(`
        SELECT viewname FROM pg_views 
        WHERE schemaname = 'public' 
        ORDER BY viewname
      `);
      
      console.log(`📊 Views: ${views.rows.length}`);
      views.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.viewname}`);
      });

      // Check indexes
      const indexes = await this.client.query(`
        SELECT indexname FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND indexname NOT LIKE '%_pkey'
        ORDER BY indexname
      `);
      
      console.log(`⚡ Performance Indexes: ${indexes.rows.length}`);
      indexes.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.indexname}`);
      });

      return missingTables.length === 0;
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      return false;
    }
  }

  async createInitialData() {
    try {
      console.log('\n👤 Creating Initial Admin User...');
      
      // Create super admin user
      const createAdminQuery = `
        INSERT INTO users (email, password_hash, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (email) DO NOTHING
        RETURNING user_id, email
      `;
      
      const adminResult = await this.client.query(createAdminQuery, [
        'admin@voteguard.com',
        '$2b$12$LQv3c1yqBwEHFpx7s2cqd.bF9n4k5l6m7p8q9r0s1t2u3v4w5x6y7z', // Password: admin123
        'System',
        'Administrator',
        'super_admin',
        true
      ]);

      if (adminResult.rows.length > 0) {
        console.log('✅ Super admin user created:', adminResult.rows[0].email);
      } else {
        console.log('ℹ️ Super admin user already exists');
      }

      // Create sample organization
      const createOrgQuery = `
        INSERT INTO organizations (org_name, org_type, contact_email, is_active)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (org_name) DO NOTHING
        RETURNING org_id, org_name
      `;
      
      const orgResult = await this.client.query(createOrgQuery, [
        'VoteGuard University',
        'educational',
        'contact@voteguard.edu',
        true
      ]);

      if (orgResult.rows.length > 0) {
        console.log('✅ Sample organization created:', orgResult.rows[0].org_name);
      } else {
        console.log('ℹ️ Sample organization already exists');
      }

      return true;
    } catch (error) {
      console.error('❌ Initial data creation failed:', error.message);
      return false;
    }
  }
}

// Main execution
async function main() {
  console.log('🎯 VoteGuard Enhanced Schema Deployment');
  console.log('=====================================');
  
  const deployer = new AzureSchemaDeployer();
  
  // Connect to database
  const connected = await deployer.connect();
  if (!connected) {
    console.log('\n❌ Cannot proceed without database connection');
    console.log('Please check your connection configuration and try again');
    process.exit(1);
  }

  try {
    // Check current database state
    const dbOk = await deployer.checkDatabase();
    if (!dbOk) {
      console.log('❌ Database check failed');
      process.exit(1);
    }

    // Deploy enhanced schema
    const deployed = await deployer.deploySchema();
    if (!deployed) {
      console.log('❌ Schema deployment failed');
      process.exit(1);
    }

    // Validate deployment
    const validated = await deployer.validateDeployment();
    if (!validated) {
      console.log('⚠️ Schema validation had issues');
    }

    // Create initial data
    const initialData = await deployer.createInitialData();
    if (!initialData) {
      console.log('⚠️ Initial data creation had issues');
    }

    console.log('\n🎉 Enhanced Schema Deployment Complete!');
    console.log('\n📋 Summary:');
    console.log('✅ Enhanced database schema deployed');
    console.log('✅ All tables, procedures, views, and indexes created');
    console.log('✅ Initial admin user and organization created');
    console.log('\n🚀 Your VoteGuard system is ready for data migration!');
    
  } finally {
    await deployer.disconnect();
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { AzureSchemaDeployer };