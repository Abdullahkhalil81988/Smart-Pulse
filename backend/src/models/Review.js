const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviews_sent: { type: Number, required: true },
  predictions: { type: Array, required: true },
  summary: {
    count:                { type: Number },
    average_stars:        { type: Number },
    sentiment_distribution: {
      positive: { type: Number },
      neutral:  { type: Number },
      negative: { type: Number },
    },
    total_latency_ms: { type: Number },
  },
}, { timestamps: true });

module.exports = mongoose.model('Review', reviewSchema);
