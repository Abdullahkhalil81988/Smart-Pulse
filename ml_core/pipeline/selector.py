from typing import Dict

import numpy as np
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC

from ml_core.config import RANDOM_SEED


def select_model(
    X: np.ndarray, y: np.ndarray, task: str = "classification"
) -> Dict[str, object]:
    # normalize task input to reduce fragile behavior from case differences
    task = task.strip().lower()

    if task == "classification":
        # compare linear and non-linear classifiers to maximize churn f1 score
        candidates = {
            "LogisticRegression": LogisticRegression(
                max_iter=1000,
                random_state=RANDOM_SEED,
            ),
            "SVC": SVC(probability=True, random_state=RANDOM_SEED),
            "MLPClassifier": MLPClassifier(
                hidden_layer_sizes=(100, 100),
                activation="relu",
                max_iter=500,
                random_state=RANDOM_SEED,
            ),
        }
        scoring = "f1"
    elif task == "regression":
        # phase 1 regression baseline is linear regression
        candidates = {"LinearRegression": LinearRegression()}
        scoring = "r2"
    else:
        raise ValueError("task must be either 'classification' or 'regression'")

    all_scores: Dict[str, float] = {}
    for model_name, model in candidates.items():
        # cross_val_score rotates train/test folds so each sample is validated once
        cv_scores = cross_val_score(model, X, y, cv=5, scoring=scoring)
        # use fold mean as stable summary for model ranking
        all_scores[model_name] = float(np.mean(cv_scores))

    # choose model with the highest mean validation score
    best_model_name = max(all_scores, key=all_scores.get)
    best_score = all_scores[best_model_name]
    return {
        "best_model_name": best_model_name,
        "best_score": best_score,
        "all_scores": all_scores,
    }
