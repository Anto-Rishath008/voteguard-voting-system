/**
 * Test script to verify if election deletion is working properly
 * This script will show all elections before and after simulated deletion
 */

import dotenv from 'dotenv';
import { getDatabase } from './src/lib/enhanced-database.js';

dotenv.config({ path: '.env.local' });

async function testElectionDeletion() {
  console.log('🔍 Testing Election Deletion System');
  console.log('================================================================================');

  try {
    const db = getDatabase();

    // First, show current elections
    console.log('\n📊 CURRENT ELECTIONS IN DATABASE:');
    console.log('--------------------------------------------------------------------------------');
    
    const currentElections = await db.query(`
      SELECT election_id, election_name, status, start_date, end_date, created_at
      FROM elections
      ORDER BY created_at DESC
    `);

    if (currentElections.rows.length === 0) {
      console.log('No elections found in database.');
      return;
    }

    console.table(currentElections.rows.map(row => ({
      ID: row.election_id,
      Name: row.election_name,
      Status: row.status,
      StartDate: new Date(row.start_date).toLocaleDateString(),
      EndDate: new Date(row.end_date).toLocaleDateString(),
      Created: new Date(row.created_at).toLocaleDateString()
    })));

    // Find a test election to delete (preferably a draft one)
    const testElection = currentElections.rows.find(e => e.status === 'Draft') || currentElections.rows[0];
    
    if (!testElection) {
      console.log('No suitable test election found for deletion test.');
      return;
    }

    console.log(`\n🎯 Selected test election: "${testElection.election_name}" (ID: ${testElection.election_id})`);

    // Show related records before deletion
    console.log('\n🔗 RELATED RECORDS BEFORE DELETION:');
    console.log('--------------------------------------------------------------------------------');

    // Check contests
    const contests = await db.query(
      'SELECT contest_id, contest_title FROM contests WHERE election_id = $1',
      [testElection.election_id]
    );
    console.log(`Contests: ${contests.rows.length}`);
    if (contests.rows.length > 0) {
      console.table(contests.rows);
    }

    // Check candidates
    const candidates = await db.query(
      'SELECT candidate_id, candidate_name FROM candidates WHERE election_id = $1',
      [testElection.election_id]
    );
    console.log(`Candidates: ${candidates.rows.length}`);
    if (candidates.rows.length > 0) {
      console.table(candidates.rows);
    }

    // Check votes
    const votes = await db.query(
      'SELECT vote_id, user_id FROM votes WHERE election_id = $1',
      [testElection.election_id]
    );
    console.log(`Votes: ${votes.rows.length}`);

    // Now test the deletion
    console.log(`\n🗑️  TESTING DELETION OF ELECTION: ${testElection.election_name}`);
    console.log('================================================================================');

    // Simulate the same deletion logic as the API
    const deleteResult = await db.query(
      'DELETE FROM elections WHERE election_id = $1',
      [testElection.election_id]
    );

    console.log(`Deletion result - Rows affected: ${deleteResult.rowCount}`);

    if (deleteResult.rowCount === 0) {
      console.log('❌ Deletion failed - no rows were affected');
    } else {
      console.log('✅ Election deleted successfully');
    }

    // Verify deletion by checking if the election still exists
    console.log('\n🔍 VERIFICATION - Checking if election still exists:');
    console.log('--------------------------------------------------------------------------------');

    const verifyResult = await db.query(
      'SELECT election_id, election_name FROM elections WHERE election_id = $1',
      [testElection.election_id]
    );

    if (verifyResult.rows.length === 0) {
      console.log('✅ Confirmed: Election has been removed from database');
    } else {
      console.log('❌ Error: Election still exists in database');
      console.table(verifyResult.rows);
    }

    // Check if related records were cleaned up (CASCADE)
    console.log('\n🧹 CASCADE CLEANUP VERIFICATION:');
    console.log('--------------------------------------------------------------------------------');

    const remainingContests = await db.query(
      'SELECT contest_id, contest_title FROM contests WHERE election_id = $1',
      [testElection.election_id]
    );
    console.log(`Remaining Contests: ${remainingContests.rows.length}`);

    const remainingCandidates = await db.query(
      'SELECT candidate_id, candidate_name FROM candidates WHERE election_id = $1',
      [testElection.election_id]
    );
    console.log(`Remaining Candidates: ${remainingCandidates.rows.length}`);

    const remainingVotes = await db.query(
      'SELECT vote_id FROM votes WHERE election_id = $1',
      [testElection.election_id]
    );
    console.log(`Remaining Votes: ${remainingVotes.rows.length}`);

    // Show final election count
    console.log('\n📊 FINAL ELECTION COUNT:');
    console.log('--------------------------------------------------------------------------------');

    const finalElections = await db.query('SELECT COUNT(*) as count FROM elections');
    const finalCount = parseInt(finalElections.rows[0].count);
    const originalCount = currentElections.rows.length;
    
    console.log(`Original elections: ${originalCount}`);
    console.log(`Final elections: ${finalCount}`);
    console.log(`Elections removed: ${originalCount - finalCount}`);

    if (originalCount - finalCount === 1) {
      console.log('✅ Election deletion working correctly');
    } else {
      console.log('❌ Unexpected deletion behavior');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testElectionDeletion().catch(console.error);