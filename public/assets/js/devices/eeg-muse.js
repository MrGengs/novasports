/* ============================================================
   NovaSport — EEG link: Muse S Athena (MS-03) via Web Bluetooth
   Protokol mengikuti OpenMuse (D. Makowski) & muse-athena-protocol:
     Kontrol  273e0001-4c4d-454d-96be-f03bac821358  (write tanpa respons + notify JSON status)
     EEG      273e0013-…   Telemetri 273e0014-…  (notify)
     Perintah ASCII berawalan panjang: v6, s, h, <preset>, s, dc001 ×2, L1, s
   Pesan -> paket (header 14 byte: len, idx, time u32 @256 kHz, …, pkt_id @9)
         -> subpaket pertama tanpa tag, berikutnya [TAG][idx][3 byte][data]
   EEG 14-bit LSB-first, 256 Hz, skala 1450/16383 µV. Kanal: TP9, AF7, AF8, TP10.

   Event: "samples" {ch:[[...]], n}  ·  "bands" {abs, rel, metrics, quality}
          "status" {state, text}  ·  "log" {text, level}  ·  "battery" {pct}
   ============================================================ */

export const MUSE_SERVICE = 0xfe8d;
export const CONTROL_UUID = "273e0001-4c4d-454d-96be-f03bac821358";
export const EEG_UUID = "273e0013-4c4d-454d-96be-f03bac821358";
export const OTHER_UUID = "273e0014-4c4d-454d-96be-f03bac821358";
export const FS = 256;
export const CHANNELS = ["TP9", "AF7", "AF8", "TP10"];
export const PRESETS = {
  p1035: "EEG4 + Optik4 + IMU (LED redup) — dianjurkan",
  p21: "EEG4 + IMU (tanpa optik, hemat baterai)",
  p1041: "EEG8 + Optik16 + IMU (semua kanal)",
};
const EEG_SCALE = 1450 / 16383;
const SENSORS = {
  0x11: { type: "EEG", ch: 4, n: 4, len: 28 }, 0x12: { type: "EEG", ch: 8, n: 2, len: 28 },
  0x34: { type: "OPTICS", len: 30 }, 0x35: { type: "OPTICS", len: 40 }, 0x36: { type: "OPTICS", len: 40 },
  0x47: { type: "ACCGYRO", len: 36 }, 0x53: { type: "Unknown", len: 24 },
  0x88: { type: "BATTERY", len: 188 }, 0x98: { type: "BATTERY", len: 20 },
};
export const BANDS = { delta: [1, 4], theta: [4, 8], alpha: [8, 13], beta: [13, 30], gamma: [30, 44] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function encodeCommand(token) {
  const payload = new TextEncoder().encode(token + "\n");
  const out = new Uint8Array(payload.length + 1); out[0] = payload.length; out.set(payload, 1);
  return out;
}

/** Bongkar n nilai bit-width dari blok byte LSB-first. */
function unpackBits(bytes, count, width) {
  const out = new Array(count); let acc = 0, accBits = 0, bi = 0;
  for (let i = 0; i < count; i++) {
    while (accBits < width) { acc |= bytes[bi++] << accBits; accBits += 8; }
    out[i] = acc & ((1 << width) - 1); acc >>>= width; accBits -= width;
  }
  return out;
}

/** FFT radix-2 in-place (re, im panjang 2^k). */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, ai = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k + len / 2] = re[i + k] - ar; im[i + k + len / 2] = im[i + k] - ai; re[i + k] += ar; im[i + k] += ai;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

export class MuseLink extends EventTarget {
  constructor() {
    super();
    this.N = 512;                                         // jendela analisis 2 detik
    this.buf = CHANNELS.map(() => new Float32Array(this.N * 2));
    this.w = 0; this.total = 0; this.preset = "p1035"; this.source = null; this.battery = null; this.fw = null;
  }
  static get bluetoothAvailable() { return typeof navigator !== "undefined" && !!navigator.bluetooth; }
  _emit(t, d) { this.dispatchEvent(new CustomEvent(t, { detail: d })); }
  _status(state, text) { this.state = state; this._emit("status", { state, text }); }
  _log(text, level = "info") { this._emit("log", { text, level }); }

  async connectBle(preset = this.preset) {
    if (!MuseLink.bluetoothAvailable) throw new Error("Browser ini belum mendukung Web Bluetooth. Pakai Chrome/Edge di desktop atau Android.");
    await this.stop();
    this.preset = preset; this.source = "ble"; this._stopped = false;
    this._status("scanning", "Memilih headband Muse…");
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "Muse" }, { namePrefix: "MuseS" }, { services: [MUSE_SERVICE] }],
      optionalServices: [MUSE_SERVICE],
    });
    this.device = device;
    this._onDisc = () => { if (!this._stopped) this._status("error", "Muse terputus. Tekan Hubungkan lagi."); };
    device.addEventListener("gattserverdisconnected", this._onDisc);
    this._status("connecting", `Menyambung ke ${device.name || "Muse"}…`);
    const server = await device.gatt.connect();
    // cari service yang memuat karakteristik kontrol Athena
    let svc = null;
    try { svc = await server.getPrimaryService(MUSE_SERVICE); } catch { /* lanjut cari */ }
    if (!svc) {
      for (const s of await server.getPrimaryServices()) {
        try { await s.getCharacteristic(CONTROL_UUID); svc = s; break; } catch { /* bukan ini */ }
      }
    }
    if (!svc) throw new Error("Service Muse tidak ditemukan. Pastikan headband menyala, tidak sedang terhubung ke aplikasi Muse di HP, lalu coba lagi.");
    this.ctrl = await svc.getCharacteristic(CONTROL_UUID);
    this._subs = [];
    const sub = async (ch, fn) => { ch.addEventListener("characteristicvaluechanged", fn); await ch.startNotifications(); this._subs.push([ch, fn]); };
    let ctlText = "";
    await sub(this.ctrl, (e) => {
      ctlText = (ctlText + new TextDecoder().decode(e.target.value)).slice(-4096);
      const fw = ctlText.match(/"fw"\s*:\s*"([^"]+)"/), bp = ctlText.match(/"bp"\s*:\s*([\d.]+)/);
      if (fw && !this.fw) { this.fw = fw[1]; this._log(`firmware ${this.fw}`); }
      if (bp) { this.battery = +bp[1]; this._emit("battery", { pct: this.battery }); }
    });
    let eegOk = false;
    for (const uuid of [EEG_UUID, OTHER_UUID]) {
      try {
        const ch = await svc.getCharacteristic(uuid);
        await sub(ch, (e) => this._onMessage(new Uint8Array(e.target.value.buffer, e.target.value.byteOffset, e.target.value.byteLength)));
        if (uuid === EEG_UUID) eegOk = true;
      } catch (err) { this._log(`tidak bisa subscribe ${uuid.slice(0, 8)}: ${err.message}`, "warn"); }
    }
    if (!eegOk) throw new Error("Karakteristik EEG Athena (273e0013) tidak tersedia. Perangkat ini mungkin Muse generasi lama (Muse 2/S Gen 1–2), bukan Muse S Athena.");
    await this._init(preset);
    this._startAnalysis();
    this._status("live", `Terhubung · ${device.name || "Muse S Athena"} · ${preset}`);
    return device.name || "Muse S Athena";
  }

  async _cmd(token) {
    const data = encodeCommand(token);
    if (this.ctrl.writeValueWithoutResponse) await this.ctrl.writeValueWithoutResponse(data); else await this.ctrl.writeValue(data);
  }
  async _init(preset) {
    const step = async (t, ms) => { try { await this._cmd(t); } catch (e) { this._log(`perintah ${t} gagal: ${e.message}`, "warn"); } await sleep(ms); };
    await step("v6", 200); await step("s", 200); await step("h", 200);
    await step(preset, 200); await step("s", 200);
    await step("dc001", 50); await step("dc001", 100);
    await step("L1", 300); await step("s", 200);
    this._log(`inisialisasi selesai (preset ${preset})`);
  }

  // ------------------------------------------------------------- dekoder
  _onMessage(bytes) {
    let off = 0;
    while (off + 14 <= bytes.length) {
      const len = bytes[off];
      if (len < 14 || off + len > bytes.length) break;
      const pkt = bytes.subarray(off, off + len);
      const id = pkt[9], cfg = SENSORS[id];
      if (cfg) this._subpackets(pkt.subarray(14), id, cfg);
      off += len;
    }
  }
  _subpackets(data, firstId, firstCfg) {
    let off = 0;
    if (firstCfg.len && firstCfg.len <= data.length) { this._decode(firstId, data.subarray(0, firstCfg.len)); off = firstCfg.len; }
    while (off + 5 <= data.length) {
      const tag = data[off], cfg = SENSORS[tag];
      if (!cfg || !cfg.len || off + 5 + cfg.len > data.length) break;
      this._decode(tag, data.subarray(off + 5, off + 5 + cfg.len));
      off += 5 + cfg.len;
    }
  }
  _decode(tag, d) {
    const cfg = SENSORS[tag];
    if (cfg.type === "EEG") {
      const vals = unpackBits(d, cfg.n * cfg.ch, 14);
      const chunk = CHANNELS.map(() => []);
      for (let s = 0; s < cfg.n; s++) {
        for (let c = 0; c < 4; c++) { const uv = vals[s * cfg.ch + c] * EEG_SCALE; chunk[c].push(uv); this._push(c, uv); }
        this._advance(1);
      }
      this._emit("samples", { ch: chunk, n: cfg.n });
    } else if (cfg.type === "BATTERY" && d.length >= 2) {
      this.battery = +(((d[1] << 8) | d[0]) / 256).toFixed(1);
      this._emit("battery", { pct: this.battery });
    }
  }
  _push(c, v) { this.buf[c][this.w] = v; }   // tulis di posisi w, lalu _advance
  _advance(n) { this.w = (this.w + n) % this.buf[0].length; this.total += n; }

  // ------------------------------------------------------------- analisis gelombang otak
  _window(c) {
    const b = this.buf[c], L = b.length, N = this.N, out = new Float64Array(N);
    for (let i = 0; i < N; i++) out[i] = b[(this.w - N + i + L) % L];
    return out;
  }
  analyze() {
    if (this.total < this.N) return null;
    const abs = Object.fromEntries(Object.keys(BANDS).map((k) => [k, 0]));
    const quality = [];
    const binHz = FS / this.N;
    for (let c = 0; c < 4; c++) {
      const x = this._window(c);
      const mean = x.reduce((a, v) => a + v, 0) / x.length;
      let sdv = 0; for (let i = 0; i < x.length; i++) { x[i] -= mean; sdv += x[i] * x[i]; } sdv = Math.sqrt(sdv / x.length);
      // kualitas kontak: datar (<1 µV) = tidak menempel, sangat besar (>120 µV) = artefak/gerak
      quality.push(sdv < 1 ? "lepas" : sdv > 120 ? "berisik" : sdv > 60 ? "cukup" : "baik");
      const re = new Float64Array(this.N), im = new Float64Array(this.N);
      for (let i = 0; i < this.N; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (this.N - 1)));
      fft(re, im);
      for (const [k, [lo, hi]] of Object.entries(BANDS)) {
        let p = 0; for (let f = Math.ceil(lo / binHz); f < Math.floor(hi / binHz); f++) p += re[f] * re[f] + im[f] * im[f];
        abs[k] += p / 4;
      }
    }
    const tot = Object.values(abs).reduce((a, v) => a + v, 0) || 1;
    const rel = Object.fromEntries(Object.entries(abs).map(([k, v]) => [k, v / tot]));
    const clamp = (v) => Math.max(0, Math.min(100, v));
    const metrics = {
      fokus: clamp(Math.round(100 * rel.beta / (rel.alpha + rel.theta + rel.beta + 1e-9) * 1.6)),   // beta relatif thd alfa+theta
      tenang: clamp(Math.round(100 * rel.alpha / (rel.alpha + rel.beta + rel.theta + 1e-9))),     // porsi alfa di antara θ-α-β
      kantuk: clamp(Math.round(100 * (rel.theta + rel.delta) / (rel.alpha + rel.beta + 1e-9) * 0.5)), // theta+delta naik saat mengantuk
    };
    return { abs, rel, metrics, quality };
  }
  _startAnalysis() {
    clearInterval(this._anT);
    this._anT = setInterval(() => { const r = this.analyze(); if (r) { this.last = r; this._emit("bands", r); } }, 500);
  }

  // ------------------------------------------------------------- simulasi
  async startSim() {
    await this.stop();
    this.source = "sim"; this._stopped = false; let t = 0; this._focus = 0.5;
    this._simT = setInterval(() => {
      const chunk = CHANNELS.map(() => []);
      for (let s = 0; s < 8; s++) {          // 8 sampel tiap 31,25 ms = 256 Hz
        t += 1 / FS;
        const a = 5 + 3 * (1 - this._focus), b = 3 + 6 * this._focus;
        for (let c = 0; c < 4; c++) {
          const v = a * Math.sin(2 * Math.PI * 10 * t + c) + b * Math.sin(2 * Math.PI * 20 * t + c * 2) + 4 * Math.sin(2 * Math.PI * 6 * t) + 6 * Math.sin(2 * Math.PI * 2 * t) + (Math.random() - 0.5) * 6 + 800;
          this._push(c, v); chunk[c].push(v);
        }
        this._advance(1);
      }
      this._emit("samples", { ch: chunk, n: 8 });
      this._focus += (Math.random() - 0.5) * 0.02; this._focus = Math.max(0.2, Math.min(0.85, this._focus));
    }, 1000 / 32);
    this._startAnalysis();
    this._status("live", "Simulasi EEG · 256 Hz");
  }
  /** Simulasi: fokus naik menjelang tembakan (pola pre-shot routine). */
  nudgeFocus(d = 0.15) { if (this.source === "sim") this._focus = Math.min(0.9, this._focus + d); }

  async stop() {
    this._stopped = true;
    clearInterval(this._anT); clearInterval(this._simT);
    try {
      if (this.ctrl && this.source === "ble") await this._cmd("h").catch(() => {});
      for (const [ch, fn] of this._subs || []) { ch.removeEventListener("characteristicvaluechanged", fn); await ch.stopNotifications().catch(() => {}); }
      if (this.device) { this.device.removeEventListener("gattserverdisconnected", this._onDisc); if (this.device.gatt.connected) this.device.gatt.disconnect(); }
    } catch { /* abaikan */ }
    this._subs = []; this.device = null; this.ctrl = null;
    if (this.source) this._status("idle", "EEG dihentikan");
    this.source = null;
  }
}
