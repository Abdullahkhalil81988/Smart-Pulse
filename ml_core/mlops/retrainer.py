from typing import Dict

import numpy as np

from ml_core.mlops.serializer import save_model
from ml_core.pipeline.classifier import train_classifier
from ml_core.pipeline.forecaster import train_forecaster


def should_retrain(drift_result: Dict[str, object]) -> bool:
    return bool(drift_result.get("drifted", False))


def retrain_if_needed(
    drift_result: Dict[str, object],
    X_train: np.ndarray,
    y_train: np.ndarray,
    model_type: str,
    current_version: int,
) -> Dict[str, object]:
    if not should_retrain(drift_result):
        return {"retrained": False, "new_version": int(current_version)}

    new_version = int(current_version) + 1
    model_type  = str(model_type).strip().lower()

    if model_type == "classifier":
        model = train_classifier(X_train, y_train)
        model_name = "classifier"
    elif model_type == "forecaster":
        model = train_forecaster(X_train, y_train)
        model_name = "forecaster"
    else:
        raise ValueError("model_type must be 'classifier' or 'forecaster'")

    save_model(model=model, model_name=model_name, accuracy=0.0, version=new_version)
    return {"retrained": True, "new_version": new_version}
