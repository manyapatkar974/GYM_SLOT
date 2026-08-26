require('dotenv').config();
const { pool } = require('./src/config/db');

async function createTestUser(email, name) {
  const res = await pool.query(
    "INSERT INTO users (email, name, password_hash) VALUES ($1, $2, 'dummyhash') ON CONFLICT (email) DO UPDATE SET name=EXCLUDED.name RETURNING id",
    [email, name]
  );
  return res.rows[0].id;
}

async function runTest() {
  console.log("Starting concurrency test...");
  
  // 1. Create a test slot
  const slotRes = await pool.query(
    "INSERT INTO slots (date, start_time, end_time, capacity, booked_count) VALUES (CURRENT_DATE, '12:00:00', '13:00:00', 10, 9) RETURNING id"
  );
  const slotId = slotRes.rows[0].id;
  console.log(`Created test slot ${slotId} with capacity=10, booked=9 (1 spot remaining)`);

  // 2. Create 3 test users
  const userA = await createTestUser('userA@test.com', 'User A');
  const userB = await createTestUser('userB@test.com', 'User B');
  const userC = await createTestUser('userC@test.com', 'User C');

  // 3. Define concurrent booking function (simulating controller logic)
  async function attemptBooking(userId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const s = await client.query('SELECT capacity, booked_count FROM slots WHERE id = $1 FOR UPDATE', [slotId]);
      const { capacity, booked_count } = s.rows[0];
      
      if (booked_count >= capacity) {
        await client.query('ROLLBACK');
        return 'FAILED: FULL';
      }
      
      await client.query("INSERT INTO bookings (user_id, slot_id, status) VALUES ($1, $2, 'ACTIVE')", [userId, slotId]);
      await client.query('UPDATE slots SET booked_count = booked_count + 1 WHERE id = $1', [slotId]);
      
      await client.query('COMMIT');
      return 'SUCCESS';
    } catch (err) {
      await client.query('ROLLBACK');
      return 'ERROR: ' + err.message;
    } finally {
      client.release();
    }
  }

  // 4. Fire 3 requests simultaneously
  console.log("Sending 3 concurrent requests...");
  const results = await Promise.all([
    attemptBooking(userA),
    attemptBooking(userB),
    attemptBooking(userC)
  ]);

  console.log("Results of concurrent requests:");
  console.log("User A:", results[0]);
  console.log("User B:", results[1]);
  console.log("User C:", results[2]);

  // 5. Verify final state
  const finalSlot = await pool.query("SELECT capacity, booked_count FROM slots WHERE id = $1", [slotId]);
  console.log("Final slot state:", finalSlot.rows[0]);

  let successCount = results.filter(r => r === 'SUCCESS').length;
  let fullCount = results.filter(r => r === 'FAILED: FULL').length;

  if (successCount === 1 && fullCount === 2 && finalSlot.rows[0].booked_count === 10) {
    console.log("✅ Concurrency Test PASSED!");
  } else {
    console.log("❌ Concurrency Test FAILED!");
  }

  process.exit(0);
}

runTest().catch(err => {
  console.error(err);
  process.exit(1);
});
