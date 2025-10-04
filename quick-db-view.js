// Quick Azure Database Viewer - Fixed column names
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function quickView() {
    console.log('🔍 Quick Azure Database View\n');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        // Show table schema first
        console.log('📋 CONTESTS TABLE STRUCTURE:');
        console.log('=' .repeat(50));
        const schemaResult = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'contests' 
            ORDER BY ordinal_position
        `);
        console.table(schemaResult.rows);

        // Show contests with correct column names
        console.log('\n🏆 CONTESTS:');
        console.log('=' .repeat(50));
        const contestsResult = await pool.query(`
            SELECT 
                contest_id,
                contest_title,
                contest_type,
                election_id,
                created_at::date as created_date
            FROM contests
            ORDER BY created_at DESC
            LIMIT 10
        `);
        console.table(contestsResult.rows);

        // Show candidates
        console.log('\n👤 CANDIDATES:');
        console.log('=' .repeat(50));
        const candidatesResult = await pool.query(`
            SELECT 
                candidate_id,
                candidate_name,
                party_affiliation,
                contest_id
            FROM candidates
            LIMIT 10
        `);
        console.table(candidatesResult.rows);

        // Show votes
        console.log('\n📊 VOTES:');
        console.log('=' .repeat(50));
        const votesResult = await pool.query(`
            SELECT 
                vote_id,
                voter_id,
                election_id,
                contest_id,
                created_at::timestamp as vote_time
            FROM votes
            ORDER BY created_at DESC
            LIMIT 10
        `);
        console.table(votesResult.rows);

        // Show summary statistics
        console.log('\n📈 SUMMARY:');
        console.log('=' .repeat(50));
        const summary = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM elections) as total_elections,
                (SELECT COUNT(*) FROM contests) as total_contests,
                (SELECT COUNT(*) FROM candidates) as total_candidates,
                (SELECT COUNT(*) FROM votes) as total_votes
        `);
        console.table(summary.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

quickView();