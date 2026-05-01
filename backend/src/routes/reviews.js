const router = require('express').Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');

const REVIEWROUTE_URL = 'https://reviewroute-backend.onrender.com/predict/batch';
const REVIEWROUTE_API_KEY = process.env.REVIEWROUTE_API_KEY;

// POST /api/reviews/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { reviews } = req.body;

    if (!Array.isArray(reviews) || reviews.length === 0)
      return res.status(400).json({ error: 'reviews must be a non-empty array' });

    if (reviews.length > 500)
      return res.status(400).json({ error: 'maximum 500 reviews per batch' });

    for (const r of reviews) {
      if (!r.review_body || !r.product_category)
        return res.status(400).json({ error: 'each review must have review_body and product_category' });
    }

    const maasRes = await fetch(REVIEWROUTE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': REVIEWROUTE_API_KEY,
      },
      body: JSON.stringify({ reviews }),
    });

    if (!maasRes.ok) {
      const err = await maasRes.json().catch(() => ({ detail: 'ReviewRoute API error' }));
      return res.status(maasRes.status).json(err);
    }

    const { predictions, summary } = await maasRes.json();

    const saved = await Review.create({
      userId:        req.user.id,
      reviews_sent:  reviews.length,
      predictions,
      summary,
    });

    req.app.get('broadcast')?.({ type: 'review_analysis', review: saved });

    res.json({ _id: saved._id, predictions, summary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    const reviews = await Review.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Review.countDocuments({ userId: req.user.id });
    res.json({ reviews, total, page: Number(page) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review analysis not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
