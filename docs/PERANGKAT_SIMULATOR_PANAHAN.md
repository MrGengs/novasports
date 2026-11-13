# Perangkat Simulator Panahan NovaSport (full web)

Simulator panahan di `nova-sport-id.web.app/app#/sim/archery` membaca semua perangkat **langsung dari browser**
lewat Web Bluetooth — tidak ada jembatan Python, server relay, atau aplikasi tambahan.

**Syarat browser:** Chrome atau Edge di Windows/macOS/Linux/Android, lewat HTTPS. Safari/iOS belum mendukung
Web Bluetooth → pakai Mode HP atau Simulasi. Satu perangkat BLE hanya bisa tersambung ke satu aplikasi:
tutup aplikasi Muse/nRF Connect dulu.

| Perangkat | Modul web | Fungsi |
|---|---|---|
| Smart Arrow Bow (busur) | `public/assets/js/devices/bow-ble.js` | arah bidik (IMU BNO085) + tembakan & kecepatan (IR gate) |
| Wearable ESP32 OLED | `public/assets/js/devices/wearable-ble.js` | MAX30102, MLX90614, MPU |
| Muse S Athena | `public/assets/js/devices/eeg-muse.js` | EEG 4 kanal 256 Hz |

Setiap tembakan merekam potret semua metrik; **Unduh CSV** dan **Simpan Sesi** (Firestore `sessions` untuk akun
asli, penyimpanan lokal untuk akun demo) memuat semuanya.

---

## 1. Smart Arrow Bow — porting `archery-bridge`

Firmware busur **tidak perlu diubah**: protokolnya identik dengan `titanraditya/archery-bridge` (`FIRMWARE.md`).

- Advertise nama berawalan `MOTUS` atau `NOVA`, Nordic UART notify `6E400003-B5A3-F393-E0A9-E50E24DCCA9E`.
- Paket `<4h H B B [B]>` 12–13 byte ~60 Hz: `qw,qx,qy,qz` (×32767), `meas` (Δt IR gate µs), `shot_seq`, `seq`, `btn_seq`.
  JSON satu baris (`{"q":[…],"dt_us":…,"shot_seq":…}`) juga diterima.
- Diolah di browser persis seperti `ble_reader.py`: kalibrasi `ref⁻¹×q`, preset sumbu 0–3, `GATE_DIST_M = 0.05`,
  `SPEED_SANE = 2–200 m/s`, `SPEED_RANGE = 10–50 m/s → draw`, counter shot dari selisih `shot_seq`, tombol Reset
  Posisi (`btn_seq`), reconnect otomatis tiap 2 detik.
- Bedanya dengan versi Python: tidak ada UDP/Unity — titik kena dihitung dari arah bidik saat lepas
  (+ jatuh panah bila tarikan lemah), lalu diskor di target 10 ring.
- **Mode HP**: sensor gerak HP sendiri; tekan-tahan area target = menarik, lepas = menembak (setara `phone.html`).

## 2. Wearable ESP32 OLED (MAX30102 · MLX90614 · MPU)

Firmware: `firmware/novasport_wearable/novasport_wearable.ino` (core esp32 3.x; library Adafruit MLX90614,
SSD1306, GFX; sudah dikompilasi). I²C satu bus 100 kHz: MAX30102 `0x57`, MLX90614 `0x5A`, MPU6050 `0x68`,
OLED `0x3C`. Pin default SDA 21 / SCL 22 — ubah `PIN_SDA/PIN_SCL` sesuai modul.

**Prinsip:** firmware mengirim data **mentah**; semua rumus ada di web (bisa disetel tanpa flash ulang).

GATT: nama berawalan `NOVA`, service `6e400010-b5a3-f393-e0a9-e50e24dcca9e`, notify `6e400011-…`, tanpa
pairing, MTU ≥ 64 (firmware meminta 185). Paket little-endian, byte pertama = TAG:

| TAG | Isi | Panjang |
|---|---|---|
| `0x01` PPG | `seq, n, fs(Hz)` + n × (`red` u24, `ir` u24) — 18-bit mentah MAX30102 | 4 + 6n |
| `0x02` IMU | `seq, n, fs(Hz)` + n × (`ax,ay,az,gx,gy,gz` int16) — **wajib** ±4 g & ±500 dps | 4 + 12n |
| `0x03` SUHU | `seq` + objek int16 (°C×100) + lingkungan int16 (°C×100) | 6 |
| `0x04` RINGKAS | `seq` + hr u8 + spo2 u8 + baterai u8 (opsional, cadangan) | 5 |

Yang dihitung web dari data itu:

| Sumber | Metrik |
|---|---|
| MAX30102 (PPG) | detak jantung, interval RR, HRV (RMSSD, SDNN, pNN50), SpO₂ (rasio merah/IR, kurva 104 − 17R), indeks perfusi, laju napas (modulasi baseline), deteksi kontak kulit |
| MLX90614 | suhu kulit (permukaan), suhu lingkungan, tren °C/menit |
| MPU | tremor (RMS giroskop >2 Hz), kestabilan tangan 0–100, variasi gerak, hentakan saat lepas; kestabilan 2 detik sebelum tiap tembakan |

Profil standar juga didukung: Pulse Oximeter `0x1822` (SpO₂) dan Heart Rate `0x180D` (HR + RR).
**Semua angka adalah estimasi untuk latihan, bukan diagnosis medis.** SpO₂ dari MAX30102 belum dikalibrasi
klinis; suhu MLX90614 adalah suhu permukaan kulit, bukan suhu inti tubuh.

## 3. EEG Muse S Athena

- Service Muse `0xFE8D` (dicari otomatis bila berbeda), kontrol `273e0001-4c4d-454d-96be-f03bac821358`,
  EEG `273e0013-…`, telemetri `273e0014-…` — mengikuti OpenMuse (D. Makowski).
- Inisialisasi: `v6, s, h, <preset>, s, dc001 ×2, L1, s`. Preset di UI: `p1035` (EEG4 + optik, dianjurkan),
  `p21` (EEG4 tanpa optik, hemat baterai), `p1041` (semua kanal).
- Dekoder: paket header 14 byte → subpaket bertag; EEG 14-bit LSB-first, 256 Hz, skala 1450/16383 µV;
  kanal TP9, AF7, AF8, TP10; baterai dari tag `0x88/0x98` (÷256).
- Analisis tiap 0,5 detik (jendela 2 detik, FFT): daya relatif δ, θ, α, β, γ; indeks **Fokus** (β terhadap α+θ),
  **Tenang** (porsi α), **Kantuk** (θ+δ terhadap α+β); kualitas kontak per elektroda.
- Muse 2 / Muse S generasi lama memakai protokol berbeda dan **tidak** didukung modul ini.

## 4. Pengujian tanpa alat

Setiap kartu punya tombol **Simulasi** yang mengirim paket palsu melalui dekoder yang sama (busur 60 Hz,
PPG 100 Hz, IMU 50 Hz, suhu 2 Hz, EEG 256 Hz), jadi alur data dan tampilan bisa diuji kapan saja.
