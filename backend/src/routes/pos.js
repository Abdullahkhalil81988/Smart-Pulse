const router = require('express').Router();
const auth = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');

// GET /api/pos/next-bill-no
router.get('/next-bill-no', auth, async (req, res) => {
  try {
    const count = await Transaction.countDocuments({ userId: req.user.id });
    res.json({ nextBillNo: count + 1 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/pos/checkout
// Finalizes a sale, updates inventory stock, and records the transaction.
router.post('/checkout', auth, async (req, res) => {
  try {
    const { 
      items, 
      subtotal, 
      discountPct, 
      discountAmt, 
      tax, 
      total, 
      paymentMethod, 
      note 
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 1. Calculate Bill Number automatically on backend
    const count = await Transaction.countDocuments({ userId: req.user.id });
    const billNo = count + 1;

    // 2. Pre-flight Stock Check
    // Verify all items exist in user's inventory and have sufficient stock
    for (const item of items) {
      const invItem = await Inventory.findOne({ 
        userId: req.user.id, 
        code: item.code 
      });

      if (!invItem) {
        return res.status(400).json({ error: `Item ${item.name} (${item.code}) not found in inventory` });
      }

      if (invItem.stock < item.qty) {
        return res.status(400).json({ 
          error: `Insufficient stock for ${item.name}. Available: ${invItem.stock}, Requested: ${item.qty}` 
        });
      }
    }

    // 3. Atomic Decrements & Transaction Recording
    for (const item of items) {
      await Inventory.updateOne(
        { userId: req.user.id, code: item.code },
        { $inc: { stock: -item.qty } }
      );
    }

    // 4. Create Transaction record
    const transaction = await Transaction.create({
      userId: req.user.id,
      billNo: String(billNo),
      items,
      subtotal,
      discountPct,
      discountAmt,
      tax,
      total,
      paymentMethod,
      note
    });

    res.status(201).json({
      success: true,
      message: 'Transaction completed successfully',
      transaction,
      nextBillNo: billNo + 1
    });

  } catch (err) {
    console.error('POS Checkout Error:', err);
    res.status(500).json({ error: 'Internal server error during checkout' });
  }
});

module.exports = router;

