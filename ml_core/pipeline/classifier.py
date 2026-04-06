from pathlib import Path
from typing import Dict, Tuple

import joblib
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import cross_val_score
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC

from ml_core.config import MODEL_DIR, RANDOM_SEED


def train_classifier(X_train: np.ndarray, y_train: np.ndarray) -> LogisticRegression:
    # max_iter=1000 avoids common non-convergence issues on churn-style tabular data
    model = LogisticRegression(max_iter=1000, random_state=RANDOM_SEED)
    # train on standardized feature vectors to estimate churn probability boundaries
    model.fit(X_train, y_train)
    return model


def train_svm_classifier(X_train: np.ndarray, y_train: np.ndarray) -> SVC:
    # probability=true is required because api responses need churn probabilities
    model = SVC(probability=True, random_state=RANDOM_SEED)
    # fit on churn features to learn non-linear class boundaries
    model.fit(X_train, y_train)
    return model


def train_mlp_classifier(X_train: np.ndarray, y_train: np.ndarray) -> MLPClassifier:
    # two hidden layers provide stronger capacity for complex churn patterns
    model = MLPClassifier(
        hidden_layer_sizes=(100, 100),
        activation="relu",
        max_iter=500,
        random_state=RANDOM_SEED,
    )
    # train neural network on standardized churn features
    model.fit(X_train, y_train)
    return model


def evaluate_classifier(
    model: LogisticRegression, X_test: np.ndarray, y_test: np.ndarray
) -> Dict[str, object]:
    # use holdout predictions so metrics reflect unseen-customer performance
    preds = model.predict(X_test)
    # accuracy is useful high-level signal but can hide class imbalance issues
    accuracy = float(accuracy_score(y_test, preds))
    # precision tracks how often predicted churn users truly churn
    precision = float(precision_score(y_test, preds, zero_division=0))
    # recall tracks how many true churn users we successfully catch
    recall = float(recall_score(y_test, preds, zero_division=0))
    # f1 balances precision and recall for a single robust optimization target
    f1 = float(f1_score(y_test, preds, zero_division=0))
    # confusion matrix exposes false positives/negatives for debugging threshold behavior
    cm = confusion_matrix(y_test, preds).tolist()
    return {
        "accuracy": accuracy,
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "confusion_matrix": cm,
    }


def save_classifier(model: LogisticRegression, version: int = 1) -> Path:
    # ensure target folder exists so first-time saves work in clean environments
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    # versioned naming keeps rollback and traceability straightforward
    model_path = model_dir / f"classifier_v{version}.joblib"
    joblib.dump(model, model_path)
    return model_path


def load_classifier(version: int = 1) -> LogisticRegression:
    # deterministic version path keeps backend integration predictable
    model_path = Path(MODEL_DIR) / f"classifier_v{version}.joblib"
    if not model_path.exists():
        raise FileNotFoundError(
            f"classifier model not found at {model_path}. train and save it first"
        )
    return joblib.load(model_path)


def choose_and_save_best_classifier(X: np.ndarray, y: np.ndarray) -> Tuple[str, float, Path]:
    # compare candidate classifiers with rotating folds for fair model selection
    candidates = {
        "logistic": LogisticRegression(max_iter=1000, random_state=RANDOM_SEED),
        "svm": SVC(probability=True, random_state=RANDOM_SEED),
        "mlp": MLPClassifier(
            hidden_layer_sizes=(100, 100),
            activation="relu",
            max_iter=500,
            random_state=RANDOM_SEED,
        ),
    }

    # store mean f1 score per model so we can pick the strongest candidate
    scores: Dict[str, float] = {}
    for name, model in candidates.items():
        # cross_val_score rotates train/test folds to reduce split bias
        cv_scores = cross_val_score(model, X, y, cv=5, scoring="f1")
        scores[name] = float(np.mean(cv_scores))

    # select the best model by highest mean f1 across folds
    best_model_name = max(scores, key=scores.get)
    best_score = scores[best_model_name]

    # refit winner on full data before persisting for inference use
    best_model = candidates[best_model_name]
    best_model.fit(X, y)

    # save winner using fixed contract filename for phase-2 integration
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    best_path = model_dir / "classifier_best.joblib"
    joblib.dump(best_model, best_path)
    return best_model_name, best_score, best_path
