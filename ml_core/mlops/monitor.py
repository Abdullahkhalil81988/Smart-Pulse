from typing import Dict, List

import numpy as np
from pymongo import MongoClient
from scipy.stats import ks_2samp


def read_feedback(mongo_uri: str, collection: str = "Predictions") -> Dict[str, object]:
    client = MongoClient(mongo_uri)
    try:
        db = client.get_default_database() or client["SmartPulse"]
        docs = list(db[collection].find({"correct": False}))
        prediction_ids = [str(doc.get("prediction_id")) for doc in docs if "prediction_id" in doc]
        return {"error_count": len(docs), "prediction_ids": prediction_ids}
    finally:
        client.close()


def generate_report(
    error_count: int, total_count: int, drift_score: float, model_version: str
) -> Dict[str, object]:
    error_rate = 0.0 if total_count == 0 else float(error_count / total_count)
    return {
        "error_rate":       error_rate,
        "prediction_count": int(total_count),
        "drift_score":      float(drift_score),
        "model_version":    model_version,
    }


def detect_drift(live_inputs: np.ndarray, training_data: np.ndarray) -> Dict[str, object]:
    live_inputs   = np.asarray(live_inputs, dtype=float)
    training_data = np.asarray(training_data, dtype=float)

    if live_inputs.ndim != 2 or training_data.ndim != 2:
        raise ValueError("live_inputs and training_data must both be 2d arrays")
    if live_inputs.shape[1] != training_data.shape[1]:
        raise ValueError("live_inputs and training_data must have the same number of columns")

    p_values: List[float] = [
        float(ks_2samp(live_inputs[:, i], training_data[:, i])[1])
        for i in range(live_inputs.shape[1])
    ]

    min_p = min(p_values) if p_values else 1.0
    return {"drifted": any(p < 0.05 for p in p_values), "p_values": p_values, "min_p_value": min_p}
