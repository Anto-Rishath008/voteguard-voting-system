import { getDatabase } from './src/lib/enhanced-database.js';

async function viewDatabaseData() {
    console.log('🔍 Connecting to Azure Database...\n');
    
    const db = getDatabase();
    if (!db) {
        console.error('❌ Failed to connect to database');
        return;
    }

    try {
        // List all tables
        console.log('📋 AVAILABLE TABLES:');
        console.log('=' .repeat(50));
        const tablesResult = await db.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        tablesResult.rows.forEach((table, index) => {
            console.log(`${index + 1}. ${table.table_name}`);
        });
        
        console.log('\n');

        // Show users table
        console.log('👥 USERS TABLE:');
        console.log('=' .repeat(50));
        const usersResult = await db.query(`
            SELECT 
                user_id, 
                email, 
                first_name, 
                last_name, 
                status, 
                created_at::date as created_date
            FROM users 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        console.table(usersResult.rows);

        // Show user roles
        console.log('\n🔐 USER ROLES:');
        console.log('=' .repeat(50));
        const rolesResult = await db.query(`
            SELECT 
                u.email,
                u.first_name,
                u.last_name,
                STRING_AGG(ur.role_name, ', ') as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.user_id = ur.user_id
            GROUP BY u.user_id, u.email, u.first_name, u.last_name
            ORDER BY u.email
        `);
        
        console.table(rolesResult.rows);

        // Show elections
        console.log('\n🗳️  ELECTIONS:');
        console.log('=' .repeat(50));
        const electionsResult = await db.query(`
            SELECT 
                election_id,
                election_name,
                status,
                start_date::date,
                end_date::date,
                created_at::date as created_date
            FROM elections 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.table(electionsResult.rows);

        // Show contests count
        console.log('\n🏆 CONTESTS SUMMARY:');
        console.log('=' .repeat(50));
        const contestsResult = await db.query(`
            SELECT 
                e.election_name,
                COUNT(c.contest_id) as contest_count
            FROM elections e
            LEFT JOIN contests c ON e.election_id = c.election_id
            GROUP BY e.election_id, e.election_name
            ORDER BY contest_count DESC
        `);
        
        console.table(contestsResult.rows);

        // Show votes summary
        console.log('\n📊 VOTING SUMMARY:');
        console.log('=' .repeat(50));
        const votesResult = await db.query(`
            SELECT 
                COUNT(*) as total_votes,
                COUNT(DISTINCT voter_id) as unique_voters
            FROM votes
        `);
        
        console.table(votesResult.rows);

        // Database statistics
        console.log('\n📈 DATABASE STATISTICS:');
        console.log('=' .repeat(50));
        const statsResult = await db.query(`
            SELECT 
                'Users' as table_name,
                COUNT(*) as record_count
            FROM users
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
                'Votes' as table_name,
                COUNT(*) as record_count
            FROM votes
            ORDER BY record_count DESC
        `);
        
        console.table(statsResult.rows);

    } catch (error) {
        console.error('❌ Error querying database:', error.message);
    } finally {
        await db.close();
        console.log('\n✅ Database connection closed');
    }
}

// Add command line argument handling
const args = process.argv.slice(2);
if (args.length > 0 && args[0] === 'custom') {
    // Allow custom queries
    console.log('📝 Custom query mode - modify this script to add your queries');
}

viewDatabaseData();