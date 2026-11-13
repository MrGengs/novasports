# Wiring — NovaSports display (ESP32-C6-Touch-LCD-1.69)

Papan **tidak punya header pin**: sensor disolder ke pad TP di sisi belakang (jarak 2,15 mm).
Hanya dua modul yang ditambahkan, **MAX30102** dan **MLX90614**. Langkah/kadens dibaca dari IMU **QMI8658 onboard**.

## 1. Sambungan modul tambahan (satu bus I2C bersama)

| Modul | Pin modul | Ke papan | Keterangan |
|---|---|---|---|
| **MAX30102** (0x57) | VIN | `3V3` | modul breakout, aman 3,3 V |
| | GND | `GND` | |
| | SDA | `SDA` (GPIO8) | |
| | SCL | `SCL` (GPIO7) | |
| | INT | — | tidak dipakai (firmware polling FIFO) |
| **MLX90614** (0x5A) | VIN | `3V3` | pakai varian 3 V (MLX90614**BAA**) |
| | GND | `GND` | |
| | SDA | `SDA` (GPIO8) | SMBus → bus dijalankan 100 kHz |
| | SCL | `SCL` (GPIO7) | |
| **ESP32-C3** (opsional) | GPIO 3 | `ESP_RXD` (GPIO17) | sinyal "jam hidup" (HIGH) / "mati" (LOW) |
| | GND | `GND` | ground bersama |

Total kabel ke papan: `3V3`, `GND`, `SDA`, `SCL` (+ GPIO17 bila memakai C3). Lepas pull-up (4,7 kΩ) pada
modul MAX30102 dan MLX90614; papan sudah punya pull-up di `SDA`/`SCL`.

## 2. Perangkat onboard yang dipakai firmware

| Bagian | Antarmuka | Pin / alamat |
|---|---|---|
| LCD ST7789V2 240×280 | SPI | SCLK 1 · MOSI 2 · DC 3 · RST 4 · CS 5 · BL 6 (offset baris 20) |
| Sentuh CST816T | I2C | 0x15 (bus yang sama, SDA 8 / SCL 7) |
| IMU QMI8658 (langkah) | I2C | 0x6B |
| Baterai | ADC | `BAT_ADC` GPIO0, pembagi 1:3 |
| Penahan daya | GPIO | `BAT_EN` GPIO15 → HIGH di awal `setup()` |
| Tombol BOOT | GPIO9 | halaman berikutnya · tahan = mulai/jeda lari |
| Tombol PWR | GPIO18 | halaman sebelumnya · tahan = stop lari · tahan 2 dtk = matikan |

## 3. Peta alamat I2C

| Alamat | Perangkat | Sumber |
|---|---|---|
| 0x15 | CST816T | onboard |
| 0x51 | PCF85063 (RTC, tidak dipakai) | onboard |
| 0x57 | MAX30102 | tambahan |
| 0x5A | MLX90614 | tambahan |
| 0x6B | QMI8658 | onboard |

Tidak ada tabrakan alamat. Serial monitor mencetak `# i2c scan:` saat boot untuk mencocokkan.

## 4. Pad yang keluar dari papan

| Pad | GPIO | Dipakai untuk |
|---|---|---|
| `3V3` / `GND` | — | catu semua modul |
| `SDA` / `SCL` | 8 / 7 | bus I2C bersama |
| `ESP_RXD` | 17 | link ke ESP32-C3 (opsional) |
| `ESP_TXD` | 16 | bebas |
| `GPIO18` | 18 | tombol PWR (sudah di papan) |
| `GPIO9` | 9 | tombol BOOT (strapping, jangan ditahan saat reset) |
| `USB_N` / `USB_P` | 12 / 13 | **jangan dipakai** (port upload) |

> Verifikasi nomor GPIO `SDA`/`SCL` dan pembagi baterai terhadap skematik Waveshare sebelum menyolder.
