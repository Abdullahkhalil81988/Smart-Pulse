import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import joblib

from ml_core.config import MODEL_DIR


def save_model(model: Any, model_name: str, accuracy: float, version: int) -> Dict[str, Path]:
    model_dir = Path(MODEL_DIR)
    model_dir.mkdir(parents=True, exist_ok=True)

    model_path    = model_dir / f"{model_name}_v{version}.joblib"
    metadata_path = model_dir / f"{model_name}_v{version}.json"
    active_path   = model_dir / f"{model_name}_active.txt"

    joblib.dump(model, model_path)
    metadata_path.write_text(
        json.dumps({"version": version, "accuracy": float(accuracy),
                    "trained_at": datetime.now(timezone.utc).isoformat(),
                    "model_name": model_name}, indent=2),
        encoding="utf-8",
    )
    active_path.write_text(str(version), encoding="utf-8")

    return {"model_path": model_path, "metadata_path": metadata_path, "active_path": active_path}


def load_model(model_name: str, version: int) -> Dict[str, Any]:
    model_dir     = Path(MODEL_DIR)
    model_path    = model_dir / f"{model_name}_v{version}.joblib"
    metadata_path = model_dir / f"{model_name}_v{version}.json"

    if not model_path.exists():
        raise FileNotFoundError(f"model artifact missing at {model_path}")
    if not metadata_path.exists():
        raise FileNotFoundError(f"metadata sidecar missing at {metadata_path}")

    return {"model": joblib.load(model_path), "metadata": json.loads(metadata_path.read_text(encoding="utf-8"))}


def rollback(model_name: str, version: int) -> Dict[str, Any]:
    loaded = load_model(model_name, version)
    active_path = Path(MODEL_DIR) / f"{model_name}_active.txt"
    active_path.write_text(str(version), encoding="utf-8")
    return {"rolled_back": True, "active_version": version, "metadata": loaded["metadata"]}


def get_active_version(model_name: str) -> int:
    active_path = Path(MODEL_DIR) / f"{model_name}_active.txt"
    if not active_path.exists():
        raise FileNotFoundError(f"active version pointer missing at {active_path}")
    return int(active_path.read_text(encoding="utf-8").strip())
