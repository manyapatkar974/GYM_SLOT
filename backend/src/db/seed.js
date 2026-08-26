require('dotenv').config();
const { pool } = require('../config/db');

async function seedDB() {
  try {
    // Clear slots
    await pool.query('DELETE FROM slots');

    const slots = [
      { start: '06:00:00', end: '07:00:00' },
      { start: '07:00:00', end: '08:00:00' },
      { start: '08:00:00', end: '09:00:00' },
      { start: '17:00:00', end: '18:00:00' },
      { start: '18:00:00', end: '19:00:00' },
      { start: '19:00:00', end: '20:00:00' },
    ];

    const today = new Date().toISOString().split('T')[0];

    for (const slot of slots) {
      await pool.query(
        'INSERT INTO slots (date, start_time, end_time, capacity, booked_count) VALUES ($1, $2, $3, $4, $5)',
        [today, slot.start, slot.end, 10, 0]
      );
    }
    
    console.log("Database seeded successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
}

seedDB();
