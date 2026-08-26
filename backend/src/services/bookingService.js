const { pool } = require('../config/db');
const ApiError = require('../utils/apiError');
const SlotService = require('./slotService');
const LogService = require('./logService');
const { AUDIT_ACTIONS, BOOKING_STATUS } = require('../constants');

/**
 * Service managing core reservation flows and concurrency-safe PostgreSQL transactions.
 */
class BookingService {
  /**
   * Executes a concurrency-safe booking transaction using PostgreSQL Row-Level Locking (`FOR UPDATE`).
   * 
   * @param {string} userId - UUID of the authenticated user
   * @param {string} slotId - UUID of the desired slot
   * @returns {Promise<Object>} Created booking record
   */
  static async bookSlot(userId, slotId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Exclusive Row-Level Lock on the target slot
      const slotQuery = await client.query(
        `SELECT id, date, start_time, end_time, capacity, booked_count 
         FROM slots 
         WHERE id = $1 
         FOR UPDATE`,
        [slotId]
      );

      if (slotQuery.rows.length === 0) {
        throw ApiError.notFound('Requested gym slot does not exist');
      }

      const slot = slotQuery.rows[0];

      // 2. Strict Capacity Check inside locked state
      if (slot.booked_count >= slot.capacity) {
        throw ApiError.conflict('This gym slot has reached maximum capacity (10/10)');
      }

      // 3. Insert Active Booking (Enforced by partial unique index against duplicate active bookings)
      let bookingResult;
      try {
        bookingResult = await client.query(
          `INSERT INTO bookings (user_id, slot_id, status) 
           VALUES ($1, $2, $3) 
           RETURNING id, user_id, slot_id, status, created_at`,
          [userId, slotId, BOOKING_STATUS.ACTIVE]
        );
      } catch (dbErr) {
        if (dbErr.code === '23505') {
          throw ApiError.conflict('You already hold an active reservation for this slot');
        }
        throw dbErr;
      }

      const booking = bookingResult.rows[0];

      // 4. Safely increment slot booked count
      await client.query(
        `UPDATE slots 
         SET booked_count = booked_count + 1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [slotId]
      );

      // 5. Commit Transaction
      await client.query('COMMIT');

      // 6. Invalidate Cache & Write Audit Log
      await SlotService.invalidateSlotCache(slotId);
      LogService.recordActivity({
        userId,
        action: AUDIT_ACTIONS.BOOK_SLOT,
        slotId,
        bookingId: booking.id,
      });

      return booking;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancels an active booking safely, restores slot capacity, and invalidates cache.
   * 
   * @param {string} userId - UUID of authenticated user
   * @param {string} bookingId - UUID of booking to cancel
   */
  static async cancelBooking(userId, bookingId) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Lock the booking row for update
      const bookingQuery = await client.query(
        `SELECT id, slot_id, status 
         FROM bookings 
         WHERE id = $1 AND user_id = $2 
         FOR UPDATE`,
        [bookingId, userId]
      );

      if (bookingQuery.rows.length === 0) {
        throw ApiError.notFound('Booking not found or not owned by the current user');
      }

      const booking = bookingQuery.rows[0];

      if (booking.status !== BOOKING_STATUS.ACTIVE) {
        throw ApiError.badRequest('This booking is already cancelled');
      }

      // 2. Mark booking as cancelled
      await client.query(
        `UPDATE bookings 
         SET status = $1, cancelled_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [BOOKING_STATUS.CANCELLED, bookingId]
      );

      // 3. Lock slot row and decrement booked count
      await client.query('SELECT id FROM slots WHERE id = $1 FOR UPDATE', [booking.slot_id]);
      await client.query(
        `UPDATE slots 
         SET booked_count = GREATEST(booked_count - 1, 0), updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [booking.slot_id]
      );

      // 4. Commit Transaction
      await client.query('COMMIT');

      // 5. Invalidate Cache & Write Audit Log
      await SlotService.invalidateSlotCache(booking.slot_id);
      LogService.recordActivity({
        userId,
        action: AUDIT_ACTIONS.CANCEL_BOOKING,
        slotId: booking.slot_id,
        bookingId,
      });

      return { bookingId, status: BOOKING_STATUS.CANCELLED };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Retrieves all reservations made by the authenticated user.
   */
  static async getUserBookings(userId) {
    const result = await pool.query(
      `SELECT b.id, b.status, b.created_at, b.cancelled_at,
              s.id AS slot_id, s.date, s.start_time, s.end_time, s.capacity
       FROM bookings b 
       JOIN slots s ON b.slot_id = s.id 
       WHERE b.user_id = $1 
       ORDER BY b.created_at DESC`,
      [userId]
    );

    return result.rows;
  }
}

module.exports = BookingService;
