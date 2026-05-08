from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd

from ml_core.config import MODEL_DIR
from ml_core.pipeline.feature_engineer import engineer_churn, engineer_retail


def _latest_model_path(prefix: str) -> Path:
    model_dir = Path(MODEL_DIR)
    if not model_dir.exists():
        raise FileNotFoundError(f"model directory does not exist: {model_dir}")
    candidates = sorted(model_dir.glob(f"{prefix}_v*.joblib"))
    if not candidates:
        raise FileNotFoundError(f"no saved model found for prefix '{prefix}' in {model_dir}")

    def _version(p: Path) -> int:
        return int(p.stem.split("_v")[-1])

    return max(candidates, key=_version)


def _infer_model_type(df: pd.DataFrame) -> str:
    retail_cols = {"InvoiceDate", "Quantity"}
    churn_cols = {"tenure", "MonthlyCharges", "TotalCharges"}
    credit_cols = {"Time", "Amount", "V1", "V2"}

    if retail_cols.issubset(df.columns):
        return "forecaster"
    if churn_cols.issubset(df.columns):
        return "classifier"
    if credit_cols.issubset(df.columns):
        return "anomaly"
    raise ValueError(
        "could not infer model_type from columns; expected retail, churn, or credit schema"
    )


def predict(df: pd.DataFrame, model_type: Optional[str] = None) -> dict:
    if not isinstance(df, pd.DataFrame) or df.empty:
        raise ValueError("df must be a non-empty pandas DataFrame")

    if model_type is None or str(model_type).strip() == "":
        model_type = _infer_model_type(df)
    else:
        model_type = str(model_type).strip().lower()

    cluster_label = None
    anomaly_flag = False
    pca_x = None
    pca_y = None
    historical_data = None

    if model_type == "forecaster":
        model = joblib.load(_latest_model_path("forecaster"))
        X, _ = engineer_retail(df)
        if X.empty:
            raise ValueError("insufficient retail history to build lag features for prediction")
        pred_value = float(model.predict(X.tail(1))[0])
        confidence = 1.0
        model_name = _latest_model_path("forecaster").stem

        # Extract historical data manually for the frontend chart
        df_copy = df.copy()
        if "Price" in df_copy.columns and "UnitPrice" not in df_copy.columns:
            df_copy = df_copy.rename(columns={"Price": "UnitPrice"})
        df_copy["InvoiceDate"] = pd.to_datetime(df_copy["InvoiceDate"], errors="coerce")
        df_copy = df_copy.dropna(subset=["InvoiceDate"])
        df_copy["revenue"] = df_copy["Quantity"] * df_copy["UnitPrice"]
        df_copy["month"] = df_copy["InvoiceDate"].dt.to_period("M").dt.to_timestamp()
        monthly = df_copy.groupby("month", as_index=False)["revenue"].sum().sort_values("month")
        
        historical_data = [
            {"date": row["month"].strftime("%Y-%m-%d"), "actual": float(row["revenue"])}
            for _, row in monthly.tail(12).iterrows()
        ]

    elif model_type == "classifier":
        best_path = Path(MODEL_DIR) / "classifier_best.joblib"
        model_path = best_path if best_path.exists() else _latest_model_path("classifier")
        model = joblib.load(model_path)

        # load training scaler so inference scaling matches training distribution
        scaler_path = Path(MODEL_DIR) / "churn_scaler_v1.joblib"
        saved_scaler = joblib.load(scaler_path) if scaler_path.exists() else None

        X, _, _ = engineer_churn(df, scaler=saved_scaler)
        if len(X) == 0:
            raise ValueError("churn dataframe produced no features for prediction")

        proba = model.predict_proba(X)
        pred_value = float(np.mean(proba[:, 1]))
        confidence = float(np.mean(np.max(proba, axis=1)))
        model_name = model_path.stem

        kmeans_path = Path(MODEL_DIR) / "kmeans_v1.joblib"
        if kmeans_path.exists():
            cluster_label = int(joblib.load(kmeans_path).predict(X[-1:].astype(float))[0])

        pca_path = Path(MODEL_DIR) / "pca_v1.joblib"
        if pca_path.exists():
            coords = joblib.load(pca_path).transform(X[-1:].astype(float))[0]
            pca_x, pca_y = float(coords[0]), float(coords[1])

        anomaly_path = Path(MODEL_DIR) / "anomaly_v1.joblib"
        if anomaly_path.exists():
            anomaly_model = joblib.load(anomaly_path)
            if anomaly_model.n_features_in_ == X.shape[1]:
                anomaly_flag = bool(int(anomaly_model.predict(X[-1:].astype(float))[0]) == 1)

    elif model_type == "anomaly":
        model = joblib.load(_latest_model_path("anomaly"))
        credit_features = df.copy()
        if "Class" in credit_features.columns:
            credit_features = credit_features.drop(columns=["Class"])
        credit_features = credit_features.select_dtypes(include=[np.number])
        if credit_features.empty:
            raise ValueError("credit dataframe did not provide numeric features for anomaly scoring")

        X_np = credit_features.to_numpy(dtype=float)
        proba = model.predict_proba(X_np)
        pred_value = float(np.mean(proba[:, 1]))
        confidence = float(np.mean(np.max(proba, axis=1)))
        model_name = _latest_model_path("anomaly").stem
        anomaly_flag = bool(int(model.predict(credit_features.tail(1).to_numpy(dtype=float))[0]) == 1)

    else:
        raise ValueError("model_type must be 'forecaster', 'classifier', or 'anomaly'")

    return {
        "prediction": pred_value,
        "confidence": confidence,
        "model_name": model_name,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "cluster_label": cluster_label,
        "anomaly_flag": anomaly_flag,
        "pca_x": pca_x,
        "pca_y": pca_y,
        "historical_data": historical_data,
    }
