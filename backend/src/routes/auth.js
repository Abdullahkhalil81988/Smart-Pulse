const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Business = require('../models/Business');

// POST /api/auth/sync
// Called by the frontend after Firebase sign-up or sign-in.
// The Firebase ID token is verified by the auth middleware,
// which auto-creates the user if needed.  This endpoint
// returns the MongoDB user document (and optionally links a business).
router.post('/sync', auth, async (req, res) => {
  try {
    const { businessName, industry } = req.body || {};
    let user = await User.findById(req.user.id).populate('businessId');

    // If a business name was provided (registration flow) and the user
    // doesn't have one yet, create and link it.
    if (businessName && !user.businessId) {
      const business = await Business.create({
        name: businessName,
        industry: industry || 'General',
      });
      user.businessId = business._id;
      await user.save();
      user = await User.findById(user._id).populate('businessId');
    }

    res.json({
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        business: user.businessId || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me  — fetch the current user profile
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('businessId');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        name: user.name,
        email: user.email,
        business: user.businessId || null,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
