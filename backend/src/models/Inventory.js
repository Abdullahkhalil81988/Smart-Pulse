const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  code: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    default: 'Uncategorized',
  },
  price: {
    type: Number,
    default: 0,
  },
  stock: {
    type: Number,
    default: 0,
  },
  lowThreshold: {
    type: Number,
    default: 10,
  },
  unit: {
    type: String,
    default: 'pcs',
  },
}, { timestamps: true });

// Ensure unique item code per user
inventorySchema.index({ userId: 1, code: 1 }, { unique: true });

module.exports = mongoose.model('Inventory', inventorySchema);
