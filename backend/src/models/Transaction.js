const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  billNo: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    default: 'Guest'
  },
  items: [{
    code: String,
    name: String,
    category: String,
    price: Number,
    qty: Number
  }],
  subtotal: {
    type: Number,
    required: true
  },
  discountPct: {
    type: Number,
    default: 0
  },
  discountAmt: {
    type: Number,
    default: 0
  },
  tax: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['Card', 'Tap', 'Cash', 'Invoice'],
    required: true
  },
  note: String,
  status: {
    type: String,
    default: 'Completed'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Transaction', TransactionSchema);
