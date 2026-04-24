from pathlib import Path
from typing import Tuple

import joblib
import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier

from ml_core.config import MODEL_DIR, RANDOM_SEED


def train_kmeans(X: np.ndarray, n_clusters: int = 5) -> KMeans:
    # fix random_state so cluster ids are reproducible across runs
    model = KMeans(n_clusters=n_clusters, random_state=RANDOM_SEED, n_init=10)
    # fit on customer features to partition users into behavior groups
    model.fit(X)
    return model


def save_kmeans(model: KMeans, version: int = 1) -> Path:
    # persist clustering model so predictor can attach stable cluster labels
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"kmeans_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_kmeans(version: int = 1) -> KMeans:
    # load specific clustering version for deterministic inference behavior
    path = Path(MODEL_DIR) / f"kmeans_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"kmeans model not found at {path}")
    return joblib.load(path)


def fit_pca(X: np.ndarray, n_components: int = 2) -> Tuple[PCA, np.ndarray, np.ndarray]:
    # reduce high-dimensional features to 2d for dashboard scatter visualization
    pca = PCA(n_components=n_components, random_state=RANDOM_SEED)
    transformed = pca.fit_transform(X)
    # expose explained variance so quality of projection can be monitored
    variance_ratio = pca.explained_variance_ratio_
    return pca, transformed, variance_ratio


def save_pca(model: PCA, version: int = 1) -> Path:
    # persist pca transform so online points use same fitted projection basis
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"pca_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_pca(version: int = 1) -> PCA:
    # load selected pca version to keep coordinates consistent in frontend charts
    path = Path(MODEL_DIR) / f"pca_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"pca model not found at {path}")
    return joblib.load(path)


def train_anomaly_detector(X: np.ndarray, y: np.ndarray) -> RandomForestClassifier:
    # class_weight='balanced' is critical — credit fraud datasets are ~0.17% fraud
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=None,
        min_samples_leaf=1,
        class_weight="balanced",
        random_state=RANDOM_SEED,
    )
    model.fit(X, y)
    return model


def save_anomaly_detector(model: RandomForestClassifier, version: int = 1) -> Path:
    # persist detector so live predictions can emit anomaly flags consistently
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)
    path = model_dir / f"anomaly_v{version}.joblib"
    joblib.dump(model, path)
    return path


def load_anomaly_detector(version: int = 1) -> RandomForestClassifier:
    # load selected detector version for stable online anomaly behavior
    path = Path(MODEL_DIR) / f"anomaly_v{version}.joblib"
    if not path.exists():
        raise FileNotFoundError(f"anomaly detector not found at {path}")
    return joblib.load(path)
