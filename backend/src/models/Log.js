const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  userId: { type: String, required: false },
  action: { type: String, required: true },
  slotId: { type: String, required: false },
  bookingId: { type: String, required: false },
  timestamp: { type: Date, default: Date.now },
  metadata: { type: mongoose.Schema.Types.Mixed }
});

module.exports = mongoose.model('Log', logSchema);
