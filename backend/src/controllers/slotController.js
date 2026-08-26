const SlotService = require('../services/slotService');
const ApiResponse = require('../utils/apiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * Retrieves all gym slots.
 * Route: GET /api/slots
 */
const getSlots = asyncHandler(async (req, res) => {
  const slots = await SlotService.getAllSlots();
  return ApiResponse.success(res, 'Gym slots fetched successfully', slots);
});

/**
 * Retrieves a single gym slot by ID.
 * Route: GET /api/slots/:id
 */
const getSlotById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const slot = await SlotService.getSlotById(id);
  return ApiResponse.success(res, 'Gym slot fetched successfully', slot);
});

module.exports = {
  getSlots,
  getSlotById,
};
