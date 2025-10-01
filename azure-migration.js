#!/usr/bin/env node

/**
 * Migration Script: Supabase to Azure Database for PostgreSQL
 * VoteGuard Voting System - Database Management System Project
 * 
 * This script:
 * 1. Backs up existing Supabase data
 * 2. Creates enhanced schema in Azure Database
 * 3. Migrates data with validation
 * 4. Sets up advanced database features
 * 5. Creates test data for demonstration
 */

const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const AZURE_DB_URL = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;

class DatabaseMigrator {
    constructor() {
        this.supabase = null;
        this.azureClient = null;
        this.migrationLog = [];
    }

    log(message, type = 'INFO') {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] ${type}: ${message}`;
        console.log(logEntry);
        this.migrationLog.push(logEntry);
    }

    async initialize() {
        this.log('🚀 Initializing Database Migration Process...');
        
        // Initialize Supabase client (if available)
        if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
            this.supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            this.log('✅ Supabase client initialized');
        } else {
            this.log('⚠️  Supabase credentials not available - will create fresh database', 'WARNING');
        }

        // Initialize Azure Database client
        if (!AZURE_DB_URL) {
            throw new Error('❌ AZURE_DATABASE_URL is required');
        }

        this.azureClient = new Client({
            connectionString: AZURE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });

        await this.azureClient.connect();
        this.log('✅ Connected to Azure Database for PostgreSQL');
    }

    async backupSupabaseData() {
        if (!this.supabase) {
            this.log('⏭️  Skipping Supabase backup - no connection available');
            return null;
        }

        this.log('💾 Backing up existing Supabase data...');
        
        const backup = {
            timestamp: new Date().toISOString(),
            users: [],
            user_roles: [],
            elections: [],
            votes: []
        };

        try {
            // Backup users
            const { data: users, error: usersError } = await this.supabase
                .from('users')
                .select('*');
            
            if (!usersError && users) {
                backup.users = users;
                this.log(`📊 Backed up ${users.length} users`);
            }

            // Backup user roles
            const { data: roles, error: rolesError } = await this.supabase
                .from('user_roles')
                .select('*');
            
            if (!rolesError && roles) {
                backup.user_roles = roles;
                this.log(`📊 Backed up ${roles.length} user roles`);
            }

            // Backup elections
            const { data: elections, error: electionsError } = await this.supabase
                .from('elections')
                .select('*');
            
            if (!electionsError && elections) {
                backup.elections = elections;
                this.log(`📊 Backed up ${elections.length} elections`);
            }

            // Backup votes
            const { data: votes, error: votesError } = await this.supabase
                .from('votes')
                .select('*');
            
            if (!votesError && votes) {
                backup.votes = votes;
                this.log(`📊 Backed up ${votes.length} votes`);
            }

            // Save backup to file
            const backupPath = path.join(__dirname, 'backup', `supabase-backup-${Date.now()}.json`);
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
            this.log(`💾 Backup saved to ${backupPath}`);

            return backup;
        } catch (error) {
            this.log(`❌ Error during backup: ${error.message}`, 'ERROR');
            return null;
        }
    }

    async createEnhancedSchema() {
        this.log('🏗️  Creating enhanced database schema...');
        
        try {
            // Read the enhanced schema file
            const schemaPath = path.join(__dirname, 'database', 'enhanced_schema.sql');
            const schemaSQL = await fs.readFile(schemaPath, 'utf8');
            
            // Execute the schema creation
            await this.azureClient.query(schemaSQL);
            this.log('✅ Enhanced schema created successfully');
            
        } catch (error) {
            this.log(`❌ Error creating schema: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async migrateUsers(backupData) {
        this.log('👤 Migrating users...');
        
        const users = backupData?.users || [];
        
        if (users.length === 0) {
            this.log('📝 Creating default test users...');
            await this.createDefaultUsers();
            return;
        }

        for (const user of users) {
            try {
                await this.azureClient.query(`
                    INSERT INTO users (
                        user_id, email, first_name, last_name, 
                        status, password_hash, created_at, updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (email) DO UPDATE SET
                        first_name = EXCLUDED.first_name,
                        last_name = EXCLUDED.last_name,
                        updated_at = NOW()
                `, [
                    user.user_id,
                    user.email,
                    user.first_name,
                    user.last_name,
                    user.status || 'active',
                    user.password_hash || await bcrypt.hash('password123', 12),
                    user.created_at || new Date(),
                    new Date()
                ]);
                
                this.log(`✅ Migrated user: ${user.email}`);
            } catch (error) {
                this.log(`❌ Error migrating user ${user.email}: ${error.message}`, 'ERROR');
            }
        }
    }

    async migrateUserRoles(backupData) {
        this.log('🔑 Migrating user roles...');
        
        const roles = backupData?.user_roles || [];
        
        if (roles.length === 0) {
            this.log('📝 Creating default user roles...');
            await this.createDefaultRoles();
            return;
        }

        for (const role of roles) {
            try {
                await this.azureClient.query(`
                    INSERT INTO user_roles (user_id, role, assigned_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (user_id, role) DO NOTHING
                `, [role.user_id, role.role, role.created_at || new Date()]);
                
                this.log(`✅ Migrated role: ${role.role} for user ${role.user_id}`);
            } catch (error) {
                this.log(`❌ Error migrating role: ${error.message}`, 'ERROR');
            }
        }
    }

    async createDefaultUsers() {
        const defaultPassword = await bcrypt.hash('password123', 12);
        const defaultUsers = [
            {
                email: 'voter@voteguard.com',
                first_name: 'Test',
                last_name: 'Voter',
                role: 'voter'
            },
            {
                email: 'admin@voteguard.com',
                first_name: 'Test',
                last_name: 'Admin',
                role: 'admin'
            },
            {
                email: 'superadmin@voteguard.com',
                first_name: 'Super',
                last_name: 'Admin',
                role: 'super_admin'
            },
            {
                email: 'officer@voteguard.com',
                first_name: 'Election',
                last_name: 'Officer',
                role: 'election_officer'
            }
        ];

        for (const user of defaultUsers) {
            try {
                const result = await this.azureClient.query(`
                    INSERT INTO users (email, first_name, last_name, password_hash, status)
                    VALUES ($1, $2, $3, $4, 'active')
                    RETURNING user_id
                `, [user.email, user.first_name, user.last_name, defaultPassword]);

                const userId = result.rows[0].user_id;

                await this.azureClient.query(`
                    INSERT INTO user_roles (user_id, role)
                    VALUES ($1, $2)
                `, [userId, user.role]);

                this.log(`✅ Created user: ${user.email} with role: ${user.role}`);
            } catch (error) {
                this.log(`❌ Error creating user ${user.email}: ${error.message}`, 'ERROR');
            }
        }
    }

    async createDefaultRoles() {
        // Roles are created along with users in createDefaultUsers
        this.log('✅ Default roles created with users');
    }

    async createSampleElection() {
        this.log('🗳️  Creating sample election for demonstration...');
        
        try {
            // Get admin user
            const adminResult = await this.azureClient.query(`
                SELECT user_id FROM users WHERE email = 'admin@voteguard.com'
            `);
            
            if (adminResult.rows.length === 0) {
                this.log('❌ Admin user not found for sample election', 'ERROR');
                return;
            }
            
            const adminId = adminResult.rows[0].user_id;

            // Get default organization
            const orgResult = await this.azureClient.query(`
                SELECT org_id FROM organizations WHERE org_code = 'DEFAULT'
            `);
            
            const orgId = orgResult.rows[0]?.org_id;

            // Create sample election
            const electionResult = await this.azureClient.query(`
                INSERT INTO elections (
                    election_name, election_code, description, election_type,
                    org_id, status, voting_start, voting_end, created_by
                ) VALUES (
                    'Student Council Election 2025',
                    'SCE2025',
                    'Annual student council election for academic year 2025-2026',
                    'Student Council',
                    $1,
                    'draft',
                    NOW() + INTERVAL '1 day',
                    NOW() + INTERVAL '7 days',
                    $2
                ) RETURNING election_id
            `, [orgId, adminId]);

            const electionId = electionResult.rows[0].election_id;

            // Create contests
            const contests = [
                { name: 'President', description: 'Student Council President' },
                { name: 'Vice President', description: 'Student Council Vice President' },
                { name: 'Secretary', description: 'Student Council Secretary' }
            ];

            for (let i = 0; i < contests.length; i++) {
                const contest = contests[i];
                const contestResult = await this.azureClient.query(`
                    INSERT INTO contests (
                        election_id, contest_name, contest_description, 
                        position_name, display_order
                    ) VALUES ($1, $2, $3, $4, $5)
                    RETURNING contest_id
                `, [electionId, contest.name, contest.description, contest.name, i + 1]);

                // Create sample candidates
                const contestId = contestResult.rows[0].contest_id;
                const candidates = [
                    { name: 'Alice Johnson', bio: 'Experienced leader with vision for change' },
                    { name: 'Bob Smith', bio: 'Dedicated to student welfare and rights' }
                ];

                for (let j = 0; j < candidates.length; j++) {
                    const candidate = candidates[j];
                    await this.azureClient.query(`
                        INSERT INTO candidates (
                            contest_id, candidate_name, candidate_bio, 
                            candidate_number, nominated_by
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [contestId, candidate.name, candidate.bio, j + 1, adminId]);
                }
            }

            this.log('✅ Sample election created successfully');
        } catch (error) {
            this.log(`❌ Error creating sample election: ${error.message}`, 'ERROR');
        }
    }

    async validateMigration() {
        this.log('🔍 Validating migration...');
        
        try {
            // Check users
            const userCount = await this.azureClient.query('SELECT COUNT(*) FROM users');
            this.log(`📊 Total users: ${userCount.rows[0].count}`);

            // Check roles
            const roleCount = await this.azureClient.query('SELECT COUNT(*) FROM user_roles');
            this.log(`📊 Total roles: ${roleCount.rows[0].count}`);

            // Check elections
            const electionCount = await this.azureClient.query('SELECT COUNT(*) FROM elections');
            this.log(`📊 Total elections: ${electionCount.rows[0].count}`);

            // Test database functions
            const testEligibility = await this.azureClient.query(`
                SELECT check_voter_eligibility(
                    (SELECT user_id FROM users LIMIT 1),
                    (SELECT election_id FROM elections LIMIT 1)
                ) as is_eligible
            `);
            this.log(`🔧 Function test - voter eligibility: ${testEligibility.rows[0]?.is_eligible}`);

            this.log('✅ Migration validation completed');
        } catch (error) {
            this.log(`❌ Validation error: ${error.message}`, 'ERROR');
        }
    }

    async saveMigrationLog() {
        try {
            const logPath = path.join(__dirname, 'logs', `migration-log-${Date.now()}.txt`);
            await fs.mkdir(path.dirname(logPath), { recursive: true });
            await fs.writeFile(logPath, this.migrationLog.join('\n'));
            this.log(`📝 Migration log saved to ${logPath}`);
        } catch (error) {
            console.error('Failed to save migration log:', error.message);
        }
    }

    async cleanup() {
        if (this.azureClient) {
            await this.azureClient.end();
            this.log('🔌 Disconnected from Azure Database');
        }
    }

    async run() {
        try {
            await this.initialize();
            
            // Backup existing data
            const backupData = await this.backupSupabaseData();
            
            // Create enhanced schema
            await this.createEnhancedSchema();
            
            // Migrate data
            await this.migrateUsers(backupData);
            await this.migrateUserRoles(backupData);
            
            // Create sample data
            await this.createSampleElection();
            
            // Validate migration
            await this.validateMigration();
            
            this.log('🎉 Migration completed successfully!');
            
        } catch (error) {
            this.log(`💥 Migration failed: ${error.message}`, 'ERROR');
            throw error;
        } finally {
            await this.saveMigrationLog();
            await this.cleanup();
        }
    }
}

// Run migration
if (require.main === module) {
    const migrator = new DatabaseMigrator();
    
    migrator.run()
        .then(() => {
            console.log('✅ Migration process completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration process failed:', error);
            process.exit(1);
        });
}

module.exports = { DatabaseMigrator };