# SmartPulse — Frontend Integration Guide (P3)

Complete reference for connecting the React frontend to the Express backend.

---

## Base URLs

| Environment | Express Backend | WebSocket |
|---|---|---|
| Production | `https://smartpulse-mht9.onrender.com` | `wss://smartpulse-mht9.onrender.com` |
| Local dev | `http://localhost:5001` | `ws://localhost:5001` |

> **Never call the FastAPI ML service directly from React.** All requests go through the Express backend.

---

## Setup

### 1. Environment variables (React)

Create `.env` in your React project root:
```
REACT_APP_API_URL=https://smartpulse-mht9.onrender.com
REACT_APP_WS_URL=wss://smartpulse-mht9.onrender.com
```

### 2. API helper

Create `src/api.js`:
```javascript
const BASE = process.env.REACT_APP_API_URL;

export async function request(method, path, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export async function upload(path, formData, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data;
}
```

### 3. Store JWT token

Store the token in memory (React state or Context) — **not localStorage**.

---

## Authentication

### Register

```javascript
// POST /api/auth/register
const data = await request('POST', '/api/auth/register', {
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
});
// data.token  — save this in Context/state
// data.user   — { id, name, email }
```

**Response:**
```json
{
  "token": "eyJhbGci...",
  "user": { "id": "64f3...", "name": "John Doe", "email": "john@example.com" }
}
```

**Errors:**
- `400` — missing name/email/password
- `409` — email already registered

---

### Login

```javascript
// POST /api/auth/login
const data = await request('POST', '/api/auth/login', {
  email: 'john@example.com',
  password: 'password123',
});
// data.token  — save this
// data.user   — { id, name, email }
```

**Response:** same shape as register.

**Errors:**
- `400` — missing fields
- `401` — wrong credentials

---

## Dashboard Stats

Use this to populate the 4 stat cards at the top of the dashboard.

```javascript
// GET /api/predictions/stats
const stats = await request('GET', '/api/predictions/stats', null, token);
```

**Response:**
```json
{
  "total": 42,
  "anomalies": 5,
  "accuracy": 87,
  "active_models": 3,
  "model_counts": [
    { "_id": "classifier", "count": 20 },
    { "_id": "forecaster", "count": 15 },
    { "_id": "anomaly", "count": 7 }
  ]
}
```

| Field | Use in UI |
|---|---|
| `total` | "Total Predictions" card |
| `anomalies` | "Anomalies Detected" card |
| `accuracy` | "Model Accuracy %" card (`null` if no feedback yet) |
| `active_models` | "Active Models" card |
| `model_counts` | Bar chart — model usage breakdown |

---

## CSV Upload + Prediction

### Step 1 — Upload CSV (ingest)

```javascript
// POST /api/ml/ingest  (multipart/form-data)
const formData = new FormData();
formData.append('file', csvFile); // csvFile from <input type="file">

const result = await upload('/api/ml/ingest', formData, token);
// result.rows     — number of rows ingested
// result.columns  — column names found
// result.filename — saved filename
```

**Response:**
```json
{
  "status": "ingested",
  "filename": "data.csv",
  "rows": 150,
  "columns": ["tenure", "MonthlyCharges", "TotalCharges", "..."]
}
```

---

### Step 2 — Run Prediction

```javascript
// POST /api/ml/predict?model_type=classifier  (multipart/form-data)
const formData = new FormData();
formData.append('file', csvFile);

// model_type options: 'forecaster' | 'classifier' | 'anomaly'
// omit model_type to auto-detect from CSV columns
const result = await upload('/api/ml/predict?model_type=classifier', formData, token);
```

**Response:**
```json
{
  "_id": "64f3...",
  "prediction": 0.73,
  "confidence": 0.91,
  "model_name": "classifier_best",
  "timestamp": "2024-01-01T00:00:00Z",
  "anomaly_flag": false,
  "cluster_label": 2,
  "pca_x": 1.24,
  "pca_y": -0.85
}
```

| Field | Use in UI |
|---|---|
| `prediction` | Main result value (0–1 for classifier, revenue for forecaster) |
| `confidence` | Confidence bar / percentage |
| `model_name` | Show which model was used |
| `anomaly_flag` | Show red alert badge if `true` |
| `cluster_label` | K-Means cluster (0–4) for scatter plot colour |
| `pca_x`, `pca_y` | Scatter plot coordinates |

---

### CSV column requirements per model type

**Forecaster (retail revenue):**
```
InvoiceNo, CustomerID, Country, InvoiceDate, Quantity, UnitPrice
```

**Classifier (customer churn):**
```
customerID, tenure, MonthlyCharges, TotalCharges, Contract, PaymentMethod, Churn
```

**Anomaly (credit fraud):**
```
Time, Amount, V1, V2, V3, ... (credit card transaction features)
```

---

## Prediction History

```javascript
// GET /api/predictions?model_type=classifier&limit=20&page=1
const data = await request('GET', '/api/predictions?limit=20&page=1', null, token);
// data.predictions — array
// data.total       — total count
// data.page        — current page
```

**Single prediction:**
```javascript
// GET /api/predictions/:id
const prediction = await request('GET', `/api/predictions/${id}`, null, token);
```

---

## Feedback (Thumbs Up / Down)

Add thumbs-up/down buttons on each prediction card. This feeds the ML retraining pipeline.

```javascript
// POST /api/predictions/feedback/:id
await request('POST', `/api/predictions/feedback/${predictionId}`, {
  correct: true   // true = thumbs up, false = thumbs down
}, token);
```

**Response:**
```json
{ "status": "ok", "prediction": { ...full prediction object... } }
```

---

## Alerts Feed

### Get alerts

```javascript
// GET /api/alerts               — all alerts
// GET /api/alerts?unread=true   — only unread
// GET /api/alerts?limit=10      — limit results
const alerts = await request('GET', '/api/alerts?unread=true', null, token);
```

**Response:**
```json
[
  {
    "_id": "64f3...",
    "type": "anomaly",
    "severity": "high",
    "message": "Anomaly detected by anomaly_v1 (confidence: 94.2%)",
    "read": false,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

| `severity` | Badge colour suggestion |
|---|---|
| `high` | Red |
| `medium` | Orange |
| `low` | Yellow |

### Mark as read

```javascript
// PATCH /api/alerts/:id/read
await request('PATCH', `/api/alerts/${alertId}/read`, null, token);

// PATCH /api/alerts/read-all
await request('PATCH', '/api/alerts/read-all', null, token);
```

---

## Review Sentiment Analysis (MaaS)

Send customer reviews and get back star ratings + sentiment scores.

```javascript
// POST /api/reviews/analyze
const result = await request('POST', '/api/reviews/analyze', {
  reviews: [
    {
      review_body: "Amazing product, works perfectly!",  // required
      product_category: "electronics",                   // required
      review_title: "Great buy",                         // optional
      language: "en"                                     // optional
    }
  ]
}, token);
```

**Response:**
```json
{
  "_id": "64f3...",
  "predictions": [
    {
      "predicted_stars": 5,
      "sentiment": "positive",
      "confidence": 0.98,
      "model_used": "model_b",
      "inference_id": "uuid-string"
    }
  ],
  "summary": {
    "count": 1,
    "average_stars": 5.0,
    "sentiment_distribution": {
      "positive": 1,
      "neutral": 0,
      "negative": 0
    },
    "total_latency_ms": 45.2
  }
}
```

| Field | Use in UI |
|---|---|
| `summary.average_stars` | Star rating display |
| `summary.sentiment_distribution` | Pie/donut chart |
| `predictions[n].sentiment` | Badge per review card |
| `predictions[n].confidence` | Confidence bar |

### Get review history

```javascript
// GET /api/reviews?limit=20&page=1
const data = await request('GET', '/api/reviews', null, token);
// data.reviews — array of past analyses
// data.total   — total count
```

---

## Businesses

```javascript
// Create a business (after registration)
const business = await request('POST', '/api/businesses', {
  name: 'Acme Corp',
  industry: 'Retail'
}, token);

// List all businesses
const businesses = await request('GET', '/api/businesses', null, token);

// Get one
const business = await request('GET', `/api/businesses/${id}`, null, token);

// Update
const updated = await request('PATCH', `/api/businesses/${id}`, {
  name: 'New Name'
}, token);
```

---

## Model Report

```javascript
// GET /api/ml/report
const report = await request('GET', '/api/ml/report', null, token);
```

**Response:**
```json
{
  "last_training": { "model_type": "both", "version": 1 },
  "model_summary": {
    "forecaster": ["forecaster_v1.joblib"],
    "classifier": ["classifier_v1.joblib", "classifier_best.joblib"],
    "anomaly": ["anomaly_v1.joblib"]
  },
  "artifact_count": 7
}
```

---

## Trigger Retraining

```javascript
// POST /api/ml/train
const result = await request('POST', '/api/ml/train', {
  model_type: 'both',  // 'forecaster' | 'classifier' | 'both'
  version: 1
}, token);
```

---

## WebSocket — Real-time Updates

Connect on app load after login. No auth needed on the WS connection itself.

```javascript
const ws = new WebSocket(process.env.REACT_APP_WS_URL);

ws.onopen = () => console.log('Connected to SmartPulse');

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);

  if (msg.type === 'connected') {
    console.log('WS handshake ok');
  }

  if (msg.type === 'prediction') {
    // new prediction came in — update predictions list / dashboard stats
    console.log('New prediction:', msg.prediction);
  }

  if (msg.type === 'alert') {
    // anomaly detected — show toast notification + update alert feed
    console.log('New alert:', msg.alert);
  }

  if (msg.type === 'review_analysis') {
    // new review batch analysed — update review history
    console.log('New review analysis:', msg.review);
  }
};

ws.onclose = () => {
  // reconnect after 3 seconds
  setTimeout(() => connectWebSocket(), 3000);
};
```

---

## Error Handling

All error responses follow this shape:
```json
{ "error": "Human readable message" }
```

Standard HTTP codes:
| Code | Meaning |
|---|---|
| `400` | Bad request — missing or invalid fields |
| `401` | Unauthorized — missing or invalid JWT token |
| `404` | Resource not found |
| `409` | Conflict — e.g. email already exists |
| `500` | Server error |

Recommended pattern:
```javascript
try {
  const data = await request('POST', '/api/auth/login', { email, password });
  setToken(data.token);
  setUser(data.user);
} catch (err) {
  setError(err.message); // show toast or inline error
}
```

---

## Suggested Page → API Mapping

| Page | APIs to call |
|---|---|
| `/login` | `POST /api/auth/login` |
| `/register` | `POST /api/auth/register`, `POST /api/businesses` |
| `/dashboard` | `GET /api/predictions/stats`, `GET /api/alerts?unread=true`, `GET /api/ml/report` |
| `/upload` | `POST /api/ml/ingest`, `POST /api/ml/predict` |
| `/predictions` | `GET /api/predictions`, `POST /api/predictions/feedback/:id` |
| `/alerts` | `GET /api/alerts`, `PATCH /api/alerts/read-all` |
| `/reviews` | `POST /api/reviews/analyze`, `GET /api/reviews` |
| All pages | WebSocket for real-time updates |
