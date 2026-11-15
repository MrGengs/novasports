/* ============================================================
   NovaSport — Wearable atlet: ESP32 OLED + MAX30102 + MLX90614 + MPU (full web)
   Prinsip sama dengan archery-bridge: firmware cukup mengirim data MENTAH,
   semua perhitungan (HR, HRV, SpO2, napas, tremor, suhu) dikerjakan di sini,
   jadi rumus bisa disetel tanpa flash ulang.

   GATT (tanpa enkripsi/bonding), nama advertise diawali "NOVA":
     Service 6e400010-b5a3-f393-e0a9-e50e24dcca9e
     Notify  6e400011-b5a3-f393-e0a9-e50e24dcca9e
   Paket biner little-endian, byte pertama = TAG (lihat docs/PERANGKAT_SIMULATOR_PANAHAN.md):
     0x01 PPG  : [tag][seq][n][fs Hz] + n × (red u24, ir u24)          MAX30102 mentah
     0x02 IMU  : [tag][seq][n][fs Hz] + n × (ax,ay,az,gx,gy,gz int16)    MPU ±4 g, ±500 dps
     0x03 TEMP : [tag][seq] + obj int16(°C×100) + amb int16(°C×100)    MLX90614
     0x04 HASIL: [tag][seq] + hr u8 + spo2 u8 + baterai u8             opsional, dari firmware
   Juga diterima: JSON satu baris {"ppg":[[r,ir],…],"fs":100,"imu":[[…6]],"to":36.4,"ta":28.1}
   Kompatibel standar: Pulse Oximeter 0x1822 (SpO2) & Heart Rate 0x180D.

   Event "vitals" (≈2 Hz) : ringkasan semua metrik · "ppg" : sampel IR terfilter untuk grafik
         "status" · "log"
   Catatan: estimasi untuk latihan olahraga, BUKAN alat diagnosis medis.
   ============================================================ */

export const NS_BIO_SERVICE = "6e400010-b5a3-f393-e0a9-e50e24dcca9e";
export const NS_BIO_CHAR = "6e400011-b5a3-f393-e0a9-e50e24dcca9e";
const PLX_SERVICE = 0x1822, PLX_CONT = 0x2a5f, PLX_SPOT = 0x2a5e, HR_SERVICE = 0x180d, HR_MEAS = 0x2a37, BAT_SERVICE = 0x180f, BAT_LEVEL = 0x2a19;
const ACC_LSB = 8192, GYRO_LSB = 65.5;          // MPU6050/9250 pada ±4 g dan ±500 dps
const NO_CONTACT_IR = 50000;                     // DC IR di bawah ini = jari/kulit tidak menempel

export function sfloat(raw) {
  const m = raw & 0x0fff, e = raw >> 12;
  if ([0x07ff, 0x0800, 0x07fe, 0x0802, 0x0801].includes(m)) return null;
  return (m >= 0x0800 ? m - 0x1000 : m) * Math.pow(10, e >= 8 ? e - 16 : e);
}
export function spo2Status(v) {
  if (v == null) return { label: "—", cls: "info" };
  if (v >= 95) return { label: "Normal", cls: "ok" };
  if (v >= 90) return { label: "Waspada", cls: "warn" };
  return { label: "Rendah — istirahat", cls: "danger" };
}
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const mean = (a) => a.reduce((s, v) => s + v, 0) / (a.length || 1);
const sd = (a) => { const m = mean(a); return Math.sqrt(mean(a.map((v) => (v - m) ** 2))); };

export class WearLink extends EventTarget {
  constructor() { super(); this._resetState(); }
  static get bluetoothAvailable() { return typeof navigator !== "undefined" && !!navigator.bluetooth; }
  _emit(t, d) { this.dispatchEvent(new CustomEvent(t, { detail: d })); }
  _status(state, text) { this.state = state; this._emit("status", { state, text }); }
  _log(text, level = "info") { this._emit("log", { text, level }); }

  _resetState() {
    this.source = null;
    // PPG
    this.fs = 100; this.ppg = { red: [], ir: [], f: [] };          // jendela 8 detik
    this._hp = { ir: null, red: null }; this._lp = 0; this._lp2 = 0;
    this._lastPeak = -1e9; this._peakMax = 0; this._n = 0; this._prev = [0, 0];
    this.rr = [];                                                 // interval antar-detak (ms)
    this._resp = []; this._respT = 0;                             // baseline IR 4 Hz, 32 dtk
    // IMU
    this.imuFs = 50; this.imu = []; this._gEma = [0, 0, 0];
    this.events = [];
    // hasil
    this.v = { hr: null, spo2: null, rmssd: null, sdnn: null, pnn50: null, rr: null, pi: null, resp: null, contact: false,
               tempSkin: null, tempAmb: null, tempTrend: null, tremor: null, steady: null, motion: null, battery: null, fwHr: null, fwSpo2: null };
    this._temps = []; this.history = [];
  }

  // ------------------------------------------------------------- koneksi
  async connectBle() {
    if (!WearLink.bluetoothAvailable) throw new Error("Browser ini belum mendukung Web Bluetooth. Pakai Chrome/Edge di desktop atau Android.");
    await this.stop(); this._resetState();
    this.source = "ble"; this._stopped = false;
    this._status("scanning", "Memilih wearable…");
    const device = await navigator.bluetooth.requestDevice({
      filters: [{ namePrefix: "NOVA-BAND" }, { services: [NS_BIO_SERVICE] }, { services: [PLX_SERVICE] }, { services: [HR_SERVICE] }],
      exclusionFilters: [{ namePrefix: "MOTUS" }, { namePrefix: "Muse" }],   // busur & EEG punya tombol sendiri
      optionalServices: [NS_BIO_SERVICE, PLX_SERVICE, HR_SERVICE, BAT_SERVICE],
    });
    this.device = device;
    this._onDisc = () => { if (!this._stopped) this._status("error", "Wearable terputus. Tekan Hubungkan lagi."); };
    device.addEventListener("gattserverdisconnected", this._onDisc);
    this._status("connecting", `Menyambung ke ${device.name || "wearable"}…`);
    const server = await device.gatt.connect();
    this._subs = []; const got = [];
    const sub = async (svcId, chId, fn) => {
      try { const ch = await (await server.getPrimaryService(svcId)).getCharacteristic(chId); const h = (e) => fn(e.target.value); ch.addEventListener("characteristicvaluechanged", h); await ch.startNotifications(); this._subs.push([ch, h]); return true; }
      catch { return false; }
    };
    if (await sub(NS_BIO_SERVICE, NS_BIO_CHAR, (dv) => this._onData(new Uint8Array(dv.buffer, dv.byteOffset, dv.byteLength)))) got.push("NovaSport wearable (PPG+IMU+suhu)");
    if (await sub(PLX_SERVICE, PLX_CONT, (dv) => this._plx(dv))) got.push("SpO₂ 0x2A5F");
    if (await sub(PLX_SERVICE, PLX_SPOT, (dv) => this._plx(dv))) got.push("SpO₂ spot 0x2A5E");
    if (await sub(HR_SERVICE, HR_MEAS, (dv) => this._hrStd(dv))) got.push("Heart Rate 0x2A37");
    try { const b = await (await server.getPrimaryService(BAT_SERVICE)).getCharacteristic(BAT_LEVEL); this.v.battery = (await b.readValue()).getUint8(0); } catch { /* opsional */ }
    if (!got.length) throw new Error("Perangkat tidak menyediakan layanan NovaSport wearable, SpO₂ (0x1822), maupun Heart Rate (0x180D).");
    this._startTick();
    this._status("live", `Terhubung · ${device.name || "wearable"}`);
    this._log("Layanan aktif: " + got.join(", "));
    return device.name || "wearable";
  }

  // ------------------------------------------------------------- dekoder paket
  _onData(b) {
    if (!b.length) return;
    if (b[0] === 0x7b) { this._json(b); return; }
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength), tag = b[0];
    if (tag === 0x01 && b.length >= 4) {
      const n = b[2]; this.fs = b[3] || this.fs;
      for (let i = 0; i < n && 4 + i * 6 + 6 <= b.length; i++) {
        const o = 4 + i * 6, red = b[o] | (b[o + 1] << 8) | (b[o + 2] << 16), ir = b[o + 3] | (b[o + 4] << 8) | (b[o + 5] << 16);
        this._ppgSample(red & 0x3ffff, ir & 0x3ffff);
      }
    } else if (tag === 0x02 && b.length >= 4) {
      const n = b[2]; this.imuFs = b[3] || this.imuFs;
      for (let i = 0; i < n && 4 + i * 12 + 12 <= b.length; i++) {
        const o = 4 + i * 12, r = [0, 2, 4, 6, 8, 10].map((k) => dv.getInt16(o + k, true));
        this._imuSample(r[0] / ACC_LSB, r[1] / ACC_LSB, r[2] / ACC_LSB, r[3] / GYRO_LSB, r[4] / GYRO_LSB, r[5] / GYRO_LSB);
      }
    } else if (tag === 0x03 && b.length >= 6) {
      this._temp(dv.getInt16(2, true) / 100, dv.getInt16(4, true) / 100);
    } else if (tag === 0x04 && b.length >= 5) {
      this.v.fwHr = b[2] || null; this.v.fwSpo2 = b[3] || null; this.v.battery = b[4] || this.v.battery;
    }
  }
  _json(b) {
    try {
      const m = JSON.parse(new TextDecoder().decode(b));
      if (m.fs) this.fs = m.fs;
      (m.ppg || []).forEach(([r, ir]) => this._ppgSample(r, ir));
      (m.imu || []).forEach((s) => this._imuSample(s[0], s[1], s[2], s[3], s[4], s[5]));   // JSON: sudah dalam g & dps
      if (m.to != null) this._temp(+m.to, m.ta != null ? +m.ta : null);
      if (m.hr) this.v.fwHr = m.hr; if (m.spo2) this.v.fwSpo2 = m.spo2;
    } catch { /* abaikan baris rusak */ }
  }
  _plx(dv) { if (dv.byteLength >= 5) { const s = sfloat(dv.getUint16(1, true)), p = sfloat(dv.getUint16(3, true)); if (s != null) this.v.fwSpo2 = Math.round(s); if (p != null) this.v.fwHr = Math.round(p); } }
  _hrStd(dv) {
    const f = dv.getUint8(0); this.v.fwHr = f & 1 ? dv.getUint16(1, true) : dv.getUint8(1);
    if (f & 0x10) { let o = f & 1 ? 3 : 2; if (f & 0x08) o += 2; for (; o + 1 < dv.byteLength; o += 2) this._addRR(dv.getUint16(o, true) / 1024 * 1000); }
  }

  // ------------------------------------------------------------- PPG -> HR, HRV, SpO2, PI, napas
  _ppgSample(red, ir) {
    this._n++;
    const W = this.fs * 8;
    this.ppg.red.push(red); this.ppg.ir.push(ir); if (this.ppg.ir.length > W) { this.ppg.red.shift(); this.ppg.ir.shift(); }
    this.v.contact = ir > NO_CONTACT_IR;
    // band-pass sederhana: high-pass (buang DC) lalu low-pass ~4 Hz, sinyal dibalik (darah menyerap IR saat sistol)
    const aHp = Math.exp(-2 * Math.PI * 0.5 / this.fs), aLp = Math.exp(-2 * Math.PI * 4 / this.fs);
    this._dcIr = this._dcIr == null ? ir : this._dcIr * aHp + ir * (1 - aHp);
    const hp = -(ir - this._dcIr);
    this._lp = this._lp * aLp + hp * (1 - aLp); this._lp2 = this._lp2 * aLp + this._lp * (1 - aLp);
    const y = this._lp2;
    this.ppg.f.push(y); if (this.ppg.f.length > W) this.ppg.f.shift();
    // deteksi puncak: lokal maksimum, ambang adaptif, refrakter 0,33 dtk (maks 180 bpm)
    this._peakMax = Math.max(this._peakMax * (1 - 1 / (this.fs * 3)), y);
    const [p1, p2] = this._prev;
    if (this.v.contact && p1 > p2 && p1 >= y && p1 > this._peakMax * 0.5 && this._n - this._lastPeak > this.fs * 0.33) {
      if (this._lastPeak > 0) this._addRR((this._n - 1 - this._lastPeak) * 1000 / this.fs);
      this._lastPeak = this._n - 1;
    }
    this._prev = [y, p1];
    // baseline untuk laju napas (dicuplik 4 Hz)
    if (this._n % Math.max(1, Math.round(this.fs / 4)) === 0) { this._resp.push(this._dcIr); if (this._resp.length > 128) this._resp.shift(); }
    if (this._n % 4 === 0) this._emit("ppg", { y });
  }
  _addRR(ms) {
    if (ms < 300 || ms > 2000) return;                         // 30–200 bpm
    const med = median(this.rr.slice(-8));
    if (med && Math.abs(ms - med) > med * 0.3) return;         // artefak gerak
    this.rr.push(ms); if (this.rr.length > 120) this.rr.shift();
  }
  _ppgMetrics() {
    const v = this.v, rr = this.rr.slice(-30);
    if (rr.length >= 3) {
      v.hr = Math.round(60000 / median(rr.slice(-8)));
      const d = rr.slice(1).map((x, i) => x - rr[i]);
      v.rmssd = Math.round(Math.sqrt(mean(d.map((x) => x * x))));
      v.sdnn = Math.round(sd(rr)); v.pnn50 = Math.round(100 * d.filter((x) => Math.abs(x) > 50).length / d.length);
      v.rr = Math.round(rr[rr.length - 1]);
    }
    const N = Math.min(this.ppg.ir.length, this.fs * 4);
    if (N > this.fs * 2 && v.contact) {
      const ir = this.ppg.ir.slice(-N), red = this.ppg.red.slice(-N);
      // AC = RMS komponen pulsatil (x dikurangi rata-rata bergerak ±0,5 dtk) -> modulasi napas tidak ikut
      const acDc = (x) => {
        const h = Math.round(this.fs / 2), cs = [0]; for (const v of x) cs.push(cs[cs.length - 1] + v);
        let e = 0, n = 0;
        for (let i = h; i < x.length - h; i++) { const d = x[i] - (cs[i + h + 1] - cs[i - h]) / (2 * h + 1); e += d * d; n++; }
        return [Math.sqrt(e / Math.max(1, n)) * Math.SQRT2, mean(x)];
      };
      const [acI, dcI] = acDc(ir), [acR, dcR] = acDc(red);
      if (dcI > 0 && dcR > 0 && acI > 0) {
        const R = (acR / dcR) / (acI / dcI);
        v.spo2 = Math.max(70, Math.min(100, Math.round(104 - 17 * R)));      // pendekatan kurva Maxim
        v.pi = +(100 * acI * 2 / dcI).toFixed(2);
      }
    } else if (!v.contact) { v.spo2 = null; v.pi = null; }
    if (this._resp.length >= 64) {                                         // napas dari modulasi baseline (≥16 dtk)
      const x = this._resp.map((a, i, arr) => a - mean(arr.slice(Math.max(0, i - 8), i + 8)));
      let z = 0; for (let i = 1; i < x.length; i++) if ((x[i - 1] < 0) !== (x[i] < 0)) z++;
      const secs = this._resp.length / 4, br = Math.round(z / 2 * 60 / secs);
      v.resp = br >= 4 && br <= 45 ? br : v.resp;
    }
    if (v.hr == null && v.fwHr) v.hr = v.fwHr;
    if (v.spo2 == null && v.fwSpo2) v.spo2 = v.fwSpo2;
  }

  // ------------------------------------------------------------- MPU -> tremor & stabilitas
  _imuSample(ax, ay, az, gx, gy, gz) {
    const a = Math.exp(-2 * Math.PI * 2 / this.imuFs);               // high-pass ~2 Hz: buang gerak lambat (membidik)
    const g = [gx, gy, gz], hp = g.map((x, i) => (this._gEma[i] = this._gEma[i] * a + x * (1 - a), x - this._gEma[i]));
    const s = { acc: Math.hypot(ax, ay, az), gyro: Math.hypot(gx, gy, gz), trem: Math.hypot(...hp), t: performance.now() };
    this.imu.push(s); if (this.imu.length > this.imuFs * 4) this.imu.shift();
    if (s.gyro > 250 && (!this._lastJolt || s.t - this._lastJolt > 800)) { this._lastJolt = s.t; this._emit("jolt", { gyro: s.gyro }); }
  }
  _imuMetrics() {
    const last = this.imu.slice(-this.imuFs);
    if (last.length < 5) return;
    const trem = Math.sqrt(mean(last.map((s) => s.trem * s.trem)));
    this.v.tremor = +trem.toFixed(2);                                  // dps RMS komponen cepat
    this.v.steady = Math.max(0, Math.min(100, Math.round(100 - trem * 6)));
    this.v.motion = +sd(last.map((s) => s.acc)).toFixed(3);            // g, variasi percepatan
  }
  /** Rata-rata kestabilan 2 detik terakhir (dipakai saat tembakan). */
  steadyBefore(ms = 2000) {
    const now = performance.now(), w = this.imu.filter((s) => now - s.t <= ms);
    if (!w.length) return null;
    return Math.max(0, Math.min(100, Math.round(100 - Math.sqrt(mean(w.map((s) => s.trem * s.trem))) * 6)));
  }

  // ------------------------------------------------------------- MLX90614
  _temp(obj, amb) {
    const t = performance.now();
    this.v.tempSkin = +obj.toFixed(2); if (amb != null) this.v.tempAmb = +amb.toFixed(2);
    this._temps.push([t, obj]); while (this._temps.length && t - this._temps[0][0] > 60000) this._temps.shift();
    if (this._temps.length > 4 && t - this._temps[0][0] >= 20000) { const [t0, v0] = this._temps[0]; this.v.tempTrend = +(((obj - v0) / ((t - t0) / 60000)) || 0).toFixed(2); }
  }

  _startTick() {
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      this._ppgMetrics(); this._imuMetrics();
      const snap = { ...this.v, t: Date.now() };
      this.history.push(snap); if (this.history.length > 1200) this.history.shift();
      this._emit("vitals", snap);
    }, 500);
  }

  // ------------------------------------------------------------- simulasi (lewat dekoder yang sama)
  async startSim() {
    await this.stop(); this._resetState();
    this.source = "sim"; this._stopped = false;
    let t = 0, seq = 0, hr = 76, effort = 0;
    const fs = 100;
    this._simT = setInterval(() => {
      // 5 sampel PPG (50 ms) per tick
      const b = new Uint8Array(4 + 5 * 6); b[0] = 0x01; b[1] = seq++ & 255; b[2] = 5; b[3] = fs;
      for (let i = 0; i < 5; i++) {
        t += 1 / fs;
        hr += (72 + effort - hr) * 0.0008;
        this._ph = (this._ph || 0) + (hr + 5 * Math.sin(2 * Math.PI * 0.25 * t)) / 60 / fs;
        const ph = this._ph % 1, puls = Math.exp(-((ph - 0.15) ** 2) / 0.006) + 0.35 * Math.exp(-((ph - 0.45) ** 2) / 0.01);
        const breath = Math.sin(2 * Math.PI * t * 0.25);
        const ir = Math.round(110000 - puls * 1400 + breath * 600 + (Math.random() - 0.5) * 120);
        const red = Math.round(95000 - puls * 640 + breath * 450 + (Math.random() - 0.5) * 120);
        const o = 4 + i * 6; [red, ir].forEach((v, k) => { b[o + k * 3] = v & 255; b[o + k * 3 + 1] = (v >> 8) & 255; b[o + k * 3 + 2] = (v >> 16) & 255; });
      }
      this._onData(b);
      // 2-3 sampel IMU (50 Hz)
      const m = new Uint8Array(4 + 3 * 12), dv = new DataView(m.buffer); m[0] = 0x02; m[1] = seq & 255; m[2] = 3; m[3] = 50;
      for (let i = 0; i < 3; i++) {
        const tr = (Math.random() - 0.5) * (1.2 + effort * 0.15);
        [0.02, -0.98, 0.1, tr * 2, tr * 1.5, tr].forEach((v, k) => dv.setInt16(4 + i * 12 + k * 2, Math.round(v * (k < 3 ? ACC_LSB : GYRO_LSB)), true));
      }
      this._onData(m);
      if (seq % 10 === 0) { const tp = new Uint8Array(6), d2 = new DataView(tp.buffer); tp[0] = 0x03; d2.setInt16(2, Math.round((33.4 + effort * 0.05 + Math.sin(t / 30) * 0.2) * 100), true); d2.setInt16(4, 2780, true); this._onData(tp); }
      effort = Math.max(0, effort * 0.995);
    }, 50);
    this._bump = (k) => { effort = Math.min(30, effort + k); };
    this._startTick();
    this._status("live", "Simulasi wearable · PPG 100 Hz · IMU 50 Hz · suhu 2 Hz");
  }
  /** Simulasi: HR & tremor naik sedikit setiap tembakan. */
  bumpEffort(k = 4) { if (this.source === "sim" && this._bump) this._bump(k); }

  manual(spo2, hr) {
    if (spo2) this.v.fwSpo2 = +spo2; if (hr) this.v.fwHr = +hr;
    this.v.spo2 = this.v.spo2 ?? this.v.fwSpo2; this.v.hr = this.v.hr ?? this.v.fwHr;
    this._emit("vitals", { ...this.v, t: Date.now() });
  }

  async stop() {
    this._stopped = true; clearInterval(this._simT); clearInterval(this._tick);
    try {
      for (const [ch, fn] of this._subs || []) { ch.removeEventListener("characteristicvaluechanged", fn); await ch.stopNotifications().catch(() => {}); }
      if (this.device) { this.device.removeEventListener("gattserverdisconnected", this._onDisc); if (this.device.gatt.connected) this.device.gatt.disconnect(); }
    } catch { /* abaikan */ }
    this._subs = []; this.device = null;
    if (this.source) this._status("idle", "Wearable dihentikan");
    this.source = null;
  }
}
