import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.preprocessing import StandardScaler
import joblib
import os

def preprocess_and_feature_engineering(df):
    # Handle missing values (forward fill then backward fill for time series)
    df = df.ffill().bfill()
    
    # Handle Outliers (capping based on interquartile range)
    for col in ['temperature', 'humidity', 'co2', 'moisture']:
        Q1 = df[col].quantile(0.25)
        Q3 = df[col].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - 1.5 * IQR
        upper_bound = Q3 + 1.5 * IQR
        df[col] = np.clip(df[col], lower_bound, upper_bound)
        
    # Feature Engineering (Rolling means & Rate of Change)
    # Ensure sequential index for rolling
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    df['temp_rolling_mean'] = df['temperature'].rolling(window=3, min_periods=1).mean()
    df['humidity_rolling_mean'] = df['humidity'].rolling(window=3, min_periods=1).mean()
    df['temp_roc'] = df['temperature'].pct_change().fillna(0)
    df['environmental_index'] = (df['temperature'] * df['humidity']) / 100
    
    return df

def train():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(current_dir, 'sensor_data.csv')
    if not os.path.exists(data_path):
        print("Dataset not found. Please run generate_data.py first.")
        return
        
    df = pd.read_csv(data_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    df = preprocess_and_feature_engineering(df)
    
    # Define features and target
    features = ['temperature', 'humidity', 'co2', 'moisture', 
                'temp_rolling_mean', 'humidity_rolling_mean', 'temp_roc', 'environmental_index']
    
    X = df[features]
    y = df['condition'] # Safe, Warning, Critical
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # Normalize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train Gradient Boosting
    print("Training Gradient Boosting Classifier...")
    model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Predictions
    y_pred = model.predict(X_test_scaled)
    
    # Evaluation Metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted', zero_division=0)
    recall = recall_score(y_test, y_pred, average='weighted', zero_division=0)
    f1 = f1_score(y_test, y_pred, average='weighted')
    
    print("\nModel Evaluation Metrics:")
    print(f"Accuracy:  {accuracy:.4f}")
    print(f"Precision: {precision:.4f}")
    print(f"Recall:    {recall:.4f}")
    print(f"F1-score:  {f1:.4f}")
    
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Save model and scaler
    joblib.dump(model, os.path.join(current_dir, 'model.pkl'))
    joblib.dump(scaler, os.path.join(current_dir, 'scaler.pkl'))
    # Save feature columns to ensure alignment during prediction
    joblib.dump(features, os.path.join(current_dir, 'features.pkl'))
    print("\nSaved model.pkl, scaler.pkl, and features.pkl successfully.")

if __name__ == '__main__':
    train()
