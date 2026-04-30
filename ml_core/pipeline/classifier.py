from pathlib import Path
from typing import Any, Dict, Tuple

import joblib
import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC

from ml_core.config import MODEL_DIR, RANDOM_SEED


def train_classifier(X_train: np.ndarray, y_train: np.ndarray) -> LogisticRegression:
    # class_weight balances minority churn class without oversampling
    model = LogisticRegression(max_iter=1000, random_state=RANDOM_SEED, class_weight="balanced")
    model.fit(X_train, y_train)
    return model


def train_svm_classifier(X_train: np.ndarray, y_train: np.ndarray) -> SVC:
    model = SVC(probability=True, random_state=RANDOM_SEED, class_weight="balanced")
    model.fit(X_train, y_train)
    return model


def train_mlp_classifier(X_train: np.ndarray, y_train: np.ndarray) -> MLPClassifier:
    model = MLPClassifier(hidden_layer_sizes=(128, 64), activation="relu", max_iter=500, random_state=RANDOM_SEED)
    model.fit(X_train, y_train)
    return model


def evaluate_classifier(model: Any, X_test: np.ndarray, y_test: np.ndarray) -> Dict[str, object]:
    preds = model.predict(X_test)
    return {
        "accuracy":         float(accuracy_score(y_test, preds)),
        "precision":        float(precision_score(y_test, preds, zero_division=0)),
        "recall":           float(recall_score(y_test, preds, zero_division=0)),
        "f1":               float(f1_score(y_test, preds, zero_division=0)),
        "confusion_matrix": confusion_matrix(y_test, preds).tolist(),
    }


def save_classifier(model, version: int = 1) -> Path:
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"classifier_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_classifier(version: int = 1):
    path = Path(MODEL_DIR) / f"classifier_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"classifier model not found at {path}")
    return joblib.load(path)


def choose_and_save_best_classifier(X: np.ndarray, y: np.ndarray) -> Tuple[str, float, Path]:
    candidates = {
        "logistic": LogisticRegression(max_iter=1000, random_state=RANDOM_SEED, class_weight="balanced"),
        "random_forest": RandomForestClassifier(
            n_estimators=300, max_depth=None, min_samples_leaf=2, class_weight="balanced", random_state=RANDOM_SEED
        ),
        "gradient_boosting": GradientBoostingClassifier(
            n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.8, random_state=RANDOM_SEED
        ),
        "mlp": MLPClassifier(hidden_layer_sizes=(128, 64), activation="relu", max_iter=500, random_state=RANDOM_SEED),
    }

    # StratifiedKFold preserves churn class ratio in every fold
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
    scores: Dict[str, float] = {
        name: float(np.mean(cross_val_score(model, X, y, cv=cv, scoring="f1")))
        for name, model in candidates.items()
    }

    best_name = max(scores, key=scores.get)
    best_model = candidates[best_name]
    best_model.fit(X, y)

    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    best_path = model_dir / "classifier_best.joblib"
    joblib.dump(best_model, best_path)
    return best_name, scores[best_name], best_path
