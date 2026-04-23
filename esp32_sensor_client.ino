#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>

// WiFi credentials (UPDATE THESE TO YOUR NETWORK)
const char* ssid = "nani";
const char* password = "00000000";

// INJECTED LAPTOP IP ADDRESS
String server = "http://10.161.225.121:8001/api/ingest";


// DHT
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// Pins
const int soilPin = 34;
const int mq135Pin = 35;
const int buzzerPin = 5; // CHANGE THIS TO YOUR BUZZER GPIO PIN

// Calibration
int dryValue = 3500;
int wetValue = 1200;

int cleanAirValue = 1000;
int pollutedValue = 3000;

void setup() {
  Serial.begin(115200);

  analogReadResolution(12);
  analogSetAttenuation(ADC_11db);

  pinMode(buzzerPin, OUTPUT);
  digitalWrite(buzzerPin, LOW); // Start with buzzer OFF

  dht.begin();

  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nConnected!");
}

void loop() {

  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi Disconnected! Reconnecting...");
    WiFi.begin(ssid, password);
    delay(3000);
    return;
  }

  HTTPClient http;

  // ------------------ SENSOR READINGS ------------------

  // Soil Moisture
  int soilRaw = analogRead(soilPin);
  int moisture = map(soilRaw, dryValue, wetValue, 0, 100);
  moisture = constrain(moisture, 0, 100);

  // MQ135 Air Quality
  int gasRaw = analogRead(mq135Pin);
  int airQuality = map(gasRaw, cleanAirValue, pollutedValue, 0, 100);
  airQuality = constrain(airQuality, 0, 100);

  // Convert to approximate CO2 PPM
  int expectedCo2 = map(airQuality, 0, 100, 400, 2000);

  // DHT Sensor
  float temp = dht.readTemperature();
  float hum = dht.readHumidity();

  // Handle DHT failure
  if (isnan(temp) || isnan(hum)) {
    Serial.println("DHT read failed! Skipping this cycle.");
    delay(2000);
    return;
  }

  // ------------------ JSON PAYLOAD ------------------

  String jsonPayload = "{";
  jsonPayload += "\"temperature\":" + String(temp) + ",";
  jsonPayload += "\"humidity\":" + String(hum) + ",";
  jsonPayload += "\"co2\":" + String(expectedCo2) + ",";
  jsonPayload += "\"moisture\":" + String(moisture);
  jsonPayload += "}";

  // ------------------ HTTP REQUEST ------------------

  http.begin(server);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // Prevent hanging

  int httpResponseCode = http.POST(jsonPayload);

  // ------------------ RESPONSE HANDLING ------------------

  if (httpResponseCode > 0) {
    Serial.print("Data sent successfully! Response Code: ");
    Serial.println(httpResponseCode);
    
    // Read response from backend to trigger buzzer
    String response = http.getString();
    if (response.indexOf("\"Warning\"") > 0 || response.indexOf("\"Critical\"") > 0) {
      Serial.println("ALERT from AI Backend! System condition Warning/Critical. BUZZER ON!");
      digitalWrite(buzzerPin, HIGH);
    } else {
      digitalWrite(buzzerPin, LOW);
    }
  } else {
    Serial.print("Error sending data. Code: ");
    Serial.println(httpResponseCode);
  }

  http.end();

  // ------------------ DEBUG OUTPUT ------------------

  Serial.print("Soil: "); Serial.print(moisture);
  Serial.print("% | Air Quality: "); Serial.print(airQuality);
  Serial.print("% (CO2: "); Serial.print(expectedCo2);
  Serial.print(" ppm) | Temp: "); Serial.print(temp);
  Serial.print("°C | Humidity: "); Serial.println(hum);

  Serial.println("--------------------------------------");

  // Send data every 3 seconds
  delay(3000);
}
