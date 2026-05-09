const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business' },
  type:       { type: String, required: true },
  severity:   { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  message:    { type: String, required: true },
  read:       { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);
