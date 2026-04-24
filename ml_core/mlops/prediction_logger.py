from datetime import datetime, timezone
from typing import Any, Dict, Optional

from pymongo import MongoClient


def log_prediction(
    mongo_uri: str,
    prediction: float,
    confidence: float,
    model_name: str,
    model_type: str,
    input_hash: Optional[str] = None,
    cluster_label: Optional[int] = None,
    anomaly_flag: bool = False,
    pca_x: Optional[float] = None,
    pca_y: Optional[float] = None,
    collection: str = "Predictions",
) -> str:
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        db = client.get_default_database() or client["SmartPulse"]
        doc: Dict[str, Any] = {
            "model_name": model_name,
            "model_type": model_type,
            "prediction": prediction,
            "confidence": confidence,
            "anomaly_flag": anomaly_flag,
            "cluster_label": cluster_label,
            "pca_x": pca_x,
            "pca_y": pca_y,
            "input_hash": input_hash,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "correct": None,  # filled later by feedback logger
        }
        result = db[collection].insert_one(doc)
        return str(result.inserted_id)
    finally:
        client.close()
