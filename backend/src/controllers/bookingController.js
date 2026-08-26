const BookingService = require('../services/bookingService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Reserves a gym slot with concurrency protection.
 * Route: POST /api/bookings
 */
const bookSlot = asyncHandler(async (req, res) => {
  const { slotId } = req.body;
  const userId = req.user.id;

  const booking = await BookingService.bookSlot(userId, slotId);
  return ApiResponse.created(res, 'Slot booked successfully', booking);
});

/**
 * Cancels a user's active reservation.
 * Route: DELETE /api/bookings/:id
 */
const cancelBooking = asyncHandler(async (req, res) => {
  const { id: bookingId } = req.params;
  const userId = req.user.id;

  const result = await BookingService.cancelBooking(userId, bookingId);
  return ApiResponse.success(res, 'Booking cancelled successfully', result);
});

/**
 * Lists all reservations belonging to the authenticated user.
 * Route: GET /api/bookings/my
 */
const getMyBookings = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const bookings = await BookingService.getUserBookings(userId);
  return ApiResponse.success(res, 'User bookings retrieved successfully', bookings);
});

module.exports = {
  bookSlot,
  cancelBooking,
  getMyBookings,
};
