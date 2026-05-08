const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    businessId: { type: mongoose.Schema.Types.ObjectId, ref: 'Business', required: true, unique: true, index: true },
    updatedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    fraudThreshold: { type: Number, default: 75, min: 0, max: 100 },
    reviewThreshold: { type: Number, default: 40, min: 0, max: 100 },
    churnThreshold: { type: Number, default: 75, min: 0, max: 100 },

    notificationRules: {
      alertOnFraudVerdict: { type: Boolean, default: true },
      dailyDigestEmail: { type: Boolean, default: true },
      slackWebhookOnHighRisk: { type: Boolean, default: false },
    },

    overrideRules: {
      blockTransactionsOver: { type: Number, default: 5000 },
      allowChipMatch: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);

