from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier

from ml_core.config import MODEL_DIR, RANDOM_SEED


def train_kmeans(X: np.ndarray, n_clusters: int = 5) -> KMeans:
    model = KMeans(n_clusters=n_clusters, random_state=RANDOM_SEED, n_init=10)
    model.fit(X)
    return model


def save_kmeans(model: KMeans, version: int = 1) -> Path:
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"kmeans_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_kmeans(version: int = 1) -> KMeans:
    path = Path(MODEL_DIR) / f"kmeans_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"kmeans model not found at {path}")
    return joblib.load(path)


def fit_pca(X: np.ndarray, n_components: int = 2) -> Tuple[PCA, np.ndarray, np.ndarray]:
    pca = PCA(n_components=n_components, random_state=RANDOM_SEED)
    transformed = pca.fit_transform(X)
    return pca, transformed, pca.explained_variance_ratio_


def save_pca(model: PCA, version: int = 1) -> Path:
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"pca_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_pca(version: int = 1) -> PCA:
    path = Path(MODEL_DIR) / f"pca_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"pca model not found at {path}")
    return joblib.load(path)


def train_anomaly_detector(X: np.ndarray, y: np.ndarray) -> RandomForestClassifier:
    # class_weight='balanced' is critical — credit fraud is ~0.17% of records
    model = RandomForestClassifier(
        n_estimators=300, max_depth=None, min_samples_leaf=1,
        class_weight="balanced", random_state=RANDOM_SEED,
    )
    model.fit(X, y)
    return model


def save_anomaly_detector(model: RandomForestClassifier, version: int = 1) -> Path:
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"anomaly_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_anomaly_detector(version: int = 1) -> RandomForestClassifier:
    path = Path(MODEL_DIR) / f"anomaly_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"anomaly detector not found at {path}")
    return joblib.load(path)
