const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  industry: { type: String, default: 'General' },
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);
