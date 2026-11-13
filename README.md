# NovaSport — Sport Education Platform

Platform **NextGen Simulator olahraga presisi berbasis AIoT** — landing page (company profile) +
aplikasi web role-based (simulator panahan, analitik biomekanika, LMS, gizi, manajemen sekolah).
Dibangun dengan **HTML, CSS, JavaScript native** (tanpa framework / build step) + **Firebase**
(Auth, Firestore, Hosting). Responsif untuk **desktop & mobile**.

🌐 **Live:** https://nova-sport-id.web.app
🖥️ **Aplikasi:** https://nova-sport-id.web.app/app

---

## Struktur Proyek

```
NovaSport/
├── firebase.json            # Hosting + Firestore config (cleanUrls, rewrites /app/**)
├── .firebaserc              # Project: nova-sport-id
├── firestore.rules          # Aturan keamanan Firestore (role-based)
├── firestore.indexes.json   # Index komposit
├── service-account.json     # 🔒 RAHASIA — di-gitignore (jangan commit / bagikan)
└── public/                  # Root hosting
    ├── index.html           # Landing page (company profile)
    ├── app.html             # Shell aplikasi (SPA, hash router → /app)
    └── assets/
        ├── css/  base.css · landing.css · app.css
        └── js/
            ├── firebase-config.js   # Init Firebase (config web publik)
            ├── auth.js              # Login Firebase + fallback DEMO offline
            ├── app.js               # Router, login, shell, navigasi per peran
            ├── charts.js            # Chart SVG dependency-free
            ├── demo-data.js         # Dataset demo (diganti Firestore di produksi)
            ├── ui.js · components helpers
            └── views/               # 1 file per peran + simulator + shared
                └── wearable-read.js # Pembacaan sensor live (Web Bluetooth + simulasi)
```

## Peran Pengguna (6)

| Peran | Halaman utama | Fitur kunci |
|---|---|---|
| 🎓 **Siswa / Atlet** | `/app#/dashboard` | Simulator panahan, riwayat, analitik, gizi, jadwal, profil |
| 📋 **Guru / Pelatih** | `/app#/guru` | Kelas & siswa, program latihan, penilaian, bank materi |
| 👪 **Orang Tua** | `/app#/ortu` | Progres anak, gizi, laporan/rapor, komunikasi |
| 🥗 **Ahli Gizi** | `/app#/gizi` | Pemantauan gizi, input pemeriksaan, program, analitik |
| 🏫 **Admin Sekolah** | `/app#/sekolah` | Guru & staf, siswa & kelas, kurikulum, langganan |
| 🌐 **Admin Pusat** | `/app#/pusat` | Sekolah mitra, perangkat IoT, billing, analitik platform |

**Flagship:** Simulator Panahan interaktif (`/app#/simulator`) — live scoring, grouping,
target dengan hit, dan readout AI Biomekanika real-time. Tombol **Auto-Sesi** mensimulasikan sesi penuh.

## Pembacaan Alat Wearable (`/app#/pembacaan`)

Halaman pembacaan sensor real-time dari Smart-Enabled Equipment. Dapat diakses peran
**Siswa** dan **Guru**, atau lewat tombol *Baca Live* di tiap kartu Perangkat Saya.

**Dua sumber data — otomatis:**

| Sumber | Kapan dipakai | Keterangan |
|---|---|---|
| **Web Bluetooth (BLE)** | Chrome/Edge/Opera di HTTPS, saat perangkat dipilih | Baca GATT langsung dari hardware |
| **Simulasi** | Browser tanpa Web Bluetooth, atau pairing dibatalkan | Pola sinyal realistis — Demo Day tetap jalan tanpa alat |

**Yang dibaca:** IMU 9-sumbu (accel/gyro/mag) dengan sparkline per sumbu + orientasi
roll/pitch/yaw, heart rate, baterai, sampling efektif (Hz), paket diterima/hilang,
latensi, dan log paket mentah.

📘 **Buku panduan pengguna:** https://nova-sport-id.web.app/panduan-wearable · [PDF](https://nova-sport-id.web.app/panduan-wearable.pdf)
Berisi panduan pemakaian, dokumentasi kode, flowchart, dan ringkasan rumus algoritma.
(`public/panduan-wearable.html`, gambar di `public/assets/img/panduan/`).

**Fitur:** kalibrasi nol (bias sensor), rekam sesi ke buffer, ekspor **CSV / JSON**,
pilih profil perangkat, dan atur laju render (10/25/50 fps).

**Profil GATT yang didukung:**

```
Heart Rate      0x180D  →  heart_rate_measurement  0x2A37  (notify)
Battery         0x180F  →  battery_level           0x2A19  (read + notify)
NovaSport IMU   6e400001-b5a3-f393-e0a9-e50e24dcca9e
                →  char  6e400003-b5a3-f393-e0a9-e50e24dcca9e  (notify)
```

Frame IMU NovaSport = **20 byte**: 9 × `int16` little-endian + `uint16` sequence.
Skala: accel ±16 g → `/2048`, gyro ±2000 °/s → `/16.4`, mag µT → `/10`.
Nomor sequence dipakai untuk menghitung paket hilang.

> 🔧 **Saat hardware siap:** samakan UUID di `views/wearable-read.js` (konstanta
> `NS_IMU_SERVICE` / `NS_IMU_CHAR`) dan `namePrefix` tiap profil dengan firmware
> ESP32/nRF52 perangkat. Decoder frame ada di fungsi `decodeImuFrame()`.

## Mode Demo vs Produksi

- **Demo per peran** (tombol di halaman login) berjalan **100% offline** — tanpa backend.
  Sempurna untuk presentasi/Demo Day.
- **Login / Daftar email** menggunakan Firebase Auth nyata. Agar berfungsi:
  1. Firebase Console → **Authentication** → aktifkan **Email/Password**.
  2. Firestore database sudah dibuat (✅ rules sudah ter-deploy).

## Cara Menjalankan Lokal

```powershell
# dari folder NovaSport
firebase emulators:start            # atau server statis apa pun:
npx serve public                    # lalu buka http://localhost:3000
```
> Wajib pakai HTTP server (bukan buka file langsung) karena memakai ES modules.

## Cara Deploy

```powershell
# Opsi A — akun login (sudah punya akses project)
firebase login
firebase deploy --only hosting,firestore:rules --project nova-sport-id

# Opsi B — service account (CI / non-interactive)
$env:GOOGLE_APPLICATION_CREDENTIALS = "$PWD\service-account.json"
firebase deploy --only hosting,firestore:rules --project nova-sport-id --non-interactive
```

## ⚠️ Keamanan Penting

- **`service-account.json` adalah kunci privat.** Sudah masuk `.gitignore`. Jangan commit / unggah.
- Private key service account ini pernah dibagikan via chat → **disarankan rotasi**:
  Firebase Console → ⚙ Project Settings → Service accounts → *Generate new private key*,
  lalu nonaktifkan key lama di Google Cloud IAM.
- `apiKey` di `firebase-config.js` adalah **web API key** (aman terekspos di sisi klien);
  keamanan data dijaga oleh **Firestore Security Rules**, bukan oleh menyembunyikan key.

## Teknologi Inti (sesuai proposal)

1. **Smart-Enabled Equipment** — Smart Arrow Bow (IMU 9-sumbu, infrared, pressure sensor).
2. **AI Biomekanika Engine** — performance score, heatmap postur, feedback korektif real-time.
3. **Virtual Simulator & Gamifikasi** — simulasi imersif + NovaSport League leaderboard.

---
© 2026 Tim NovaSport UNS — hilirisasi riset di bawah Prof. Dr.Eng. Ir. Pringgo Widyo Laksono.
