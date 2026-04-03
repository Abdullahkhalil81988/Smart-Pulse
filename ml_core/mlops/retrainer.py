from typing import Dict

import numpy as np

from ml_core.mlops.serializer import save_model
from ml_core.pipeline.classifier import train_classifier
from ml_core.pipeline.forecaster import train_forecaster


def should_retrain(drift_result: Dict[str, object]) -> bool:
    # retrain only when drift detector explicitly flags distribution shift
    return bool(drift_result.get("drifted", False))


def retrain_if_needed(
    drift_result: Dict[str, object],
    X_train: np.ndarray,
    y_train: np.ndarray,
    model_type: str,
    current_version: int,
) -> Dict[str, object]:
    # short-circuit early so stable models are not retrained unnecessarily
    if not should_retrain(drift_result):
        return {"retrained": False, "new_version": int(current_version)}

    # compute next version first so model and metadata stay version-aligned
    new_version = int(current_version) + 1

    # route to the right trainer based on impacted model family
    model_type = str(model_type).strip().lower()
    if model_type == "classifier":
        # retrain churn classifier on refreshed data window
        model = train_classifier(X_train, y_train)
        model_name = "classifier"
    elif model_type == "forecaster":
        # retrain revenue forecaster on refreshed time-series features
        model = train_forecaster(X_train, y_train)
        model_name = "forecaster"
    else:
        raise ValueError("model_type must be 'classifier' or 'forecaster'")

    # persist model and metadata and update active pointer in one place
    save_model(model=model, model_name=model_name, accuracy=0.0, version=new_version)
    return {"retrained": True, "new_version": new_version}
