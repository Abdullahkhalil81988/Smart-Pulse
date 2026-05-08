const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Settings = require('../models/Settings');

async function requireBusiness(req) {
  const user = await User.findById(req.user.id);
  if (!user?.businessId) {
    const err = new Error('Business not set for user. Create/sync business first.');
    err.statusCode = 400;
    throw err;
  }
  return user.businessId;
}

// GET /api/settings
router.get('/', auth, async (req, res) => {
  try {
    const businessId = await requireBusiness(req);
    const settings =
      (await Settings.findOne({ businessId })) ||
      (await Settings.create({ businessId, updatedByUserId: req.user.id }));
    res.json(settings);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// PUT /api/settings
router.put('/', auth, async (req, res) => {
  try {
    const businessId = await requireBusiness(req);
    const {
      fraudThreshold,
      reviewThreshold,
      churnThreshold,
      notificationRules,
      overrideRules,
    } = req.body || {};

    const update = {
      updatedByUserId: req.user.id,
    };

    if (fraudThreshold != null) update.fraudThreshold = fraudThreshold;
    if (reviewThreshold != null) update.reviewThreshold = reviewThreshold;
    if (churnThreshold != null) update.churnThreshold = churnThreshold;

    if (notificationRules && typeof notificationRules === 'object') {
      update.notificationRules = {
        alertOnFraudVerdict:
          notificationRules.alertOnFraudVerdict ?? undefined,
        dailyDigestEmail: notificationRules.dailyDigestEmail ?? undefined,
        slackWebhookOnHighRisk:
          notificationRules.slackWebhookOnHighRisk ?? undefined,
      };
    }

    if (overrideRules && typeof overrideRules === 'object') {
      update.overrideRules = {
        blockTransactionsOver: overrideRules.blockTransactionsOver ?? undefined,
        allowChipMatch: overrideRules.allowChipMatch ?? undefined,
      };
    }

    // Ensure reviewThreshold < fraudThreshold if both exist
    const existing = await Settings.findOne({ businessId });
    const nextFraud = update.fraudThreshold ?? existing?.fraudThreshold ?? 75;
    const nextReview = update.reviewThreshold ?? existing?.reviewThreshold ?? 40;
    if (nextReview >= nextFraud) {
      return res.status(400).json({ error: 'reviewThreshold must be less than fraudThreshold' });
    }

    const settings = await Settings.findOneAndUpdate(
      { businessId },
      { $set: update, $setOnInsert: { businessId } },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(settings);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

module.exports = router;

