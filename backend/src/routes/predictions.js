const router = require('express').Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const Alert = require('../models/Alert');

// GET /api/predictions  — list with optional filters
router.get('/', auth, async (req, res) => {
  try {
    const { model_type, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (model_type) filter.model_type = model_type;

    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Prediction.countDocuments(filter);
    res.json({ predictions, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/predictions/stats  — dashboard summary cards
router.get('/stats', auth, async (req, res) => {
  try {
    const total      = await Prediction.countDocuments();
    const anomalies  = await Prediction.countDocuments({ anomaly_flag: true });
    const withFeedback = await Prediction.countDocuments({ correct: { $ne: null } });
    const correct    = await Prediction.countDocuments({ correct: true });

    const accuracy = withFeedback > 0 ? Math.round((correct / withFeedback) * 100) : null;

    const modelCounts = await Prediction.aggregate([
      { $group: { _id: '$model_type', count: { $sum: 1 } } },
    ]);

    res.json({ total, anomalies, accuracy, active_models: modelCounts.length, model_counts: modelCounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/predictions/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const p = await Prediction.findById(req.params.id);
    if (!p) return res.status(404).json({ error: 'Prediction not found' });
    res.json(p);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/predictions/feedback/:id  — thumbs up/down
router.post('/feedback/:id', auth, async (req, res) => {
  try {
    const { correct } = req.body;
    if (typeof correct !== 'boolean')
      return res.status(400).json({ error: 'correct must be a boolean' });

    const p = await Prediction.findByIdAndUpdate(
      req.params.id,
      { correct, feedback_at: new Date() },
      { new: true }
    );
    if (!p) return res.status(404).json({ error: 'Prediction not found' });
    res.json({ status: 'ok', prediction: p });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
