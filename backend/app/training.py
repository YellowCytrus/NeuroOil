"""Training logic with SSE callback support."""

import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import os
import pickle
import asyncio
from pathlib import Path
from typing import Optional, Callable
import uuid

# Get the project root directory
PROJECT_ROOT = Path(__file__).parent.parent.parent


def parse_numeric(value):
    """Parse numeric values, handling comma as thousands separator."""
    if pd.isna(value) or value == '' or value is None:
        return np.nan
    if isinstance(value, (int, float)):
        return float(value)
    # Convert to string and remove commas
    value_str = str(value).replace(',', '').strip()
    if value_str == '':
        return np.nan
    try:
        return float(value_str)
    except (ValueError, TypeError):
        return np.nan


def load_and_preprocess_data(csv_path):
    """
    Load CSV and preprocess data.
    Returns DataFrame with computed features and target.
    """
    df = pd.read_csv(csv_path)
    
    # Parse numeric columns that might have commas
    numeric_cols = [
        'AVG_DOWNHOLE_PRESSURE', 'AVG_DP_TUBING', 'AVG_CHOKE_SIZE_P',
        'ON_STREAM_HRS', 'BORE_OIL_VOL', 'BORE_GAS_VOL', 'BORE_WAT_VOL'
    ]
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].apply(parse_numeric)
    
    # Compute features according to specifications
    # 1. P_downhole = AVG_DOWNHOLE_PRESSURE
    df['P_downhole'] = df['AVG_DOWNHOLE_PRESSURE']
    
    # 2. Q_liquid = BORE_OIL_VOL + BORE_WAT_VOL
    df['Q_liquid'] = df['BORE_OIL_VOL'] + df['BORE_WAT_VOL'].fillna(0)
    
    # 3. H_pump = AVG_DP_TUBING × 10.2
    df['H_pump'] = df['AVG_DP_TUBING'] * 10.2
    
    # 4. WC_percent = BORE_WAT_VOL / (BORE_OIL_VOL + BORE_WAT_VOL) × 100
    liquid_sum = df['BORE_OIL_VOL'] + df['BORE_WAT_VOL'].fillna(0)
    df['WC_percent'] = np.where(
        liquid_sum > 0,
        (df['BORE_WAT_VOL'].fillna(0) / liquid_sum) * 100,
        np.nan
    )
    
    # 5. GFR = BORE_GAS_VOL / BORE_OIL_VOL
    df['GFR'] = np.where(
        df['BORE_OIL_VOL'] > 0,
        df['BORE_GAS_VOL'] / df['BORE_OIL_VOL'],
        np.nan
    )
    
    # 6. choke_size = AVG_CHOKE_SIZE_P
    df['choke_size'] = df['AVG_CHOKE_SIZE_P']
    
    # Target: debit_oil_t_per_day = BORE_OIL_VOL × 0.842
    df['debit_oil_t_per_day'] = df['BORE_OIL_VOL'] * 0.842
    
    # Select only the features and target we need
    feature_cols = [
        'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
        'GFR', 'choke_size'
    ]
    target_col = 'debit_oil_t_per_day'
    
    # Filter rows with missing values
    all_cols = feature_cols + [target_col]
    df_clean = df[all_cols].copy()
    
    # Drop rows where any feature or target is missing
    df_clean = df_clean.dropna(subset=all_cols)
    
    return df_clean[feature_cols], df_clean[target_col]


def build_model(input_dim):
    """Build neural network model."""
    model = keras.Sequential([
        keras.layers.Dense(64, activation='relu', input_shape=(input_dim,)),
        keras.layers.Dense(32, activation='relu'),
        keras.layers.Dense(1, activation='linear')
    ])
    
    model.compile(
        optimizer='adam',
        loss='mse',
        metrics=['mae']
    )
    
    return model


class SSETrainingCallback(keras.callbacks.Callback):
    """Keras callback that sends training progress via a callback function."""
    
    def __init__(self, progress_callback: Callable):
        super().__init__()
        self.progress_callback = progress_callback
    
    def on_epoch_end(self, epoch, logs=None):
        """Called at the end of each epoch."""
        logs = logs or {}
        progress = {
            'epoch': epoch + 1,
            'loss': float(logs.get('loss', 0)),
            'val_loss': float(logs.get('val_loss', 0)),
            'mae': float(logs.get('mae', 0)),
            'val_mae': float(logs.get('val_mae', 0)),
            'status': 'training'
        }
        self.progress_callback(progress)


async def train_model_async(csv_path: str, task_id: str, progress_callback: Callable):
    """
    Train model asynchronously with progress updates.
    
    Parameters:
    -----------
    csv_path : str
        Path to CSV file
    task_id : str
        Unique task identifier
    progress_callback : Callable
        Function to call with progress updates
    """
    try:
        # Load and preprocess data
        X, y = load_and_preprocess_data(csv_path)
        
        # Split into train and test sets (80/20)
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42
        )
        
        # Normalize features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Build model
        model = build_model(X_train_scaled.shape[1])
        
        # Setup callbacks
        sse_callback = SSETrainingCallback(progress_callback)
        early_stopping = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=20,
            restore_best_weights=True,
            verbose=0
        )
        
        # Train model (run in thread pool to avoid blocking)
        loop = asyncio.get_event_loop()
        history = await loop.run_in_executor(
            None,
            lambda: model.fit(
                X_train_scaled, y_train,
                validation_split=0.2,
                epochs=200,
                batch_size=32,
                callbacks=[sse_callback, early_stopping],
                verbose=0
            )
        )
        
        # Evaluate on test set
        y_pred = model.predict(X_test_scaled, verbose=0).flatten()
        
        # Calculate metrics
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)
        mse = mean_squared_error(y_test, y_pred)
        rmse = np.sqrt(mse)
        
        # Save model and scaler
        model_path = PROJECT_ROOT / 'oil_production_model.keras'
        scaler_path = PROJECT_ROOT / 'scaler.pkl'
        info_path = PROJECT_ROOT / 'model_info.pkl'
        
        model.save(str(model_path))
        
        with open(scaler_path, 'wb') as f:
            pickle.dump(scaler, f)
        
        # Save feature names for reference
        feature_info = {
            'feature_names': [
                'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
                'GFR', 'choke_size'
            ],
            'target_name': 'debit_oil_t_per_day',
            'metrics': {
                'r2': float(r2),
                'mae': float(mae),
                'mse': float(mse),
                'rmse': float(rmse)
            }
        }
        
        with open(info_path, 'wb') as f:
            pickle.dump(feature_info, f)
        
        # Send final progress update
        progress_callback({
            'epoch': len(history.history['loss']),
            'loss': float(history.history['loss'][-1]),
            'val_loss': float(history.history['val_loss'][-1]),
            'mae': float(history.history['mae'][-1]),
            'val_mae': float(history.history['val_mae'][-1]),
            'status': 'completed',
            'metrics': {
                'r2': float(r2),
                'mae': float(mae),
                'mse': float(mse),
                'rmse': float(rmse)
            }
        })
        
    except Exception as e:
        progress_callback({
            'status': 'error',
            'error': str(e)
        })



