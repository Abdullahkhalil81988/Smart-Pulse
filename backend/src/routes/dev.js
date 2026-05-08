const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Business = require('../models/Business');
const User = require('../models/User');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const Prediction = require('../models/Prediction');
const Alert = require('../models/Alert');
const Settings = require('../models/Settings');

function isDevEnabled() {
  const env = (process.env.APP_ENV || process.env.NODE_ENV || '').toLowerCase();
  if (process.env.ENABLE_DEV_ROUTES === 'true') return true;
  return env === 'development' || env === 'dev';
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// POST /api/dev/seed
// Seeds realistic demo data for the *current authenticated user*.
router.post('/seed', auth, async (req, res) => {
  if (!isDevEnabled()) return res.status(403).json({ error: 'Dev routes are disabled' });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      inventoryItems = 24,
      transactions = 60,
      daysBack = 30,
      wipe = false,
    } = req.body || {};

    const user = await User.findById(req.user.id).session(session);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // ensure business exists
    if (!user.businessId) {
      const business = await Business.create([{
        name: `${user.name}'s Demo Business`,
        industry: 'Retail',
      }], { session });
      user.businessId = business[0]._id;
      await user.save({ session });
    }

    // ensure settings exists
    await Settings.findOneAndUpdate(
      { businessId: user.businessId },
      { $setOnInsert: { businessId: user.businessId, updatedByUserId: user._id } },
      { upsert: true, new: true, session }
    );

    if (wipe) {
      await Promise.all([
        Inventory.deleteMany({ userId: user._id }).session(session),
        Transaction.deleteMany({ userId: user._id }).session(session),
        Prediction.deleteMany({ userId: user._id }).session(session),
        Alert.deleteMany({ userId: user._id }).session(session),
      ]);
    }

    // seed inventory
    const categories = ['Coffee', 'Food', 'Drinks', 'Snacks'];
    const productNames = {
      Coffee: ['Latte', 'Cappuccino', 'Americano', 'Mocha', 'Espresso', 'Macchiato'],
      Food: ['Croissant', 'Muffin', 'Bagel', 'Sandwich', 'Salad', 'Brownie'],
      Drinks: ['Iced Tea', 'Lemonade', 'Sparkling Water', 'Orange Juice', 'Cola', 'Smoothie'],
      Snacks: ['Cookie', 'Chips', 'Chocolate Bar', 'Granola', 'Nuts', 'Protein Bar'],
    };

    const invDocs = [];
    const invCount = Math.min(200, Math.max(1, Number(inventoryItems) || 24));
    for (let i = 0; i < invCount; i += 1) {
      const category = pick(categories);
      const name = pick(productNames[category]);
      const code = `${category.slice(0, 3).toUpperCase()}-${String(i + 1).padStart(3, '0')}`;
      const price = round2(1.5 + Math.random() * 8.5);
      const stock = Math.floor(Math.random() * 90);
      const lowThreshold = 10;
      invDocs.push({
        userId: user._id,
        code,
        name,
        category,
        price,
        stock,
        lowThreshold,
        unit: 'pcs',
      });
    }

    // insertMany unordered (skip duplicates if already seeded)
    if (invDocs.length) {
      try {
        await Inventory.insertMany(invDocs, { ordered: false, session });
      } catch (e) {
        // ignore dup key errors when reseeding
      }
    }

    const inventory = await Inventory.find({ userId: user._id }).session(session);
    if (inventory.length === 0) {
      throw new Error('Inventory seeding failed (no inventory rows found).');
    }

    // seed transactions
    const customerNames = [
      'Maria Santos',
      'Bob Tanner',
      'Dave Patterson',
      'Carol Meyer',
      'Alice Chen',
      'Frank Bell',
      'Priya Nair',
      'Sam Lee',
    ];
    const paymentMethods = ['Card', 'Tap', 'Cash', 'Invoice'];
    const txnCount = Math.min(500, Math.max(1, Number(transactions) || 60));
    const daysBackNum = Math.min(365, Math.max(1, Number(daysBack) || 30));

    const txnDocs = [];
    for (let i = 0; i < txnCount; i += 1) {
      const itemCount = 1 + Math.floor(Math.random() * 5);
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < itemCount; j += 1) {
        const p = pick(inventory);
        const qty = 1 + Math.floor(Math.random() * 3);
        items.push({
          code: p.code,
          name: p.name,
          category: p.category,
          price: p.price,
          qty,
        });
        subtotal += p.price * qty;
      }

      const discountPct = Math.random() < 0.2 ? [5, 10, 15][Math.floor(Math.random() * 3)] : 0;
      const discountAmt = subtotal * (discountPct / 100);
      const afterDisc = subtotal - discountAmt;
      const tax = afterDisc * 0.08;
      const total = afterDisc + tax;

      const daysAgo = Math.floor(Math.random() * daysBackNum);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      const pm = pick(paymentMethods);
      const status = pm === 'Invoice' ? (Math.random() < 0.65 ? 'Pending' : 'Completed') : 'Completed';

      txnDocs.push({
        userId: user._id,
        billNo: String(i + 1),
        customerName: Math.random() < 0.15 ? 'Guest' : pick(customerNames),
        items,
        subtotal: round2(subtotal),
        discountPct,
        discountAmt: round2(discountAmt),
        tax: round2(tax),
        total: round2(total),
        paymentMethod: pm,
        status,
        note: '',
        createdAt,
        updatedAt: createdAt,
      });
    }
    await Transaction.insertMany(txnDocs, { session });

    // seed a few predictions + alerts so dashboard isn't empty
    const predDocs = [];
    for (let i = 0; i < 10; i += 1) {
      predDocs.push({
        userId: user._id,
        businessId: user.businessId,
        model_name: pick(['forecaster_v1', 'anomaly_v1', 'classifier_v2']),
        model_type: pick(['forecaster', 'anomaly', 'classifier']),
        prediction: round2(Math.random() * 1000),
        confidence: round2(0.5 + Math.random() * 0.5),
        anomaly_flag: Math.random() < 0.2,
        timestamp: new Date().toISOString(),
      });
    }
    await Prediction.insertMany(predDocs, { session });

    const alertDocs = [
      {
        userId: user._id,
        businessId: user.businessId,
        type: 'system',
        severity: 'low',
        message: 'Demo data seeded successfully.',
        read: false,
      },
    ];
    await Alert.insertMany(alertDocs, { session });

    // create a couple invited staff members (optional)
    const staffSeeds = [
      { name: 'Mark Torres', email: `mark.${user._id.toString().slice(-4)}@demo.local`, role: 'Manager' },
      { name: 'Sam Lee', email: `sam.${user._id.toString().slice(-4)}@demo.local`, role: 'Analyst' },
    ];
    for (const s of staffSeeds) {
      const exists = await User.findOne({ email: s.email }).session(session);
      if (!exists) {
        await User.create([{
          firebaseUid: `invited:${user.businessId.toString()}:${s.email}`,
          email: s.email,
          name: s.name,
          businessId: user.businessId,
          role: s.role,
          status: 'Invited',
        }], { session });
      }
    }

    await session.commitTransaction();
    res.json({
      status: 'ok',
      message: 'Seeded demo data for current user',
      counts: {
        inventory: invDocs.length,
        transactions: txnDocs.length,
        predictions: predDocs.length,
        alerts: alertDocs.length,
      },
    });
  } catch (err) {
    await session.abortTransaction();
    console.error(`[dev] seed failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  } finally {
    session.endSession();
  }
});

module.exports = router;

