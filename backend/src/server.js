require('dotenv').config();
require('./firebase-config'); // initialise Firebase Admin SDK early
const http = require('http');
const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const connectDB = require('./db');

const authRoutes        = require('./routes/auth');
const businessRoutes    = require('./routes/businesses');
const predictionRoutes  = require('./routes/predictions');
const alertRoutes       = require('./routes/alerts');
const mlRoutes          = require('./routes/ml');
const reviewRoutes      = require('./routes/reviews');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

// ── middleware ──────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// ── WebSocket broadcast helper ──────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}
app.set('broadcast', broadcast);

wss.on('connection', ws => {
  ws.send(JSON.stringify({ type: 'connected' }));
});

// ── routes ──────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);
app.use('/api/businesses',  businessRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/alerts',      alertRoutes);
app.use('/api/ml',          mlRoutes);
app.use('/api/reviews',     reviewRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));

// ── start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => server.listen(PORT, () => console.log(`Server running on port ${PORT}`)))
  .catch(err => { console.error('DB connection failed:', err.message); process.exit(1); });
