const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Inventory = require('../models/Inventory');

// Require auth for all inventory routes
router.use(auth);

// GET all inventory items for current user
router.get('/', async (req, res) => {
  try {
    const items = await Inventory.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST new inventory item
router.post('/', async (req, res) => {
  try {
    const { code, name, category, price, stock, lowThreshold, unit } = req.body;
    
    // Check if code already exists for this user
    const existing = await Inventory.findOne({ userId: req.user.id, code });
    if (existing) {
      return res.status(400).json({ error: 'Item with this code already exists' });
    }

    const newItem = await Inventory.create({
      userId: req.user.id,
      code,
      name,
      category,
      price,
      stock,
      lowThreshold,
      unit,
    });
    
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update an item
router.put('/:id', async (req, res) => {
  try {
    const { name, category, price, stock, lowThreshold, unit } = req.body;
    const item = await Inventory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { name, category, price, stock, lowThreshold, unit },
      { new: true }
    );
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE an item
router.delete('/:id', async (req, res) => {
  try {
    const item = await Inventory.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk restock items
router.post('/bulk-restock', async (req, res) => {
  try {
    const { updates } = req.body; // updates is an array of { code, amount }
    
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates format' });
    }

    const updatedItems = [];
    
    for (const update of updates) {
      if (update.amount > 0) {
        const item = await Inventory.findOneAndUpdate(
          { code: update.code, userId: req.user.id },
          { $inc: { stock: update.amount } },
          { new: true }
        );
        if (item) {
          updatedItems.push(item);
        }
      }
    }
    
    res.json(updatedItems);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST bulk import new items
router.post('/bulk-import', async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of items' });
    }

    // Attach userId to all items
    const itemsToInsert = items.map(item => ({
      ...item,
      userId: req.user.id
    }));

    // Perform bulk insert (using unordered so duplicates don't fail the entire batch)
    const result = await Inventory.insertMany(itemsToInsert, { ordered: false });
    res.status(201).json({ message: `Successfully imported ${result.length} items.`, count: result.length });
  } catch (err) {
    if (err.code === 11000) {
      // Duplicate key error
      return res.status(207).json({ 
        message: 'Some items were imported, but some were skipped due to duplicate codes.',
        error: err.message 
      });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
