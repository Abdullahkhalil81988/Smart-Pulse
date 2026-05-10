const router = require('express').Router();
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const CustomerDb = require('../models/Customer');

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Very lightweight churn heuristic (0-100):
 * - Recency dominates (days since last purchase)
 * - Frequency + spend reduce risk
 *
 * This is not "ML" churn; it's a deterministic score so the UI has real data.
 */
function churnScoreFromStats({ daysSinceLast, visits, totalSpend }) {
  const recency = clamp((daysSinceLast / 60) * 100, 0, 100); // 0..60 days -> 0..100
  const frequencyBonus = clamp(Math.log10((visits || 0) + 1) * 25, 0, 50); // 0..~50
  const spendBonus = clamp(Math.log10((totalSpend || 0) + 1) * 15, 0, 35); // 0..~35
  return Math.round(clamp(recency - frequencyBonus - spendBonus + 25, 0, 100));
}

function riskLabel(score) {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MED';
  return 'LOW';
}

// GET /api/customers
// Computes a customer list from transactions (customerName-based).
router.get('/', auth, async (req, res) => {
  try {
    const { limit = 200, search = '' } = req.query;
    const searchStr = String(search || '').trim();
    const limitNum = Math.min(500, Math.max(1, Number(limit) || 200));

    const match = {
      userId: { $in: req.user.teamIds },
      customerName: { $nin: [null, '', 'Guest', 'guest'] },
    };

    if (searchStr) {
      match.customerName = { ...match.customerName, $regex: searchStr, $options: 'i' };
    }

    const rows = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$customerName',
          visits: { $sum: 1 },
          totalSpend: { $sum: '$total' },
          lastSeen: { $max: '$createdAt' },
        },
      },
      { $sort: { lastSeen: -1 } },
      { $limit: limitNum },
    ]);

    const now = Date.now();
    const customers = rows.map((r, idx) => {
      const lastSeen = r.lastSeen ? new Date(r.lastSeen) : null;
      const daysSinceLast = lastSeen ? Math.floor((now - lastSeen.getTime()) / (1000 * 60 * 60 * 24)) : 999;

      const churn = churnScoreFromStats({
        daysSinceLast,
        visits: r.visits || 0,
        totalSpend: r.totalSpend || 0,
      });

      return {
        id: `C-${String(idx + 1).padStart(4, '0')}`,
        name: r._id,
        email: null, // email not available from transactions yet
        spend: Number((r.totalSpend || 0).toFixed(2)),
        visits: r.visits || 0,
        churn,
        risk: riskLabel(churn),
        lastSeen: lastSeen ? lastSeen.toISOString() : null,
      };
    });

    res.json({ customers });
  } catch (err) {
    console.error(`[customers] list failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/directory
// Returns raw customer records for the POS autocomplete
router.get('/directory', auth, async (req, res) => {
  try {
    const records = await CustomerDb.find({ userId: { $in: req.user.teamIds } }).sort({ name: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/customers/:name
// Basic profile (computed) + recent transactions
router.get('/:name', auth, async (req, res) => {
  try {
    const customerName = decodeURIComponent(req.params.name);
    if (!customerName || customerName.toLowerCase() === 'guest') {
      return res.status(400).json({ error: 'Invalid customer name' });
    }

    const txns = await Transaction.find({
      userId: { $in: req.user.teamIds },
      customerName,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const visits = txns.length;
    const spend = txns.reduce((s, t) => s + (t.total || 0), 0);
    const lastSeen = txns[0]?.createdAt ? new Date(txns[0].createdAt) : null;
    const daysSinceLast = lastSeen ? Math.floor((Date.now() - lastSeen.getTime()) / (1000 * 60 * 60 * 24)) : 999;
    const churn = churnScoreFromStats({ daysSinceLast, visits, totalSpend: spend });

    res.json({
      customer: {
        name: customerName,
        email: null,
        spend: Number(spend.toFixed(2)),
        visits,
        churn,
        risk: riskLabel(churn),
        lastSeen: lastSeen ? lastSeen.toISOString() : null,
      },
      transactions: txns,
    });
  } catch (err) {
    console.error(`[customers] detail failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

