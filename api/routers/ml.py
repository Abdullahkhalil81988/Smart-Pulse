from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from api.schemas import PredictionResult, TrainRequest
from typing import Optional
import pandas as pd
import subprocess
import sys
import os
import io
import json
from ml_core.config import MODEL_DIR

router = APIRouter(prefix="/api/v1", tags=["ML"])

_last_train_meta = {}

RETAIL_CSV = os.environ.get("RETAIL_CSV", "datasets/online_retail_II.csv")
CHURN_CSV  = os.environ.get("CHURN_CSV",  "datasets/WA_Fn-UseC_-Telco-Customer-Churn.csv")
CREDIT_CSV = os.environ.get("CREDIT_CSV", "datasets/creditcard.csv")
UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "uploads")

@router.post("/ingest")
async def ingest(file: UploadFile = File(...)):
    """Accept a CSV upload, validate it, and store it in uploads/ for training."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV has no rows")

    # strip path components to prevent directory traversal attacks
    safe_filename = os.path.basename(file.filename)
    if not safe_filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    dest = os.path.join(UPLOADS_DIR, safe_filename)
    with open(dest, "wb") as f:
        f.write(contents)

    return {
        "status": "ingested",
        "filename": safe_filename,
        "rows": len(df),
        "columns": list(df.columns),
        "saved_to": dest,
    }


@router.get("/datasets/status")
def dataset_status():
    return {
        "retail_csv_found": os.path.exists(RETAIL_CSV),
        "churn_csv_found":  os.path.exists(CHURN_CSV),
        "credit_csv_found": os.path.exists(CREDIT_CSV),
    }

@router.post("/train")
def train(model_type: str = "both", version: int = 1):
    if not os.path.exists(RETAIL_CSV):
        raise HTTPException(status_code=500,
            detail=f"Retail dataset not found at {RETAIL_CSV}.")
    if not os.path.exists(CHURN_CSV):
        raise HTTPException(status_code=500,
            detail=f"Churn dataset not found at {CHURN_CSV}.")

    cmd = [
        sys.executable, "-m", "ml_core.pipeline.train_entrypoint",
        "--retail-csv", RETAIL_CSV,
        "--churn-csv",  CHURN_CSV,
        "--version", str(version)
    ]
    if os.path.exists(CREDIT_CSV):
        cmd += ["--credit-csv", CREDIT_CSV]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise HTTPException(status_code=500,
            detail=f"Training failed:\nSTDERR: {result.stderr}\nSTDOUT: {result.stdout}")

    global _last_train_meta
    _last_train_meta = {
        "model_type": model_type,
        "version": version,
        "retail_csv": RETAIL_CSV,
        "churn_csv":  CHURN_CSV,
        "credit_csv": CREDIT_CSV if os.path.exists(CREDIT_CSV) else "not provided",
    }
    return {"status": "trained", **_last_train_meta}

@router.post("/predict", response_model=PredictionResult)
async def predict(
    file: UploadFile = File(...),
    model_type: Optional[str] = Query(default=None)
):
    if model_type is not None and model_type not in ["forecaster", "classifier", "anomaly"]:
        raise HTTPException(status_code=400,
            detail="model_type must be 'forecaster', 'classifier', or 'anomaly'")

    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files accepted")

    contents = await file.read()
    try:
        df = pd.read_csv(io.BytesIO(contents))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not parse CSV: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="CSV is empty")

    models_dir = MODEL_DIR
    if not os.path.exists(models_dir) or not any(
        f.endswith(".joblib") for f in os.listdir(models_dir)
    ):
        raise HTTPException(status_code=400,
            detail="No trained models found. Call /train first.")

    try:
        from ml_core.pipeline.predictor import predict as ml_predict
        result = ml_predict(df, model_type)
        return PredictionResult(**result)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=f"Model artifact missing: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.get("/report")
def report():
    models_dir = MODEL_DIR
    artifacts = []
    metadata = {}

    if os.path.exists(models_dir):
        artifacts = [f for f in os.listdir(models_dir) if f.endswith(".joblib")]
        for f in os.listdir(models_dir):
            if f.endswith(".json"):
                path = os.path.join(models_dir, f)
                try:
                    with open(path) as fp:
                        metadata[f] = json.load(fp)
                except Exception:
                    pass

    # categorise each artifact clearly
    model_summary = {
        "forecaster":   [f for f in artifacts if "forecaster" in f],
        "classifier":   [f for f in artifacts if "classifier" in f],
        "clustering":   [f for f in artifacts if "kmeans" in f],
        "pca":          [f for f in artifacts if "pca" in f],
        "scaler":       [f for f in artifacts if "scaler" in f],
        "anomaly":      [f for f in artifacts if "anomaly" in f],
    }

    return {
        "last_training":   _last_train_meta if _last_train_meta else "No training run yet",
        "model_summary":   model_summary,
        "model_artifacts": artifacts,
        "artifact_count":  len(artifacts),
        "anomaly_model_available": any("anomaly" in f for f in artifacts),
        "credit_csv_provided": os.path.exists(CREDIT_CSV),
        "model_metadata":  metadata,
    }