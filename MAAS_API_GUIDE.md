 Presentation Generation Prompt for ReviewRoute

Use the following detailed prompt to generate a professional, comprehensive presentation. Copy-paste this entire prompt into Claude or Gamma.

---

## PROMPT START

Create a professional, detailed PowerPoint/presentation (approximately 25–30 slides) for a university project titled **"ReviewRoute: Model as a Service & Deployment"**. This is for a Programming for AI course (DS201). The presentation must cover Assignment 3 (Model as a Service) and the Final Project (Deployment & Operational Readiness). Use a dark, modern tech theme with accent colors (deep blue/purple gradients). Include diagrams, code snippets, and architecture visuals where applicable.

---

### SLIDE 1: TITLE SLIDE
- **Title**: ReviewRoute — Intelligent Review Analytics as a Service
- **Subtitle**: Multi-Model Star Rating Prediction | MaaS & Deployment
- **Course**: DS201 – Programming for AI
- **Instructor**: Dr. Mehwish Fatima
- **Date**: April 2026

---

### SLIDE 2: PROJECT OVERVIEW
- ReviewRoute is a production-grade MLOps platform that predicts star ratings (1–5) and sentiment (positive/neutral/negative) from product reviews in 6 languages (English, German, Spanish, French, Japanese, Chinese).
- It supports both single review analysis and batch processing of up to 500 reviews at once.
- The system intelligently routes each review to one of three ML models based on language, text length, product category, and script analysis.
- Deployed live:
  - **Frontend**: Vercel (React + Vite) — provides an interactive dashboard for testing predictions, reviewing human-in-the-loop queue, and monitoring model drift.
  - **Backend API**: Render (FastAPI) — handles authentication, validation, Firestore persistence, and proxies inference requests.
  - **Inference Engine**: Hugging Face Spaces (FastAPI + PyTorch) — loads and serves the actual ML models.
  - **Database**: Google Firestore — stores inference logs, human review queue, and drift metrics.

---

### SLIDE 3: SYSTEM ARCHITECTURE (DIAGRAM)
Create a clear 3-tier architecture diagram showing:
1. **Client Layer**: React Frontend (Vercel) and External MaaS Consumers (Node.js/Express apps)
2. **API Gateway Layer**: FastAPI Backend on Render — handles authentication (X-API-Key header), input validation (Pydantic schemas), Firestore logging, HITL queueing, and drift detection.
3. **ML Inference Layer**: FastAPI on Hugging Face Spaces — loads model artifacts (joblib .pkl files for Model A/C, PyTorch XLM-RoBERTa for Model B) into GPU/CPU memory, performs actual inference.
4. **Persistence Layer**: Google Cloud Firestore — 4 collections: `inference_log`, `human_review_queue`, `human_labels`, `drift_metrics`.

Show arrows:
- Frontend → Backend (HTTPS + API Key)
- Backend → HF Space (HTTP POST /predict or /predict/batch)
- Backend → Firestore (gRPC)
- External MaaS Client → Backend (HTTPS + API Key)

---

### SLIDE 4: THE THREE MODELS
- **Model A** — TF-IDF + Logistic Regression (scikit-learn)
  - Language-specific variants: `model_a.pkl` (English), `model_a_de.pkl` (German), `model_a_es.pkl` (Spanish), `model_a_fr.pkl` (French).
  - Fast inference (~2ms), small footprint.
  - Used for Latin-script reviews with 15–80 words in supported languages.
  - Escalation threshold: if confidence < 0.55, automatically escalates to Model B.

- **Model B** — XLM-RoBERTa (Fine-tuned Transformer, PyTorch)
  - Multilingual: handles any language including CJK, Arabic, Cyrillic.
  - Max sequence length: 128 tokens.
  - Slower (~50ms per review single, ~15ms per review batched).
  - Escalation threshold: if confidence < 0.35 AND category is in escalation set (software, video_games, music, movies), escalates to Model C.

- **Model C** — Stacking Meta-Learner (scikit-learn)
  - A meta-classifier that takes the probability vector from Model A or B as features, plus one-hot encoded product category.
  - Used for specific categories: book, digital_ebook_purchase, electronics, pc.
  - Requires a "base model" to generate feature vectors first — so Model C always runs after Model A or B.
  - Reports which base model was used in the response: `base_model_used` field.

---

### SLIDE 5: INTELLIGENT MODEL ROUTING (FLOWCHART)
Create a detailed flowchart of the `select_model()` function logic:
1. **Input arrives** → preprocess (strip whitespace, generate title if missing, compute text_length).
2. **Language Detection**: If no language provided, auto-detect using: (a) Script heuristics (Arabic→ar, Cyrillic→ru, CJK→zh), (b) langdetect library, (c) Stopword-frequency heuristic for en/de/es/fr.
3. **Category Check**: If product_category is in MODEL_C_CATEGORIES (book, digital_ebook_purchase, electronics, pc) → route to Model C.
4. **Quality Check**: If text has ALL CAPS (>80% uppercase) or high word repetition (>50%) → route to Model B (robust to noisy input).
5. **Script Check**: If non-ASCII ratio > 30% OR has CJK/Arabic/Cyrillic characters → route to Model B.
6. **Language + Length Check**: If language is supported by Model A (en/de/es/fr) AND 15 ≤ text_length < 80 → route to Model A.
7. **Default**: Route to Model B.

---

### SLIDE 6: CONFIDENCE-BASED ESCALATION
- **Model A → Model B**: If Model A confidence < 0.55, the prediction is discarded and Model B re-processes the review. The response shows `model_used: "model_b_escalated"`.
- **Model B → Model C**: If Model B confidence < 0.35 AND the category qualifies (software, video_games, music, movies), Model C uses Model B's probability vector as input features. The response shows `model_used: "model_b_escalated_to_c"` and `base_model_used: "model_b"`.
- **Model A Language Fallback**: If no Model A variant exists for the detected language, falls back to Model B. Response shows `model_used: "model_b_language_fallback"`.
- This cascading design ensures the system always maximizes prediction accuracy by leveraging the strongest model when the first choice is uncertain.

---

### SLIDE 7: REST API DESIGN — ENDPOINTS TABLE
| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/health` | GET | Public | Service status, HF Space connectivity, Firestore status |
| `/predict` | POST | API Key | Single review prediction |
| `/predict/batch` | POST | API Key | Batch prediction (up to 500 reviews) with summary stats |
| `/human-review/queue` | GET | API Key | List pending human review items |
| `/human-review/{id}/label` | POST | API Key | Submit human label for a queued review |
| `/drift/run` | POST | API Key | Trigger drift detection analysis |
| `/drift/latest` | GET | API Key | Retrieve latest drift metrics |

- API documentation auto-generated via Swagger UI at `/docs` and ReDoc at `/redoc`.

---

### SLIDE 8: INPUT VALIDATION & SCHEMA ENFORCEMENT
- Built with **Pydantic v2** BaseModel classes for strict type checking.
- `ReviewRequest` schema enforces:
  - `review_body`: required, 1–10,000 chars, cannot be whitespace-only (custom `@field_validator`).
  - `review_title`: optional, max 500 chars, auto-stripped.
  - `language`: optional, 2–10 chars, auto-normalized to lowercase (e.g., "EN" → "en", "en-US" → "en").
  - `product_category`: required, auto-normalized to lowercase.
- `BatchReviewRequest`: wraps a list of `ReviewRequest` with `min_length=1, max_length=500`.
- `PredictionResponse`: enforces `predicted_stars` between 1–5, `confidence` between 0.0–1.0, `sentiment` as a Literal["positive", "neutral", "negative"].
- All 422 validation errors return structured JSON with field-level error details via custom `RequestValidationError` handler.

---

### SLIDE 9: EXCEPTION HANDLING
- **Custom Exception Handlers**:
  - `RequestValidationError` → 422 with field-level detail array (type, loc, msg, input, ctx).
  - `HTTPException` → structured JSON error body.
- **Inference Errors**: All model inference calls wrapped in try/except — ValueError → 400, generic Exception → 500 with logging.
- **Firestore Failures**: Non-blocking — if persistence fails, the prediction still returns successfully, but a warning is logged. The system degrades gracefully.
- **HF Space Unreachable**: 30-second timeout on single requests, 60-second timeout on batch. Returns clear error message.
- **Language Handling**: Previously, "auto-detect" was passed as a literal string causing a 422 (string too long for language field). Fixed by handling auto-detection on the frontend only and sending `null` to the backend.

---

### SLIDE 10: API KEY AUTHENTICATION
- Implemented via FastAPI's `APIKeyHeader` security dependency.
- The `get_api_key()` dependency reads `API_KEY` from environment variables.
- If `API_KEY` is not set (local development), all requests are allowed — zero-friction for developers.
- If `API_KEY` is set (production on Render), requests without a valid `X-API-Key` header receive 403 Forbidden.
- `/health` endpoint is excluded from authentication so monitoring tools and uptime checkers can still ping the service.
- Frontend reads the key from `VITE_API_KEY` environment variable and attaches it to every request via a `getHeaders()` utility function.

---

### SLIDE 11: BATCH INFERENCE — ARCHITECTURE
- The `/predict/batch` endpoint accepts up to 500 reviews in a single request.
- **Optimization Strategy**: Reviews are grouped by their selected model:
  - Model A items: processed individually (scikit-learn doesn't benefit from batching).
  - **Model B items: tokenized and processed as a single PyTorch tensor batch** — this is the key optimization. Instead of 500 individual forward passes, there is 1 batched forward pass through XLM-RoBERTa.
  - Model C items: processed individually but with pre-computed base probabilities.
- **Summary Statistics**: The response includes aggregate stats: count, average_stars, sentiment_distribution (positive/neutral/negative counts), total_latency_ms.
- **Batch Firestore Logging**: Uses Firestore's `write_batch()` for atomic, high-throughput persistence of all inference logs and HITL queue entries.
- Tested with 300 reviews from data.json: processed in 0.07 seconds locally.

---

### SLIDE 12: BATCH INFERENCE — RESPONSE FORMAT
Show the actual JSON response structure:
```json
{
  "predictions": [
    {
      "predicted_stars": 5,
      "sentiment": "positive",
      "confidence": 0.96,
      "model_used": "model_b",
      "resolved_language": "en",
      "language_was_detected": false,
      "inference_id": "uuid",
      "queued_for_review": false
    }
  ],
  "summary": {
    "count": 300,
    "average_stars": 4.46,
    "sentiment_distribution": {
      "positive": 270,
      "neutral": 13,
      "negative": 17
    },
    "total_latency_ms": 0.52
  }
}
```

---

### SLIDE 13: HUMAN-IN-THE-LOOP (HITL) SYSTEM
- Reviews are automatically queued for human verification based on:
  - **Low confidence** (below configurable threshold, default 0.60).
  - **Unsupported language** (language not in en/es/fr/de/ja/zh).
  - **Escalated model path** (review was escalated between models).
  - **Random audit sampling** (configurable rate, default 2%).
- Queue items have a priority (1 = highest for low confidence/unsupported language, 2 = escalated, 3 = random).
- Human reviewers can submit a corrected star rating, reviewer ID, and notes via `/human-review/{id}/label`.
- The frontend has a dedicated "Review Queue" tab showing pending items in a table with all inference details.

---

### SLIDE 14: MODEL DRIFT DETECTION
- Drift detection compares recent inference patterns against a historical baseline.
- Configurable parameters: `lookback_hours` (default 24), `baseline_days` (default 30), `min_samples` (default 200).
- Metrics tracked:
  - **Mean Predicted Stars Shift**: Statistical shift in average star rating.
  - **Confidence Distribution**: Changes in model confidence scores.
  - **Sentiment Distribution**: Shifts in positive/neutral/negative ratios.
- Three-tier alerting: `ok`, `warn`, `alert`.
- Results persisted to Firestore `drift_metrics` collection for historical tracking.
- Frontend has a "Drift Monitoring" view with charts and alert indicators.

---

### SLIDE 15: FIRESTORE PERSISTENCE LAYER
- **4 Firestore Collections**:
  1. `inference_log` — every prediction stored with review text, model used, confidence, latency, review hash (SHA-256 for deduplication).
  2. `human_review_queue` — items flagged for human review with reasons, priority, and status.
  3. `human_labels` — corrected labels submitted by human reviewers.
  4. `drift_metrics` — historical drift analysis results.
- **Authentication**: Supports 4 methods in priority order: `FIREBASE_CREDENTIALS_PATH`, `FIREBASE_CREDENTIALS_JSON`, project-local `firebase-service-account.json`, Application Default Credentials.
- **Private Key Handling**: The production deployment on Render required special handling of the `\n` characters in the Firebase private key. We parse the JSON from the environment variable and explicitly replace `\\n` with actual newlines to avoid "Invalid private key" errors.
- **Graceful Degradation**: If Firestore is unavailable or disabled (`FIRESTORE_ENABLED=false`), the API continues to serve predictions without persistence.

---

### SLIDE 16: DOCKERIZATION
- **Dockerfile**: Multi-stage build based on `python:3.11-slim`.
  - Installs PyTorch CPU-only (`torch==2.11.0` from `download.pytorch.org/whl/cpu`) — reduces image from ~2GB to ~300MB.
  - Copies only `api/` and `router/` code — model weights are NOT baked into the image (mounted at runtime or downloaded from HF Hub).
  - Runs as non-root user `appuser` (principle of least privilege).
  - `PYTHONUNBUFFERED=1` for real-time log visibility.
- **docker-compose.yml**: Mounts models directory and Firebase credentials as read-only volumes. Includes a healthcheck that pings `/health` every 30 seconds.
- **Environment Isolation**: All configuration via environment variables — no hardcoded secrets, paths, or URLs in the codebase.

---

### SLIDE 17: CI/CD PIPELINE
- **Two GitHub Actions workflows**:
  1. **Backend CI/CD** (`backend.yml`): Triggered on push/PR to `main` when `backend/**` files change.
     - Step 1: Install Python 3.11, pip install dependencies.
     - Step 2: Run `pytest` with `FIRESTORE_ENABLED=false` and `API_KEY=""` (tests run without external dependencies).
     - Step 3 (push to main only): Build Docker image and push to GitHub Container Registry (GHCR).
  2. **Frontend CI/CD** (`frontend.yml`): Triggered on push/PR to `main` when `frontend/**` files change.
     - Step 1: Install Node.js 20, npm install.
     - Step 2: Run `npm run build` with mock API URL.
     - Vercel automatically deploys on push to main (connected via Vercel GitHub integration).
- **Test Suite**: 69 tests across 7 test files covering schemas, API integration, Firestore service, batch processing, and security.

---

### SLIDE 18: TESTING STRATEGY
- **7 Test Files, 69 Total Tests**:
  - `test_schemas.py` (41 tests): Validates every Pydantic schema — field constraints, normalization, edge cases.
  - `test_api_testclient_integration.py` (10 tests): End-to-end API tests using FastAPI TestClient with mocked inference.
  - `test_api_firestore_features.py` (7 tests): Tests HITL queueing and drift endpoints.
  - `test_firestore_service.py` (6 tests): Unit tests for Firestore persistence logic.
  - `test_firestore_emulator_e2e.py` (2 tests, skipped in CI): Integration tests requiring Firestore emulator.
  - `test_batch_api.py` (1 test): Batch endpoint test using 5 samples from data.json.
  - `test_security.py` (2 tests): Verifies API Key enforcement (403 on missing/wrong key) and health endpoint remains public.
- **Mocking Strategy**: All external dependencies (HF Space API calls, Firestore client) are mocked in tests. Tests complete in ~9 seconds.

---

### SLIDE 19: STRESS TESTING & PERFORMANCE ANALYSIS
- **Batch Processing**: 300 reviews processed in 0.07 seconds (end-to-end through TestClient with mocked inference).
- **Single Inference Latency**: ~50ms for Model B (transformer), ~2ms for Model A (TF-IDF).
- **PyTorch Batching Optimization**: Model B batched inference processes 500 reviews in a single forward pass instead of 500 individual passes, reducing latency from ~25 seconds to ~2 seconds.
- **Firestore Write Batching**: Uses Firestore's native `write_batch()` to persist 300+ inference logs in a single atomic network round-trip.
- **Bottlenecks Identified**:
  - Cold start on Render (free tier): ~30 seconds for first request due to container spin-up.
  - HF Space cold start: ~60 seconds when models need to be downloaded from HF Hub.
  - Model B tokenization is CPU-bound; on GPU-enabled spaces, this is negligible.

---

### SLIDE 20: FRONTEND — REACT DASHBOARD
- Built with **React + TypeScript + Vite**.
- **4 Main Views**:
  1. **Simulator**: Submit a review with title, body, category, and language. See predicted stars, sentiment, confidence, model path, and decision reasons in real-time.
  2. **Results**: View all prediction results with detailed model routing information.
  3. **Review Queue**: Browse human review items with status, reasons, and ability to submit corrections.
  4. **Drift Monitor**: Visualize drift metrics with alert indicators and historical charts.
- **Mobile Responsive**: Sidebar collapses into a hamburger-toggled drawer on screens < 1024px. Tables wrapped in horizontal scroll containers.
- **API Key Integration**: Reads `VITE_API_KEY` from environment and attaches to all requests via `getHeaders()` utility.

---

### SLIDE 21: NOTEBOOK-TO-SERVICE GAP — WHAT BROKE IN DEPLOYMENT
1. **Private Key Newlines**: The Firebase private key contains literal `\n` characters. In a Jupyter notebook, loading from a JSON file works perfectly. On Render, the environment variable stores these as `\\n` (escaped), causing "Invalid private key" errors. **Fix**: Explicitly `.replace("\\n", "\n")` during credential parsing.
2. **"auto-detect" Language String**: The frontend was sending the literal string "auto-detect" as the language field. The schema allowed max 10 chars, and "auto-detect" is 11 chars → 422 error. In the notebook, language was always explicitly set. **Fix**: Send `null` from frontend when auto-detect is desired; handle detection server-side.
3. **Model File Sizes**: In the notebook, models loaded from local disk instantly. In deployment, the XLM-RoBERTa model (~1.1GB) needed to be hosted separately on HF Hub because Render's free tier has limited disk. **Fix**: Split architecture — models live on HF Spaces, backend on Render.
4. **CORS Issues**: Notebook had no CORS concept. The React frontend on Vercel couldn't reach the Render backend until `CORSMiddleware` was configured with `allow_origins=["*"]`.
5. **Import Path Differences**: Running `uvicorn api.main:app` from the project root works locally, but Docker's `WORKDIR /app` changes the module resolution. **Fix**: `sys.path.insert(0, ...)` to explicitly add the project root.

---

### SLIDE 22: ROBUSTNESS & RELIABILITY ANALYSIS
- **Malformed Inputs**: Empty strings → 422 with "review_body cannot be empty or whitespace only". Unicode-only text → gracefully handled by Model B (multilingual). Extremely long reviews (>10,000 chars) → rejected by schema.
- **Unexpected Languages**: Arabic, Russian, Chinese → auto-detected and routed to Model B. Unsupported language with Model A → falls back to Model B with `model_b_language_fallback`.
- **Low Quality Text**: ALL CAPS or high word repetition → detected by `compute_text_signals()` and routed to Model B (most robust).
- **Extreme Inputs**: Reviews with only emojis, HTML tags, or special characters → Model B handles gracefully (XLM-RoBERTa tokenizer processes subword tokens).
- **Service Degradation**: Firestore down → predictions still served, just not persisted. HF Space down → clear 503/timeout error. API Key missing → 403 with clear message.

---

### SLIDE 23: MaaS (MODEL AS A SERVICE) INTEGRATION
- The `/predict/batch` endpoint enables any external application to use ReviewRoute as a service.
- **Use Case**: A business owner uploads a CSV of product reviews → the MaaS consumer (e.g., a Node.js/Express app) sends them to the batch endpoint → receives predictions + summary statistics → stores the summary in their own database for a review analytics dashboard.
- **Integration requires**:
  1. An API Key (set in `X-API-Key` header).
  2. JSON body with `reviews` array.
  3. Each review needs only `review_body` (required) and `product_category` (required). Title and language are optional.
- **Code examples provided** for both Node.js (axios) and React (fetch) consumers.

---

### SLIDE 24: ARCHITECTURAL DECISION — LONG-TERM CONSEQUENCES
**Decision**: Separating the inference engine (HF Space) from the API gateway (Render).

**Why**: We initially tried deploying everything (FastAPI + PyTorch models) on a single Render instance. The XLM-RoBERTa model consumed ~1.5GB RAM, and with Firestore + API logic, the free tier kept OOM-killing the container. Splitting the inference into a dedicated HF Space with its own GPU/CPU resources was a pivotal decision.

**Positive Consequences**:
- Models can be updated independently without redeploying the API.
- HF Spaces provides free GPU inference for academic projects.
- The API gateway stays lightweight (~50MB Docker image vs ~2GB with models).
- Batch processing can be optimized at the inference level without affecting API logic.

**Negative Consequences**:
- Added network latency (~100ms per request for Render → HF Space round trip).
- Two deployment targets to manage instead of one.
- HF Space cold starts add ~60 seconds of latency for the first request after idle.
- Debugging is harder — need to check logs on both Render and HF Spaces.

**Verdict**: The trade-off was worth it. The system is more scalable, maintainable, and cost-effective.

---

### SLIDE 25: PROBLEMS FACED & HOW WE SOLVED THEM
| Problem | Impact | Solution |
|---|---|---|
| Firebase private key `\n` encoding | 503 on all Firestore operations | Explicit `.replace("\\n", "\n")` in credential parsing |
| "auto-detect" as language string | 422 validation error | Frontend sends `null`, backend auto-detects |
| Render OOM with PyTorch models | Container crashes | Split to HF Space for inference |
| Vercel build output directory | Deployment fail ("No Output Directory named 'build'") | Added `vercel.json` with `"outputDirectory": "dist"` for Vite |
| CORS blocking frontend requests | Network errors on every API call | Added `CORSMiddleware` with `allow_origins=["*"]` |
| Mock data showing on frontend | UI shows fake data, not real data | Replaced mock data with live Firestore-backed API calls |
| HF Space cold starts | First request takes ~60s | Health check polling on frontend shows loading state |
| Test failures after adding API Key | All existing tests blocked by 403 | Added `monkeypatch.setenv("API_KEY", "")` to test fixtures |

---

### SLIDE 26: ENGINEERING DISCIPLINE
- **Version Control**: Git with GitHub — all changes tracked, CI/CD automated.
- **Environment Isolation**: `.env` files for local, environment variables on Render/Vercel/HF — no secrets in code.
- **Test-Driven Development**: 69 automated tests run on every push.
- **Code Quality**: Pydantic for type safety, custom validators for input normalization, structured logging throughout.
- **Security**: API Key authentication, non-root Docker user, read-only volume mounts.
- **Reproducibility**: Docker image ensures identical environment across machines. `requirements.txt` pins all dependency versions.

---

### SLIDE 27: LIVE DEPLOYMENT LINKS
- **Frontend**: [Vercel URL] (React Dashboard)
- **Backend API**: https://reviewroute-backend.onrender.com
  - Swagger Docs: https://reviewroute-backend.onrender.com/docs
  - Health Check: https://reviewroute-backend.onrender.com/health
- **Inference Engine**: Hugging Face Spaces (private)
- **Source Code**: GitHub Repository

---

### SLIDE 28: DEMO PLAN (FOR LIVE PRESENTATION)
1. Show `/health` endpoint returning ok status (public, no key needed).
2. Submit a single English review via Swagger UI → show prediction with Model A.
3. Submit a German review → show language-specific Model A variant.
4. Submit a Japanese review → show auto-detection routing to Model B.
5. Submit a "book" category review → show Model C with `base_model_used` field.
6. Show batch endpoint with 10 reviews → display summary statistics.
7. Show Human Review Queue on the frontend dashboard.
8. Show API Key enforcement: remove key → 403 error.

---

### SLIDE 29: KEY TAKEAWAYS
- **System > Model accuracy**: The routing, escalation, HITL, and drift detection make the system robust regardless of individual model performance.
- **Engineering maturity > algorithmic novelty**: Focus on validation, error handling, CI/CD, testing, and deployment rather than chasing accuracy percentages.
- **Reproducibility**: Docker + environment variables + CI/CD ensures any team member can run the system identically.
- **Clear failures with analysis**: Every problem (Firebase keys, CORS, OOM) was documented with root cause and fix — not hidden.

---

### SLIDE 30: THANK YOU / Q&A
- Summary of deliverables:
  - REST API (FastAPI) with 7 endpoints ✓
  - Input validation and schema enforcement ✓
  - Exception handling ✓
  - Stress testing (300 reviews, 0.07s) ✓
  - API documentation (Swagger/OpenAPI) ✓
  - Dockerized AI service ✓
  - CI/CD pipeline (GitHub Actions) ✓
  - API Key security ✓
  - Live deployment ✓

---

## STYLE INSTRUCTIONS
- Use a dark theme with deep blue/purple gradient backgrounds.
- Use white and light gray text for readability.
- Code snippets should use a dark code block with syntax highlighting.
- Architecture diagrams should use clean boxes with connecting arrows.
- Use icons for different components (cloud icon for deployment, lock icon for security, chart icon for drift, etc.).
- Keep text concise on slides — use speaker notes for detailed explanations.
- Add slide numbers.

## PROMPT END