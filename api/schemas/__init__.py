from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class IngestRequest(BaseModel):
    filename: str
    data: list[dict]

class TrainRequest(BaseModel):
    model_type: str = "both"
    target_column: Optional[str] = None
    version: int = 1

class PredictRequest(BaseModel):
    data: list[dict]
    model_type: Optional[str] = None

class PredictionResult(BaseModel):
    prediction: float
    confidence: float
    model_name: str
    timestamp: str
    cluster_label: Optional[int] = None
    anomaly_flag: bool = False
    pca_x: Optional[float] = None
    pca_y: Optional[float] = None
    historical_data: Optional[list[dict]] = None