# SmartPulse

AI-powered business analytics platform. Upload your data, get predictions, detect anomalies, and monitor model health in real time.

## Architecture

```
React Frontend (P3)
       │
       ▼
Express Backend  ──── MongoDB Atlas
  (Node.js / JWT / WebSocket)
       │
       ▼
FastAPI ML Service
  ├── Forecaster    (retail revenue prediction)
  ├── Classifier    (customer churn)
  └── Anomaly Detector (fraud detection)
```

---

## ML Models

| Model | Algorithm | Dataset | Purpose |
|---|---|---|---|
| Forecaster | Random Forest Regressor | Online Retail II (Kaggle) | Revenue forecasting |
| Classifier | Logistic Regression / SVM / MLP (auto-selected) | Telco Customer Churn (Kaggle) | Churn prediction |
| Anomaly Detector | Gaussian Naive Bayes | Credit Card Fraud (Kaggle) | Fraud / anomaly detection |
| Clustering | K-Means (5 clusters) + PCA | Customer data | Segmentation + scatter viz |

**Why these models:**
- Random Forest for forecasting: handles non-linear revenue patterns, robust to outliers
- Auto-selected classifier: cross-validation picks best of Logistic/SVM/MLP on each dataset
- Gaussian NB for anomaly: fast, probabilistic, works well on imbalanced fraud data
- K-Means: unsupervised segmentation, no labels required

**MLOps:**
- All models saved as versioned `.joblib` files with JSON metadata sidecars
- KS-test drift detection compares live input distribution vs training distribution
- Auto-retraining triggers when drift score exceeds threshold (p < 0.05)
- Prediction logging and thumbs-up/down feedback stored in MongoDB

---

## Infrastructure

### Services

| Service | Stack | Port | Deploy Target |
|---|---|---|---|
| FastAPI ML | Python 3.11, scikit-learn, FastAPI | 8000 | Hugging Face Spaces |
| Express BFF | Node.js, Express, Mongoose, JWT, WebSocket | 5001 | Render |
| Frontend | React 18, Recharts, Context API | 3000 | Vercel |
| Database | MongoDB Atlas (M0 free tier) | — | MongoDB Atlas |

### FastAPI Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| POST | `/api/v1/ingest` | Upload CSV data |
| POST | `/api/v1/train` | Trigger model training |
| POST | `/api/v1/predict` | Run prediction |
| GET | `/api/v1/report` | Model summary + metadata |
| POST | `/api/v1/feedback/{id}` | Log thumbs-up/down |

### Express Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET/POST | `/api/businesses` | JWT | Business CRUD |
| GET | `/api/predictions/stats` | JWT | Dashboard stats |
| GET | `/api/alerts` | JWT | Alert feed |
| PATCH | `/api/alerts/:id/read` | JWT | Mark alert read |
| POST | `/api/ml/predict` | JWT | Proxy → FastAPI + save to DB |
| POST | `/api/ml/ingest` | JWT | Proxy → FastAPI /ingest |
| POST | `/api/ml/train` | JWT | Trigger training |
| GET | `/api/ml/report` | JWT | Model report |

### Environment Variables

**FastAPI (`api/`):**
```
MONGO_URI=
RETAIL_CSV=datasets/online_retail_II.csv
CHURN_CSV=datasets/WA_Fn-UseC_-Telco-Customer-Churn.csv
CREDIT_CSV=datasets/creditcard.csv
FRONTEND_URL=
APP_ENV=production
```

**Express (`backend/`):**
```
PORT=5001
MONGODB_URI=
JWT_SECRET=
JWT_EXPIRES_IN=7d
FASTAPI_URL=
```

---

## Run Locally

**Option 1 — docker-compose (full stack):**
```bash
cp .env.example .env   # fill in MONGODB_URI, JWT_SECRET, MONGO_URI
docker-compose up
```

**Option 2 — manual:**
```bash
# FastAPI
pip install -r api/requirements.txt -r ml_core/requirements.txt
uvicorn api.main:app --reload --port 8000

# Express
cd backend && npm install && node src/server.js
```

**Train models (first time):**
```bash
# Swagger UI at http://localhost:8000/docs
# POST /api/v1/train
```

---

## Tests

```bash
# Python
pytest ml_core/tests/ -v
pytest api/tests/ -v

# Node (syntax check)
cd backend && node --check src/server.js
```

CI runs automatically on every push via GitHub Actions.

---

## Project Structure

```
SmartPulse/
├── ml_core/              # P1 — ML models + MLOps
│   ├── pipeline/         # ingestor, feature engineer, models, predictor
│   ├── mlops/            # serializer, prediction logger, drift, retrainer
│   ├── utils/            # vectorized ops, profiler
│   ├── models/           # saved .joblib artifacts
│   └── tests/
├── api/                  # P2 — FastAPI service
│   ├── routers/ml.py     # all ML endpoints
│   ├── schemas/          # Pydantic models
│   └── tests/
├── backend/              # P3 — Express BFF
│   └── src/
│       ├── models/       # Mongoose schemas
│       ├── routes/       # auth, businesses, predictions, alerts, ml proxy
│       └── middleware/   # JWT auth guard
├── .github/workflows/    # CI pipeline
├── Dockerfile.api        # FastAPI container
├── docker-compose.yml    # full local stack
└── datasets/             # Kaggle CSVs (gitignored)
```
