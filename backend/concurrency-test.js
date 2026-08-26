require('dotenv').config();
const { pool } = require('./src/config/db');

/**
 * Concurrency Stress Test for FitSlot Booking Engine.
 * 
 * Scenario:
 * - A gym slot has capacity = 10, current bookings = 9 (only 1 remaining spot).
 * - 3 distinct users simultaneously submit booking requests.
 * - Enforces PostgreSQL Row-Level Locking (`SELECT ... FOR UPDATE`).
 * 
 * Expected Outcome:
 * - Exactly 1 booking succeeds (HTTP 201).
 * - Exactly 2 bookings fail with Slot Full conflict (HTTP 409).
 * - Final slot booked_count is strictly 10 (never 11, never exceeds capacity).
 */

async function getOrCreateTestUser(email, name) {
  const query = `
    INSERT INTO users (email, name, password_hash)
    VALUES ($1, $2, '$2b$10$dummyHashForConcurrencyTestingPurposesOnly')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, name, email;
  `;
  const res = await pool.query(query, [email, name]);
  return res.rows[0];
}

async function simulateBookingAttempt(userId, slotId, userName) {
  const client = await pool.connect();
  const startTime = Date.now();

  try {
    await client.query('BEGIN');

    // Acquire exclusive row lock
    const slotRes = await client.query(
      'SELECT id, capacity, booked_count FROM slots WHERE id = $1 FOR UPDATE',
      [slotId]
    );

    const { capacity, booked_count } = slotRes.rows[0];

    if (booked_count >= capacity) {
      await client.query('ROLLBACK');
      const duration = Date.now() - startTime;
      return {
        user: userName,
        status: 'FAILED',
        reason: 'SLOT_FULL (409 Conflict)',
        durationMs: duration,
      };
    }

    // Insert active booking
    await client.query(
      "INSERT INTO bookings (user_id, slot_id, status) VALUES ($1, $2, 'ACTIVE')",
      [userId, slotId]
    );

    // Increment booked count
    await client.query(
      'UPDATE slots SET booked_count = booked_count + 1 WHERE id = $1',
      [slotId]
    );

    await client.query('COMMIT');
    const duration = Date.now() - startTime;
    return {
      user: userName,
      status: 'SUCCESS',
      reason: 'BOOKED_CONFIRMED (201 Created)',
      durationMs: duration,
    };
  } catch (err) {
    await client.query('ROLLBACK');
    return {
      user: userName,
      status: 'ERROR',
      reason: err.message,
      durationMs: Date.now() - startTime,
    };
  } finally {
    client.release();
  }
}

async function runConcurrencyVerification() {
  console.log('\n================================================================');
  console.log('⚡ STARTING FITSLOT CONCURRENCY & ROW-LOCKING VERIFICATION TEST ⚡');
  console.log('================================================================\n');

  // Step 1: Provision a Test Slot with 9/10 capacity filled
  const today = new Date().toISOString().split('T')[0];
  const slotRes = await pool.query(
    `INSERT INTO slots (date, start_time, end_time, capacity, booked_count)
     VALUES ($1, '14:00:00', '15:00:00', 10, 9)
     RETURNING id, date, start_time, end_time, capacity, booked_count`,
    [today]
  );
  const testSlot = slotRes.rows[0];

  console.log(`📌 Test Slot Initialized:`);
  console.log(`   - Slot ID: ${testSlot.id}`);
  console.log(`   - Timing: ${testSlot.start_time} - ${testSlot.end_time}`);
  console.log(`   - Total Capacity: ${testSlot.capacity}`);
  console.log(`   - Initial Bookings: ${testSlot.booked_count}`);
  console.log(`   - Spots Available: ${testSlot.capacity - testSlot.booked_count} (Only ONE spot!)\n`);

  // Step 2: Provision 3 Distinct Test Users
  const user1 = await getOrCreateTestUser('athlete1@test.com', 'Athlete One');
  const user2 = await getOrCreateTestUser('athlete2@test.com', 'Athlete Two');
  const user3 = await getOrCreateTestUser('athlete3@test.com', 'Athlete Three');

  console.log(`👥 Test Athletes Ready:`);
  console.log(`   1. ${user1.name} (${user1.id})`);
  console.log(`   2. ${user2.name} (${user2.id})`);
  console.log(`   3. ${user3.name} (${user3.id})\n`);

  // Step 3: Fire 3 Concurrent Booking Requests Simultaneously
  console.log('🚀 Dispatching 3 concurrent booking requests via Promise.all()...');
  const results = await Promise.all([
    simulateBookingAttempt(user1.id, testSlot.id, user1.name),
    simulateBookingAttempt(user2.id, testSlot.id, user2.name),
    simulateBookingAttempt(user3.id, testSlot.id, user3.name),
  ]);

  console.log('\n📊 Concurrent Request Execution Results:');
  console.table(results);

  // Step 4: Validate Database Final State
  const finalSlotQuery = await pool.query(
    'SELECT capacity, booked_count FROM slots WHERE id = $1',
    [testSlot.id]
  );
  const finalSlot = finalSlotQuery.rows[0];

  const successfulBookings = results.filter((r) => r.status === 'SUCCESS');
  const failedBookings = results.filter((r) => r.status === 'FAILED');

  console.log('🔍 Verification Assertions:');
  console.log(`   - Expected Successes: 1 | Actual: ${successfulBookings.length}`);
  console.log(`   - Expected Rejections: 2 | Actual: ${failedBookings.length}`);
  console.log(`   - Final Slot Booked Count: ${finalSlot.booked_count} / ${finalSlot.capacity}`);

  const passed =
    successfulBookings.length === 1 &&
    failedBookings.length === 2 &&
    finalSlot.booked_count === 10;

  console.log('\n----------------------------------------------------------------');
  if (passed) {
    console.log('✅ TEST PASSED: Zero overbooking detected. Row-level locks verified!');
  } else {
    console.log('❌ TEST FAILED: Overbooking or unexpected concurrency race detected.');
  }
  console.log('----------------------------------------------------------------\n');

  // Clean up test slot
  await pool.query('DELETE FROM slots WHERE id = $1', [testSlot.id]);
  await pool.end();
  process.exit(passed ? 0 : 1);
}

runConcurrencyVerification().catch((err) => {
  console.error('Fatal error during concurrency test:', err);
  pool.end();
  process.exit(1);
});
