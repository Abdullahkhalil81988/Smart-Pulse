const router = require('express').Router();
const auth = require('../middleware/auth');
const Business = require('../models/Business');
const User = require('../models/User');

// GET /api/businesses — return only the authenticated user's linked business
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('businessId');
    res.json(user.businessId ? [user.businessId] : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/businesses/:id — only if the user owns it
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.businessId || user.businessId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const business = await Business.findById(req.params.id);
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/businesses
router.post('/', auth, async (req, res) => {
  try {
    const { name, industry } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const business = await Business.create({ name, industry });

    // link business to the creating user
    await User.findByIdAndUpdate(req.user.id, { businessId: business._id });

    res.status(201).json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/businesses/:id — only if the user owns it
router.patch('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user.businessId || user.businessId.toString() !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const business = await Business.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!business) return res.status(404).json({ error: 'Business not found' });
    res.json(business);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
