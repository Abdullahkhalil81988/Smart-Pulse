const router = require('express').Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const Alert = require('../models/Alert');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

// POST /api/ml/predict  — proxy to FastAPI, save result to MongoDB
router.post('/predict', auth, async (req, res) => {
  try {
    const FormData = (await import('node:stream')).PassThrough;
    // forward the raw multipart request to FastAPI
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/predict${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`, {
      method: 'POST',
      headers: { ...req.headers, host: undefined },
      body: req,
      duplex: 'half',
    });

    if (!fastapiRes.ok) {
      const err = await fastapiRes.json().catch(() => ({ detail: 'FastAPI error' }));
      return res.status(fastapiRes.status).json(err);
    }

    const result = await fastapiRes.json();

    // persist prediction to MongoDB so frontend can query history
    const saved = await Prediction.create({
      userId:       req.user.id,
      model_name:   result.model_name,
      model_type:   result.model_name.includes('forecaster') ? 'forecaster'
                  : result.model_name.includes('anomaly')    ? 'anomaly'
                  : 'classifier',
      prediction:   result.prediction,
      confidence:   result.confidence,
      anomaly_flag: result.anomaly_flag ?? false,
      cluster_label:result.cluster_label ?? null,
      pca_x:        result.pca_x ?? null,
      pca_y:        result.pca_y ?? null,
      timestamp:    result.timestamp,
    });

    // create an alert if anomaly detected
    if (result.anomaly_flag) {
      const alert = await Alert.create({
        userId:   req.user.id,
        type:     'anomaly',
        severity: 'high',
        message:  `Anomaly detected by ${result.model_name} (confidence: ${(result.confidence * 100).toFixed(1)}%)`,
      });
      // broadcast to WebSocket clients
      req.app.get('broadcast')?.({ type: 'alert', alert });
    }

    // broadcast new prediction to WebSocket clients
    req.app.get('broadcast')?.({ type: 'prediction', prediction: saved });

    res.json({ ...result, _id: saved._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ml/ingest  — proxy CSV upload to FastAPI /ingest
router.post('/ingest', auth, async (req, res) => {
  try {
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/ingest`, {
      method: 'POST',
      headers: { ...req.headers, host: undefined },
      body: req,
      duplex: 'half',
    });
    const data = await fastapiRes.json().catch(() => ({}));
    res.status(fastapiRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ml/train  — trigger FastAPI training
router.post('/train', auth, async (req, res) => {
  try {
    const { model_type = 'both', version = 1 } = req.body;
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/train?model_type=${model_type}&version=${version}`, {
      method: 'POST',
    });
    const data = await fastapiRes.json().catch(() => ({}));
    res.status(fastapiRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ml/report  — fetch model report from FastAPI
router.get('/report', auth, async (req, res) => {
  try {
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/report`);
    const data = await fastapiRes.json().catch(() => ({}));
    res.status(fastapiRes.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
