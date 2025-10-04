// Check table structures
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTables() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        console.log('📋 CANDIDATES TABLE STRUCTURE:');
        const candidatesSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'candidates' 
            ORDER BY ordinal_position
        `);
        console.table(candidatesSchema.rows);

        console.log('\n📋 VOTES TABLE STRUCTURE:');
        const votesSchema = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'votes' 
            ORDER BY ordinal_position
        `);
        console.table(votesSchema.rows);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkTables();