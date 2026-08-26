const express = require('express');
const router = express.Router();
const { bookSlot, cancelBooking, getMyBookings } = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const rateLimit = require('express-rate-limit');

const bookingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10,
  message: { success: false, message: 'Too many booking requests, please try again later.' }
});

router.use(authMiddleware);

router.post('/', bookingLimiter, bookSlot);
router.get('/my', getMyBookings);
router.delete('/:id', cancelBooking);

module.exports = router;
