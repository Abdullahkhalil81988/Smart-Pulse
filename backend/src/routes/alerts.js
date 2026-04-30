const router = require('express').Router();
const auth = require('../middleware/auth');
const Alert = require('../models/Alert');

// GET /api/alerts
router.get('/', auth, async (req, res) => {
  try {
    const { unread, limit = 20 } = req.query;
    const filter = {};
    if (unread === 'true') filter.read = false;

    const alerts = await Alert.find(filter).sort({ createdAt: -1 }).limit(Number(limit));
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/:id/read
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const alert = await Alert.findByIdAndUpdate(req.params.id, { read: true }, { new: true });
    if (!alert) return res.status(404).json({ error: 'Alert not found' });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/alerts/read-all  — mark all as read
router.patch('/read-all', auth, async (req, res) => {
  try {
    await Alert.updateMany({ read: false }, { read: true });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
