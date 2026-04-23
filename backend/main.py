from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import os
import json
import pandas as pd
import numpy as np
import random
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = FastAPI(title="Grain Storage Predictive Maintenance API")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev, allow all
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_dir = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(current_dir, 'model.pkl')
scaler_path = os.path.join(current_dir, 'scaler.pkl')

model = None
scaler = None

@app.on_event("startup")
def load_ml_assets():
    global model, scaler
    if os.path.exists(model_path) and os.path.exists(scaler_path):
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        print("ML Model and Scaler loaded successfully.")
    else:
        print("Warning: Model or Scaler not found! Run train_model.py first.")

class UserAuth(BaseModel):
    username: str
    password: str

USERS_FILE = os.path.join(current_dir, 'users.json')
DATA_FILE = os.path.join(current_dir, 'sensor_data.csv')

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return {"admin": "password"}

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f)

@app.post("/api/register")
def register(user: UserAuth):
    users = load_users()
    if user.username in users:
        return {"error": "Username already exists"}
    users[user.username] = user.password
    save_users(users)
    return {"success": True, "message": "User registered successfully"}

@app.post("/api/login")
def login(user: UserAuth):
    users = load_users()
    if user.username in users and users[user.username] == user.password:
        return {"success": True, "token": "mock-jwt-token-123"}
    return {"error": "Invalid credentials"}

@app.get("/api/history")
def get_history():
    if not os.path.exists(DATA_FILE):
        return {"history": []}
    try:
        df_tail = pd.read_csv(DATA_FILE).tail(20)
        history = []
        for _, row in df_tail.iterrows():
            ts = pd.to_datetime(row['timestamp'])
            history.append({
                "time": ts.strftime('%I:%M:%S %p').lstrip('0'), # e.g. 2:30:15 PM
                "temperature": round(float(row['temperature']), 2),
                "humidity": round(float(row['humidity']), 2),
                "co2": round(float(row['co2']), 2),
                "moisture": round(float(row['moisture']), 2)
            })
        return {"history": history}
    except Exception as e:
        return {"error": str(e)}

class SensorData(BaseModel):
    temperature: float
    humidity: float
    co2: float
    moisture: float

# Global variable to hold the latest reading from physical hardware
latest_sensor_reading = {
    "temperature": 22.0,
    "humidity": 55.0,
    "co2": 450.0,
    "moisture": 12.0
}

# Email Configuration (Update these with your details)
EMAIL_SENDER = "harisaran123456789@gmail.com"
EMAIL_PASSWORD = "ituekghjgvxikric" # Use Gmail App Password
EMAIL_RECEIVER = "harisaransamudrala984@gmail.com"
EMAIL_COOLDOWN_MINUTES = 5

last_email_time = None

def send_alert_email(status: str, sensor_data: dict):
    global last_email_time
    # Check cooldown to prevent spamming
    now = datetime.datetime.now()
    if last_email_time is not None:
        if (now - last_email_time).total_seconds() < (EMAIL_COOLDOWN_MINUTES * 60):
            return # Skip sending, still in cooldown
            
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_SENDER
        msg['To'] = EMAIL_RECEIVER
        msg['Subject'] = f"ALERT: Grain Storage System {status}"
        
        body = f"""Warning: The predictive maintenance system has detected a {status} condition!
        
Latest Sensor Readings:
- Temperature: {sensor_data['temperature']} °C
- Humidity: {sensor_data['humidity']} %
- CO2 Level: {sensor_data['co2']} ppm
- Soil Moisture: {sensor_data['moisture']} %

Please check the dashboard for more details.
"""
        msg.attach(MIMEText(body, 'plain'))
        
        # Connect to Gmail SMTP server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(EMAIL_SENDER, EMAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(EMAIL_SENDER, EMAIL_RECEIVER, text)
        server.quit()
        
        last_email_time = now
        print(f"Alert email sent successfully at {now}")
    except Exception as e:
        print(f"Failed to send email: {e}")

@app.post("/api/ingest")
def receive_iot_data(sensor_data: SensorData, background_tasks: BackgroundTasks):
    """endpoint to receive POST requests from the ESP32/Arduino hardware."""
    global latest_sensor_reading
    # Update the global state with the new real data sent from hardware
    latest_sensor_reading = sensor_data.model_dump()
    
    system_status = "Safe"
    if model and scaler:
        try:
            temp_val = sensor_data.temperature
            hum_val = sensor_data.humidity
            feature_dict = {
                'temperature': temp_val,
                'humidity': hum_val,
                'co2': sensor_data.co2,
                'moisture': sensor_data.moisture,
                'temp_rolling_mean': temp_val,
                'humidity_rolling_mean': hum_val,
                'temp_roc': 0.0,
                'environmental_index': (temp_val * hum_val) / 100
            }
            df = pd.DataFrame([feature_dict])
            X_scaled = scaler.transform(df)
            system_status = model.predict(X_scaled)[0]
            
            # Send Email Alert if condition is Warning or Critical
            if system_status in ["Warning", "Critical"]:
                background_tasks.add_task(send_alert_email, system_status, feature_dict)
                
        except Exception as e:
            pass

    return {"status": "success", "message": "Data ingested", "system_status": system_status}

@app.get("/api/data")
def get_live_data():
    """Returns the most recent reading posted by the IoT sensor."""
    return {
        "timestamp": datetime.datetime.now().isoformat(),
        "readings": latest_sensor_reading
    }

@app.post("/api/predict")
def predict_condition(data: SensorData):
    if not model or not scaler:
        return {"error": "Model not loaded. Train the model first."}
        
    try:
        # Reconstruct features expected by model (simplified for realtime context)
        # Note: In a real system, rolling means require caching past data.
        # We simulate them as identical to current data for realtime simplicity here.
        temp_val = data.temperature
        hum_val = data.humidity
        
        feature_dict = {
            'temperature': temp_val,
            'humidity': hum_val,
            'co2': data.co2,
            'moisture': data.moisture,
            'temp_rolling_mean': temp_val,     # Approximation
            'humidity_rolling_mean': hum_val,  # Approximation
            'temp_roc': 0.0,                   # Approximation
            'environmental_index': (temp_val * hum_val) / 100
        }
        
        df = pd.DataFrame([feature_dict])
        
        # Scale features
        X_scaled = scaler.transform(df)
        
        # Predict
        prediction = model.predict(X_scaled)[0]
        probabilities = model.predict_proba(X_scaled)[0]
        
        # Extract confidence
        confidence = float(max(probabilities))
        
        return {
            "prediction": prediction,
            "confidence": confidence,
            "probabilities": {class_name: float(prob) for class_name, prob in zip(model.classes_, probabilities)}
        }
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
