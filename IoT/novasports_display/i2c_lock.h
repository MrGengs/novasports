// NovaSports C6 — the ESP32-C6 has a single I2C controller, so the touch panel (loop task) and the
// sensors (FreeRTOS task) share one bus. Every transaction group goes through this mutex.
#pragma once
#include <Arduino.h>
#include <Wire.h>
#include <freertos/semphr.h>

namespace i2c {
static SemaphoreHandle_t mux = nullptr;
inline void begin(int sda, int scl, uint32_t hz) {
  if (!mux) mux = xSemaphoreCreateMutex();
  Wire.begin(sda, scl, hz);
}
inline bool take(uint32_t ms = 50) { return !mux || xSemaphoreTake(mux, pdMS_TO_TICKS(ms)) == pdTRUE; }
inline void give() { if (mux) xSemaphoreGive(mux); }
}  // namespace i2c
