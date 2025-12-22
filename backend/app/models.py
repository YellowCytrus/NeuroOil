"""Pydantic models for API requests and responses."""

from pydantic import BaseModel
from typing import Optional, Dict, List


class PredictionRequest(BaseModel):
    """Request model for prediction endpoint."""
    P_downhole: float
    Q_liquid: float
    H_pump: float
    WC_percent: float
    GFR: float
    T_downhole: float
    P_annulus: float
    P_wellhead: float
    T_wellhead: float
    dp_choke: float


class PredictionResponse(BaseModel):
    """Response model for prediction endpoint."""
    prediction: float
    unit: str = "т/сут"


class TrainingResponse(BaseModel):
    """Response model for training start endpoint."""
    task_id: str
    status: str
    message: str


class ModelInfoResponse(BaseModel):
    """Response model for model info endpoint."""
    feature_names: List[str]
    target_name: str
    architecture: Dict
    metrics: Optional[Dict] = None
    model_exists: bool


class TrainingProgress(BaseModel):
    """Model for training progress updates."""
    epoch: int
    loss: float
    val_loss: float
    mae: float
    val_mae: float
    status: str  # 'training', 'completed', 'error'
    metrics: Optional[Dict] = None
    feature_importance: Optional[Dict[str, Dict[str, float]]] = None
    correlation_data: Optional[Dict] = None
    error: Optional[str] = None



