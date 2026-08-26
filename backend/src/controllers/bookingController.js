const { pool } = require('../config/db');
const { redisClient } = require('../config/redis');
const Log = require('../models/Log');

async function bookSlot(req, res, next) {
  const { slotId } = req.body;
  const userId = req.user.id;
  
  if (!slotId) return res.status(400).json({ success: false, message: 'slotId is required' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock the slot row
    const slotRes = await client.query('SELECT capacity, booked_count FROM slots WHERE id = $1 FOR UPDATE', [slotId]);
    if (slotRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    const { capacity, booked_count } = slotRes.rows[0];

    // 2. Check capacity
    if (booked_count >= capacity) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Slot is full' });
    }

    // 3. Create booking, duplicate check is handled by unique index
    let bookingRes;
    try {
      bookingRes = await client.query(
        "INSERT INTO bookings (user_id, slot_id, status) VALUES ($1, $2, 'ACTIVE') RETURNING id",
        [userId, slotId]
      );
    } catch (err) {
      if (err.code === '23505') { // Unique constraint violation
        await client.query('ROLLBACK');
        return res.status(409).json({ success: false, message: 'You have already booked this slot' });
      }
      throw err;
    }

    // 4. Update slot count
    await client.query('UPDATE slots SET booked_count = booked_count + 1 WHERE id = $1', [slotId]);

    // 5. Commit transaction
    await client.query('COMMIT');

    // Invalid cache
    await redisClient.del('slots:all');
    await redisClient.del(`slots:${slotId}`);

    // Log in Mongo
    await Log.create({ userId, action: 'BOOK_SLOT', slotId, bookingId: bookingRes.rows[0].id });

    res.status(201).json({ success: true, message: 'Booking successful' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

async function cancelBooking(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the booking row
    const bookingRes = await client.query(
      "SELECT slot_id, status FROM bookings WHERE id = $1 AND user_id = $2 FOR UPDATE",
      [id, userId]
    );

    if (bookingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found or not yours' });
    }

    const { slot_id, status } = bookingRes.rows[0];
    if (status !== 'ACTIVE') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Booking is already cancelled' });
    }

    // Update booking
    await client.query(
      "UPDATE bookings SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP WHERE id = $1",
      [id]
    );

    // Lock and update slot
    await client.query('SELECT id FROM slots WHERE id = $1 FOR UPDATE', [slot_id]);
    await client.query('UPDATE slots SET booked_count = booked_count - 1 WHERE id = $1', [slot_id]);

    await client.query('COMMIT');

    // Invalidate cache
    await redisClient.del('slots:all');
    await redisClient.del(`slots:${slot_id}`);

    // Log
    await Log.create({ userId, action: 'CANCEL_BOOKING', slotId: slot_id, bookingId: id });

    res.json({ success: true, message: 'Booking cancelled' });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
}

async function getMyBookings(req, res, next) {
  const userId = req.user.id;
  try {
    const result = await pool.query(
      `SELECT b.id, b.status, b.created_at, s.date, s.start_time, s.end_time 
       FROM bookings b 
       JOIN slots s ON b.slot_id = s.id 
       WHERE b.user_id = $1 
       ORDER BY b.created_at DESC`,
      [userId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
}

module.exports = { bookSlot, cancelBooking, getMyBookings };
