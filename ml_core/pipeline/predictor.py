from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

from ml_core.config import MODEL_DIR
from ml_core.pipeline.feature_engineer import engineer_churn, engineer_retail


def _latest_model_path(prefix: str) -> Path:
    # gather all versioned artifacts so inference always picks the newest trained model
    model_dir = Path(MODEL_DIR)
    if not model_dir.exists():
        raise FileNotFoundError(f"model directory does not exist: {model_dir}")

    # restrict matches to expected naming pattern for safety
    candidates = sorted(model_dir.glob(f"{prefix}_v*.joblib"))
    if not candidates:
        raise FileNotFoundError(f"no saved model found for prefix '{prefix}' in {model_dir}")

    # parse numeric suffix and pick highest version number
    def _extract_version(path: Path) -> int:
        stem = path.stem
        return int(stem.split("_v")[-1])

    return max(candidates, key=_extract_version)


def _infer_model_type(df: pd.DataFrame) -> str:
    # detect retail schema by checking core retail revenue columns
    retail_cols = {"InvoiceDate", "Quantity", "UnitPrice"}
    # detect churn schema by checking core churn prediction columns
    churn_cols = {"tenure", "MonthlyCharges", "TotalCharges", "Churn"}

    if retail_cols.issubset(df.columns):
        return "forecaster"
    if churn_cols.issubset(df.columns):
        return "classifier"
    raise ValueError(
        "could not infer model_type from dataframe columns; expected retail or churn schema"
    )


def predict(df: pd.DataFrame, model_type: Optional[str] = None) -> dict:
    # validate input early because downstream feature logic expects tabular data
    if not isinstance(df, pd.DataFrame) or df.empty:
        raise ValueError("df must be a non-empty pandas DataFrame")

    # auto-detect when caller omits model_type so p2 can pass raw data directly
    if model_type is None or str(model_type).strip() == "":
        model_type = _infer_model_type(df)
    else:
        model_type = str(model_type).strip().lower()

    # keep phase-2 optional outputs initialized even when related models are absent
    cluster_label = None
    anomaly_flag = False
    pca_x = None
    pca_y = None

    if model_type == "forecaster":
        # load latest forecaster artifact so serving tracks newest training output
        model_path = _latest_model_path("forecaster")
        model = joblib.load(model_path)

        # rebuild lag features from raw retail rows because caller sends unprocessed data
        X, _ = engineer_retail(df)
        if X.empty:
            raise ValueError("insufficient retail history to build lag features for prediction")

        # predict from the latest available lag row as next-step revenue estimate
        latest_features = X.tail(1)
        pred_value = float(model.predict(latest_features)[0])

        # phase 1 regression confidence is fixed by contract
        confidence = 1.0
        model_name = model_path.stem
    elif model_type == "classifier":
        # prefer explicit best-model artifact from selector if it exists
        best_path = Path(MODEL_DIR) / "classifier_best.joblib"
        if best_path.exists():
            model_path = best_path
        else:
            # fallback to latest versioned classifier when best artifact is not present
            model_path = _latest_model_path("classifier")
        model = joblib.load(model_path)

        # rebuild churn features from raw churn rows before scoring
        X, _, _ = engineer_churn(df)
        if X.size == 0:
            raise ValueError("churn dataframe produced no features for prediction")

        # use positive-class probability as churn risk output in [0, 1]
        proba = model.predict_proba(X)
        pred_value = float(np.mean(proba[:, 1]))

        # contract asks for max class probability as confidence
        confidence = float(np.max(np.mean(proba, axis=0)))
        model_name = model_path.stem

        # if kmeans exists, attach cluster for the latest row to enrich dashboard views
        kmeans_path = Path(MODEL_DIR) / "kmeans_v1.joblib"
        if kmeans_path.exists():
            kmeans_model = joblib.load(kmeans_path)
            cluster_label = int(kmeans_model.predict(X[-1:].astype(float))[0])

        # if pca exists, project latest row into 2d chart coordinates
        pca_path = Path(MODEL_DIR) / "pca_v1.joblib"
        if pca_path.exists():
            pca_model = joblib.load(pca_path)
            pca_coords = pca_model.transform(X[-1:].astype(float))[0]
            pca_x = float(pca_coords[0])
            pca_y = float(pca_coords[1])

        # if anomaly detector exists, set alert flag for latest input sample
        anomaly_path = Path(MODEL_DIR) / "anomaly_v1.joblib"
        if anomaly_path.exists():
            anomaly_model = joblib.load(anomaly_path)
            anomaly_pred = anomaly_model.predict(X[-1:].astype(float))[0]
            anomaly_flag = bool(int(anomaly_pred) == 1)
    else:
        raise ValueError("model_type must be 'forecaster' or 'classifier'")

    # emit utc timestamp in iso 8601 so api and dashboard can sort consistently
    timestamp = datetime.now(timezone.utc).isoformat()

    # keep response schema exact to preserve p2/p3 integration contract
    return {
        "prediction": pred_value,
        "confidence": confidence,
        "model_name": model_name,
        "timestamp": timestamp,
        "cluster_label": cluster_label,
        "anomaly_flag": anomaly_flag,
        "pca_x": pca_x,
        "pca_y": pca_y,
    }
