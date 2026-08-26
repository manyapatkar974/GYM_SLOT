const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { bookSlot, cancelBooking, getMyBookings } = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateBookingRequest } = require('../middleware/validationMiddleware');

// Redis-compatible write rate limiter for booking endpoints
const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many booking attempts from this IP. Please try again after 1 minute.',
  },
});

// Protect all booking endpoints
router.use(authMiddleware);

router.post('/', bookingLimiter, validateBookingRequest, bookSlot);
router.get('/my', getMyBookings);
router.delete('/:id', cancelBooking);

module.exports = router;
