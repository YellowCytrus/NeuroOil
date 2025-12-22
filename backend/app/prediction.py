"""Prediction logic using the trained model."""

import numpy as np
import tensorflow as tf
from tensorflow import keras
import pickle
import os
import sys
from pathlib import Path

# Get the project root directory (two levels up from this file)
PROJECT_ROOT = Path(__file__).parent.parent.parent


def get_model_paths():
    """Get paths to model files in the project root."""
    return {
        'model': PROJECT_ROOT / 'oil_production_model.keras',
        'scaler': PROJECT_ROOT / 'scaler.pkl',
        'info': PROJECT_ROOT / 'model_info.pkl'
    }


def load_model_and_scaler(model_path=None, scaler_path=None, info_path=None):
    """Load the trained model, scaler, and model info."""
    paths = get_model_paths()
    
    model_path = model_path or paths['model']
    scaler_path = scaler_path or paths['scaler']
    info_path = info_path or paths['info']
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
    
    model = keras.models.load_model(str(model_path))
    
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
    
    feature_info = None
    if os.path.exists(info_path):
        with open(info_path, 'rb') as f:
            feature_info = pickle.load(f)
    
    return model, scaler, feature_info


def predict(model, scaler, features):
    """
    Make prediction using the trained model.
    
    Parameters:
    -----------
    model : keras.Model
        Trained model
    scaler : StandardScaler
        Fitted scaler for normalization
    features : dict or array-like
        Input features. If dict, should contain:
        - P_downhole (bara)
        - Q_liquid (Sm³/сут)
        - H_pump (м)
        - WC_percent (%)
        - GFR (м³/м³)
        - T_downhole (°C)
        - P_annulus (бар)
        - P_wellhead (бар)
        - T_wellhead (°C)
        - dp_choke (бар)
    
    Returns:
    --------
    float : Predicted debit_oil_t_per_day (т/сут)
    """
    # Convert dict to array if needed
    if isinstance(features, dict):
        feature_names = [
            'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
            'GFR', 'T_downhole', 'P_annulus',
            'P_wellhead', 'T_wellhead', 'dp_choke'
        ]
        features_array = np.array([[features.get(name, 0) for name in feature_names]])
    else:
        features_array = np.array(features)
        if features_array.ndim == 1:
            features_array = features_array.reshape(1, -1)
    
    # Normalize features
    features_scaled = scaler.transform(features_array)
    
    # Make prediction
    prediction = model.predict(features_scaled, verbose=0)[0][0]
    
    return float(prediction)



