const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'gym_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'gym_db',
  password: process.env.POSTGRES_PASSWORD || 'gym_password',
  port: process.env.POSTGRES_PORT || 5432,
});

module.exports = { pool };
