/**
 * Higher-order wrapper for Express route handlers to capture uncaught async exceptions.
 * Eliminates repetitive try/catch blocks across controllers.
 * 
 * @param {Function} fn - Async express route handler function
 * @returns {Function} Express middleware handler
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
