from typing import Dict, List

import numpy as np
from pymongo import MongoClient
from scipy.stats import ks_2samp


def read_feedback(mongo_uri: str, collection: str = "Predictions") -> Dict[str, object]:
    # open mongo connection so we can inspect live prediction feedback
    client = MongoClient(mongo_uri)
    try:
        # use database from uri path; fallback keeps local tests from crashing
        db = client.get_default_database()
        if db is None:
            db = client["SmartPulse"]

        # fetch incorrect predictions because these represent model mistakes
        docs = list(db[collection].find({"correct": False}))
        prediction_ids = [str(doc.get("prediction_id")) for doc in docs if "prediction_id" in doc]
        return {"error_count": len(docs), "prediction_ids": prediction_ids}
    finally:
        # always close client to avoid leaked sockets in long-running workers
        client.close()


def generate_report(
    error_count: int, total_count: int, drift_score: float, model_version: str
) -> Dict[str, object]:
    # guard division-by-zero for empty traffic windows
    error_rate = 0.0 if total_count == 0 else float(error_count / total_count)
    return {
        "error_rate": error_rate,
        "prediction_count": int(total_count),
        "drift_score": float(drift_score),
        "model_version": model_version,
    }


def detect_drift(live_inputs: np.ndarray, training_data: np.ndarray) -> Dict[str, object]:
    # coerce arrays so column-wise ks tests can run consistently
    live_inputs = np.asarray(live_inputs, dtype=float)
    training_data = np.asarray(training_data, dtype=float)

    if live_inputs.ndim != 2 or training_data.ndim != 2:
        raise ValueError("live_inputs and training_data must both be 2d arrays")
    if live_inputs.shape[1] != training_data.shape[1]:
        raise ValueError("live_inputs and training_data must have the same number of columns")

    p_values: List[float] = []
    for col_idx in range(live_inputs.shape[1]):
        # ks test checks whether two feature distributions have diverged significantly
        _, p_value = ks_2samp(live_inputs[:, col_idx], training_data[:, col_idx])
        p_values.append(float(p_value))

    # any p-value below 0.05 indicates statistically significant distribution shift
    min_p_value = min(p_values) if p_values else 1.0
    drifted = any(p < 0.05 for p in p_values)
    return {"drifted": drifted, "p_values": p_values, "min_p_value": float(min_p_value)}
