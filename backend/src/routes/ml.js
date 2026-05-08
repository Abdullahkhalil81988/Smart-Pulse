const router = require('express').Router();
const auth = require('../middleware/auth');
const Prediction = require('../models/Prediction');
const Alert = require('../models/Alert');

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function splitCsvLine(line) {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvText(text) {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();
  if (!normalized) return { headers: [], rows: [] };

  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] ?? '';
    });
    return row;
  });

  return { headers, rows };
}

function extractMultipartFile(buffer, contentType) {
  const boundaryMatch = /boundary=([^;]+)/i.exec(contentType || '');
  if (!boundaryMatch) {
    throw new Error('Missing multipart boundary');
  }

  const boundary = `--${boundaryMatch[1]}`;
  const bodyText = buffer.toString('utf8');
  const parts = bodyText.split(boundary).filter(part => part.includes('Content-Disposition'));
  const filePart = parts.find(part => /filename=/i.test(part));

  if (!filePart) {
    throw new Error('Uploaded file part not found');
  }

  const splitIndex = filePart.indexOf('\r\n\r\n');
  if (splitIndex === -1) {
    throw new Error('Malformed multipart upload');
  }

  const content = filePart.slice(splitIndex + 4).replace(/\r\n--$/, '').trim();
  return content;
}

function buildFallbackForecast(csvText) {
  const parsed = parseCsvText(csvText);
  const headerSet = new Set(parsed.headers.map(header => header.toLowerCase()));

  const hasInvoiceDate = headerSet.has('invoicedate');
  const hasQuantity = headerSet.has('quantity');
  const hasUnitPrice = headerSet.has('unitprice') || headerSet.has('price');

  if (!hasInvoiceDate || !hasQuantity || !hasUnitPrice) {
    throw new Error('CSV must include InvoiceDate, Quantity, and UnitPrice columns.');
  }

  const monthlyRevenue = new Map();

  parsed.rows.forEach(row => {
    const invoiceDate = row.InvoiceDate || row.invoicedate;
    const quantity = Number(row.Quantity ?? row.quantity);
    const unitPrice = Number(row.UnitPrice ?? row.unitprice ?? row.Price ?? row.price);

    if (!invoiceDate || !Number.isFinite(quantity) || !Number.isFinite(unitPrice)) {
      return;
    }

    const date = new Date(invoiceDate);
    if (Number.isNaN(date.getTime())) {
      return;
    }

    const monthKey = date.toISOString().slice(0, 7);
    const revenue = quantity * unitPrice;
    monthlyRevenue.set(monthKey, (monthlyRevenue.get(monthKey) || 0) + revenue);
  });

  const monthlyRows = Array.from(monthlyRevenue.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((left, right) => left.month.localeCompare(right.month));

  if (monthlyRows.length === 0) {
    throw new Error('CSV did not contain any valid monthly revenue rows.');
  }

  const lastRevenue = monthlyRows[monthlyRows.length - 1].revenue;
  const previousRevenue = monthlyRows.length > 1 ? monthlyRows[monthlyRows.length - 2].revenue : lastRevenue;
  const trend = lastRevenue - previousRevenue;
  const forecast = Math.max(0, lastRevenue + (trend || lastRevenue * 0.05));

  return {
    prediction: Number(forecast.toFixed(2)),
    confidence: 1,
    model_name: 'forecaster_fallback',
    timestamp: new Date().toISOString(),
    cluster_label: null,
    anomaly_flag: false,
    pca_x: null,
    pca_y: null,
    historical_data: monthlyRows.map(row => ({
      date: `${row.month}-01`,
      actual: Number(row.revenue.toFixed(2)),
    })),
  };
}

async function runForecasterFallback(req) {
  const bodyBuffer = req._rawBody || await collectRequestBody(req);
  const contentType = req.headers['content-type'] || '';
  const csvText = extractMultipartFile(bodyBuffer, contentType);
  return buildFallbackForecast(csvText);
}

// POST /api/ml/predict  — proxy to FastAPI, save result to MongoDB
router.post('/predict', auth, async (req, res) => {
  try {
    const bodyBuffer = await collectRequestBody(req);
    req._rawBody = bodyBuffer;

    console.log(`[ml] predict user=${req.user.id} model_type=${req.query.model_type || 'auto'} bytes=${bodyBuffer.length}`);

    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['content-length'];

    // forward the raw multipart request to FastAPI
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/predict${req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''}`, {
      method: 'POST',
      headers,
      body: bodyBuffer,
    });

    console.log(`[ml] predict upstream status=${fastapiRes.status}`);

    if (!fastapiRes.ok) {
      const err = await fastapiRes.json().catch(() => ({ detail: 'FastAPI error' }));
      console.warn(`[ml] predict upstream error detail=${JSON.stringify(err)}`);
      console.warn(`[ml] FastAPI URL=${FASTAPI_URL}`);
      const requestedModelType = req.query.model_type;
      if (requestedModelType === 'forecaster' && String(err.detail || err.error || '').toLowerCase().includes('no trained models')) {
        console.warn('[ml] detected "no trained models" error, using local forecaster fallback');
        const fallback = await runForecasterFallback(req);
        console.log(`[ml] fallback forecast prediction=${fallback.prediction} confidence=${fallback.confidence}`);
        const savedFallback = await Prediction.create({
          userId:       req.user.id,
          model_name:   fallback.model_name,
          model_type:   'forecaster',
          prediction:   fallback.prediction,
          confidence:   fallback.confidence,
          anomaly_flag: fallback.anomaly_flag,
          cluster_label:fallback.cluster_label,
          pca_x:        fallback.pca_x,
          pca_y:        fallback.pca_y,
          timestamp:    fallback.timestamp,
        });
        console.log(`[ml] fallback saved to MongoDB with id=${savedFallback._id}`);
        req.app.get('broadcast')?.({ type: 'prediction', prediction: savedFallback });
        return res.json({ ...fallback, _id: savedFallback._id, fallback: true });
      }
      return res.status(fastapiRes.status).json(err);
    }

    const result = await fastapiRes.json();
    console.log(`[ml] predict upstream success model_name=${result.model_name} prediction=${result.prediction}`);


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
    console.error(`[ml] predict error: ${err.message}`, err.stack);
    const requestedModelType = req.query?.model_type;
    if (requestedModelType === 'forecaster') {
      try {
        console.warn(`[ml] predict fetch failed, attempting local forecaster fallback: ${err.message}`);
        const fallback = await runForecasterFallback(req);
        console.log(`[ml] fallback forecast prediction=${fallback.prediction} confidence=${fallback.confidence}`);
        const savedFallback = await Prediction.create({
          userId:       req.user.id,
          model_name:   fallback.model_name,
          model_type:   'forecaster',
          prediction:   fallback.prediction,
          confidence:   fallback.confidence,
          anomaly_flag: fallback.anomaly_flag,
          cluster_label:fallback.cluster_label,
          pca_x:        fallback.pca_x,
          pca_y:        fallback.pca_y,
          timestamp:    fallback.timestamp,
        });
        console.log(`[ml] fallback saved to MongoDB with id=${savedFallback._id}`);
        req.app.get('broadcast')?.({ type: 'prediction', prediction: savedFallback });
        return res.json({ ...fallback, _id: savedFallback._id, fallback: true });
      } catch (fallbackErr) {
        console.error(`[ml] fallback error: ${fallbackErr.message}`, fallbackErr.stack);
        return res.status(500).json({ error: `Fallback failed: ${fallbackErr.message}` });
      }
    }
    console.error(`[ml] returning 500 for model_type=${requestedModelType}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ml/ingest  — proxy CSV upload to FastAPI /ingest
router.post('/ingest', auth, async (req, res) => {
  try {
    const bodyBuffer = await collectRequestBody(req);
    console.log(`[ml] ingest user=${req.user.id} bytes=${bodyBuffer.length}`);

    const headers = { ...req.headers };
    delete headers['host'];
    delete headers['content-length'];

    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/ingest`, {
      method: 'POST',
      headers,
      body: bodyBuffer,
    });
    console.log(`[ml] ingest upstream status=${fastapiRes.status}`);
    const data = await fastapiRes.json().catch(() => ({}));
    res.status(fastapiRes.status).json(data);
  } catch (err) {
    console.error(`[ml] ingest failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ml/train  — trigger FastAPI training
router.post('/train', auth, async (req, res) => {
  try {
    const { model_type = 'both', version = 1 } = req.body;
    console.log(`[ml] train user=${req.user.id} model_type=${model_type} version=${version}`);
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/train?model_type=${model_type}&version=${version}`, {
      method: 'POST',
    });
    console.log(`[ml] train upstream status=${fastapiRes.status}`);
    const data = await fastapiRes.json().catch(() => ({}));
    res.status(fastapiRes.status).json(data);
  } catch (err) {
    console.error(`[ml] train failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/ml/report  — fetch model report from FastAPI
router.get('/report', auth, async (req, res) => {
  try {
    console.log(`[ml] report user=${req.user.id}`);
    const fastapiRes = await fetch(`${FASTAPI_URL}/api/v1/report`);
    console.log(`[ml] report upstream status=${fastapiRes.status}`);
    const data = await fastapiRes.json().catch(() => ({}));
    res.status(fastapiRes.status).json(data);
  } catch (err) {
    console.error(`[ml] report failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
