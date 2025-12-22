"""FastAPI application for oil production prediction."""

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from sse_starlette.sse import EventSourceResponse
import asyncio
import uuid
import os
import tempfile
from pathlib import Path
from typing import Dict, Optional
import json
import time

from .models import (
    PredictionRequest, PredictionResponse, TrainingResponse,
    ModelInfoResponse, TrainingProgress
)
from .prediction import load_model_and_scaler, predict, get_model_paths
from .training import train_model_async

app = FastAPI(title="Oil Production Prediction API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for training tasks
training_tasks: Dict[str, Dict] = {}
training_progress: Dict[str, list] = {}

# Get project root
PROJECT_ROOT = Path(__file__).parent.parent.parent


def get_default_dataset_path():
    """Get path to default dataset."""
    return PROJECT_ROOT / "Volve production data.csv"


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Oil Production Prediction API"}


@app.post("/api/train", response_model=TrainingResponse)
async def start_training(file: UploadFile = File(None)):
    """
    Start training with uploaded CSV file or use default dataset.
    """
    # Generate task ID
    task_id = str(uuid.uuid4())
    
    # Determine CSV path
    if file is not None and file.filename:
        # Save uploaded file to temp location
        temp_dir = tempfile.gettempdir()
        csv_path = os.path.join(temp_dir, f"{task_id}_{file.filename}")
        
        with open(csv_path, "wb") as f:
            content = await file.read()
            f.write(content)
    else:
        # Use default dataset
        default_path = get_default_dataset_path()
        if not default_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Default dataset not found. Please upload a CSV file."
            )
        csv_path = str(default_path)
    
    # Initialize task state
    training_tasks[task_id] = {
        'status': 'starting',
        'csv_path': csv_path
    }
    training_progress[task_id] = []
    
    # Define progress callback
    def progress_callback(progress: dict):
        training_progress[task_id].append(progress)
        training_tasks[task_id]['status'] = progress.get('status', 'training')
        if progress.get('status') == 'completed':
            training_tasks[task_id]['status'] = 'completed'
        elif progress.get('status') == 'error':
            training_tasks[task_id]['status'] = 'error'
            training_tasks[task_id]['error'] = progress.get('error', 'Unknown error')
    
    # Start training in background
    asyncio.create_task(train_model_async(csv_path, task_id, progress_callback))
    
    return TrainingResponse(
        task_id=task_id,
        status="started",
        message="Training started successfully"
    )


@app.get("/api/training/progress")
async def training_progress_stream(request: Request, task_id: str):
    """
    SSE endpoint for real-time training progress.
    """
    if task_id not in training_tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    async def event_generator():
        last_index = 0
        timeout_count = 0
        max_timeout = 600  # 5 minutes max wait
        
        try:
            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break
                
                # Check if task exists
                if task_id not in training_progress:
                    timeout_count += 1
                    if timeout_count > max_timeout:
                        yield {
                            "event": "error",
                            "data": json.dumps({"error": "Timeout waiting for training to start"})
                        }
                        break
                    await asyncio.sleep(0.5)
                    continue
                
                timeout_count = 0  # Reset timeout when progress exists
                
                # Get new progress updates
                current_progress = training_progress.get(task_id, [])
                
                if len(current_progress) > last_index:
                    # Send new updates
                    for i in range(last_index, len(current_progress)):
                        progress = current_progress[i]
                        yield {
                            "event": "progress",
                            "data": json.dumps(progress)
                        }
                    last_index = len(current_progress)
                
                # Check if training is complete or error
                if task_id in training_tasks:
                    status = training_tasks[task_id].get('status')
                    if status in ['completed', 'error']:
                        # Send final update if there's new progress
                        if len(current_progress) > last_index:
                            final_progress = current_progress[-1]
                            yield {
                                "event": "progress",
                                "data": json.dumps(final_progress)
                            }
                        # Send a keepalive to ensure client receives final message
                        await asyncio.sleep(0.1)
                        break
                
                await asyncio.sleep(0.5)  # Poll every 500ms
        except asyncio.CancelledError:
            pass
        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"error": str(e)})
            }
    
    return EventSourceResponse(
        event_generator(),
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


@app.post("/api/predict", response_model=PredictionResponse)
async def make_prediction(request: PredictionRequest):
    """
    Make a prediction using the trained model.
    """
    try:
        # Load model and scaler
        model, scaler, _ = load_model_and_scaler()
        
        # Convert request to dict
        features = {
            'P_downhole': request.P_downhole,
            'Q_liquid': request.Q_liquid,
            'H_pump': request.H_pump,
            'WC_percent': request.WC_percent,
            'GFR': request.GFR,
            'T_downhole': request.T_downhole,
            'P_annulus': request.P_annulus,
            'P_wellhead': request.P_wellhead,
            'T_wellhead': request.T_wellhead,
            'dp_choke': request.dp_choke
        }
        
        # Make prediction
        raw_prediction = predict(model, scaler, features)
        
        # Clamp negative predictions to 0 (debit cannot be negative)
        prediction = max(0.0, raw_prediction)
        
        return PredictionResponse(
            prediction=prediction,
            unit="т/сут"
        )
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Model not found. Please train the model first. {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Prediction error: {str(e)}"
        )


@app.get("/api/model/info", response_model=ModelInfoResponse)
async def get_model_info():
    """
    Get information about the trained model.
    """
    try:
        paths = get_model_paths()
        
        if not paths['model'].exists():
            return ModelInfoResponse(
                feature_names=[
                    'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
                    'GFR', 'T_downhole', 'P_annulus', 'P_wellhead', 'T_wellhead', 'dp_choke'
                ],
                target_name='debit_oil_t_per_day',
                architecture={
                    'layers': [
                        {'type': 'Dense', 'units': 64, 'activation': 'relu'},
                        {'type': 'Dense', 'units': 32, 'activation': 'relu'},
                        {'type': 'Dense', 'units': 1, 'activation': 'linear'}
                    ]
                },
                model_exists=False
            )
        
        # Load model info if available
        model, scaler, feature_info = load_model_and_scaler()
        
        architecture = {
            'layers': [
                {'type': 'Dense', 'units': 64, 'activation': 'relu'},
                {'type': 'Dense', 'units': 32, 'activation': 'relu'},
                {'type': 'Dense', 'units': 1, 'activation': 'linear'}
            ]
        }
        
        return ModelInfoResponse(
            feature_names=feature_info.get('feature_names', [
                'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
                'GFR', 'T_downhole', 'P_annulus', 'P_wellhead', 'T_wellhead', 'dp_choke'
            ]) if feature_info else [
                'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
                'GFR', 'T_downhole', 'P_annulus', 'P_wellhead', 'T_wellhead', 'dp_choke'
            ],
            target_name=feature_info.get('target_name', 'debit_oil_t_per_day') if feature_info else 'debit_oil_t_per_day',
            architecture=architecture,
            metrics=feature_info.get('metrics') if feature_info else None,
            model_exists=True
        )
    except Exception as e:
        # Return default info even if model doesn't exist
        return ModelInfoResponse(
            feature_names=[
                'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
                'GFR', 'T_downhole', 'P_annulus', 'P_wellhead', 'T_wellhead', 'dp_choke'
            ],
            target_name='debit_oil_t_per_day',
            architecture={
                'layers': [
                    {'type': 'Dense', 'units': 64, 'activation': 'relu'},
                    {'type': 'Dense', 'units': 32, 'activation': 'relu'},
                    {'type': 'Dense', 'units': 1, 'activation': 'linear'}
                ]
            },
            model_exists=False
        )


@app.get("/api/model/feature-importance")
async def get_feature_importance():
    """
    Get feature importance from the trained model.
    """
    try:
        paths = get_model_paths()
        
        if not paths['model'].exists():
            raise HTTPException(
                status_code=404,
                detail="Model not found. Please train the model first."
            )
        
        # Load model info which contains feature importance
        model, scaler, feature_info = load_model_and_scaler()
        
        if not feature_info or 'feature_importance' not in feature_info:
            raise HTTPException(
                status_code=404,
                detail="Feature importance not available. Please retrain the model."
            )
        
        return feature_info['feature_importance']
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Model not found. Please train the model first. {str(e)}"
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error loading feature importance: {str(e)}"
        )


@app.get("/api/default-dataset")
async def get_default_dataset():
    """
    Get the default dataset file.
    """
    dataset_path = get_default_dataset_path()
    
    if not dataset_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Default dataset not found"
        )
    
    return FileResponse(
        path=str(dataset_path),
        filename="Volve production data.csv",
        media_type="text/csv"
    )

