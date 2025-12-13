import numpy as np
import tensorflow as tf
from tensorflow import keras
import pickle
import os
import sys
import argparse


def load_model_and_scaler(model_path='oil_production_model.keras', 
                          scaler_path='scaler.pkl',
                          info_path='model_info.pkl'):
    """Load the trained model, scaler, and model info."""
    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file not found: {model_path}")
    if not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
    
    print(f"Loading model from {model_path}...")
    model = keras.models.load_model(model_path)
    
    print(f"Loading scaler from {scaler_path}...")
    with open(scaler_path, 'rb') as f:
        scaler = pickle.load(f)
    
    feature_info = None
    if os.path.exists(info_path):
        with open(info_path, 'rb') as f:
            feature_info = pickle.load(f)
        print(f"Model info loaded. R² = {feature_info['metrics']['r2']:.4f}")
    
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
        - on_stream_hrs (часы/сутки)
        - choke_size (%)
    
    Returns:
    --------
    float : Predicted debit_oil_t_per_day (т/сут)
    """
    
    if isinstance(features, dict):
        feature_names = [
            'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
            'GFR', 'on_stream_hrs', 'choke_size'
        ]
        features_array = np.array([[features.get(name, 0) for name in feature_names]])
    else:
        features_array = np.array(features)
        if features_array.ndim == 1:
            features_array = features_array.reshape(1, -1)
    
    
    features_scaled = scaler.transform(features_array)
    
    
    prediction = model.predict(features_scaled, verbose=0)[0][0]
    
    return float(prediction)


def main():
    """Main function with command line argument parsing."""
    parser = argparse.ArgumentParser(
        description='Predict oil production (debit_oil_t_per_day) from input parameters',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python predict.py 250.0 2000.0 1500.0 50.0 200.0 24.0 45.0
  
  python predict.py --interactive
  
Parameters (in order):
  1. P_downhole      - давление на забое (bara)
  2. Q_liquid        - дебит жидкости (Sm³/сут)
  3. H_pump          - напор насоса (м)
  4. WC_percent      - обводненность (%)
  5. GFR             - газовый фактор (м³/м³)
  6. on_stream_hrs   - время работы (часы/сутки)
  7. choke_size      - размер штуцера (%)
        """
    )
    
    parser.add_argument(
        'values',
        nargs='*',
        type=float,
        help='7 parameter values: P_downhole Q_liquid H_pump WC_percent GFR on_stream_hrs choke_size'
    )
    
    parser.add_argument(
        '--interactive', '-i',
        action='store_true',
        help='Interactive mode: enter values one by one'
    )
    
    parser.add_argument(
        '--model',
        default='oil_production_model.keras',
        help='Path to model file (default: oil_production_model.keras)'
    )
    
    parser.add_argument(
        '--scaler',
        default='scaler.pkl',
        help='Path to scaler file (default: scaler.pkl)'
    )
    
    args = parser.parse_args()
    
    
    try:
        model, scaler, info = load_model_and_scaler(
            model_path=args.model,
            scaler_path=args.scaler
        )
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        print("\nPlease make sure you have trained the model first by running train_model.py", file=sys.stderr)
        sys.exit(1)
    
    
    feature_names = [
        'P_downhole', 'Q_liquid', 'H_pump', 'WC_percent',
        'GFR', 'on_stream_hrs', 'choke_size'
    ]
    
    feature_descriptions = [
        'давление на забое (bara)',
        'дебит жидкости (Sm³/сут)',
        'напор насоса (м)',
        'обводненность (%)',
        'газовый фактор (м³/м³)',
        'время работы (часы/сутки)',
        'размер штуцера (%)'
    ]
    
    
    if args.interactive:
        
        print("\n" + "="*60)
        print("INTERACTIVE MODE - Enter parameter values")
        print("="*60)
        values = []
        for i, (name, desc) in enumerate(zip(feature_names, feature_descriptions), 1):
            while True:
                try:
                    value = float(input(f"{i}. {name} ({desc}): "))
                    values.append(value)
                    break
                except ValueError:
                    print("  Please enter a valid number")
    elif len(args.values) == 7:
        
        values = args.values
    elif len(args.values) == 0:
        
        print("Error: Please provide 7 parameter values or use --interactive mode\n")
        parser.print_help()
        sys.exit(1)
    else:
        print(f"Error: Expected 7 parameters, got {len(args.values)}\n", file=sys.stderr)
        parser.print_help()
        sys.exit(1)
    
    
    features = dict(zip(feature_names, values))
    
    
    print("\n" + "="*60)
    print("INPUT PARAMETERS")
    print("="*60)
    for name, value, desc in zip(feature_names, values, feature_descriptions):
        print(f"  {name:15s} = {value:10.2f}  ({desc})")
    
    
    try:
        prediction = predict(model, scaler, features)
        
        print("\n" + "="*60)
        print("PREDICTION RESULT")
        print("="*60)
        print(f"  Predicted debit_oil_t_per_day: {prediction:.2f} т/сут")
        if info and 'metrics' in info:
            print(f"\n  Model R² score: {info['metrics']['r2']:.4f}")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\nError during prediction: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()

