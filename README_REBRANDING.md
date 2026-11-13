# Rebranding MOTUS → NovaSport (November 2026)

Folder ini adalah rumah NovaSport. Website, aplikasi, dan pitch deck NovaSport yang sudah ada (lihat `README.md`) tetap di tempatnya.
Rebranding menambahkan materi bisnis dan pemasaran hasil program Inkubasi Bisnis Semesta UNS (sebelumnya bernama **MOTUS**),
dibuat ulang dengan identitas NovaSport.

## Struktur tambahan

| Folder | Isi | Cara membuat ulang |
|---|---|---|
| `00_BRAND/` | Logo (terang, putih, ikon), `tokens.json`, **BRAND_GUIDE_NovaSport.pdf** | `python build_brand.py` |
| `01_PEMASARAN/` | **NovaSport-PitchDeck.pptx/.pdf** (12 slide + notes), Company Profile, BMC, Panduan Penjaga Stand (docx + pdf) | Deck: `python pitchdeck_build/build_deck.py` · Dokumen: `python rebrand_docx.py` |
| `02_VIDEO/` | Pipeline iklan (Blender → FFmpeg → Remotion → CapCut), hasil di `02_VIDEO/out/` | lihat `02_VIDEO/README.md` |
| `03_BISNIS/` | **Studi Kelayakan Bisnis & Business Plan NovaSport** (docx + pdf) | `python rebrand_studi.py` |
| `99_SUMBER/` | Foto purwarupa & uji lab, frame & video uji MVP, screenshot website NovaSport | — |

## Aturan brand (ringkas, lengkapnya di `00_BRAND/BRAND_GUIDE_NovaSport.pdf`)
- Nama: **NovaSport**. Tagline: **"Presisi di setiap tarikan."** Website: **nova-sport-id.web.app**. Instagram: belum ditetapkan (ditulis "Instagram NovaSport (segera)").
- Gaya: neumorph putih-biru (pustaka `pitchdeck/neu.py`), biru utama `#2F7BFF`, navy `#16233F`, emas `#F5A524` hanya aksen kecil.
- Logo pitch deck = cincin target + wordmark miring; logo website = huruf "N" dalam kotak biru. Keduanya milik NovaSport.

## Yang TIDAK di-rebrand (tetap di `Desktop/MOTUS`)
Dokumen resmi hibah dan catatan hukum memakai judul terdaftar **"Motus: Platform NextGen Simulator Olahraga Virtual Berbasis AIoT
Terintegrasi dengan Smart-Enabled Equipment Sport"**: proposal, kontrak, SPTJB, formulir capaian luaran, laporan akhir, laporan uji MVP,
laporan business matching, dan Hak Cipta DJKI No. 001368218. Di materi baru, rujuk sebagai "NovaSport (sebelumnya MOTUS)".

## Sumber data
Angka di semua materi mengikuti dokumen resmi hibah per November 2026: uji MVP 10 Agt 2026 (95%, 182 ms, 4,3/5), studi kelayakan
(Rp3,5 jt/unit, Rp75 rb & Rp500 rb/bulan, NPV Rp351,4 jt, IRR 126,3%), hibah Rp23 jt terserap 100%, mitra CRIMS UNS, SMA N 1 Ngaglik,
SMK N 2 Surakarta, Manahan Archery Club, Adhi Bidik Solo Raya. Bila berbeda dengan angka di website/pitch deck NovaSport lama, yang
dipakai adalah data dokumen resmi.

## Simulator panahan & perangkat (13 Nov 2026, sudah live)
Simulator panahan membaca Smart Arrow Bow (porting `archery-bridge`), wearable ESP32 (MAX30102, MLX90614, MPU),
dan EEG Muse S Athena langsung dari browser via Web Bluetooth. Kontrak perangkat: `docs/PERANGKAT_SIMULATOR_PANAHAN.md`.
Firmware wearable: `firmware/novasport_wearable/`. Cadangan web sebelum perubahan: `_backup_public_2026-11-13/`.
