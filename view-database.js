const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function viewDatabaseData() {
    console.log('🔍 Connecting to Supabase Database...\n');
    
    try {
        // Initialize Supabase client
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
        );

        // Get users data
        console.log('👥 USERS:');
        console.log('=' .repeat(60));
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('user_id, email, first_name, last_name, status, created_at')
            .order('created_at', { ascending: false })
            .limit(10);

        if (usersError) {
            console.error('Error fetching users:', usersError);
        } else {
            console.table(users);
        }

        // Get user roles
        console.log('\n🔐 USER ROLES:');
        console.log('=' .repeat(60));
        const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('user_id, role_name');

        if (rolesError) {
            console.error('Error fetching roles:', rolesError);
        } else {
            console.table(roles);
        }

        // Get elections
        console.log('\n🗳️  ELECTIONS:');
        console.log('=' .repeat(60));
        const { data: elections, error: electionsError } = await supabase
            .from('elections')
            .select('election_id, election_name, status, start_date, end_date, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (electionsError) {
            console.error('Error fetching elections:', electionsError);
        } else {
            console.table(elections);
        }

        // Get contests count
        console.log('\n🏆 CONTESTS:');
        console.log('=' .repeat(60));
        const { data: contests, error: contestsError } = await supabase
            .from('contests')
            .select('contest_id, title, election_id, contest_type')
            .limit(10);

        if (contestsError) {
            console.error('Error fetching contests:', contestsError);
        } else {
            console.table(contests);
        }

        // Get votes summary
        console.log('\n📊 VOTES:');
        console.log('=' .repeat(60));
        const { data: votes, error: votesError } = await supabase
            .from('votes')
            .select('vote_id, voter_id, election_id, contest_id, created_at')
            .limit(10);

        if (votesError) {
            console.error('Error fetching votes:', votesError);
        } else {
            console.table(votes);
        }

        console.log('\n✅ Database query completed!');

    } catch (error) {
        console.error('❌ Connection error:', error.message);
    }
}

viewDatabaseData();