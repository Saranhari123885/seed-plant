import pandas as pd
import numpy as np
import datetime
import os

def generate_sensor_data(num_samples=5000):
    np.random.seed(42)
    start_time = datetime.datetime.now() - datetime.timedelta(days=30)
    
    timestamps = [start_time + datetime.timedelta(minutes=5 * i) for i in range(num_samples)]
    
    # Generate base data with random walks for realism
    temperature = np.cumsum(np.random.normal(0, 0.2, num_samples)) + 20
    temperature = np.clip(temperature, 10, 35) # Range 10 to 35 C
    
    humidity = np.cumsum(np.random.normal(0, 0.5, num_samples)) + 50
    humidity = np.clip(humidity, 30, 80) # Range 30 to 80 %
    
    co2 = np.cumsum(np.random.normal(0, 5, num_samples)) + 400
    co2 = np.clip(co2, 350, 1500) # Range 350 to 1500 ppm
    
    moisture = np.cumsum(np.random.normal(0, 0.1, num_samples)) + 12
    moisture = np.clip(moisture, 8, 20) # Range 8 to 20 %
    
    # Determine system condition
    conditions = []
    for t, h, c, m in zip(temperature, humidity, co2, moisture):
        if t > 30 or h > 70 or c > 1000 or m > 16:
            conditions.append('Critical')
        elif t > 25 or h > 60 or c > 600 or m > 14.5:
            conditions.append('Warning')
        else:
            conditions.append('Safe')
            
    df = pd.DataFrame({
        'timestamp': timestamps,
        'temperature': temperature,
        'humidity': humidity,
        'co2': co2,
        'moisture': moisture,
        'condition': conditions
    })
    
    # Add some missing values/outliers to simulate real IoT data for preprocessing step
    outlier_idx = np.random.choice(df.index, size=int(num_samples * 0.01), replace=False)
    df.loc[outlier_idx, 'temperature'] = df.loc[outlier_idx, 'temperature'] * 1.5
    
    missing_idx = np.random.choice(df.index, size=int(num_samples * 0.02), replace=False)
    df.loc[missing_idx, 'humidity'] = np.nan
    
    os.makedirs(os.path.dirname(os.path.abspath(__file__)), exist_ok=True)
    df.to_csv(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sensor_data.csv'), index=False)
    print(f"Generated {num_samples} samples and saved to sensor_data.csv")

if __name__ == '__main__':
    generate_sensor_data()
