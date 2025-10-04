// Azure PostgreSQL Database Viewer
// Uses the same connection method as your Next.js app

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function viewAzureDatabase() {
    console.log('🔍 Connecting to Azure PostgreSQL Database...\n');
    console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@'));
    
    // Create connection pool using the same connection string as your app
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Required for Azure PostgreSQL
        }
    });

    try {
        // Test connection
        console.log('Testing connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Connected successfully!\n');

        // List all tables
        console.log('📋 DATABASE TABLES:');
        console.log('=' .repeat(60));
        const tablesResult = await pool.query(`
            SELECT 
                table_name,
                table_type
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.table(tablesResult.rows);

        // Show users table
        console.log('\n👥 USERS TABLE:');
        console.log('=' .repeat(60));
        const usersResult = await pool.query(`
            SELECT 
                user_id, 
                email, 
                first_name, 
                last_name, 
                status, 
                created_at::date as created_date,
                last_login::date as last_login_date
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.table(usersResult.rows);

        // Show user roles
        console.log('\n🔐 USER ROLES:');
        console.log('=' .repeat(60));
        const rolesResult = await pool.query(`
            SELECT 
                u.email,
                u.first_name,
                u.last_name,
                ur.role_name,
                ur.created_at::date as role_assigned_date
            FROM users u
            JOIN user_roles ur ON u.user_id = ur.user_id
            ORDER BY u.email, ur.role_name
        `);
        
        console.table(rolesResult.rows);

        // Show elections
        console.log('\n🗳️  ELECTIONS:');
        console.log('=' .repeat(60));
        const electionsResult = await pool.query(`
            SELECT 
                election_id,
                election_name,
                status,
                start_date::date,
                end_date::date,
                created_at::date as created_date
            FROM elections 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.table(electionsResult.rows);

        // Show contests
        console.log('\n🏆 CONTESTS:');
        console.log('=' .repeat(60));
        const contestsResult = await pool.query(`
            SELECT 
                c.contest_id,
                c.title as contest_title,
                c.contest_type,
                e.election_name,
                c.created_at::date as created_date
            FROM contests c
            JOIN elections e ON c.election_id = e.election_id
            ORDER BY c.created_at DESC
            LIMIT 10
        `);
        
        console.table(contestsResult.rows);

        // Show candidates
        console.log('\n👤 CANDIDATES:');
        console.log('=' .repeat(60));
        const candidatesResult = await pool.query(`
            SELECT 
                ca.candidate_id,
                ca.candidate_name,
                ca.party_affiliation,
                c.title as contest_title,
                e.election_name
            FROM candidates ca
            JOIN contests c ON ca.contest_id = c.contest_id
            JOIN elections e ON c.election_id = e.election_id
            ORDER BY e.election_name, c.title, ca.candidate_name
            LIMIT 15
        `);
        
        console.table(candidatesResult.rows);

        // Show votes summary
        console.log('\n📊 VOTING SUMMARY:');
        console.log('=' .repeat(60));
        const votesResult = await pool.query(`
            SELECT 
                e.election_name,
                COUNT(v.vote_id) as total_votes,
                COUNT(DISTINCT v.voter_id) as unique_voters
            FROM votes v
            JOIN elections e ON v.election_id = e.election_id
            GROUP BY e.election_id, e.election_name
            ORDER BY total_votes DESC
        `);
        
        console.table(votesResult.rows);

        // Database statistics
        console.log('\n📈 DATABASE STATISTICS:');
        console.log('=' .repeat(60));
        const statsResult = await pool.query(`
            SELECT 
                'Users' as table_name,
                COUNT(*) as record_count
            FROM users
            UNION ALL
            SELECT 
                'User Roles' as table_name,
                COUNT(*) as record_count
            FROM user_roles
            UNION ALL
            SELECT 
                'Elections' as table_name,
                COUNT(*) as record_count
            FROM elections
            UNION ALL
            SELECT 
                'Contests' as table_name,
                COUNT(*) as record_count
            FROM contests
            UNION ALL
            SELECT 
                'Candidates' as table_name,
                COUNT(*) as record_count
            FROM candidates
            UNION ALL
            SELECT 
                'Votes' as table_name,
                COUNT(*) as record_count
            FROM votes
            ORDER BY record_count DESC
        `);
        
        console.table(statsResult.rows);

        // Show recent activity
        console.log('\n⏰ RECENT ACTIVITY:');
        console.log('=' .repeat(60));
        const recentResult = await pool.query(`
            SELECT 
                'Vote Cast' as activity,
                u.email as user_email,
                e.election_name,
                v.created_at::timestamp as timestamp
            FROM votes v
            JOIN users u ON v.voter_id = u.user_id
            JOIN elections e ON v.election_id = e.election_id
            ORDER BY v.created_at DESC
            LIMIT 10
        `);
        
        console.table(recentResult.rows);

    } catch (error) {
        console.error('❌ Database Error:', error.message);
        console.error('Error Code:', error.code);
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Connection refused - check if database is accessible');
        } else if (error.code === '28P01') {
            console.error('💡 Authentication failed - check credentials');
        }
    } finally {
        await pool.end();
        console.log('\n✅ Database connection closed');
    }
}

// Allow custom queries via command line
const args = process.argv.slice(2);
if (args.length > 0) {
    console.log('📝 Command line arguments:', args);
    if (args[0] === '--help') {
        console.log(`
Usage:
  node view-azure-database.js           - View all data
  node view-azure-database.js --help    - Show this help
        `);
        process.exit(0);
    }
}

viewAzureDatabase();