const router = require('express').Router();
const auth = require('../middleware/auth');
const Review = require('../models/Review');

const REVIEWROUTE_URL = 'https://reviewroute-backend.onrender.com/predict/batch';
const REVIEWROUTE_API_KEY = process.env.REVIEWROUTE_API_KEY;

// POST /api/reviews/analyze
router.post('/analyze', auth, async (req, res) => {
  try {
    const { reviews } = req.body;

    console.log(`[reviews] analyze user=${req.user.id} count=${Array.isArray(reviews) ? reviews.length : 0}`);

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

    console.log(`[reviews] upstream status=${maasRes.status}`);

    if (!maasRes.ok) {
      const err = await maasRes.json().catch(() => ({ detail: 'ReviewRoute API error' }));
      console.warn(`[reviews] upstream error detail=${JSON.stringify(err)}`);
      return res.status(maasRes.status).json(err);
    }

    const { predictions, summary } = await maasRes.json();

    const saved = await Review.create({
      userId:        req.user.id,
      reviews_sent:  reviews.length,
      predictions,
      summary,
    });

    console.log(`[reviews] saved batch id=${saved._id} predictions=${predictions.length}`);

    req.app.get('broadcast')?.({ type: 'review_analysis', review: saved });

    res.json({ _id: saved._id, predictions, summary });
  } catch (err) {
    console.error(`[reviews] analyze failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 20, page = 1 } = req.query;
    console.log(`[reviews] list user=${req.user.id} limit=${limit} page=${page}`);
    const reviews = await Review.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Review.countDocuments({ userId: req.user.id });
    res.json({ reviews, total, page: Number(page) });
  } catch (err) {
    console.error(`[reviews] list failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviews/:id — with ownership check
router.get('/:id', auth, async (req, res) => {
  try {
    console.log(`[reviews] detail user=${req.user.id} review_id=${req.params.id}`);
    const review = await Review.findOne({ _id: req.params.id, userId: req.user.id });
    if (!review) return res.status(404).json({ error: 'Review analysis not found' });
    res.json(review);
  } catch (err) {
    console.error(`[reviews] detail failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
