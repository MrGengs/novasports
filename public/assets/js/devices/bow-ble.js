/* ============================================================
   NovaSport — Smart Arrow Bow link (full web, tanpa jembatan Python)
   Porting langsung dari archery-bridge/ble_reader.py + static/phone.html:
   paket, kalibrasi, preset sumbu, IR gate -> m/s -> draw, dan counter shot
   dibuat identik supaya firmware busur tidak perlu diubah sedikit pun.

   Sumber data (pilih salah satu):
     "ble"   — busur NovaSport/MOTUS via Web Bluetooth (Nordic UART notify)
     "phone" — sensor gerak HP ini sendiri (DeviceOrientation), tahan = tarik
     "sim"   — firmware dummy (FIRMWARE.md §8), untuk demo tanpa alat

   Event (EventTarget):
     "packet"  detail {q, aim:{yaw,pitch,roll}, draw, shot, speed, hz, source}
     "shot"    detail {shot, speed, draw, aim, t}
     "status"  detail {state, text}   state: idle|scanning|connecting|live|retry|error
     "log"     detail {text, level}
   ============================================================ */

export const NUS_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
export const NUS_TX = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";
export const NAME_PREFIXES = ["MOTUS", "NOVA"];   // awalan nama advertise busur

// --- konstanta yang sama dengan ble_reader.py -------------------------------
export const GATE_DIST_M = 0.05;          // jarak dua sensor IR (m)
export const SPEED_SANE = [2.0, 200.0];   // di luar ini bukan lesatan
export const SPEED_RANGE = [10.0, 50.0];  // m/s -> draw 0..1
const SHOT_SEQ_MAX_GAP = 8;
const RETRY_MS = 2000;
const DROP_REPORT_MS = 5000;

// --- quaternion (w, x, y, z) ------------------------------------------------
export const qmul = (a, b) => [
  a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
  a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
  a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
  a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
];
export const qconj = (a) => [a[0], -a[1], -a[2], -a[3]];
export function qnorm(a) {
  const n = Math.hypot(a[0], a[1], a[2], a[3]);
  return n < 1e-9 ? [1, 0, 0, 0] : a.map((v) => v / n);
}

// Preset sumbu jalur BLE (busur): sama urutan & isinya dengan ble_reader.py.
export const AXIS_PRESETS_BLE = [
  (v) => v,                          // 0: apa adanya
  (v) => [v[0], v[1], v[3], -v[2]],  // 1: Z->Y (atas)
  (v) => [v[0], v[1], -v[3], v[2]],  // 2: Z->Y, yaw kebalik
  (v) => [v[0], v[2], v[3], v[1]],   // 3: Z->Y, moncong pindah ke X
];
export const AXIS_LABELS = ["0 · apa adanya", "1 · Z→Y (atas)", "2 · Z→Y, yaw kebalik", "3 · Z→Y, moncong ke X"];

/** Arah bidik dari quaternion relatif: sumbu -Z lokal (moncong) -> yaw/pitch (derajat). */
export function aimFromQuat(q) {
  const [w, x, y, z] = q;
  // rotasi vektor (0,0,-1)
  const fx = -(2 * (x * z + w * y));
  const fy = -(2 * (y * z - w * x));
  const fz = -(1 - 2 * (x * x + y * y));
  const yaw = Math.atan2(fx, -fz) * 180 / Math.PI;
  const pitch = Math.asin(Math.max(-1, Math.min(1, fy))) * 180 / Math.PI;
  const roll = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)) * 180 / Math.PI;
  return { yaw, pitch, roll };
}

/** Euler DeviceOrientation (alpha, beta, gamma, derajat) -> quaternion w,x,y,z (urutan Z-X'-Y''). */
function quatFromDeviceOrientation(alpha, beta, gamma) {
  const d = Math.PI / 180;
  const _x = (beta || 0) * d / 2, _y = (gamma || 0) * d / 2, _z = (alpha || 0) * d / 2;
  const cX = Math.cos(_x), cY = Math.cos(_y), cZ = Math.cos(_z);
  const sX = Math.sin(_x), sY = Math.sin(_y), sZ = Math.sin(_z);
  return qnorm([
    cX * cY * cZ - sX * sY * sZ,
    sX * cY * cZ - cX * sY * sZ,
    cX * sY * cZ + sX * cY * sZ,
    cX * cY * sZ + sX * sY * cZ,
  ]);
}

export class BowLink extends EventTarget {
  constructor(opts = {}) {
    super();
    this.gateDist = opts.gateDist ?? GATE_DIST_M;
    this.speedRange = opts.speedRange ?? SPEED_RANGE;
    this.speedUnit = opts.speedUnit ?? "dt_us";      // "dt_us" | "speed_x100"
    this.axis = 1;                                   // preset default untuk busur
    this.flipYaw = false;
    this.source = null;
    this._reset();
  }

  static get bluetoothAvailable() { return typeof navigator !== "undefined" && !!navigator.bluetooth; }

  _reset() {
    this.ref = [1, 0, 0, 0];
    this.rawQ = [1, 0, 0, 0];
    this.shot = 0; this.speed = 0; this.draw = 0;
    this._shotSeq = null; this._btnSeq = null; this._seq = null;
    this.packets = 0; this.dropped = 0; this.rejected = 0;
    this._hzWin = []; this.hz = 0;
    this._lastDropReport = 0; this._dropsReported = 0;
  }

  _emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  _status(state, text) { this.state = state; this._emit("status", { state, text }); }
  _log(text, level = "info") { this._emit("log", { text, level }); }

  /** Kalibrasi Tengah: orientasi sekarang dijadikan titik nol (ref). */
  center() { this.ref = this.rawQ.slice(); this._log("titik tengah direset"); }
  setAxis(i) { this.axis = ((+i % AXIS_PRESETS_BLE.length) + AXIS_PRESETS_BLE.length) % AXIS_PRESETS_BLE.length; this._log(`preset sumbu ${this.axis}`); }

  // ------------------------------------------------------------- BLE
  async connectBle() {
    if (!BowLink.bluetoothAvailable) throw new Error("Browser ini belum mendukung Web Bluetooth. Pakai Chrome/Edge di desktop atau Android.");
    await this.stop();
    this._reset();
    this.source = "ble";
    this._stopped = false;
    this._status("scanning", "Memilih busur…");
    const device = await navigator.bluetooth.requestDevice({
      filters: [...NAME_PREFIXES.map((namePrefix) => ({ namePrefix })), { services: [NUS_SERVICE] }],
      exclusionFilters: [{ namePrefix: "NOVA-BAND" }, { namePrefix: "Muse" }],   // jangan tertukar dengan smartwatch/EEG
      optionalServices: [NUS_SERVICE],
    });
    this.device = device;
    this._onGattDisconnect = () => this._handleDisconnect();
    device.addEventListener("gattserverdisconnected", this._onGattDisconnect);
    await this._openSession();
    return device.name || "busur";
  }

  async _openSession() {
    this._status("connecting", `Menyambung ke ${this.device.name || "busur"}…`);
    const server = await this.device.gatt.connect();
    const svc = await server.getPrimaryService(NUS_SERVICE);
    this.char = await svc.getCharacteristic(NUS_TX);
    this._onNotify = (e) => this._onData(new Uint8Array(e.target.value.buffer, e.target.value.byteOffset, e.target.value.byteLength));
    this.char.addEventListener("characteristicvaluechanged", this._onNotify);
    await this.char.startNotifications();
    this._status("live", `Terhubung · ${this.device.name || "busur"}`);
    this._log(`notify ${NUS_TX.slice(0, 8)}… aktif`);
  }

  _handleDisconnect() {
    if (this._stopped || this.source !== "ble") return;
    this._status("retry", "Koneksi putus — menyambung ulang tiap 2 detik…");
    clearTimeout(this._retryT);
    this._retryT = setTimeout(async () => {
      if (this._stopped) return;
      try { this._seq = null; await this._openSession(); this._log("tersambung ulang"); }
      catch { this._handleDisconnect(); }
    }, RETRY_MS);
  }

  // ------------------------------------------------------------- HP (DeviceOrientation)
  async startPhone() {
    await this.stop();
    this._reset();
    this.source = "phone";
    this._stopped = false;
    if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
      const r = await DeviceOrientationEvent.requestPermission();   // iOS
      if (r !== "granted") throw new Error("Izin sensor gerak ditolak.");
    }
    this.axisPhone = 0;
    this._phoneDraw = 0; this._phoneHold = null;
    this._onOrient = (e) => {
      if (e.alpha == null && e.beta == null) return;
      const q = quatFromDeviceOrientation(e.alpha, e.beta, e.gamma);
      if (this._phoneHold) this._phoneDraw = Math.min(1, (performance.now() - this._phoneHold) / 1500);
      this._ingest(q, null, null, null, null, this._phoneDraw);
    };
    window.addEventListener("deviceorientation", this._onOrient);
    this._status("live", "Mode HP · tahan layar = tarik, lepas = tembak");
  }
  /** Mode HP: mulai menarik (tekan-tahan). */
  phonePress() { if (this.source === "phone") this._phoneHold = performance.now(); }
  /** Mode HP: lepas = tembakan dengan kekuatan sesuai lama menahan. */
  phoneRelease() {
    if (this.source !== "phone" || !this._phoneHold) return;
    const draw = this._phoneDraw; this._phoneHold = null; this._phoneDraw = 0;
    if (draw < 0.08) return;
    const speed = this.speedRange[0] + draw * (this.speedRange[1] - this.speedRange[0]);
    this._register(speed, 1);
    this._emit("shot", { shot: this.shot, speed: this.speed, draw: this.draw, aim: this.aim, t: Date.now() });
  }

  // ------------------------------------------------------------- Simulasi
  async startSim() {
    await this.stop();
    this._reset();
    this.source = "sim";
    this._stopped = false;
    let t = 0, seq = 0, shotSeq = 0, nextShot = 3;
    this._simT = setInterval(() => {
      t += 1 / 60;
      // goyangan bidik halus di sekitar tengah (busur sudah dikalibrasi)
      const yaw = Math.sin(t * 0.7) * 1.3 + Math.sin(t * 2.3) * 0.4;
      const pitch = Math.cos(t * 0.5) * 1.0 + Math.sin(t * 1.9) * 0.3;
      const hy = yaw * Math.PI / 360, hp = pitch * Math.PI / 360;
      const q = qmul([Math.cos(hy), 0, Math.sin(hy), 0], [Math.cos(hp), Math.sin(hp), 0, 0]);
      if (t >= nextShot) { shotSeq = (shotSeq + 1) % 256; nextShot = t + 3 + Math.random(); }
      const buf = new ArrayBuffer(13), dv = new DataView(buf);
      // sim langsung memakai ruang preset 0 supaya bidiknya benar tanpa setelan
      [q[0], q[1], q[2], q[3]].forEach((v, i) => dv.setInt16(i * 2, Math.round(v * 32767), true));
      dv.setUint16(8, Math.max(1, Math.round(this.gateDist / (30 + (shotSeq % 7) * 2.5) * 1e6)), true);
      dv.setUint8(10, shotSeq); dv.setUint8(11, seq = (seq + 1) % 256); dv.setUint8(12, 0);
      this._onData(new Uint8Array(buf), true);
    }, 1000 / 60);
    this._status("live", "Simulasi · firmware dummy 60 Hz");
  }

  async stop() {
    this._stopped = true;
    clearTimeout(this._retryT); clearInterval(this._simT);
    if (this._onOrient) { window.removeEventListener("deviceorientation", this._onOrient); this._onOrient = null; }
    try {
      if (this.char && this._onNotify) { this.char.removeEventListener("characteristicvaluechanged", this._onNotify); await this.char.stopNotifications().catch(() => {}); }
      if (this.device) { this.device.removeEventListener("gattserverdisconnected", this._onGattDisconnect); if (this.device.gatt.connected) this.device.gatt.disconnect(); }
    } catch { /* abaikan */ }
    this.char = null; this.device = null;
    if (this.source) this._status("idle", "Sumber dihentikan");
    this.source = null;
  }

  // ------------------------------------------------------------- parser & olah
  _speedFrom(meas) {
    if (!meas || meas <= 0) return null;
    return this.speedUnit === "speed_x100" ? meas / 100 : this.gateDist / (meas * 1e-6);
  }

  /** Bytes notify -> [q, speed, shotSeq, shotAbs, btnSeq] (null kalau format tak dikenal). */
  _parse(bytes) {
    if (bytes[0] === 0x7b) {               // '{' = JSON satu baris (FIRMWARE.md §4)
      try {
        const m = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(m.q) || m.q.length !== 4) return null;
        const speed = m.speed ? +m.speed : this._speedFrom(+(m.dt_us || 0));
        return [m.q.map(Number), speed, m.shot_seq ?? null, m.shot ?? null, m.btn_seq ?? null];
      } catch { return null; }
    }
    if (bytes.length < 12) return null;
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const q = [0, 2, 4, 6].map((o) => dv.getInt16(o, true) / 32767);
    const meas = dv.getUint16(8, true), shotSeq = dv.getUint8(10), seq = dv.getUint8(11);
    const btn = bytes.length > 12 ? dv.getUint8(12) : null;
    if (this._seq !== null && seq !== (this._seq + 1) % 256) this.dropped++;
    this._seq = seq;
    return [q, this._speedFrom(meas), shotSeq, null, btn];
  }

  _register(speed, count) {
    const [lo, hi] = SPEED_SANE;
    if (speed == null || speed < lo || speed > hi) { this.rejected++; return false; }
    this.shot += count; this.speed = speed;
    const [v0, v1] = this.speedRange;
    this.draw = v1 > v0 ? Math.max(0, Math.min(1, (speed - v0) / (v1 - v0))) : 0;
    return true;
  }

  _onData(bytes, isSim = false) {
    const p = this._parse(bytes);
    if (!p) return;
    const [qRaw, speed, shotSeq, shotAbs, btnSeq] = p;
    this.rawQ = qnorm(qRaw);
    if (btnSeq != null && btnSeq !== this._btnSeq) {
      if (this._btnSeq != null) { this.center(); this._log("titik tengah direset dari tombol busur"); }
      this._btnSeq = btnSeq;
    }
    let fired = false;
    if (shotAbs != null) { this.shot = shotAbs; if (speed != null) this._register(speed, 0); }
    else if (shotSeq != null && shotSeq !== this._shotSeq) {
      if (this._shotSeq != null) {
        const gap = (shotSeq - this._shotSeq + 256) % 256;
        fired = this._register(speed, gap <= SHOT_SEQ_MAX_GAP ? gap : 1);
      }
      this._shotSeq = shotSeq;
    }
    this._ingest(this.rawQ, null, null, null, null, null, isSim);
    if (fired) this._emit("shot", { shot: this.shot, speed: this.speed, draw: this.draw, aim: this.aim, t: Date.now() });
    this._reportDrops();
  }

  /** Terapkan kalibrasi + preset, hitung arah bidik, siarkan paket. */
  _ingest(qRaw, _a, _b, _c, _d, liveDraw = null, isSim = false) {
    if (this.source === "phone") this.rawQ = qRaw;
    const preset = this.source === "ble" ? AXIS_PRESETS_BLE[this.axis] : (v) => v;
    const rel = qnorm(preset(qmul(qconj(this.ref), this.rawQ)));
    const aim = aimFromQuat(rel);
    if (this.flipYaw) aim.yaw = -aim.yaw;
    this.aim = aim; this.q = rel;
    this.packets++;
    const now = performance.now();
    this._hzWin.push(now); while (this._hzWin.length && now - this._hzWin[0] > 1000) this._hzWin.shift();
    this.hz = this._hzWin.length;
    this._emit("packet", {
      q: rel.map((v) => +v.toFixed(5)), aim, draw: liveDraw != null ? liveDraw : this.draw,
      shot: this.shot, speed: +this.speed.toFixed(2), hz: this.hz, source: this.source,
      dropped: this.dropped, rejected: this.rejected,
    });
  }

  _reportDrops() {
    const now = performance.now();
    if (now - this._lastDropReport < DROP_REPORT_MS) return;
    this._lastDropReport = now;
    const d = this.dropped - this._dropsReported;
    if (d > 0) { this._log(`${d} paket BLE hilang (cek connection interval ≤ 15 ms)`, "warn"); this._dropsReported = this.dropped; }
  }
}
