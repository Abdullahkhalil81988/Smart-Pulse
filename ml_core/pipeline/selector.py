from typing import Dict

import numpy as np
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier, RandomForestRegressor
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.model_selection import KFold, StratifiedKFold, TimeSeriesSplit, cross_val_score
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC

from ml_core.config import RANDOM_SEED


def select_model(
    X: np.ndarray, y: np.ndarray, task: str = "classification"
) -> Dict[str, object]:
    task = task.strip().lower()

    if task == "classification":
        candidates = {
            "LogisticRegression": LogisticRegression(
                max_iter=1000, random_state=RANDOM_SEED, class_weight="balanced"
            ),
            "RandomForest": RandomForestClassifier(
                n_estimators=300, min_samples_leaf=2, class_weight="balanced", random_state=RANDOM_SEED
            ),
            "GradientBoosting": GradientBoostingClassifier(
                n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.8, random_state=RANDOM_SEED
            ),
            "SVC": SVC(probability=True, random_state=RANDOM_SEED, class_weight="balanced"),
            "MLPClassifier": MLPClassifier(
                hidden_layer_sizes=(128, 64),
                activation="relu",
                max_iter=500,
                random_state=RANDOM_SEED,
            ),
        }
        cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_SEED)
        scoring = "f1"
    elif task == "regression":
        candidates = {
            "Ridge": Ridge(alpha=1.0),
            "RandomForest": RandomForestRegressor(
                n_estimators=200, min_samples_leaf=2, random_state=RANDOM_SEED
            ),
            "GradientBoosting": GradientBoostingRegressor(
                n_estimators=200, learning_rate=0.05, max_depth=4, subsample=0.8, random_state=RANDOM_SEED
            ),
        }
        cv = TimeSeriesSplit(n_splits=5)
        scoring = "r2"
    else:
        raise ValueError("task must be either 'classification' or 'regression'")

    all_scores: Dict[str, float] = {}
    for model_name, model in candidates.items():
        cv_scores = cross_val_score(model, X, y, cv=cv, scoring=scoring)
        all_scores[model_name] = float(np.mean(cv_scores))

    best_model_name = max(all_scores, key=all_scores.get)
    best_score = all_scores[best_model_name]
    return {
        "best_model_name": best_model_name,
        "best_score": best_score,
        "all_scores": all_scores,
    }
