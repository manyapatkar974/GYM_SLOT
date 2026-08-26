const Log = require('../models/Log');

/**
 * Service to handle asynchronous audit and activity logging in MongoDB.
 * Ensures logging operations are non-blocking and fail-safe.
 */
class LogService {
  /**
   * Records a user activity event.
   * 
   * @param {Object} logParams
   * @param {string} [logParams.userId] - ID of the user performing the action
   * @param {string} logParams.action - Action identifier from AUDIT_ACTIONS
   * @param {string} [logParams.slotId] - Affected slot ID
   * @param {string} [logParams.bookingId] - Generated or affected booking ID
   * @param {Object} [logParams.metadata] - Optional supplementary context
   */
  static async recordActivity({ userId, action, slotId = null, bookingId = null, metadata = {} }) {
    try {
      await Log.create({
        userId,
        action,
        slotId,
        bookingId,
        metadata,
        timestamp: new Date(),
      });
    } catch (err) {
      // Non-blocking: Audit failure should not terminate user transaction
      console.warn(`[LogService Warning] Failed to persist activity log for action ${action}:`, err.message);
    }
  }
}

module.exports = LogService;
