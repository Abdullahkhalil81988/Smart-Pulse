const router = require('express').Router();
const auth = require('../middleware/auth');
const Inventory = require('../models/Inventory');
const Transaction = require('../models/Transaction');
const CustomerDb = require('../models/Customer');

// GET /api/pos/next-bill-no
router.get('/next-bill-no', auth, async (req, res) => {
  try {
    const count = await Transaction.countDocuments({ userId: { $in: req.user.teamIds } });
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
      note,
      customerName,
      status
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // 1. Calculate Bill Number automatically on backend
    const count = await Transaction.countDocuments({ userId: { $in: req.user.teamIds } });
    const billNo = count + 1;

    // 2. Pre-flight Stock Check
    // Verify items with codes exist and have sufficient stock
    for (const item of items) {
      if (item.code) {
        const invItem = await Inventory.findOne({ 
          userId: { $in: req.user.teamIds }, 
          code: item.code 
        });

        if (invItem && invItem.stock < item.qty) {
          return res.status(400).json({ 
            error: `Insufficient stock for ${item.name}. Available: ${invItem.stock}, Requested: ${item.qty}` 
          });
        }
      }
    }

    // 3. Atomic Decrements & Transaction Recording
    for (const item of items) {
      if (item.code) {
        await Inventory.findOneAndUpdate(
          { userId: { $in: req.user.teamIds }, code: item.code },
          { $inc: { stock: -item.qty } }
        );
      }
    }

    // 4. Resolve exact customer identity
    const { customerId } = req.body;
    let finalCustomerName = 'Guest';

    if (customerId) {
      // Existing customer
      const existing = await CustomerDb.findById(customerId);
      if (existing) {
        finalCustomerName = existing.name; // This will be "Alice #A1B2"
      } else {
        finalCustomerName = customerName || 'Guest';
      }
    } else if (customerName && customerName.toLowerCase() !== 'guest') {
      // New customer - attach a unique short ID to their name to prevent aggregation collisions
      const shortId = Math.random().toString(36).substring(2, 6).toUpperCase();
      finalCustomerName = `${customerName.trim()} #${shortId}`;
      
      try {
        await CustomerDb.create({ userId: req.user.id, name: finalCustomerName });
      } catch (err) {
        console.error('Failed to create new customer profile:', err);
      }
    }

    // 5. Create Transaction record
    const transaction = await Transaction.create({
      userId: req.user.id,
      billNo: String(billNo),
      customerName: finalCustomerName,
      items,
      subtotal,
      discountPct,
      discountAmt,
      tax,
      total,
      paymentMethod,
      note,
      status: status || 'Completed'
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

// GET /api/pos/transactions
// List transactions with search filters
router.get('/transactions', auth, async (req, res) => {
  try {
    const { search, date, paymentMethod } = req.query;
    let query = { userId: { $in: req.user.teamIds } };

    if (search) {
      query.$or = [
        { billNo: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } }
      ];
    }

    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0,0,0,0);
      const end = new Date(date);
      end.setHours(23,59,59,999);
      query.createdAt = { $gte: start, $lte: end };
    }

    const transactions = await Transaction.find(query).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/pos/transactions/:id
// Get detail for a specific transaction
router.get('/transactions/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      userId: { $in: req.user.teamIds } 
    });
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/pos/transactions/:id
// Update transaction status
router.patch('/transactions/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: { $in: req.user.teamIds } },
      { status },
      { new: true }
    );
    
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    res.json(transaction);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

