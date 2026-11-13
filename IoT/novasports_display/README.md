# NovaSports display — ESP32-C6-Touch-LCD-1.69

Firmware jam NovaSports untuk papan **Waveshare ESP32-C6-Touch-LCD-1.69** (layar 240 × 280, portrait).
Isinya sama dengan `novaband/firmware/novaband_display` (T-Display-S3): halaman **LIVE / RUN / READINESS / LINK**,
model sesi lari, sensor MAX30102 + MLX90614 (+ IMU QMI8658 onboard untuk langkah), protokol JSON (BLE + USB serial), BLE HR/Battery
standar, dan cloud Firebase RTDB. Yang berbeda hanya lapisan board (layar, sentuh, tombol, daya, I2C).

## Beda dengan versi T-Display-S3

| | T-Display-S3 | ESP32-C6-Touch-LCD-1.69 |
|---|---|---|
| Layar | 320×170 landscape, bus i80 + DMA | 240×280 portrait, SPI (Arduino_GFX), render 4 pita × 70 baris |
| PSRAM | 8 MB | tidak ada → aset dibaca langsung dari flash (mmap) |
| I2C | Wire (sentuh) + Wire1 (sensor) | satu bus (SDA 8 / SCL 7, 100 kHz) dipakai bersama, diatur mutex (`i2c_lock.h`) |
| Tombol | BOOT (GPIO0) + KEY (GPIO14) | BOOT (GPIO9) = berikutnya · PWR (GPIO18) = sebelumnya |
| Mati | deep sleep + ext0 | lepas `BAT_EN` (GPIO15); di USB layar gelap, tombol apa pun → restart |
| Baterai | ADC GPIO4, pembagi 1:2 | `BAT_ADC` GPIO0, pembagi 1:3 |
| Link ke ESP32-C3 | GPIO12 | GPIO17 (pad `ESP_RXD`) |

Tombol: tekan singkat BOOT/PWR = halaman berikutnya/sebelumnya · tahan BOOT = mulai/jeda lari ·
tahan PWR = hentikan lari · tahan PWR 2 detik = matikan. Sapu kiri/kanan = ganti halaman, ketuk halaman RUN = mulai/jeda.

## Wiring sensor (semua I2C, satu bus)

Hanya dua modul yang ditambahkan: `3V3`, `GND`, `SDA` (GPIO8), `SCL` (GPIO7) ke **MAX30102** (0x57) dan **MLX90614** (0x5A).
Langkah/kadens dibaca dari IMU **QMI8658 onboard** (0x6B) - tidak perlu MPU6050 / GY-50.
Lepas pull-up di modul tambahan (papan sudah punya 4,7 kΩ). Pad `ESP_RXD` (GPIO17) → GPIO3 ESP32-C3 bila memakai C3 sensor.
Tabel lengkap: [WIRING.md](WIRING.md).

## Build & flash

```bash
cp secrets.example.h secrets.h          # isi WiFi + akun cloud (secrets.h tidak di-commit)
python3 tools/pack_assets_c6.py         # -> build/assets.bin  (butuh ../novaband dengan build/screen + prebuilt)
arduino-cli compile -b esp32:esp32:esp32c6:CDCOnBoot=cdc,FlashSize=16M,PartitionScheme=custom \
    --output-dir build/app novasports_display
# flash: bootloader 0x0, partitions 0x8000, app 0x10000, assets 0x310000
esptool.py --chip esp32c6 -p /dev/ttyACM0 -b 921600 write_flash --flash_size 16MB \
    0x0 build/app/novasports_display.ino.bootloader.bin 0x8000 build/app/novasports_display.ino.partitions.bin \
    0x10000 build/app/novasports_display.ino.bin 0x310000 build/assets.bin
```

Pustaka: GFX Library for Arduino, ArduinoJson 7, SparkFun MAX3010x.

## Pratinjau UI tanpa papan

```bash
g++ -O2 -std=c++17 -I <ArduinoJson>/src sim/sim_main.cpp novasports_display/src/{gfx,ui,model,protocol}.cpp -o sim/sim
sim/sim build/assets.bin out/      # menulis PPM per halaman
```

## Catatan

- ESP32-C6 tidak punya FPU; renderer UI memakai float, jadi laju bingkai lebih rendah daripada S3 (ukur lewat
  log `# fps` / `# slow frame`). Bila terasa patah, turunkan efek (specks/glow) di `src/ui.cpp`.
- Pin dan perilaku tombol PWR diukur saat boot (lihat `pwrKeyBegin`); nilai pembagi baterai perlu dikalibrasi
  (`battery.h`, DIVIDER) dengan multimeter.
