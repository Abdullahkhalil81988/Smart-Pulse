from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from api.schemas import PredictionResult, TrainRequest
from typing import Optional
import pandas as pd
import subprocess
import sys
import os
import io
import json

router = APIRouter(prefix="/api/v1", tags=["ML"])

_last_train_meta = {}

RETAIL_CSV = "datasets/retail_test.csv"
CHURN_CSV  = "datasets/churn_test.csv"
CREDIT_CSV = "datasets/creditcard.csv"

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
            detail=f"Training failed: {result.stderr}")

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

    models_dir = "ml_core/models"
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
    models_dir = "ml_core/models"
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

    return {
        "last_training":   _last_train_meta if _last_train_meta else "No training run yet",
        "model_artifacts": artifacts,
        "artifact_count":  len(artifacts),
        "model_metadata":  metadata,
    }