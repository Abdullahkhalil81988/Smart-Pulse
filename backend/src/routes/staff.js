const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// GET /api/staff
// Returns users linked to the same business as the current user.
router.get('/', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me?.businessId) return res.json({ members: [] });

    const members = await User.find({ businessId: me.businessId })
      .sort({ createdAt: 1 })
      .select('_id name email role status createdAt');

    res.json({ members });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/staff/invite
// Creates an "Invited" user stub linked to the business.
router.post('/invite', auth, async (req, res) => {
  try {
    const { email, name, role } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email is required' });

    const me = await User.findById(req.user.id);
    if (!me?.businessId) return res.status(400).json({ error: 'Business not set for user' });

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: 'User with this email already exists' });

    const invited = await User.create({
      firebaseUid: `invited:${me.businessId.toString()}:${String(email).toLowerCase()}`,
      email: String(email).toLowerCase(),
      name: name || email,
      businessId: me.businessId,
      role: role || 'Cashier',
      status: 'Invited',
    });

    res.status(201).json({ member: invited });
  } catch (err) {
    // firebaseUid uniqueness could collide on re-invites
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/staff/:id
// Update role/status for a member in the same business.
router.patch('/:id', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me?.businessId) return res.status(400).json({ error: 'Business not set for user' });

    const { role, status } = req.body || {};
    const member = await User.findOneAndUpdate(
      { _id: req.params.id, businessId: me.businessId },
      { ...(role ? { role } : {}), ...(status ? { status } : {}) },
      { new: true, runValidators: true }
    ).select('_id name email role status createdAt');

    if (!member) return res.status(404).json({ error: 'Member not found' });
    res.json({ member });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/staff/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id);
    if (!me?.businessId) return res.status(400).json({ error: 'Business not set for user' });
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: 'You cannot delete yourself' });
    }

    const deleted = await User.findOneAndDelete({ _id: req.params.id, businessId: me.businessId });
    if (!deleted) return res.status(404).json({ error: 'Member not found' });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

