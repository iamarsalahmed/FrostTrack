/*
  FrostTrack: Arduino Mega 2560 + W5500 Ethernet + HX711 x4 + DS18B20 x4.
  PHYSICAL HARDWARE EXAMPLE. CALIBRATE each load cell before measuring real meat.
  Network: Arduino sends HTTP to local trusted gateway (not directly to Vercel HTTPS).
  In Wokwi, use the separate simulation circuit; W5500 is not verified in that simulation.
  Libraries in Arduino IDE: HX711 (bogde), OneWire, DallasTemperature, Ethernet.
*/
#include <SPI.h>
#include <Ethernet.h>
#include <HX711.h>
#include <OneWire.h>
#include <DallasTemperature.h>

const char* meatIds[4] = {"chicken","beef","mutton","mince"};
const byte dtPins[4]  = {22,24,26,28};
const byte sckPins[4] = {23,25,27,29};
const byte tempPins[4]= {30,31,32,33};
const byte ALERT_LED = 34;
const byte W5500_CS = 10; // Ethernet Shield 2 / matching module CS. Change if needed.
const float thresholds[4] = {5.0,6.0,5.0,5.0};
const float calibrationFactor[4] = {420.0,420.0,420.0,420.0}; // PLACEHOLDER: calibrate all sensors!
HX711 scales[4];
OneWire *oneWires[4];
DallasTemperature *temps[4];
byte mac[] = {0x02,0xFA,0xCE,0x55,0x10,0x01};
IPAddress gatewayHost(192,168,1,20); // CHANGE to the laptop / Raspberry Pi running gateway.mjs
const uint16_t gatewayPort=8787;
EthernetClient client;

void setup(){
  Serial.begin(115200);
  pinMode(ALERT_LED,OUTPUT);
  pinMode(53,OUTPUT); digitalWrite(53,HIGH); // keep Mega hardware SPI in master mode
  Ethernet.init(W5500_CS);
  for (byte i=0;i<4;i++){
    scales[i].begin(dtPins[i],sckPins[i]);
    scales[i].set_scale(calibrationFactor[i]);
    if(scales[i].is_ready()) scales[i].tare(10); // TARE WITH EMPTY TRAY ONLY
    oneWires[i]=new OneWire(tempPins[i]);
    temps[i]=new DallasTemperature(oneWires[i]);temps[i]->begin();
  }
  if(Ethernet.begin(mac)==0) Serial.println("DHCP failed. Check W5500 and LAN cable.");
  else {Serial.print("Arduino IP: ");Serial.println(Ethernet.localIP());}
}

void loop(){
  float weight[4];float temp[4];bool alert=false;
  for(byte i=0;i<4;i++){
    weight[i]=scales[i].is_ready()?scales[i].get_units(3):-1;
    temps[i]->requestTemperatures();temp[i]=temps[i]->getTempCByIndex(0);
    if(weight[i]<0 || temp[i]<-30 || temp[i]>60){Serial.print(meatIds[i]);Serial.println(" sensor missing/uncalibrated; packet skipped");return;}
    if(weight[i]<=thresholds[i] || temp[i]>4.0)alert=true;
  }
  digitalWrite(ALERT_LED,alert?HIGH:LOW);
  String json="{\"deviceId\":\"mega-01\",\"readings\":[";
  for(byte i=0;i<4;i++){
    if(i) json+=",";
    json+="{\"compartment\":\"";json+=meatIds[i];json+="\",\"weightKg\":";
    json+=String(weight[i],2);json+=",\"temperatureC\":";json+=String(temp[i],2);json+="}";
  }
  json+="]}";
  Serial.println(json);
  if(client.connect(gatewayHost,gatewayPort)){
    client.println("POST /telemetry HTTP/1.1");
    client.print("Host: ");client.println(gatewayHost);
    client.println("Content-Type: application/json");
    client.print("Content-Length: ");client.println(json.length());
    client.println("Connection: close");client.println();client.print(json);
    unsigned long start=millis();
    while(client.connected() && millis()-start<5000){while(client.available())Serial.write(client.read());}
    client.stop();
  }else Serial.println("Gateway unavailable: check LAN IP / port 8787");
  delay(5000);
}
