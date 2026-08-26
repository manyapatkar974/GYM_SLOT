const express = require('express');
const router = express.Router();
const { getSlots, getSlotById } = require('../controllers/slotController');

router.get('/', getSlots);
router.get('/:id', getSlotById);

module.exports = router;
