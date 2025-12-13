#!/usr/bin/env python3
"""
Neural network for oil production prediction.
Predicts debit_oil_t_per_day from 7 input parameters.
"""

import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import r2_score, mean_absolute_error, mean_squared_error
import matplotlib.pyplot as plt
import os
import pickle


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
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    print(f"Original dataset shape: {df.shape}")
    
    # Parse numeric columns that might have commas
    numeric_cols = [
        'AVG_DOWNHOLE_PRESSURE', 'AVG_DP_TUBING', 'AVG_CHOKE_SIZE_P',
        'ON_STREAM_HRS', 'BORE_OIL_VOL', 'BORE_GAS_VOL', 'BORE_WAT_VOL'
    ]
    
    for col in numeric_cols:
        if col in df.columns:
            df[col] = df[col].apply(parse_numeric)
    
    # Compute features according to specifications
    print("Computing features...")
    
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
    
    # 6. on_stream_hrs = ON_STREAM_HRS
    df['on_stream_hrs'] = df['ON_STREAM_HRS']
    
    # 7. choke_size = AVG_CHOKE_SIZE_P
    df['choke_size'] = df['AVG_CHOKE_SIZE_P']
    
    # Target: debit_oil_t_per_day = BORE_OIL_VOL × 0.842
    df['debit_oil_t_per_day'] = df['BORE_OIL_VOL'] * 0.842
    
    # Select only the features and target we need
    feature_cols = [
        'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
        'GFR', 'on_stream_hrs', 'choke_size'
    ]
    target_col = 'debit_oil_t_per_day'
    
    # Filter rows with missing values
    print("Filtering rows with missing values...")
    all_cols = feature_cols + [target_col]
    df_clean = df[all_cols].copy()
    
    # Drop rows where any feature or target is missing
    initial_count = len(df_clean)
    df_clean = df_clean.dropna(subset=all_cols)
    final_count = len(df_clean)
    
    print(f"Removed {initial_count - final_count} rows with missing values")
    print(f"Final dataset shape: {df_clean.shape}")
    
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


def main():
    """Main training function."""
    # Path to CSV file
    csv_path = 'Volve production data.csv'
    
    if not os.path.exists(csv_path):
        print(f"Error: File {csv_path} not found!")
        return
    
    # Load and preprocess data
    X, y = load_and_preprocess_data(csv_path)
    
    # Split into train and test sets (80/20)
    print("\nSplitting data into train/test (80/20)...")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    print(f"Train set: {X_train.shape[0]} samples")
    print(f"Test set: {X_test.shape[0]} samples")
    
    # Normalize features
    print("\nNormalizing features...")
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Build model
    print("\nBuilding neural network model...")
    model = build_model(X_train_scaled.shape[1])
    model.summary()
    
    # Setup callbacks
    early_stopping = keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=20,
        restore_best_weights=True,
        verbose=1
    )
    
    # Train model
    print("\nTraining model...")
    history = model.fit(
        X_train_scaled, y_train,
        validation_split=0.2,
        epochs=200,
        batch_size=32,
        callbacks=[early_stopping],
        verbose=1
    )
    
    # Evaluate on test set
    print("\nEvaluating on test set...")
    y_pred = model.predict(X_test_scaled, verbose=0).flatten()
    
    # Calculate metrics
    r2 = r2_score(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    
    print("\n" + "="*50)
    print("MODEL PERFORMANCE METRICS")
    print("="*50)
    print(f"R² Score: {r2:.4f}")
    print(f"MAE: {mae:.4f} т/сут")
    print(f"MSE: {mse:.4f}")
    print(f"RMSE: {rmse:.4f} т/сут")
    print("="*50)
    
    # Plot training history
    plt.figure(figsize=(12, 4))
    
    plt.subplot(1, 2, 1)
    plt.plot(history.history['loss'], label='Train Loss')
    plt.plot(history.history['val_loss'], label='Validation Loss')
    plt.xlabel('Epoch')
    plt.ylabel('Loss (MSE)')
    plt.title('Model Loss')
    plt.legend()
    plt.grid(True)
    
    plt.subplot(1, 2, 2)
    plt.plot(history.history['mae'], label='Train MAE')
    plt.plot(history.history['val_mae'], label='Validation MAE')
    plt.xlabel('Epoch')
    plt.ylabel('MAE')
    plt.title('Model MAE')
    plt.legend()
    plt.grid(True)
    
    plt.tight_layout()
    plt.savefig('training_history.png', dpi=150)
    print("\nTraining history saved to training_history.png")
    
    # Plot predictions vs actual
    plt.figure(figsize=(8, 8))
    plt.scatter(y_test, y_pred, alpha=0.5)
    plt.plot([y_test.min(), y_test.max()], [y_test.min(), y_test.max()], 'r--', lw=2)
    plt.xlabel('Actual debit_oil_t_per_day (т/сут)')
    plt.ylabel('Predicted debit_oil_t_per_day (т/сут)')
    plt.title(f'Predictions vs Actual (R² = {r2:.4f})')
    plt.grid(True)
    plt.savefig('predictions_vs_actual.png', dpi=150)
    print("Predictions plot saved to predictions_vs_actual.png")
    
    # Save model and scaler
    print("\nSaving model and scaler...")
    model.save('oil_production_model.keras')
    print("Model saved to oil_production_model.keras")
    
    with open('scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    print("Scaler saved to scaler.pkl")
    
    # Save feature names for reference
    feature_info = {
        'feature_names': [
            'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
            'GFR', 'on_stream_hrs', 'choke_size'
        ],
        'target_name': 'debit_oil_t_per_day',
        'metrics': {
            'r2': float(r2),
            'mae': float(mae),
            'mse': float(mse),
            'rmse': float(rmse)
        }
    }
    
    with open('model_info.pkl', 'wb') as f:
        pickle.dump(feature_info, f)
    print("Model info saved to model_info.pkl")
    
    print("\nTraining completed successfully!")
    print("\nFiles saved:")
    print("  - oil_production_model.keras (model)")
    print("  - scaler.pkl (normalization scaler)")
    print("  - model_info.pkl (feature names and metrics)")


if __name__ == '__main__':
    main()

