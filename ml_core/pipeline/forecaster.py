from pathlib import Path
from typing import Dict

import joblib
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml_core.config import MODEL_DIR


def train_forecaster(X_train: np.ndarray, y_train: np.ndarray) -> LinearRegression:
    # linear regression is a strong baseline for lag-based revenue forecasting
    model = LinearRegression()
    # fit on historical lag features so future revenue can be extrapolated
    model.fit(X_train, y_train)
    return model


def evaluate_forecaster(
    model: LinearRegression, X_test: np.ndarray, y_test: np.ndarray
) -> Dict[str, float]:
    # predict on holdout data so metrics reflect generalization quality
    preds = model.predict(X_test)
    # mae gives absolute error magnitude in revenue units
    mae = float(mean_absolute_error(y_test, preds))
    # rmse penalizes larger misses more heavily than mae
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    # r2 shows how much variance in revenue is explained by the model
    r2 = float(r2_score(y_test, preds))
    return {"mae": mae, "rmse": rmse, "r2": r2}


def save_forecaster(model: LinearRegression, version: int = 1) -> Path:
    # ensure target folder exists so save never fails on fresh clones
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    # versioned filenames let us keep audit-friendly model history
    model_path = model_dir / f"forecaster_v{version}.joblib"
    joblib.dump(model, model_path)
    return model_path


def load_forecaster(version: int = 1) -> LinearRegression:
    # use deterministic path so p2 can load the exact expected artifact
    model_path = Path(MODEL_DIR) / f"forecaster_v{version}.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            f"forecaster model not found at {model_path}. train and save it first"
        )
    return joblib.load(model_path)
