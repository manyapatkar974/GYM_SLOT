const { pool } = require('../config/db');
const { redisClient } = require('../config/redis');

async function getSlots(req, res, next) {
  try {
    const cacheKey = 'slots:all';
    const cachedSlots = await redisClient.get(cacheKey);

    if (cachedSlots) {
      return res.json({ success: true, data: JSON.parse(cachedSlots) });
    }

    const result = await pool.query('SELECT * FROM slots ORDER BY date, start_time');
    const slots = result.rows;

    await redisClient.setEx(cacheKey, 60, JSON.stringify(slots)); // 60s TTL

    res.json({ success: true, data: slots });
  } catch (error) {
    next(error);
  }
}

async function getSlotById(req, res, next) {
  try {
    const { id } = req.params;
    const cacheKey = `slots:${id}`;
    const cachedSlot = await redisClient.get(cacheKey);

    if (cachedSlot) {
      return res.json({ success: true, data: JSON.parse(cachedSlot) });
    }

    const result = await pool.query('SELECT * FROM slots WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Slot not found' });
    }

    const slot = result.rows[0];
    await redisClient.setEx(cacheKey, 60, JSON.stringify(slot));

    res.json({ success: true, data: slot });
  } catch (error) {
    next(error);
  }
}

module.exports = { getSlots, getSlotById };
