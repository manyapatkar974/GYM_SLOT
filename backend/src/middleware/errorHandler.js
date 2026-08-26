const ApiError = require('../utils/apiError');
const { HTTP_STATUS } = require('../constants');

/**
 * Centralized Application Error Middleware.
 * Standardizes error responses across all routes and protects internal trace logs in production.
 */
function errorHandler(err, req, res, next) {
  let error = err;

  // Transform PostgreSQL Unique Violation errors
  if (err.code === '23505') {
    const detail = err.detail || 'Unique constraint violation';
    error = ApiError.conflict(`Duplicate entry: ${detail}`);
  }

  // Transform PostgreSQL Invalid UUID / Type errors
  if (err.code === '22P02') {
    error = ApiError.badRequest('Invalid parameter format provided');
  }

  // Transform JWT verification errors
  if (err.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid authentication token');
  }
  if (err.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Authentication token has expired. Please login again.');
  }

  // Fallback for unexpected runtime exceptions
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = error.message || 'An unexpected internal error occurred';
    error = new ApiError(statusCode, message, [], err.stack);
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  if (error.statusCode >= 500) {
    console.error(`[ERROR 500] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(error.statusCode).json(response);
}

module.exports = { errorHandler };
