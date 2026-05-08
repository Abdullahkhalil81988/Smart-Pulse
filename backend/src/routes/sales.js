const router = require('express').Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');

// GET /api/sales/stats?date=YYYY-MM-DD
router.get('/stats', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    
    const start = new Date(targetDate);
    start.setHours(0,0,0,0);
    const end = new Date(targetDate);
    end.setHours(23,59,59,999);

    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 1);
    const prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - 1);

    // Current stats
    const txns = await Transaction.find({ userId: req.user.id, createdAt: { $gte: start, $lte: end } });
    const revenue = txns.reduce((sum, t) => sum + t.total, 0);
    const count = txns.length;
    const avgOrder = count > 0 ? revenue / count : 0;
    const invoiceCount = txns.filter(t => t.paymentMethod === 'Invoice').length;

    // Previous stats (for trends)
    const prevTxns = await Transaction.find({ userId: req.user.id, createdAt: { $gte: prevStart, $lte: prevEnd } });
    const prevRevenue = prevTxns.reduce((sum, t) => sum + t.total, 0);
    const prevCount = prevTxns.length;

    // Payment methods distribution
    const paymentDistribution = {};
    txns.forEach(t => {
      if (!paymentDistribution[t.paymentMethod]) paymentDistribution[t.paymentMethod] = 0;
      paymentDistribution[t.paymentMethod] += t.total;
    });

    res.json({
      revenue,
      prevRevenue,
      count,
      prevCount,
      avgOrder,
      invoiceCount,
      pendingInvoices: txns.filter(t => t.paymentMethod === 'Invoice' && t.status === 'Pending').length,
      paymentDistribution
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/chart?date=YYYY-MM-DD
router.get('/chart', auth, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate);
    start.setHours(0,0,0,0);
    const end = new Date(targetDate);
    end.setHours(23,59,59,999);

    const txns = await Transaction.find({ userId: req.user.id, createdAt: { $gte: start, $lte: end } });
    
    // Group by hour
    const hourly = Array(24).fill(0);
    txns.forEach(t => {
      const hour = new Date(t.createdAt).getHours();
      hourly[hour] += t.total;
    });

    res.json(hourly);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sales/performance
router.get('/performance', auth, async (req, res) => {
  try {
    const txns = await Transaction.find({ userId: req.user.id });
    
    const productStats = {};
    const categoryStats = {};

    txns.forEach(t => {
      t.items.forEach(item => {
        // Product
        if (!productStats[item.name]) {
          productStats[item.name] = { name: item.name, category: item.category, units: 0, revenue: 0 };
        }
        productStats[item.name].units += item.qty;
        productStats[item.name].revenue += item.qty * item.price;

        // Category
        if (!categoryStats[item.category]) {
          categoryStats[item.category] = 0;
        }
        categoryStats[item.category] += item.qty * item.price;
      });
    });

    const topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({ topProducts, categoryStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
