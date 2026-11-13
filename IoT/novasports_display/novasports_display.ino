// ============================================================
// NovaSports — firmware for the Waveshare ESP32-C6-Touch-LCD-1.69 (ESP32-C6, 16 MB flash, no PSRAM)
//
// Same product firmware as firmware/novaband_display (Nova-Band on the LILYGO T-Display-S3):
// same pages (LIVE / RUN / READINESS / LINK), model, sensors, JSON protocol, BLE services and
// Firebase cloud link. Only the board layer differs:
//
//   display  ST7789V2 240x280 on SPI (Arduino_GFX), portrait. The frame is drawn as four 70-row bands
//            in one 33.6 KB buffer (no PSRAM for a full frame) and each band goes out over SPI at once.
//   assets   Blender renders + fonts in the "assets" flash partition, memory-mapped
//            (tools/pack_assets_c6.py -> build/assets.bin, flashed at 0x310000)
//   input    CST816T touch (swipe between pages, tap), BOOT (GPIO9) + PWR (GPIO18) buttons
//   sensors  MAX30102 + MLX90614 added, steps from the onboard QMI8658, on the shared I2C bus (GPIO8 SDA / GPIO7 SCL,
//            100 kHz because of the MLX90614), serialised with the touch controller by a mutex
//   link     Bluetooth LE: Heart Rate (0x180D) + Battery (0x180F) + the Nova-Band service (JSON),
//            the same JSON lines over USB serial, WiFi -> Realtime Database (cloud.h)
//
// Build + flash: see README.md in this folder. Arduino board options:
//   esp32:esp32:esp32c6:CDCOnBoot=cdc,FlashSize=16M,PartitionScheme=custom
// ============================================================
#include <Arduino.h>
#include <Arduino_GFX_Library.h>
#include <BLEDevice.h>      // BLE bawaan core ESP32 (berbasis NimBLE di C6) - NimBLE-Arduino 2.x tidak cocok dengan core C6
#include <BLEServer.h>
#include <BLEUtils.h>
#include <Wire.h>
#include <esp_mac.h>
#include <esp_partition.h>
#include <freertos/queue.h>
#include <freertos/semphr.h>

#include "i2c_lock.h"
#include "battery.h"
#include "cloud.h"
#include "runlog.h"
#include "sensors.h"
#include "src/assets.h"
#include "src/gfx.h"
#include "src/model.h"
#include "src/protocol.h"
#include "src/ui.h"

// ---------------------------------------------------------------- pins (Waveshare ESP32-C6-Touch-LCD-1.69)
static const int PIN_PWR = 15;                          // BAT_EN: hold HIGH to keep the board powered on battery
static const int PIN_LCD_SCLK = 1, PIN_LCD_MOSI = 2, PIN_LCD_DC = 3, PIN_LCD_RST = 4, PIN_LCD_CS = 5, PIN_BL = 6;
static const int PIN_SDA = 8, PIN_SCL = 7;              // shared I2C bus: touch, IMU, RTC, MAX30102, MLX90614, GY-50
static const int PIN_BTN_NEXT = 9;                      // BOOT key (strapping pin: only pressed while running)
static const int PIN_BTN_PREV = 18;                     // PWR key (polarity measured at boot, see pwrKeyBegin)
static const int PIN_LINK = 17;                         // pad ESP_RXD -> GPIO 3 of the ESP32-C3: HIGH = watch on, LOW = off
static const int LCD_COL_OFFSET = 0, LCD_ROW_OFFSET = 20;   // ST7789V2 240x280 window
static const uint32_t LCD_SPI_HZ = 80000000;
static const uint8_t TOUCH_ADDR = 0x15;

// ---------------------------------------------------------------- BLE UUIDs
#define NB_SVC   "4e420001-6e6f-7661-6261-6e6453330000"
#define NB_TELEM "4e420002-6e6f-7661-6261-6e6453330000"
#define NB_WAVE  "4e420003-6e6f-7661-6261-6e6453330000"
#define NB_CMD   "4e420004-6e6f-7661-6261-6e6453330000"

// ---------------------------------------------------------------- state
static Arduino_DataBus* lcdBus = new Arduino_HWSPI(PIN_LCD_DC, PIN_LCD_CS, PIN_LCD_SCLK, PIN_LCD_MOSI, GFX_NOT_DEFINED);
static Arduino_GFX* panel = new Arduino_ST7789(lcdBus, PIN_LCD_RST, 0, true, gfx::W, gfx::H, LCD_COL_OFFSET, LCD_ROW_OFFSET, LCD_COL_OFFSET, LCD_ROW_OFFSET);
// The frame is drawn as four 70-row bands through one buffer (33.6 KB instead of a 134 KB frame):
// the UI is rendered once per band, clipped to it, and the band is sent over SPI before the next.
static const int BAND = 70, BAND_N = gfx::H / BAND;
static_assert(BAND * BAND_N == gfx::H, "bands must tile the panel");
alignas(4) static uint16_t bandBuf[gfx::W * BAND];
static gfx::Canvas canvas;
static Assets assets;
static Model model;
static Ui ui;
static char devName[24];
static int brightness = 220;

struct Line { char s[256]; uint8_t src; };      // commands from BLE/USB, handled in loop()
static QueueHandle_t cmdQ;
static BLECharacteristic *chTelem, *chWave, *chHr, *chBat;
static volatile int bleClients = 0;
static bool bleUp = false;                                  // bleInit() sudah jalan
static volatile uint32_t advAt = 0;                        // millis() at which to restart advertising, 0 = none
static uint32_t usbSeenMs = 0;                  // last command over USB
static bool usbStream = false;

static float uptime() { return millis() / 1000.f; }
static void setBrightness(int v) { brightness = constrain(v, 10, 255); }

// ---------------------------------------------------------------- display
static void displayInit() {
  panel->begin(LCD_SPI_HZ);
  panel->fillScreen(0);
}

// ---------------------------------------------------------------- assets
static bool assetsInit() {
  const esp_partition_t* p = esp_partition_find_first(ESP_PARTITION_TYPE_DATA, (esp_partition_subtype_t)0x40, "assets");
  if (!p) return false;
  const void* ptr = nullptr;
  esp_partition_mmap_handle_t h;
  if (esp_partition_mmap(p, 0, p->size, ESP_PARTITION_MMAP_DATA, &ptr, &h) != ESP_OK) return false;
  return assets.load((const uint8_t*)ptr);     // everything is read straight from flash through the cache (no PSRAM here)
}

// ---------------------------------------------------------------- touch (CST816T, shared I2C bus)
// returns 1 finger down (x,y set), 2 lifted, 0 no finger, -1 no usable information (ghost / bus error)
static int touchRead(int& x, int& y) {
  if (!i2c::take(8)) return -1;
  uint8_t b[5];
  bool ok = false;
  Wire.beginTransmission(TOUCH_ADDR);
  Wire.write(0x02);
  if (Wire.endTransmission(false) == 0 && Wire.requestFrom((int)TOUCH_ADDR, 5) == 5) {
    for (auto& v : b) v = Wire.read();
    ok = true;
  }
  i2c::give();
  if (!ok) return -1;
  uint8_t n = b[0], xh = b[1], xl = b[2], yh = b[3], yl = b[4];
  if (n == 0xFF) return -1;                                // chip asleep / garbage
  if (!(n & 0x0F)) return 0;
  if ((xh >> 6) == 1) return 2;                            // the chip's own "lift" event
  int tx = ((xh & 0x0F) << 8) | xl, ty = ((yh & 0x0F) << 8) | yl;
  if (tx >= gfx::W + 8 || ty >= gfx::H + 8) return -1;     // 4095,4095 = ghost read, not a finger
  x = constrain(tx, 0, gfx::W - 1);                        // panel and touch share the portrait frame
  y = constrain(ty, 0, gfx::H - 1);
  return 1;
}

// Polled several times per frame (see the end of loop and between bands) so a swipe follows the finger.
static bool tdown = false;
static int tlx = 0, tly = 0;
static void touchPoll() {
  static uint32_t upSince = 0;
  int tx, ty;
  int tr = touchRead(tx, ty);
  if (tr == 1) { tdown = true; tlx = tx; tly = ty; upSince = 0; }
  else if (tr == 2) { tdown = false; upSince = 0; }
  else if (tr == 0 || (tr < 0 && tdown)) {                 // release only after ~40 ms without a finger
    if (!upSince) upSince = millis();
    if (millis() - upSince > 40) tdown = false;
  }
}

static void touchInit() {
  i2c::begin(PIN_SDA, PIN_SCL, 100000);                    // 100 kHz: the MLX90614 (SMBus) hangs the bus when pushed faster
  Wire.setTimeOut(5);                                      // a sleeping CST816T otherwise costs a 50 ms timeout per read
  delay(20);
  Wire.beginTransmission(TOUCH_ADDR); Wire.write(0xFE); Wire.write(0x01); Wire.endTransmission();   // DisAutoSleep = 1 (NOT 0xFF)
}

// ---------------------------------------------------------------- buttons
// BOOT is active-low. The PWR key's polarity is measured at boot (pull-up vs pull-down read): if the line floats,
// the key is disabled instead of guessed (a floating pin read as "pressed" would switch the board off by itself).
static bool pwrIdle = true, pwrUsable = false;
static void pwrKeyBegin() {
  pinMode(PIN_BTN_PREV, INPUT_PULLUP);   delay(5);
  bool up = digitalRead(PIN_BTN_PREV);
  pinMode(PIN_BTN_PREV, INPUT_PULLDOWN); delay(5);
  bool dn = digitalRead(PIN_BTN_PREV);
  pinMode(PIN_BTN_PREV, INPUT);
  pwrUsable = (up == dn);
  pwrIdle = up;
  Serial.printf("# PWR_KEY GPIO%d: %s, idle %s\n", PIN_BTN_PREV, pwrUsable ? "driven externally" : "FLOATING - key disabled", pwrIdle ? "HIGH" : "LOW");
}
static bool isPressed(int pin) {
  if (pin == PIN_BTN_PREV) return pwrUsable && digitalRead(pin) != pwrIdle;
  return digitalRead(pin) == LOW;
}
struct Button {
  int pin; uint32_t downAt = 0; bool down = false, longFired = false;
  // 0 nothing, 1 short press, 2 long press (fires once while held)
  int poll() {
    bool d = isPressed(pin);
    uint32_t now = millis();
    int ev = 0;
    if (d && !down) { down = true; downAt = now; longFired = false; }
    else if (d && down && !longFired && now - downAt > 650) { longFired = true; ev = 2; }
    else if (!d && down) { down = false; if (!longFired && now - downAt > 25) ev = 1; }
    return ev;
  }
};
static Button bPrev{PIN_BTN_PREV}, bNext{PIN_BTN_NEXT};

// ---------------------------------------------------------------- power (hold the PWR key 2 s)
static const uint32_t POWER_HOLD_MS = 2000;

// "Off": on battery, releasing BAT_EN cuts the board's own supply. Powered from USB the board stays alive, so it
// parks the screen dark and waits for a key press, then restarts cleanly.
RTC_DATA_ATTR static bool rtcTimeSet = false;
RTC_DATA_ATTR static int rtcTzMin = 0;

static void powerOff() {
  battery::save();
  sensors::shutdown();                                      // MAX30102 LEDs, gyro
  for (int i = brightness; i >= 0; i -= 12) { ledcWrite(PIN_BL, i); delay(8); }
  ledcWrite(PIN_BL, 0);
  panel->displayOff();
  digitalWrite(PIN_LINK, LOW);                              // beri tahu ESP32-C3: jam mati
  digitalWrite(PIN_PWR, LOW);                               // on battery the board dies here
  delay(400);
  while (isPressed(PIN_BTN_PREV) || isPressed(PIN_BTN_NEXT)) delay(10);   // USB-powered: wait for release, then for a press
  delay(200);
  for (;;) {
    if (isPressed(PIN_BTN_PREV) || isPressed(PIN_BTN_NEXT)) { delay(60); if (isPressed(PIN_BTN_PREV) || isPressed(PIN_BTN_NEXT)) break; }
    delay(20);
  }
  ESP.restart();
}

// ---------------------------------------------------------------- battery
static void batteryRead() {
  battery::update();                                         // median + kurva Li-Po + koreksi saat dicas (battery.h)
  model.m.usbPower = battery::isCharging();
  model.m.battery = battery::percent();
}

// ---------------------------------------------------------------- sensors -> model
// Fresh readings replace the simulation; a stale one lets the model take over again.
// Waktu otomatis: begitu WiFi tersambung dan NTP (dijalankan task cloud) sudah benar, jam layar mengikutinya
// (WIB, UTC+7). Waktu dari HP (BLE) tetap menang: setelah HP mengirim waktu, NTP tidak menimpa zonanya.
static const int NTP_TZ_MIN = 420;
static void ntpClockTick() {
  static int64_t mine = 0;                                   // offset yang terakhir kita tulis; beda = HP yang menulis
  static uint32_t lastSync = 0;
  if (model.timeValid && model.epochOffset != mine) { mine = 0; lastSync = 0; return; }   // diatur HP
  if (lastSync && millis() - lastSync < 3600000UL) return;   // sinkron ulang tiap jam
  time_t t = time(nullptr);
  if (t < 1700000000) return;                                // NTP belum sinkron
  mine = model.epochOffset = (int64_t)t + NTP_TZ_MIN * 60 - (int64_t)uptime();
  model.tzMin = NTP_TZ_MIN;
  model.timeValid = true;
  lastSync = millis();
  Serial.println("# waktu: sinkron NTP (WIB)");
}

static const uint32_t REMOTE_VALID_MS = 8000;               // C3 mengirim tiap 2 dtk, dibaca tiap 2 dtk
static void applySensors() {
  using namespace sensors;
  uint32_t ms = millis();
  auto fresh = [&](uint32_t at) { return at && ms - at < VALID_MS; };
  model.hrOk = fresh(data.hrAt);
  model.spo2Ok = fresh(data.spo2At);
  model.cadOk = fresh(data.cadAt);
  model.tempOk = fresh(data.tempAt);
  model.m.hr = model.hrOk ? data.hr : 0;
  model.m.spo2 = model.spo2Ok ? data.spo2 : 0;
  model.m.cadence = model.cadOk ? data.cadence : 0;
  model.m.temp = model.tempOk ? data.temp : 0;
  // Sensor lokal tidak ada/basi -> pakai bacaan ESP32-C3 dari Realtime Database (MAX30102 + MLX90614 di sana).
  const auto& rc = cloud::remote;
  if (rc.seenAt && ms - rc.seenAt < REMOTE_VALID_MS) {
    if (!model.hrOk && rc.hasMax && rc.finger && rc.hr >= 40) { model.hrOk = true; model.m.hr = rc.hr; }
    if (!model.spo2Ok && rc.hasMax && rc.finger && rc.spo2 >= 70) { model.spo2Ok = true; model.m.spo2 = rc.spo2; }
    if (!model.tempOk && rc.hasMlx && rc.temp > 0) { model.tempOk = true; model.m.temp = rc.temp; }
  }
  static uint32_t seen = 0, beats = 0;
  uint32_t n = data.waveN;
  if (n - seen > Model::PPG_N) seen = n - Model::PPG_N;
  while (seen != n) model.pushPpg(data.wave[seen++ % Data::WAVE_N]);
  static uint32_t stepsSeen = 0;
  model.addSteps(data.steps - stepsSeen); stepsSeen = data.steps;
  while (beats != data.beats) { model.beat(); beats++; }
}

// ---------------------------------------------------------------- BLE
class SrvCb : public BLEServerCallbacks {
  void onConnect(BLEServer*) override { bleClients++; }
  void onDisconnect(BLEServer*) override {
    if (bleClients > 0) bleClients--;
    advAt = millis() + 400;                                 // re-advertise from loop(), after the stack settled
  }
};
class CmdCb : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic* c) override {
    Line l = {};
    String v = c->getValue();
    strncpy(l.s, v.c_str(), sizeof l.s - 1);
    l.src = 0;
    xQueueSend(cmdQ, &l, 0);
  }
};

static void bleInit() {
  BLEDevice::init(devName);
  BLEDevice::setMTU(247);
  BLEServer* srv = BLEDevice::createServer();
  srv->setCallbacks(new SrvCb());

  BLEService* hrs = srv->createService(BLEUUID((uint16_t)0x180D));
  chHr = hrs->createCharacteristic(BLEUUID((uint16_t)0x2A37), BLECharacteristic::PROPERTY_NOTIFY);
  BLECharacteristic* loc = hrs->createCharacteristic(BLEUUID((uint16_t)0x2A38), BLECharacteristic::PROPERTY_READ);
  uint8_t other = 0;                                        // body sensor location: "other" (upper arm)
  loc->setValue(&other, 1);
  hrs->start();

  BLEService* bas = srv->createService(BLEUUID((uint16_t)0x180F));
  chBat = bas->createCharacteristic(BLEUUID((uint16_t)0x2A19), BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  bas->start();

  BLEService* nb = srv->createService(NB_SVC);
  chTelem = nb->createCharacteristic(NB_TELEM, BLECharacteristic::PROPERTY_NOTIFY | BLECharacteristic::PROPERTY_READ);
  chWave = nb->createCharacteristic(NB_WAVE, BLECharacteristic::PROPERTY_NOTIFY);
  BLECharacteristic* cmd = nb->createCharacteristic(NB_CMD, BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR);
  cmd->setCallbacks(new CmdCb());
  nb->start();

  BLEAdvertising* adv = BLEDevice::getAdvertising();
  adv->addServiceUUID(NB_SVC);
  adv->addServiceUUID(BLEUUID((uint16_t)0x180D));
  adv->setScanResponse(true);
  BLEDevice::startAdvertising();
}

static void send(const char* s, uint8_t src) {
  if (src == 1) { Serial.println(s); return; }
  if (bleClients > 0) { chTelem->setValue((uint8_t*)s, strlen(s)); chTelem->notify(); }
}

static void linkTick() {
  runlog::tick(model);
  static uint32_t lastTelem = 0, lastWave = 0;
  uint32_t now = millis();
  bool usb = usbStream && now - usbSeenMs < 8000;
  ui.setLink(bleClients > 0 ? Link::Ble : usb ? Link::Usb : Link::Advertising,
             bleClients > 0 ? "Web Bluetooth" : usb ? "Web Serial" : "");
  char buf[320];
  if (now - lastTelem >= 1000) {
    lastTelem = now;
    proto::telemetry(model, buf, sizeof buf);
    if (usb) Serial.println(buf);
    {                                                // + hitungan mentah sensor langkah (rs), puncak (rp), |w| maks (rw) untuk uji tanpa kabel
      size_t n = strlen(buf);
      if (n > 2 && buf[n - 1] == '}')
        snprintf(buf + n - 1, sizeof buf - n + 1, ",\"rs\":%lu,\"rp\":%lu,\"rw\":%d,\"rv\":%d,\"bv\":%d,\"bp\":%d}", (unsigned long)sensors::data.steps,
                 (unsigned long)sensors::data.wPeaks, (int)(sensors::data.wPeakRt * 10), (int)(sensors::data.wSd * 100),
                 battery::millivolts(), battery::pinMillivolts());
      cloud::publish(buf);
    }
    if (bleClients > 0) {
      chTelem->setValue((uint8_t*)buf, strlen(buf));
      chTelem->notify();
      uint8_t hr[2] = {0x00, (uint8_t)constrain((int)(model.m.hr + .5f), 0, 255)};   // flags: uint8 HR
      chHr->setValue(hr, 2);
      chHr->notify();
      uint8_t b = (uint8_t)model.m.battery;
      chBat->setValue(&b, 1);
      chBat->notify();
    }
  }
  // PPG wave: the newest 20 samples as int8, every 400 ms, with a sequence byte
  if (bleClients > 0 && now - lastWave >= 400) {
    lastWave = now;
    uint8_t pkt[21];
    static uint8_t seq = 0;
    pkt[0] = seq++;
    for (int i = 0; i < 20; i++) {
      float v = model.ppg[(model.ppgHead + Model::PPG_N - 20 + i) % Model::PPG_N];
      pkt[1 + i] = (uint8_t)(int8_t)constrain((int)(v * 90), -127, 127);
    }
    chWave->setValue(pkt, sizeof pkt);
    chWave->notify();
  }
}

static void serialPoll() {
  static char line[256];
  static int n = 0;
  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n' || ch == '\r') {
      if (n) {
        line[n] = 0;
        if (!strncmp(line, "simwalk", 7)) {            // uji: "simwalk 40" = 40 dtk sinyal jalan sintetis
          int secs = atoi(line + 7); if (secs <= 0) secs = 30;
          sensors::data.simUntil = millis() + secs * 1000UL;
          Serial.printf("# simwalk %d dtk\n", secs); n = 0; continue;
        }
        Line l = {};
        strncpy(l.s, line, sizeof l.s - 1);
        l.src = 1;
        xQueueSend(cmdQ, &l, 0);
        n = 0;
      }
    } else if (n < (int)sizeof line - 1) line[n++] = ch;
  }
}

static void handleCommands() {
  Line l;
  char reply[256];
  proto::Env env{&model, &ui, devName, setBrightness, uptime};
  while (xQueueReceive(cmdQ, &l, 0) == pdTRUE) {
    if (l.s[0] != '{') continue;
    if (l.src == 1) { usbSeenMs = millis(); usbStream = true; }
    int r = proto::handle(l.s, strlen(l.s), env, reply, sizeof reply);
    if (r > 0) send(reply, l.src);
  }
}


// ---------------------------------------------------------------- setup / loop
void setup() {
  pinMode(PIN_PWR, OUTPUT);
  digitalWrite(PIN_PWR, HIGH);                  // first thing: keep the board powered when running on battery
  Serial.begin(115200);
  Serial.setTxTimeoutMs(0);                     // never block the render loop when nobody reads the USB port
  pinMode(PIN_LINK, OUTPUT);
  digitalWrite(PIN_LINK, HIGH);                 // jam hidup
  pinMode(PIN_BTN_NEXT, INPUT_PULLUP);
  pwrKeyBegin();
  ledcAttach(PIN_BL, 20000, 8);
  ledcWrite(PIN_BL, 0);

  uint8_t mac[6];
  esp_read_mac(mac, ESP_MAC_BT);
  snprintf(devName, sizeof devName, "NovaSports-%02X%02X", mac[4], mac[5]);

  displayInit();
  if (!assetsInit()) {
    // no asset image flashed: a plain gold screen + instructions on the serial port
    for (int i = 0; i < gfx::W * BAND; i++) bandBuf[i] = gfx::hex(0x8A6A00);
    for (int b = 0; b < BAND_N; b++) panel->draw16bitRGBBitmap(0, b * BAND, bandBuf, gfx::W, BAND);
    ledcWrite(PIN_BL, 200);
    while (true) {
      Serial.println("# assets partition missing or stale: flash build/assets.bin at 0x310000");
      delay(2000);
    }
  }
  touchInit();
  battery::begin();
  sensors::begin();
  model.real = true;                            // show measured values only
  struct timeval tv0;
  gettimeofday(&tv0, nullptr);
  if (rtcTimeSet && esp_reset_reason() == ESP_RST_SW && tv0.tv_sec > 1700000000) {   // restart after "power off" on USB: keep the clock
    struct timeval tv = tv0;
    model.epochOffset = (int64_t)tv.tv_sec + rtcTzMin * 60 - (int64_t)uptime();
    model.tzMin = rtcTzMin;
    model.timeValid = true;
  }
  model.m.readiness = 0;                        // no HRV / sleep data to base it on
  cmdQ = xQueueCreate(8, sizeof(Line));
  ui.begin(&assets, &model);
  ui.setDeviceName(devName);
  cloud::watch("esp32c3");                      // baca sensor C3 (/devices/esp32c3/live)
  cloud::begin(devName);                        // jalur utama: WiFi -> Realtime Database. BLE menyusul di loop()
  Serial.printf("# mem: %u internal bebas, blok terbesar %u\n", (unsigned)heap_caps_get_free_size(MALLOC_CAP_INTERNAL),
                (unsigned)heap_caps_get_largest_free_block(MALLOC_CAP_INTERNAL));
  Serial.printf("# %s ready (ESP32-C6, %d-row bands), heap %u\n", devName, BAND, (unsigned)ESP.getFreeHeap());
}

void loop() {
  static uint32_t last = micros(), statT = millis();
  static int frames = 0;
  static float renderMs = 0;
  static int bl = 0;
  uint32_t nowUs = micros();
  float dt = (nowUs - last) / 1e6f;
  last = nowUs;
  static float worstDt = 0;
  if (dt > worstDt) worstDt = dt;
  if (dt > .1f) dt = .1f;

  // input
  touchPoll();
  ui.touch(tdown, tlx, tly);
  int e = bNext.poll();
  if (e) ui.buttonNext(e == 2);
  e = bPrev.poll();
  if (e) ui.buttonPrev(e == 2);
  if (bPrev.down && millis() - bPrev.downAt >= POWER_HOLD_MS) powerOff();

  serialPoll();
  // BLE hanya formalitas (menyambung ke jam dari web): dinyalakan setelah cloud login, atau setelah 30 dtk
  // tanpa cloud; dilewati kalau RAM internal tidak cukup, supaya WiFi/RTDB tidak pernah dikorbankan.
  static bool bleTried = false;
  if (!bleTried && (cloud::status.authed || millis() > 30000)) {
    bleTried = true;
    size_t freeInt = heap_caps_get_free_size(MALLOC_CAP_INTERNAL);
    if (freeInt >= 85000) { bleInit(); bleUp = true; }
    Serial.printf("# ble %s (internal bebas %u)\n", bleUp ? "aktif" : "dilewati: RAM kurang", (unsigned)freeInt);
  }
  if (bleUp && advAt && (int32_t)(millis() - advAt) >= 0) { advAt = 0; BLEDevice::startAdvertising(); }
  handleCommands();
  static uint32_t batT = 0;
  if (millis() - batT > 500) { batT = millis(); batteryRead(); }

  applySensors();
  if (model.timeValid) { rtcTimeSet = true; rtcTzMin = model.tzMin; }
  static uint32_t gdbT = 0;
  if (millis() - gdbT >= 1000) { gdbT = millis(); if (sensors::data.hasGyro) Serial.printf("# gyro %s\n", sensors::data.gdbg); }
  static uint32_t batLogT = 0;
  if (millis() - batLogT >= 10000) {
    batLogT = millis();
    Serial.printf("# batt pin %d mV  sel %d mV  %d%%  %s\n", battery::pinMillivolts(), battery::millivolts(), battery::percent(),
                  battery::isCharging() ? "DICAS (persen perkiraan, maks 99)" : "baterai");
  }
  static uint32_t dbgT = 0;
  if (millis() - dbgT >= 10000) {                   // 400 detik terakhir: "up;detik_ke_belakang,w,sd,pk,st;..." -> /devices/novasports/dbg
    dbgT = millis();
    uint32_t n = sensors::data.ringN, cnt = n < 400 ? n : 400;
    String t; t.reserve(cnt * 14 + 40);
    t += String(millis() / 1000) + ";" + String(sensors::gBias[0], 1) + "," + String(sensors::gBias[1], 1) + "," + String(sensors::gBias[2], 1);
    for (uint32_t i = 0; i < cnt; i++) {
      const auto& e = sensors::data.ring[(n - cnt + i) % sensors::Data::RING_N];
      t += ';'; t += e.w; t += ','; t += e.sd; t += ','; t += e.pk; t += ','; t += e.st;
    }
    cloud::publishDbg(t);
  }
  static uint32_t senT = 0;
  if (millis() - senT >= 2000) {
    senT = millis();
    Serial.printf("# hr %.0f%s spo2 %.0f%s temp %.1f%s cad %.0f%s finger %d stp %lu wmax %.0f peaks %lu\n", model.m.hr, model.hrOk ? "" : "?",
                  model.m.spo2, model.spo2Ok ? "" : "?", model.m.temp, model.tempOk ? "" : "?", model.m.cadence,
                  model.cadOk ? "" : "?", (int)sensors::data.finger, (unsigned long)sensors::data.steps, (float)sensors::data.wPeak, (unsigned long)sensors::data.wPeaks);
    sensors::data.wPeak = 0;
  }
  ntpClockTick();
  model.update(dt, uptime());
  ui.update(dt);
  linkTick();

  // backlight eases in with the splash, then follows the brightness setting
  int target = brightness;
  bl += (target - bl) / 6 + (target > bl ? 1 : target < bl ? -1 : 0);
  ledcWrite(PIN_BL, constrain(bl, 0, 255));

  uint32_t r0 = micros();
  for (int b = 0; b < BAND_N; b++) {            // four bands: draw, ship over SPI, sample the touch panel in between
    canvas.band(bandBuf, b * BAND, (b + 1) * BAND);
    ui.render(canvas);
    panel->draw16bitRGBBitmap(0, b * BAND, bandBuf, gfx::W, BAND);
    touchPoll();
  }
  renderMs += (micros() - r0) / 1000.f;
  if (micros() - nowUs > 250000) Serial.printf("# slow frame: input %u ms, render %u ms\n", (unsigned)((r0 - nowUs) / 1000), (unsigned)((micros() - r0) / 1000));

  frames++;
  if (millis() - statT >= 5000) {
    Serial.printf("# fps %.1f  render %.1f ms  worst frame %.0f ms  heap %u  ble %d  page %d\n", frames * 1000.f / (millis() - statT),
                  renderMs / frames, worstDt * 1000, (unsigned)ESP.getFreeHeap(), bleClients, ui.page());
    worstDt = 0;
    statT = millis(); frames = 0; renderMs = 0;
  }
  // cap at ~30 fps (the C6 renders slower than that; this only matters for light frames)
  while (micros() - nowUs < 33000) { touchPoll(); delay(3); }   // keep sampling the panel; also yields to BLE / USB
}
