from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import TimeSeriesSplit, cross_val_score

from ml_core.config import MODEL_DIR, RANDOM_SEED


def train_forecaster(X_train: np.ndarray, y_train: np.ndarray) -> Ridge:
    model = Ridge(alpha=1.0)
    model.fit(X_train, y_train)
    return model


def evaluate_forecaster(model, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, float]:
    preds = model.predict(X_test)
    return {
        "mae":  float(mean_absolute_error(y_test, preds)),
        "rmse": float(np.sqrt(mean_squared_error(y_test, preds))),
        "r2":   float(r2_score(y_test, preds)),
    }


def save_forecaster(model, version: int = 1) -> Path:
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"forecaster_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_forecaster(version: int = 1):
    path = Path(MODEL_DIR) / f"forecaster_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"forecaster model not found at {path}")
    return joblib.load(path)


def choose_and_save_best_forecaster(
    X: np.ndarray, y: np.ndarray, version: int = 1
) -> Tuple[str, float, Path]:
    candidates = {
        "ridge": Ridge(alpha=1.0),
        "random_forest": RandomForestRegressor(n_estimators=200, min_samples_leaf=2, random_state=RANDOM_SEED),
        "gradient_boosting": GradientBoostingRegressor(
            n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.8, random_state=RANDOM_SEED
        ),
    }

    # TimeSeriesSplit respects temporal order for revenue forecasting
    cv = TimeSeriesSplit(n_splits=3)
    scores: Dict[str, float] = {
        name: float(np.mean(cross_val_score(model, X, y, cv=cv, scoring="r2")))
        for name, model in candidates.items()
    }

    best_name = max(scores, key=scores.get)
    best_model = candidates[best_name]
    best_model.fit(X, y)

    path = Path(MODEL_DIR)
    path.mkdir(parents=True, exist_ok=True)
    best_path = path / f"forecaster_v{version}.joblib"
    joblib.dump(best_model, best_path)
    return best_name, scores[best_name], best_path
