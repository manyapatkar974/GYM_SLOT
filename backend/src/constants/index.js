/**
 * Application Constants
 * Standardized status codes, error messages, and system actions.
 */

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
});

const AUDIT_ACTIONS = Object.freeze({
  USER_REGISTER: 'USER_REGISTER',
  USER_LOGIN: 'USER_LOGIN',
  BOOK_SLOT: 'BOOK_SLOT',
  CANCEL_BOOKING: 'CANCEL_BOOKING',
});

const BOOKING_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
});

const REDIS_KEYS = Object.freeze({
  SLOTS_ALL: 'slots:all',
  SLOT_BY_ID: (id) => `slots:${id}`,
});

module.exports = {
  HTTP_STATUS,
  AUDIT_ACTIONS,
  BOOKING_STATUS,
  REDIS_KEYS,
};
