/**
 * Enhanced Database Library for VoteGuard
 * Azure Database for PostgreSQL Integration
 * Database Management System Academic Project
 * 
 * Features:
 * - Connection pooling
 * - Transaction management
 * - Query optimization
 * - Error handling
 * - Security features
 * - Performance monitoring
 */

import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

interface DatabaseConfig {
    host: string;
    database: string;
    username: string;
    password: string;
    port: number;
    ssl: boolean;
    maxConnections?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

interface QueryMetrics {
    query: string;
    executionTime: number;
    timestamp: Date;
    rowCount: number;
    success: boolean;
}

export class EnhancedDatabase {
    private pool: Pool;
    private queryMetrics: QueryMetrics[] = [];
    private isConnected: boolean = false;

    constructor(config: DatabaseConfig) {
        this.pool = new Pool({
            host: config.host,
            database: config.database,
            user: config.username,
            password: config.password,
            port: config.port,
            ssl: config.ssl ? { rejectUnauthorized: false } : false,
            max: config.maxConnections || 20,
            idleTimeoutMillis: config.idleTimeoutMillis || 30000,
            connectionTimeoutMillis: config.connectionTimeoutMillis || 2000,
        });

        // Connection event handlers
        this.pool.on('connect', () => {
            console.log('📊 New database connection established');
            this.isConnected = true;
        });

        this.pool.on('error', (err) => {
            console.error('💥 Database pool error:', err);
            this.isConnected = false;
        });
    }

    /**
     * Execute a query with performance monitoring
     */
    async query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
        const startTime = Date.now();
        let success = false;
        let result: QueryResult<T> | undefined;

        try {
            result = await this.pool.query<T>(text, params);
            success = true;
            return result;
        } catch (error) {
            console.error('❌ Query error:', error);
            throw error;
        } finally {
            // Record metrics
            const executionTime = Date.now() - startTime;
            this.queryMetrics.push({
                query: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                executionTime,
                timestamp: new Date(),
                rowCount: result?.rowCount || 0,
                success
            });

            // Keep only last 100 metrics
            if (this.queryMetrics.length > 100) {
                this.queryMetrics.shift();
            }
        }
    }

    /**
     * Execute queries within a transaction
     */
    async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        
        try {
            await client.query('BEGIN');
            console.log('🔄 Transaction started');
            
            const result = await callback(client);
            
            await client.query('COMMIT');
            console.log('✅ Transaction committed');
            
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            console.log('🔄 Transaction rolled back');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * User Management Functions
     */
    async createUser(userData: {
        email: string;
        firstName: string;
        lastName: string;
        passwordHash: string;
        role: string;
        nationalId?: string;
        phoneNumber?: string;
    }) {
        return this.transaction(async (client) => {
            // Insert user
            const userResult = await client.query(`
                INSERT INTO users (email, first_name, last_name, password_hash, national_id, phone_number)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING user_id, email, first_name, last_name, status, created_at
            `, [
                userData.email,
                userData.firstName,
                userData.lastName,
                userData.passwordHash,
                userData.nationalId,
                userData.phoneNumber
            ]);

            const user = userResult.rows[0];

            // Assign role
            await client.query(`
                INSERT INTO user_roles (user_id, role)
                VALUES ($1, $2)
            `, [user.user_id, userData.role]);

            return user;
        });
    }

    async getUserByEmail(email: string) {
        const result = await this.query(`
            SELECT 
                u.user_id,
                u.email,
                u.first_name,
                u.last_name,
                u.status,
                u.password_hash,
                u.failed_login_attempts,
                u.locked_until,
                u.last_login,
                u.created_at,
                ARRAY_AGG(ur.role) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id AND ur.is_active = true
            WHERE u.email = $1
            GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.status, 
                     u.password_hash, u.failed_login_attempts, u.locked_until, 
                     u.last_login, u.created_at
        `, [email]);

        return result.rows[0] || null;
    }

    async updateUserLoginAttempt(userId: string, success: boolean) {
        if (success) {
            await this.query(`
                UPDATE users 
                SET failed_login_attempts = 0, 
                    locked_until = NULL, 
                    last_login = NOW()
                WHERE user_id = $1
            `, [userId]);
        } else {
            await this.query(`
                UPDATE users 
                SET failed_login_attempts = failed_login_attempts + 1,
                    locked_until = CASE 
                        WHEN failed_login_attempts + 1 >= 5 
                        THEN NOW() + INTERVAL '30 minutes'
                        ELSE locked_until 
                    END
                WHERE user_id = $1
            `, [userId]);
        }
    }

    /**
     * Election Management Functions
     */
    async createElection(electionData: {
        name: string;
        code: string;
        description: string;
        type: string;
        orgId: string;
        votingStart: Date;
        votingEnd: Date;
        createdBy: string;
    }) {
        const result = await this.query(`
            INSERT INTO elections (
                election_name, election_code, description, election_type,
                org_id, voting_start, voting_end, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING election_id, election_name, election_code, status, created_at
        `, [
            electionData.name,
            electionData.code,
            electionData.description,
            electionData.type,
            electionData.orgId,
            electionData.votingStart,
            electionData.votingEnd,
            electionData.createdBy
        ]);

        return result.rows[0];
    }

    async getActiveElections() {
        const result = await this.query(`
            SELECT * FROM active_elections
            ORDER BY voting_start DESC
        `);
        return result.rows;
    }

    async getElectionResults(electionId: string) {
        const result = await this.query(`
            SELECT * FROM get_election_results($1)
        `, [electionId]);
        return result.rows;
    }

    /**
     * Voting Functions
     */
    async castVote(voteData: {
        electionId: string;
        contestId: string;
        voterId: string;
        candidateId?: string;
        ipAddress: string;
        userAgent: string;
    }) {
        return this.transaction(async (client) => {
            // Check voter eligibility
            const eligibilityResult = await client.query(`
                SELECT check_voter_eligibility($1, $2) as is_eligible
            `, [voteData.voterId, voteData.electionId]);

            if (!eligibilityResult.rows[0].is_eligible) {
                throw new Error('Voter is not eligible for this election');
            }

            // Check if already voted
            const existingVote = await client.query(`
                SELECT vote_id FROM votes 
                WHERE election_id = $1 AND contest_id = $2 AND voter_id = $3
            `, [voteData.electionId, voteData.contestId, voteData.voterId]);

            if (existingVote.rows.length > 0) {
                throw new Error('Vote already cast for this contest');
            }

            // Generate vote hash
            const now = new Date();
            const voteHashResult = await client.query(`
                SELECT generate_vote_hash($1, $2, $3, $4) as vote_hash
            `, [voteData.electionId, voteData.voterId, voteData.candidateId, now]);

            const voteHash = voteHashResult.rows[0].vote_hash;

            // Cast vote
            const voteResult = await client.query(`
                INSERT INTO votes (
                    election_id, contest_id, voter_id, candidate_id,
                    vote_hash, cast_at, ip_address, user_agent
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING vote_id, cast_at
            `, [
                voteData.electionId,
                voteData.contestId,
                voteData.voterId,
                voteData.candidateId,
                voteHash,
                now,
                voteData.ipAddress,
                voteData.userAgent
            ]);

            return voteResult.rows[0];
        });
    }

    async getVoterHistory(voterId: string) {
        const result = await this.query(`
            SELECT 
                e.election_name,
                c.contest_name,
                cand.candidate_name,
                v.cast_at,
                v.status
            FROM votes v
            JOIN elections e ON v.election_id = e.election_id
            JOIN contests c ON v.contest_id = c.contest_id
            LEFT JOIN candidates cand ON v.candidate_id = cand.candidate_id
            WHERE v.voter_id = $1
            ORDER BY v.cast_at DESC
        `, [voterId]);

        return result.rows;
    }

    /**
     * Analytics and Reporting Functions
     */
    async getDashboardStats(userId: string) {
        const result = await this.transaction(async (client) => {
            // Get user stats
            const userStatsResult = await client.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'active') as active_users,
                    COUNT(*) as total_users
                FROM users
            `);

            // Get election stats
            const electionStatsResult = await client.query(`
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'active') as active_elections,
                    COUNT(*) FILTER (WHERE status = 'completed') as completed_elections,
                    COUNT(*) as total_elections
                FROM elections
            `);

            // Get vote stats
            const voteStatsResult = await client.query(`
                SELECT COUNT(*) as total_votes
                FROM votes
                WHERE DATE(cast_at) = CURRENT_DATE
            `);

            // Get user's vote count
            const userVotesResult = await client.query(`
                SELECT COUNT(*) as user_votes
                FROM votes
                WHERE voter_id = $1
            `, [userId]);

            return {
                users: userStatsResult.rows[0],
                elections: electionStatsResult.rows[0],
                votes: voteStatsResult.rows[0],
                userVotes: userVotesResult.rows[0]
            };
        });

        return result;
    }

    async getQueryMetrics() {
        return {
            totalQueries: this.queryMetrics.length,
            averageExecutionTime: this.queryMetrics.reduce((sum, m) => sum + m.executionTime, 0) / this.queryMetrics.length,
            slowQueries: this.queryMetrics.filter(m => m.executionTime > 1000),
            recentQueries: this.queryMetrics.slice(-10)
        };
    }

    /**
     * Security Functions
     */
    async logSecurityEvent(eventData: {
        eventType: string;
        userId?: string;
        description: string;
        severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
        ipAddress?: string;
        userAgent?: string;
        additionalData?: any;
    }) {
        await this.query(`
            INSERT INTO security_events (
                event_type, user_id, event_description, severity,
                ip_address, user_agent, additional_data
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
            eventData.eventType,
            eventData.userId,
            eventData.description,
            eventData.severity,
            eventData.ipAddress,
            eventData.userAgent,
            eventData.additionalData ? JSON.stringify(eventData.additionalData) : null
        ]);
    }

    /**
     * Connection Management
     */
    async healthCheck(): Promise<boolean> {
        try {
            await this.query('SELECT 1');
            return true;
        } catch (error) {
            return false;
        }
    }

    async close(): Promise<void> {
        await this.pool.end();
        console.log('🔌 Database connection pool closed');
    }

    getConnectionStatus(): boolean {
        return this.isConnected;
    }
}

// Factory function to create database instance
export function createEnhancedDatabase(): EnhancedDatabase {
    const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        database: process.env.DB_NAME || 'postgres',
        username: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASS || '',
        port: parseInt(process.env.DB_PORT || '5432'),
        ssl: process.env.DB_SSL === 'require',
        maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
        idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
    };

    return new EnhancedDatabase(config);
}

// Singleton instance
let dbInstance: EnhancedDatabase | null = null;

export function getDatabase(): EnhancedDatabase {
    if (!dbInstance) {
        dbInstance = createEnhancedDatabase();
    }
    return dbInstance;
}

export default getDatabase;