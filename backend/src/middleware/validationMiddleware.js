const ApiError = require('../utils/apiError');

/**
 * Validation helper middleware for input sanitization and verification.
 */
const validateRegister = (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    throw ApiError.badRequest('Name is required and must be at least 2 characters long');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    throw ApiError.badRequest('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    throw ApiError.badRequest('Password is required and must be at least 6 characters long');
  }

  req.body.name = name.trim();
  req.body.email = email.trim().toLowerCase();
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw ApiError.badRequest('Both email and password are required');
  }

  req.body.email = email.trim().toLowerCase();
  next();
};

const validateBookingRequest = (req, res, next) => {
  const { slotId } = req.body;

  if (!slotId || typeof slotId !== 'string') {
    throw ApiError.badRequest('slotId is required and must be a valid identifier');
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  validateBookingRequest,
};
