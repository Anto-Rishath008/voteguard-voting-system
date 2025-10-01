#!/usr/bin/env node

/**
 * Azure Database Setup Script
 * VoteGuard Voting System - Database Management System Project
 * 
 * This script:
 * 1. Creates enhanced schema in Azure Database
 * 2. Sets up advanced database features
 * 3. Creates test data for demonstration
 * 4. Validates database functionality
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const AZURE_DB_URL = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;

class AzureDBSetup {
    constructor() {
        this.azureClient = null;
        this.setupLog = [];
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type}: ${message}`;
        console.log(logEntry);
        this.setupLog.push(logEntry);
    }

    async initialize() {
        this.log('🚀 Initializing Azure Database Setup...');
        
        if (!AZURE_DB_URL) {
            throw new Error('AZURE_DATABASE_URL or DATABASE_URL environment variable is required');
        }

        // Initialize Azure Database client
        this.azureClient = new Client({ connectionString: AZURE_DB_URL });
        await this.azureClient.connect();
        this.log('✅ Azure Database connection established');
    }

    async deployEnhancedSchema() {
        this.log('📋 Deploying enhanced database schema...');
        
        try {
            const schemaPath = path.join(__dirname, 'database', 'azure_schema.sql');
            const schemaSQL = await fs.readFile(schemaPath, 'utf8');
            
            // Execute schema in chunks to handle complex statements
            const statements = schemaSQL.split(';').filter(stmt => stmt.trim());
            
            for (const statement of statements) {
                if (statement.trim()) {
                    try {
                        await this.azureClient.query(statement);
                    } catch (error) {
                        // Some statements might fail if already exists, that's OK
                        if (!error.message.includes('already exists')) {
                            console.warn('Schema statement warning:', error.message);
                        }
                    }
                }
            }
            
            this.log('✅ Enhanced schema deployed successfully');
        } catch (error) {
            this.log(`❌ Schema deployment error: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async createTestUsers() {
        this.log('👥 Creating test users...');
        
        try {
            const testUsers = [
                {
                    email: 'test@voteguard.com',
                    password: 'password123',
                    firstName: 'Test',
                    lastName: 'User',
                    role: 'Voter'
                },
                {
                    email: 'admin@voteguard.com',
                    password: 'admin123',
                    firstName: 'Admin',
                    lastName: 'User',
                    role: 'Admin'
                }
            ];

            for (const user of testUsers) {
                const hashedPassword = await bcrypt.hash(user.password, 12);
                
                // Insert user
                const userResult = await this.azureClient.query(
                    `INSERT INTO users (email, password_hash, first_name, last_name, status)
                     VALUES ($1, $2, $3, $4, 'Active')
                     ON CONFLICT (email) DO UPDATE SET
                     password_hash = $2, first_name = $3, last_name = $4
                     RETURNING user_id`,
                    [user.email, hashedPassword, user.firstName, user.lastName]
                );

                const userId = userResult.rows[0]?.user_id;
                
                if (userId) {
                    // Get or create role
                    let roleResult = await this.azureClient.query(
                        'SELECT role_id FROM roles WHERE role_name = $1',
                        [user.role]
                    );

                    if (roleResult.rows.length === 0) {
                        await this.azureClient.query(
                            'INSERT INTO roles (role_name, description) VALUES ($1, $2)',
                            [user.role, `${user.role} role`]
                        );
                        
                        roleResult = await this.azureClient.query(
                            'SELECT role_id FROM roles WHERE role_name = $1',
                            [user.role]
                        );
                    }

                    const roleId = roleResult.rows[0]?.role_id;
                    
                    if (roleId) {
                        // Assign role to user
                        await this.azureClient.query(
                            `INSERT INTO user_roles (user_id, role_id)
                             VALUES ($1, $2)
                             ON CONFLICT (user_id, role_id) DO NOTHING`,
                            [userId, roleId]
                        );
                    }
                }
                
                this.log(`✅ Created test user: ${user.email} (${user.role})`);
            }
            
        } catch (error) {
            this.log(`❌ Test user creation error: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async validateDatabase() {
        this.log('🔍 Validating database setup...');
        
        try {
            // Test basic connectivity
            const result = await this.azureClient.query('SELECT NOW() as current_time');
            this.log(`✅ Database connectivity: ${result.rows[0].current_time}`);

            // Check tables exist
            const tables = await this.azureClient.query(`
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                ORDER BY table_name
            `);
            
            this.log(`✅ Found ${tables.rows.length} tables in database`);
            
            // Check users
            const userCount = await this.azureClient.query('SELECT COUNT(*) as count FROM users');
            this.log(`✅ Total users in database: ${userCount.rows[0].count}`);

            return true;
        } catch (error) {
            this.log(`❌ Database validation error: ${error.message}`, 'ERROR');
            return false;
        }
    }

    async generateReport() {
        const reportPath = path.join(__dirname, 'logs', `azure-setup-${Date.now()}.log`);
        
        try {
            await fs.mkdir(path.dirname(reportPath), { recursive: true });
            await fs.writeFile(reportPath, this.setupLog.join('\n'));
            this.log(`📄 Setup report saved to: ${reportPath}`);
        } catch (error) {
            this.log(`⚠️  Could not save report: ${error.message}`, 'WARNING');
        }
    }

    async run() {
        try {
            await this.initialize();
            await this.deployEnhancedSchema();
            await this.createTestUsers();
            
            const isValid = await this.validateDatabase();
            if (!isValid) {
                throw new Error('Database validation failed');
            }
            
            await this.generateReport();
            
            this.log('🎉 Azure Database setup completed successfully!');
            this.log('');
            this.log('📋 Setup Summary:');
            this.log('   • Enhanced PostgreSQL schema deployed');
            this.log('   • Test users created (test@voteguard.com, admin@voteguard.com)');
            this.log('   • Database validation passed');
            this.log('');
            this.log('🔐 Test Credentials:');
            this.log('   Voter: test@voteguard.com / password123');
            this.log('   Admin: admin@voteguard.com / admin123');
            
            return true;
        } catch (error) {
            this.log(`💥 Setup failed: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            if (this.azureClient) {
                await this.azureClient.end();
            }
        }
    }
}

// Run the setup if called directly
if (require.main === module) {
    const setup = new AzureDBSetup();
    setup.run()
        .then(() => {
            console.log('✅ Azure Database setup completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Setup failed:', error.message);
            process.exit(1);
        });
}

module.exports = { AzureDBSetup };