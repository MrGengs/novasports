/* =====================================================================
   NovaSport Wearable — ESP32 + OLED SSD1306 + MAX30102 + MLX90614 + MPU6050
   Kontrak paket: docs/PERANGKAT_SIMULATOR_PANAHAN.md (dibaca web: assets/js/devices/wearable-ble.js)

   Prinsip (sama dengan archery-bridge): firmware cukup MENGIRIM DATA MENTAH.
   HR, HRV, SpO2, napas, tremor, dan tren suhu dihitung di browser, jadi rumus
   bisa disetel tanpa flash ulang. OLED hanya menampilkan ringkasan lokal.

   I2C (satu bus, 100 kHz karena MLX90614 = SMBus):
     MAX30102 0x57 · MLX90614 0x5A · MPU6050 0x68 · SSD1306 0x3C
   Board: esp32:esp32 (core 3.x). Library: Adafruit MLX90614, Adafruit SSD1306, Adafruit GFX.
   ===================================================================== */
#include <Wire.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLE2902.h>
#include <Adafruit_MLX90614.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// ---------------- pin & alamat (sesuaikan dengan modul) ----------------
#ifndef PIN_SDA
#define PIN_SDA 21
#endif
#ifndef PIN_SCL
#define PIN_SCL 22
#endif
#define ADDR_MAX30102 0x57
#define ADDR_MPU      0x68
#define ADDR_OLED     0x3C

// ---------------- BLE: harus sama dengan wearable-ble.js ----------------
#define DEVICE_NAME  "NOVA-BAND"                                  // awalan "NOVA" wajib
#define SVC_UUID     "6e400010-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_UUID    "6e400011-b5a3-f393-e0a9-e50e24dcca9e"

#define TAG_PPG  0x01
#define TAG_IMU  0x02
#define TAG_TEMP 0x03
#define TAG_FW   0x04

#define PPG_FS        100     // Hz keluaran FIFO (400 Hz / rata-rata 4)
#define PPG_PER_PKT   5       // 5 sampel = 34 byte per paket
#define IMU_FS        50
#define IMU_PER_PKT   3       // 3 sampel = 40 byte per paket

Adafruit_MLX90614 mlx;
Adafruit_SSD1306 oled(128, 64, &Wire, -1);
BLECharacteristic* tx = nullptr;
volatile bool linked = false;
bool hasOled = false, hasMlx = false, hasMax = false, hasMpu = false;

uint8_t seqPpg = 0, seqImu = 0, seqTemp = 0, seqFw = 0;
uint8_t ppgBuf[4 + PPG_PER_PKT * 6]; uint8_t ppgN = 0;
uint8_t imuBuf[4 + IMU_PER_PKT * 12]; uint8_t imuN = 0;
float lastObj = NAN, lastAmb = NAN;
uint32_t lastIr = 0;
uint8_t dispHr = 0;                       // perkiraan kasar untuk OLED saja

// ---------------- util I2C ----------------
void wr(uint8_t a, uint8_t r, uint8_t v) { Wire.beginTransmission(a); Wire.write(r); Wire.write(v); Wire.endTransmission(); }
uint8_t rd(uint8_t a, uint8_t r) { Wire.beginTransmission(a); Wire.write(r); Wire.endTransmission(false); Wire.requestFrom((int)a, 1); return Wire.available() ? Wire.read() : 0; }
bool present(uint8_t a) { Wire.beginTransmission(a); return Wire.endTransmission() == 0; }

// ---------------- MAX30102 (driver register ringkas) ----------------
bool maxInit() {
  if (!present(ADDR_MAX30102)) return false;
  wr(ADDR_MAX30102, 0x09, 0x40); delay(10);              // reset
  wr(ADDR_MAX30102, 0x08, 0x50);                         // FIFO: rata-rata 4 sampel, rollover on
  wr(ADDR_MAX30102, 0x09, 0x03);                         // mode SpO2 (merah + IR)
  wr(ADDR_MAX30102, 0x0A, 0x2F);                         // ADC 4096 nA, 400 sps, pulse 411 µs (18 bit)
  wr(ADDR_MAX30102, 0x0C, 0x24);                         // arus LED merah ~7 mA
  wr(ADDR_MAX30102, 0x0D, 0x24);                         // arus LED IR ~7 mA
  wr(ADDR_MAX30102, 0x04, 0); wr(ADDR_MAX30102, 0x05, 0); wr(ADDR_MAX30102, 0x06, 0);   // kosongkan FIFO
  return true;
}
void sendPacket(uint8_t* b, size_t n) { if (linked && tx) { tx->setValue(b, n); tx->notify(); } }

void maxPoll() {
  uint8_t w = rd(ADDR_MAX30102, 0x04), r = rd(ADDR_MAX30102, 0x06);
  int avail = (w - r) & 0x1F;
  while (avail-- > 0) {
    Wire.beginTransmission(ADDR_MAX30102); Wire.write(0x07); Wire.endTransmission(false);
    Wire.requestFrom((int)ADDR_MAX30102, 6);
    uint8_t s[6]; for (int i = 0; i < 6; i++) s[i] = Wire.available() ? Wire.read() : 0;
    uint32_t red = (((uint32_t)s[0] << 16) | ((uint32_t)s[1] << 8) | s[2]) & 0x3FFFF;   // FIFO big-endian
    uint32_t ir  = (((uint32_t)s[3] << 16) | ((uint32_t)s[4] << 8) | s[5]) & 0x3FFFF;
    lastIr = ir;
    if (ppgN == 0) { ppgBuf[0] = TAG_PPG; ppgBuf[1] = seqPpg++; ppgBuf[2] = PPG_PER_PKT; ppgBuf[3] = PPG_FS; }
    uint8_t* o = ppgBuf + 4 + ppgN * 6;                    // paket BLE: little-endian u24
    o[0] = red; o[1] = red >> 8; o[2] = red >> 16; o[3] = ir; o[4] = ir >> 8; o[5] = ir >> 16;
    if (++ppgN == PPG_PER_PKT) { sendPacket(ppgBuf, sizeof(ppgBuf)); ppgN = 0; }
    oledBeat(ir);
  }
}

// deteksi detak sederhana HANYA untuk tampilan OLED (web menghitung ulang dengan benar)
void oledBeat(uint32_t ir) {
  static float dc = 0, lp = 0, prev = 0, peak = 0; static uint32_t lastBeat = 0;
  if (ir < 50000) { dispHr = 0; return; }
  dc = dc ? dc * 0.99f + ir * 0.01f : ir; float x = -(ir - dc); lp = lp * 0.8f + x * 0.2f;
  peak = max(peak * 0.995f, lp);
  uint32_t now = millis();
  if (prev > lp && prev > peak * 0.5f && now - lastBeat > 330) {
    if (lastBeat) { uint32_t bpm = 60000 / (now - lastBeat); if (bpm > 35 && bpm < 200) dispHr = (dispHr ? (dispHr * 3 + bpm) / 4 : bpm); }
    lastBeat = now;
  }
  prev = lp;
}

// ---------------- MPU6050 (register mentah) ----------------
bool mpuInit() {
  if (!present(ADDR_MPU)) return false;
  wr(ADDR_MPU, 0x6B, 0x01);        // bangun, clock gyro X
  wr(ADDR_MPU, 0x1A, 0x03);        // DLPF ~44 Hz
  wr(ADDR_MPU, 0x19, 19);          // 1 kHz / (1+19) = 50 Hz
  wr(ADDR_MPU, 0x1B, 0x08);        // gyro ±500 dps  (65,5 LSB/dps)  <- wajib sama dengan web
  wr(ADDR_MPU, 0x1C, 0x08);        // accel ±4 g     (8192 LSB/g)    <- wajib sama dengan web
  return true;
}
void mpuRead() {
  Wire.beginTransmission(ADDR_MPU); Wire.write(0x3B); Wire.endTransmission(false);
  Wire.requestFrom((int)ADDR_MPU, 14);
  int16_t v[7]; for (int i = 0; i < 7; i++) { int16_t h = Wire.read(); v[i] = (h << 8) | Wire.read(); }   // MPU big-endian
  int16_t out[6] = { v[0], v[1], v[2], v[4], v[5], v[6] };                                              // lewati suhu (v[3])
  if (imuN == 0) { imuBuf[0] = TAG_IMU; imuBuf[1] = seqImu++; imuBuf[2] = IMU_PER_PKT; imuBuf[3] = IMU_FS; }
  uint8_t* o = imuBuf + 4 + imuN * 12;
  for (int k = 0; k < 6; k++) { o[k * 2] = out[k] & 0xFF; o[k * 2 + 1] = (out[k] >> 8) & 0xFF; }          // paket BLE: little-endian
  if (++imuN == IMU_PER_PKT) { sendPacket(imuBuf, sizeof(imuBuf)); imuN = 0; }
}

// ---------------- MLX90614 ----------------
void tempRead() {
  lastObj = mlx.readObjectTempC(); lastAmb = mlx.readAmbientTempC();
  if (isnan(lastObj) || isnan(lastAmb)) return;
  int16_t o = (int16_t)lroundf(lastObj * 100), a = (int16_t)lroundf(lastAmb * 100);
  uint8_t b[6] = { TAG_TEMP, seqTemp++, (uint8_t)(o & 0xFF), (uint8_t)(o >> 8), (uint8_t)(a & 0xFF), (uint8_t)(a >> 8) };
  sendPacket(b, sizeof(b));
}

// ---------------- OLED ----------------
void drawOled() {
  if (!hasOled) return;
  oled.clearDisplay(); oled.setTextColor(SSD1306_WHITE);
  oled.setTextSize(1); oled.setCursor(0, 0); oled.print("NovaSport "); oled.print(linked ? "BLE ON" : "menunggu");
  oled.setTextSize(2); oled.setCursor(0, 14);
  if (lastIr < 50000) oled.print("jari?"); else { oled.print(dispHr ? dispHr : 0); oled.setTextSize(1); oled.print(" bpm"); }
  oled.setTextSize(1); oled.setCursor(0, 38); oled.print("Kulit "); if (!isnan(lastObj)) oled.print(lastObj, 1); oled.print(" C");
  oled.setCursor(0, 50); oled.print("Udara "); if (!isnan(lastAmb)) oled.print(lastAmb, 1); oled.print(" C");
  oled.setCursor(96, 50); oled.print(hasMax ? "P" : "-"); oled.print(hasMpu ? "M" : "-"); oled.print(hasMlx ? "T" : "-");
  oled.display();
}

class Cb : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { linked = true; }
  void onDisconnect(BLEServer* s) override { linked = false; s->getAdvertising()->start(); }
};

void setup() {
  Serial.begin(115200);
  Wire.begin(PIN_SDA, PIN_SCL); Wire.setClock(100000);
  hasOled = oled.begin(SSD1306_SWITCHCAPVCC, ADDR_OLED);
  hasMax = maxInit(); hasMpu = mpuInit(); hasMlx = mlx.begin();
  Serial.printf("MAX30102:%d MPU:%d MLX:%d OLED:%d\n", hasMax, hasMpu, hasMlx, hasOled);

  BLEDevice::init(DEVICE_NAME);
  BLEDevice::setMTU(185);                                   // paket 34–40 byte butuh MTU > 23
  BLEServer* srv = BLEDevice::createServer(); srv->setCallbacks(new Cb());
  BLEService* svc = srv->createService(SVC_UUID);
  tx = svc->createCharacteristic(CHAR_UUID, BLECharacteristic::PROPERTY_NOTIFY);
  tx->addDescriptor(new BLE2902());
  svc->start();
  BLEAdvertising* adv = BLEDevice::getAdvertising(); adv->addServiceUUID(SVC_UUID); adv->setScanResponse(true); adv->start();
  drawOled();
}

void loop() {
  static uint32_t tImu = 0, tTemp = 0, tOled = 0, tFw = 0;
  uint32_t now = millis();
  if (hasMax) maxPoll();
  if (hasMpu && now - tImu >= 1000 / IMU_FS) { tImu = now; mpuRead(); }
  if (hasMlx && now - tTemp >= 500) { tTemp = now; tempRead(); }                 // 2 Hz
  if (now - tFw >= 1000) {                                                       // ringkasan opsional 1 Hz
    tFw = now; uint8_t b[5] = { TAG_FW, seqFw++, dispHr, 0, 0 }; sendPacket(b, sizeof(b));
  }
  if (now - tOled >= 250) { tOled = now; drawOled(); }
}
