const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const ApiError = require('../utils/apiError');
const LogService = require('./logService');
const { AUDIT_ACTIONS } = require('../constants');

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '24h';

/**
 * Authentication and User Identity Service.
 */
class AuthService {
  /**
   * Registers a new user with hashed password and returns credentials.
   */
  static async registerUser(name, email, plainPassword) {
    // 1. Check email uniqueness
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      throw ApiError.conflict('An account with this email address already exists');
    }

    // 2. Hash password
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const passwordHash = await bcrypt.hash(plainPassword, salt);

    // 3. Persist user
    const insertResult = await pool.query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email, created_at`,
      [name, email, passwordHash]
    );

    const user = insertResult.rows[0];

    // 4. Generate JWT
    const token = this.generateToken(user);

    // 5. Asynchronous Audit Log
    LogService.recordActivity({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_REGISTER,
      metadata: { email: user.email },
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  /**
   * Authenticates user credentials and returns JWT token.
   */
  static async loginUser(email, plainPassword) {
    // 1. Fetch user record
    const result = await pool.query(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    const user = result.rows[0];

    // 2. Verify password hash
    const isMatch = await bcrypt.compare(plainPassword, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // 3. Generate JWT
    const token = this.generateToken(user);

    // 4. Asynchronous Audit Log
    LogService.recordActivity({
      userId: user.id,
      action: AUDIT_ACTIONS.USER_LOGIN,
    });

    return { token, user: { id: user.id, name: user.name, email: user.email } };
  }

  /**
   * Helper to sign JWT tokens.
   */
  static generateToken(user) {
    const secret = process.env.JWT_SECRET || 'secret';
    return jwt.sign(
      { id: user.id, email: user.email, name: user.name },
      secret,
      { expiresIn: JWT_EXPIRY }
    );
  }
}

module.exports = AuthService;
