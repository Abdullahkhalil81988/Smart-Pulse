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
// Creates a user in Firebase and links them to the business.
router.post('/invite', auth, async (req, res) => {
  try {
    const { email, password, name, role } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password are required' });

    const me = await User.findById(req.user.id);
    if (!me?.businessId) return res.status(400).json({ error: 'Business not set for user' });

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return res.status(400).json({ error: 'User with this email already exists' });

    const admin = require('../firebase-config');
    const firebaseUser = await admin.auth().createUser({
      email: String(email).toLowerCase(),
      password: password,
      displayName: name || email,
    });

    const newStaff = await User.create({
      firebaseUid: firebaseUser.uid,
      email: String(email).toLowerCase(),
      name: name || email,
      businessId: me.businessId,
      role: role || 'Cashier',
      status: 'Active',
    });

    res.status(201).json({ member: newStaff });
  } catch (err) {
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

    const targetUser = await User.findOne({ _id: req.params.id, businessId: me.businessId });
    if (!targetUser) return res.status(404).json({ error: 'Member not found' });

    if (targetUser.firebaseUid && !targetUser.firebaseUid.startsWith('invited:')) {
      const admin = require('../firebase-config');
      try {
        await admin.auth().deleteUser(targetUser.firebaseUid);
      } catch (fbErr) {
        console.error("Failed to delete Firebase user:", fbErr.message);
      }
    }

    await User.deleteOne({ _id: targetUser._id });
    res.json({ status: 'ok' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

