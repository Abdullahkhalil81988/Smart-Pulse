from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import MongoClient


def log_feedback(
    mongo_uri: str,
    prediction_id: str,
    correct: bool,
    collection: str = "Predictions",
) -> bool:
    try:
        oid = ObjectId(prediction_id)
    except InvalidId:
        raise ValueError(f"Invalid prediction_id format: {prediction_id!r}")

    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    try:
        db = client.get_default_database() or client["SmartPulse"]
        result = db[collection].update_one(
            {"_id": oid},
            {"$set": {"correct": correct, "feedback_at": datetime.now(timezone.utc).isoformat()}},
        )
        return result.modified_count == 1
    finally:
        client.close()
