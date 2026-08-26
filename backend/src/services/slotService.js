const { pool } = require('../config/db');
const { redisClient } = require('../config/redis');
const { REDIS_KEYS } = require('../constants');
const ApiError = require('../utils/apiError');

const CACHE_TTL_SECONDS = 60;

/**
 * Service managing gym slot queries and Redis caching layer.
 */
class SlotService {
  /**
   * Fetches all scheduled slots, utilizing Redis caching with automatic failover.
   */
  static async getAllSlots() {
    const cacheKey = REDIS_KEYS.SLOTS_ALL;

    // 1. Attempt Cache Retrieval
    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning] Failed to read from cache, falling back to PostgreSQL:', cacheErr.message);
    }

    // 2. Query Source of Truth (PostgreSQL)
    const result = await pool.query(
      `SELECT id, date, start_time, end_time, capacity, booked_count, 
              (capacity - booked_count) AS available_count,
              created_at
       FROM slots 
       ORDER BY date ASC, start_time ASC`
    );

    const slots = result.rows;

    // 3. Populate Redis Cache
    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(slots));
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning] Failed to set cache:', cacheErr.message);
    }

    return slots;
  }

  /**
   * Fetches a single slot by ID.
   */
  static async getSlotById(slotId) {
    const cacheKey = REDIS_KEYS.SLOT_BY_ID(slotId);

    try {
      if (redisClient.isOpen) {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning] Single slot cache read failed:', cacheErr.message);
    }

    const result = await pool.query(
      `SELECT id, date, start_time, end_time, capacity, booked_count, 
              (capacity - booked_count) AS available_count
       FROM slots 
       WHERE id = $1`,
      [slotId]
    );

    if (result.rows.length === 0) {
      throw ApiError.notFound('Gym slot not found');
    }

    const slot = result.rows[0];

    try {
      if (redisClient.isOpen) {
        await redisClient.setEx(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(slot));
      }
    } catch (cacheErr) {
      console.warn('[Redis Cache Warning] Single slot cache set failed:', cacheErr.message);
    }

    return slot;
  }

  /**
   * Invalidates slot caches upon mutation events (booking or cancellation).
   */
  static async invalidateSlotCache(slotId = null) {
    try {
      if (!redisClient.isOpen) return;

      const keysToDelete = [REDIS_KEYS.SLOTS_ALL];
      if (slotId) {
        keysToDelete.push(REDIS_KEYS.SLOT_BY_ID(slotId));
      }

      await redisClient.del(keysToDelete);
    } catch (err) {
      console.warn('[Redis Invalidation Warning] Failed to invalidate cache keys:', err.message);
    }
  }
}

module.exports = SlotService;
