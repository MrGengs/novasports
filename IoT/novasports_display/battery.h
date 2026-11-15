// NovaSports — baterai Li-Po 1 sel di Waveshare ESP32-C6-Touch-LCD-1.69 (pembagi 1:3 ke BAT_ADC = GPIO 0).
//
// Diporting dari modul baterai project Asawatch (touchscreen/battery.cpp), versi ringkas:
//   * MEDIAN 9 sampel tiap panggilan (burst transmit WiFi membuat tegangan ambles sesaat; median
//     membuang pencilan, rata-rata justru ikut tertarik), lalu dihaluskan.
//   * Kurva Li-Po NON-LINEAR (peta linear 3,3-4,15 V salah besar di tengah rentang).
//   * Dasar persen = MEDIAN dari minimum tiap slot 5 dtk selama 2 menit: beban singkat (WiFi, layar)
//     tidak menggesernya.
//   * Saat DICAS pin tidak mengukur sel: di board ini pin membaca rel USB (> 4,3 V) sehingga persen
//     lama "langsung 100%". Sekarang: persen dibekukan di nilai sebelum dicolok lalu naik pelan
//     (perkiraan waktu, BUKAN pengukuran) dan mentok 99%. Begitu dicabut, persen bergeser 1% per
//     3 dtk ke nilai terukur, tidak melompat.
//   * Persen terakhir disimpan di NVS, jadi reboot/brownout tidak menjatuhkan angka.
//
// KALIBRASI (sekali, dengan multimeter): ukur tegangan baterai SAAT TIDAK DICAS (cabut USB) di konektor
// baterai, lalu ketik di serial monitor:  batcal 3.87   (volt hasil ukur). Pembagi baru dihitung otomatis dan
// disimpan di NVS (bertahan setelah reboot). "batcal reset" mengembalikan ke bawaan (3,0).
#pragma once
#include <Arduino.h>
#include <Preferences.h>
#include "soc/usb_serial_jtag_reg.h"

namespace battery {

static const int PIN = 0;
static const float DIVIDER_DEFAULT = 3.0f;         // Vbaterai / Vpin bawaan (pembagi 200k/100k di board)
static const int PLUG_MV = 4300, UNPLUG_MV = 4250; // histeresis: di atas ini = USB (pin membaca rel USB)
// Model laju isi (perkiraan dari kapasitas, bukan pengukuran). Pengisi onboard ETA6098 (ISET = 82 kOhm di skematik Waveshare)
// mampu sampai ~2 A, tetapi arus nyata dibatasi sumbernya: port USB PC ~500 mA, adaptor dinding lebih besar.
// Fase CC (arus tetap) sampai ~80 %, sesudah itu fase CV: arus menyusut sampai sel penuh.
static const float CAP_MAH = 1000.f;               // kapasitas baterai terpasang (800-1200 mAh)
static const float CHG_MA_USB = 500.f;             // arus isi ke sel saat tersambung ke host USB (PC)
static const float CHG_MA_WALL = 800.f;            // arus isi dengan adaptor dinding (tanpa data USB)
static const float CC_UNTIL_PCT = 80.f;
inline float chargeRatePerMin(float pct, bool host) {
  float cc = (host ? CHG_MA_USB : CHG_MA_WALL) / CAP_MAH * 100.f / 60.f;         // %/menit di fase CC
  if (pct < CC_UNTIL_PCT) return cc;
  float k = (100.f - pct) / (100.f - CC_UNTIL_PCT);                              // 1 -> 0 di fase CV
  return cc * (.15f + .85f * (k < 0 ? 0 : k)) ;
}      // perkiraan laju isi saat dicas (pagar, bukan pengukuran)

struct Pt { int mv, pct; };
static const Pt CURVE[] = {
  {4190, 100}, {4100, 92}, {4000, 85}, {3950, 78}, {3900, 70}, {3850, 62}, {3800, 55}, {3750, 47},
  {3700, 40},  {3650, 33}, {3600, 25}, {3550, 18}, {3500, 12}, {3450, 8},  {3400, 5},  {3300, 2},
  {3000, 0},
};
static const int CURVE_N = sizeof(CURVE) / sizeof(CURVE[0]);

inline int toPercent(int mv) {
  if (mv >= CURVE[0].mv) return 100;
  if (mv <= CURVE[CURVE_N - 1].mv) return 0;
  for (int i = 0; i < CURVE_N - 1; i++)
    if (mv <= CURVE[i].mv && mv > CURVE[i + 1].mv) {
      int dv = CURVE[i].mv - CURVE[i + 1].mv, dp = CURVE[i].pct - CURVE[i + 1].pct;
      return CURVE[i + 1].pct + ((mv - CURVE[i + 1].mv) * dp + dv / 2) / dv;
    }
  return 0;
}

namespace {
bool viaUsb = false;                                // charging was detected by a USB host (SOF) -> PC port, ~500 mA
// USB host present? The C6's USB-Serial-JTAG block counts 1 ms SOF frames while a host drives the port.
// (A plain wall charger sends no SOF; that case is caught by the voltage heuristics below.)
bool usbHost() {
  uint32_t a = REG_READ(USB_SERIAL_JTAG_FRAM_NUM_REG) & USB_SERIAL_JTAG_SOF_FRAME_INDEX_V;
  delayMicroseconds(2500);
  return a != (REG_READ(USB_SERIAL_JTAG_FRAM_NUM_REG) & USB_SERIAL_JTAG_SOF_FRAME_INDEX_V);
}
float fullMin = 0;                                  // minutes spent on the charger at >= 4.18 V (constant-voltage phase)
const int SLOTS = 24;                              // 24 x 5 dtk = 2 menit
Preferences prefs;
float divider = DIVIDER_DEFAULT;
int saved = -1, pct = -1, pinMv = 0;
float emaMv = 0, prevMv = 0, chgPct = 0;
bool charging = false;
uint16_t slotMin[SLOTS];
int slotN = 0, slotI = 0, curSlotMin = 0, baseMv = 0, savedPct = -1;
uint32_t snapUntil = 0, slotAt = 0, stepAt = 0, updAt = 0, saveAt = 0;

int median9(int* s) {
  for (int i = 1; i < 9; i++) for (int j = i; j > 0 && s[j] < s[j - 1]; j--) { int t = s[j]; s[j] = s[j - 1]; s[j - 1] = t; }
  return s[4];
}
void clearWindow() { slotN = slotI = 0; curSlotMin = 0; slotAt = 0; baseMv = 0; }
}  // namespace

inline void begin() {
  prefs.begin("batt", false);
  saved = prefs.getChar("pct", -1);
  float d = prefs.getFloat("div", DIVIDER_DEFAULT);
  if (d >= 2.4f && d <= 3.6f) divider = d;
  analogReadResolution(12);
}

inline void save() {
  if (pct >= 0 && pct != savedPct) { prefs.putChar("pct", (int8_t)pct); savedPct = pct; }
}

// Panggil tiap ~500 ms dari loop().
inline void update() {
  uint32_t now = millis();
  int s[9];
  for (int i = 0; i < 9; i++) { s[i] = analogReadMilliVolts(PIN); delayMicroseconds(300); }
  pinMv = median9(s);
  float v = pinMv * divider;
  float dt = updAt ? (now - updAt) / 1000.f : .5f;
  updAt = now;

  bool first = emaMv == 0;
  emaMv = first ? v : emaMv * .8f + v * .2f;
  bool wasCharging = charging;
  static uint32_t usbAt = 0, usbLast = 0;
  if (!usbAt || now - usbAt >= 1000) { usbAt = now ? now : 1; if (usbHost()) usbLast = now ? now : 1; }
  bool usb = usbLast && now - usbLast < 3000;
  // Charging = USB host present, or the pin reads the USB rail, or the voltage jumped up (charger plugged in).
  if (!charging && (usb || emaMv > PLUG_MV || (!first && v - prevMv >= 100))) { charging = true; viaUsb = usb; }   // dicolok
  else if (charging) {
    if (viaUsb) { if (!usb) charging = false; }                // host gone for 3 s
    else if (emaMv < UNPLUG_MV && (emaMv < PLUG_MV - 100 || (!first && prevMv - v >= 100))) charging = false;   // dicabut
  }
  prevMv = v;

  if (charging != wasCharging || first) { clearWindow(); fullMin = 0; }
  if (wasCharging && !charging) { emaMv = v; snapUntil = now + 3000; }       // dicabut: buang sisa tegangan charger, baca sel sungguhan     // jendela median tidak boleh campur dua keadaan

  if (!charging) {
    // dasar = median minimum slot 5 dtk
    if (!slotAt) { slotAt = now; curSlotMin = (int)v; }
    if ((int)v < curSlotMin) curSlotMin = (int)v;
    if (now - slotAt >= 5000) {
      slotMin[slotI] = curSlotMin; slotI = (slotI + 1) % SLOTS; if (slotN < SLOTS) slotN++;
      slotAt = now; curSlotMin = (int)v;
    }
    if (slotN) {
      uint16_t t[SLOTS]; for (int i = 0; i < slotN; i++) t[i] = slotMin[i];
      for (int i = 1; i < slotN; i++) for (int j = i; j > 0 && t[j] < t[j - 1]; j--) { uint16_t x = t[j]; t[j] = t[j - 1]; t[j - 1] = x; }
      baseMv = t[slotN / 2];
    } else baseMv = (int)emaMv;
    if (now < snapUntil) baseMv = (int)v;                                             // 3 dtk pertama setelah dicabut: ikuti bacaan langsung
    int target = toPercent(baseMv);
    if (pct < 0) pct = (saved >= 0 && abs(saved - target) <= 10) ? saved : target;   // titik awal: simpanan kalau masih masuk akal
    else if (now < snapUntil) pct = target;                                          // lompat langsung ke nilai terukur
    else if (now - stepAt >= 3000) {                                                  // 1% per 3 dtk menuju nilai terukur
      stepAt = now;
      if (target > pct) pct++; else if (target < pct) pct--;
    }
    chgPct = pct;
  } else {
    // Saat dicas pin TIDAK dipakai (tegangan terminal naik karena arus charger): persen dihitung dari WAKTU.
    // Mulai dari persen sebelum dicolok, naik menurut chargeRatePerMin() (model kapasitas + arus isi), mentok 99.
    if (pct < 0) {                                                         // boot di USB: pakai simpanan, atau perkiraan tegangan
      if (saved >= 0) pct = saved;
      else if (emaMv > 0 && emaMv <= PLUG_MV) pct = min(99, toPercent((int)emaMv - 100));
      else pct = 50;
      chgPct = pct;
    }
    if (!wasCharging && pct >= 0) chgPct = pct;                            // baru dicolok: mulai dari angka sekarang
    chgPct += chargeRatePerMin(chgPct, viaUsb) * dt / 60.f;
    int p = min(99, (int)chgPct);
    if (p > pct) pct = p;                                                  // naik pelan, tanpa lompatan
  }
  if (now - saveAt >= 60000) { saveAt = now; save(); }
}

// Kalibrasi dari tegangan sel hasil ukur multimeter (volt). Hanya saat TIDAK dicas.
inline bool calibrate(float volts) {
  if (charging || emaMv < 2500 || volts < 2.5f || volts > 4.3f) return false;
  float k = volts * 1000.f / emaMv;
  if (k < .8f || k > 1.25f) return false;
  float d = divider * k;
  if (d < 2.4f || d > 3.6f) return false;
  divider = d;
  prefs.putFloat("div", d);
  emaMv = volts * 1000.f; prevMv = emaMv;
  clearWindow();
  return true;
}
inline void calibrateReset() { divider = DIVIDER_DEFAULT; prefs.remove("div"); emaMv = 0; clearWindow(); }
inline float dividerValue() { return divider; }

inline int percent() { return pct < 0 ? 0 : pct; }
inline bool isCharging() { return charging; }
inline int pinMillivolts() { return pinMv; }
inline int millivolts() { return charging ? 0 : (int)emaMv; }   // tegangan sel (0 = tidak terukur saat dicas)

}  // namespace battery
