/**
 * Enhanced Database Library for VoteGuard
 * Azure Database for PostgreSQL Integration
 * Database Management System Academic Project
 */

import { Pool, PoolClient, QueryResult } from 'pg';

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
        // Use environment variables with fallback to config
        const connectionString = process.env.DATABASE_URL || process.env.AZURE_DATABASE_URL;
        
        if (connectionString) {
            // Use connection string if available
            this.pool = new Pool({
                connectionString,
                ssl: { rejectUnauthorized: false },
                max: config.maxConnections || 20,
                idleTimeoutMillis: config.idleTimeoutMillis || 30000,
                connectionTimeoutMillis: config.connectionTimeoutMillis || 5000,
            });
        } else {
            // Use individual config parameters
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
        }

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
    async query(text: string, params?: any[]): Promise<QueryResult> {
        const startTime = Date.now();
        let success = false;
        let result: QueryResult | null = null;
        let rowCount = 0;

        try {
            result = await this.pool.query(text, params);
            rowCount = result.rowCount || 0;
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
                rowCount,
                success
            });

            // Keep only last 100 metrics
            if (this.queryMetrics.length > 100) {
                this.queryMetrics = this.queryMetrics.slice(-100);
            }
        }
    }

    /**
     * Get a client from the pool for transactions
     */
    async connect(): Promise<PoolClient> {
        return await this.pool.connect();
    }

    /**
     * Test database connection
     */
    async testConnection(): Promise<boolean> {
        try {
            const result = await this.query('SELECT 1 as test');
            return result.rows.length > 0;
        } catch (error) {
            console.error('Connection test failed:', error);
            return false;
        }
    }

    /**
     * Get user by email (updated for Azure Database schema)
     */
    async getUserByEmail(email: string): Promise<any> {
        const result = await this.query(
            'SELECT * FROM users WHERE email = $1 AND (status IS NULL OR status != $2)',
            [email.toLowerCase(), 'disabled']
        );
        return result.rows[0] || null;
    }

    /**
     * Get user by ID
     */
    async getUserById(userId: string): Promise<any> {
        const result = await this.query(
            'SELECT * FROM users WHERE user_id = $1',
            [userId]
        );
        return result.rows[0] || null;
    }

    /**
     * Get user roles by user ID
     */
    async getUserRoles(userId: string): Promise<string[]> {
        const result = await this.query(
            'SELECT role_name FROM user_roles WHERE user_id = $1',
            [userId]
        );
        return result.rows.map(row => row.role_name);
    }

    /**
     * Get user with roles by email
     */
    async getUserWithRolesByEmail(email: string): Promise<any> {
        const user = await this.getUserByEmail(email);
        if (!user) return null;
        
        const roles = await this.getUserRoles(user.user_id);
        return {
            ...user,
            roles
        };
    }

    /**
     * Get active elections
     */
    async getActiveElections(): Promise<any[]> {
        const result = await this.query(`
            SELECT 
                e.*,
                'VoteGuard System' as org_name,
                COUNT(DISTINCT c.contest_id) as contest_count,
                COUNT(DISTINCT candidates.candidate_id) as candidate_count,
                0 as voter_count
            FROM elections e
            LEFT JOIN contests c ON e.election_id = c.election_id
            LEFT JOIN candidates ON c.contest_id = candidates.contest_id
            WHERE e.status = 'Active'
            GROUP BY e.election_id
            ORDER BY e.start_date DESC
        `);
        return result.rows;
    }

    /**
     * Get voter history
     */
    async getVoterHistory(userId: string): Promise<any[]> {
        const result = await this.query(`
            SELECT 
                v.*,
                e.election_name,
                e.description as election_description,
                c.contest_title
            FROM votes v
            JOIN contests c ON v.contest_id = c.contest_id
            JOIN elections e ON c.election_id = e.election_id
            WHERE v.voter_id = $1
            ORDER BY v.vote_timestamp DESC
        `, [userId]);
        return result.rows;
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(userId: string): Promise<any> {
        try {
            // Get user counts
            const userStats = await this.query(`
                SELECT 
                    COUNT(*) as total_users,
                    COUNT(CASE WHEN (status IS NULL OR status != 'disabled') THEN 1 END) as active_users
                FROM users
            `);

            // Get election counts with more detailed status breakdown
            const electionStats = await this.query(`
                SELECT 
                    COUNT(*) as total_elections,
                    COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_elections,
                    COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_elections,
                    COUNT(CASE WHEN status = 'Draft' THEN 1 END) as draft_elections,
                    COUNT(CASE WHEN status = 'Scheduled' THEN 1 END) as scheduled_elections
                FROM elections
            `);

            // Get vote counts - total votes overall, not just today
            const voteStats = await this.query(`
                SELECT 
                    COUNT(*) as total_votes,
                    COUNT(DISTINCT voter_id) as unique_voters,
                    COUNT(CASE WHEN DATE(vote_timestamp) = CURRENT_DATE THEN 1 END) as today_votes
                FROM votes
            `);

            // Get user-specific vote count
            const userVotes = await this.query(`
                SELECT COUNT(*) as user_votes
                FROM votes
                WHERE voter_id = $1
            `, [userId]);

            return {
                users: userStats.rows[0],
                elections: electionStats.rows[0],
                votes: voteStats.rows[0],
                userVotes: userVotes.rows[0]
            };
        } catch (error) {
            console.error('Dashboard stats error:', error);
            return {
                users: { total_users: 0, active_users: 0 },
                elections: { total_elections: 0, active_elections: 0, completed_elections: 0 },
                votes: { total_votes: 0 },
                userVotes: { user_votes: 0 }
            };
        }
    }

    /**
     * Get query performance metrics
     */
    async getQueryMetrics(): Promise<QueryMetrics[]> {
        return this.queryMetrics.slice(-20); // Return last 20 metrics
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<any> {
        try {
            const result = await this.query('SELECT version(), current_database(), current_user');
            return {
                status: 'healthy',
                version: result.rows[0].version,
                database: result.rows[0].current_database,
                user: result.rows[0].current_user,
                connection_count: this.pool.totalCount,
                idle_count: this.pool.idleCount,
                waiting_count: this.pool.waitingCount
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Log security events (simplified)
     */
    async logSecurityEvent(event: any): Promise<void> {
        try {
            // Map custom events to valid operation_type values
            let operationType = 'LOGIN'; // Default to LOGIN for most security events
            
            if (event.action === 'LOGIN_SUCCESS') {
                operationType = 'LOGIN';
            } else if (event.action === 'LOGIN_FAILED') {
                operationType = 'LOGIN'; // Use LOGIN for failed attempts too
            } else if (event.action === 'LOGOUT') {
                operationType = 'LOGOUT';
            } else if (event.action?.includes('INSERT')) {
                operationType = 'INSERT';
            } else if (event.action?.includes('UPDATE')) {
                operationType = 'UPDATE';
            } else if (event.action?.includes('DELETE')) {
                operationType = 'DELETE';
            }
            
            await this.query(`
                INSERT INTO audit_log (user_id, operation_type, table_name, new_values, ip_address, user_agent, timestamp)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `, [
                event.user_id || null,
                operationType,
                'users',
                JSON.stringify({ action: event.action, ...(event.details || {}) }),
                event.ip_address || 'unknown',
                event.user_agent || 'unknown'
            ]);
        } catch (error) {
            console.error('Failed to log security event:', error);
        }
    }

    /**
     * Update user login attempt
     */
    async updateUserLoginAttempt(userId: string, success: boolean): Promise<void> {
        try {
            if (success) {
                await this.query(`
                    UPDATE users 
                    SET last_login = NOW(), failed_login_attempts = 0, updated_at = NOW()
                    WHERE user_id = $1
                `, [userId]);
            } else {
                await this.query(`
                    UPDATE users 
                    SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1, updated_at = NOW()
                    WHERE user_id = $1
                `, [userId]);
            }
        } catch (error) {
            console.error('Failed to update login attempt:', error);
        }
    }

    /**
     * Close the pool
     */
    async close(): Promise<void> {
        await this.pool.end();
        this.isConnected = false;
    }
}

// Singleton database instance
let databaseInstance: EnhancedDatabase | null = null;

export function getDatabase(): EnhancedDatabase {
    if (!databaseInstance) {
        let config: DatabaseConfig;
        
        // Check if we have AZURE_DATABASE_URL (connection string format)
        const connectionString = process.env.AZURE_DATABASE_URL || process.env.DATABASE_URL;
        
        if (connectionString) {
            // Parse connection string format: postgresql://user:password@host:port/database
            try {
                const url = new URL(connectionString);
                config = {
                    host: url.hostname,
                    database: url.pathname.slice(1), // Remove leading slash
                    username: url.username,
                    password: url.password,
                    port: parseInt(url.port) || 5432,
                    ssl: url.searchParams.get('sslmode') === 'require' || process.env.NODE_ENV === 'production',
                    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
                    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
                    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
                };
                console.log('🔗 Using connection string for database config');
            } catch (error) {
                console.error('❌ Failed to parse connection string:', error);
                throw new Error('Invalid database connection string format');
            }
        } else {
            // Use individual environment variables (fallback)
            config = {
                host: process.env.DB_HOST || 'localhost',
                database: process.env.DB_NAME || 'postgres',
                username: process.env.DB_USER || 'postgres',
                password: process.env.DB_PASS || '',
                port: parseInt(process.env.DB_PORT || '5432'),
                ssl: process.env.DB_SSL === 'require' || process.env.NODE_ENV === 'production',
                maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
                idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
                connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '5000')
            };
            console.log('🔧 Using individual environment variables for database config');
        }
        
        databaseInstance = new EnhancedDatabase(config);
    }
    
    return databaseInstance;
}

export default { EnhancedDatabase, getDatabase };