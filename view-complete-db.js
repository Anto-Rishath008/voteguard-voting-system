// Complete Azure PostgreSQL Database Viewer
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function viewCompleteDatabase() {
    console.log('🔍 Complete Azure PostgreSQL Database View\n');
    console.log('Database:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@'));
    console.log('=' .repeat(80) + '\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // 1. USERS
        console.log('👥 USERS (Recent 10):');
        console.log('-' .repeat(80));
        const users = await pool.query(`
            SELECT user_id, email, first_name, last_name, status, created_at::date as joined_date
            FROM users ORDER BY created_at DESC LIMIT 10
        `);
        console.table(users.rows);

        // 2. USER ROLES
        console.log('\n🔐 USER ROLES:');
        console.log('-' .repeat(80));
        const roles = await pool.query(`
            SELECT u.email, u.first_name, u.last_name, ur.role_name
            FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            ORDER BY ur.role_name, u.email
        `);
        console.table(roles.rows);

        // 3. ELECTIONS
        console.log('\n🗳️  ELECTIONS:');
        console.log('-' .repeat(80));
        const elections = await pool.query(`
            SELECT election_id, election_name, status, 
                   start_date::date, end_date::date, created_at::date as created_date
            FROM elections ORDER BY created_at DESC
        `);
        console.table(elections.rows);

        // 4. CONTESTS
        console.log('\n🏆 CONTESTS:');
        console.log('-' .repeat(80));
        const contests = await pool.query(`
            SELECT c.contest_id, c.contest_title, c.contest_type, 
                   e.election_name, c.created_at::date as created_date
            FROM contests c
            JOIN elections e ON c.election_id = e.election_id
            ORDER BY c.created_at DESC
        `);
        console.table(contests.rows);

        // 5. CANDIDATES
        console.log('\n👤 CANDIDATES:');
        console.log('-' .repeat(80));
        const candidates = await pool.query(`
            SELECT ca.candidate_id, ca.candidate_name, ca.party,
                   c.contest_title, e.election_name
            FROM candidates ca
            JOIN contests c ON ca.contest_id = c.contest_id
            JOIN elections e ON ca.election_id = e.election_id
            ORDER BY e.election_name, c.contest_title, ca.candidate_name
        `);
        console.table(candidates.rows);

        // 6. VOTES
        console.log('\n📊 VOTES:');
        console.log('-' .repeat(80));
        const votes = await pool.query(`
            SELECT v.vote_id, u.email as voter_email, ca.candidate_name,
                   c.contest_title, e.election_name, v.vote_timestamp::timestamp as voted_at
            FROM votes v
            JOIN users u ON v.voter_id = u.user_id
            JOIN candidates ca ON v.candidate_id = ca.candidate_id
            JOIN contests c ON v.contest_id = c.contest_id
            JOIN elections e ON v.election_id = e.election_id
            ORDER BY v.vote_timestamp DESC
            LIMIT 20
        `);
        console.table(votes.rows);

        // 7. SUMMARY STATISTICS
        console.log('\n📈 DATABASE SUMMARY:');
        console.log('-' .repeat(80));
        const stats = await pool.query(`
            SELECT 
                'Users' as table_name,
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_records
            FROM users
            UNION ALL
            SELECT 
                'Elections' as table_name,
                COUNT(*) as total_records,
                COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_records
            FROM elections
            UNION ALL
            SELECT 
                'Contests' as table_name,
                COUNT(*) as total_records,
                0 as active_records
            FROM contests
            UNION ALL
            SELECT 
                'Candidates' as table_name,
                COUNT(*) as total_records,
                0 as active_records
            FROM candidates
            UNION ALL
            SELECT 
                'Votes' as table_name,
                COUNT(*) as total_records,
                0 as active_records
            FROM votes
            ORDER BY total_records DESC
        `);
        console.table(stats.rows);

        // 8. VOTING ACTIVITY BY ELECTION
        console.log('\n📊 VOTING ACTIVITY BY ELECTION:');
        console.log('-' .repeat(80));
        const activity = await pool.query(`
            SELECT 
                e.election_name,
                e.status,
                COUNT(v.vote_id) as total_votes,
                COUNT(DISTINCT v.voter_id) as unique_voters,
                COUNT(c.contest_id) as total_contests
            FROM elections e
            LEFT JOIN votes v ON e.election_id = v.election_id
            LEFT JOIN contests c ON e.election_id = c.election_id
            GROUP BY e.election_id, e.election_name, e.status
            ORDER BY total_votes DESC
        `);
        console.table(activity.rows);

        console.log('\n✅ Database view completed successfully!');
        console.log('=' .repeat(80));

    } catch (error) {
        console.error('❌ Database Error:', error.message);
        console.error('Error Code:', error.code);
    } finally {
        await pool.end();
    }
}

viewCompleteDatabase();