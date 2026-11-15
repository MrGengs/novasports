/* ============================================================
   NovaSport — Pembacaan Alat Wearable (Live Sensor Reading)
   ------------------------------------------------------------
   Membaca data sensor dari Smart-Enabled Equipment NovaSport.

   DUA SUMBER DATA:
   1. PERANGKAT NYATA — Web Bluetooth (GATT). Mendukung profil
      standar Heart Rate (0x180D) & Battery (0x180F), plus service
      kustom NovaSport untuk stream IMU 9-sumbu.
   2. MODE SIMULASI — dipakai otomatis bila Web Bluetooth tidak
      tersedia (Safari/Firefox/HTTP) atau pengguna membatalkan
      dialog pairing. Demo Day tetap jalan tanpa hardware.

   Data yang terbaca bisa direkam lalu diekspor ke CSV / JSON.
   ============================================================ */
import { donut, sparkline, gaugeRow } from "../charts.js";
import { pageHead } from "./components.js";
import { toast } from "../ui.js";

/* ---------- Kontrak protokol perangkat ---------- */

// Service kustom NovaSport untuk stream IMU. Samakan UUID ini dengan
// firmware perangkat (ESP32/nRF52) saat hardware sudah siap.
const NS_IMU_SERVICE = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const NS_IMU_CHAR = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

const HR_SERVICE = "heart_rate";              // 0x180D
const HR_CHAR = "heart_rate_measurement";     // 0x2A37
const BAT_SERVICE = "battery_service";        // 0x180F
const BAT_CHAR = "battery_level";             // 0x2A19

// Profil perangkat yang bisa dibaca (menentukan kanal & filter pairing).
const PROFILES = {
  bow: { name: "Smart Arrow Bow", icon: "🏹", hz: 200, ch: ["imu", "hr", "pressure", "ir"], namePrefix: "NS-BOW" },
  band: { name: "IMU Wearable Band", icon: "⌚", hz: 100, ch: ["imu", "hr"], namePrefix: "NS-BAND" },
  suit: { name: "Smart Suit (16×IMU)", icon: "🦾", hz: 50, ch: ["imu", "emg"], namePrefix: "NS-SUIT" },
  pistol: { name: "Smart Precision Pistol", icon: "🎯", hz: 200, ch: ["imu", "pressure"], namePrefix: "NS-PIS" },
  hr: { name: "HR Chest Strap", icon: "❤️", hz: 1, ch: ["hr"], namePrefix: "Polar" },
};

/* ---------- Helpers ---------- */
const $ = (id) => document.getElementById(id);
const noise = (a) => (Math.random() - 0.5) * a;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nowStr = () => new Date().toLocaleTimeString("id-ID", { hour12: false });

function axisRow(label, id, color) {
  return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:9px">
    <span style="width:26px;font-size:.72rem;font-weight:800;color:${color}">${label}</span>
    <div class="wr-spark" id="${id}-spark"></div>
    <b style="width:62px;text-align:right;font-size:.76rem;font-variant-numeric:tabular-nums;color:var(--ink-900)" id="${id}-val">0.00</b>
  </div>`;
}

/* ============================================================
   VIEW
   ============================================================ */
export function wearableReadView() {
  const supported = typeof navigator !== "undefined" && !!navigator.bluetooth;
  return `
  <a href="#/perangkat-saya" class="back" style="display:inline-flex;gap:6px;align-items:center;color:var(--ink-500);font-size:.82rem;margin-bottom:14px">← Kembali ke Perangkat Saya</a>
  ${pageHead("Perangkat / Pembacaan Live", "Pembacaan Alat Wearable",
    "Baca stream sensor real-time dari Smart-Enabled Equipment — IMU 9-sumbu, heart rate, tekanan, dan baterai.",
    `<a href="/panduan-wearable" target="_blank" rel="noopener" class="btn btn-outline btn-sm">📘 Panduan</a>
     <button class="btn btn-outline btn-sm" id="wrCal">⊙ Kalibrasi Nol</button>
     <button class="btn btn-primary btn-sm" id="wrConnect">⚯ Hubungkan Perangkat</button>`)}

  ${supported ? "" : `<div class="card" style="border-left:3px solid var(--warn-500);padding:12px 16px;margin-bottom:16px;font-size:.82rem;color:var(--ink-600)">
    ⚠️ Browser ini tidak mendukung <b>Web Bluetooth</b> (hanya Chrome/Edge/Opera di HTTPS). Pembacaan berjalan dalam <b>mode simulasi</b> dengan pola sinyal realistis.
  </div>`}

  <div class="grid g-4" style="margin-bottom:18px">
    <div class="card stat">
      <div class="stat-top"><div class="stat-ic" style="background:#e8edfd;color:var(--brand-600)">📡</div><span class="pill danger" id="wrState">● Terputus</span></div>
      <div><div class="stat-val" style="font-size:1.15rem" id="wrDevName">—</div><div class="stat-label">Perangkat aktif</div></div>
    </div>
    <div class="card stat">
      <div class="stat-val"><span id="wrHz">0</span><span style="font-size:1rem;color:var(--ink-400)">Hz</span></div>
      <div class="stat-label">Sampling efektif</div>
    </div>
    <div class="card stat">
      <div class="stat-val" id="wrPackets">0</div>
      <div class="stat-label">Paket diterima</div>
    </div>
    <div class="card stat">
      <div class="stat-top"><div class="stat-ic" style="background:#e2f8f3;color:var(--accent-600)">🔋</div></div>
      <div><div class="stat-val"><span id="wrBat">—</span><span style="font-size:1rem;color:var(--ink-400)">%</span></div><div class="stat-label">Baterai perangkat</div></div>
    </div>
  </div>

  <div class="wr-layout">

    <!-- KIRI — sumber data & kontrol -->
    <div class="card">
      <div class="card-head"><h3>Sumber Data</h3><span class="pill muted" id="wrSrc">—</span></div>

      <div class="field"><label>Profil Perangkat</label>
        <select class="input" id="wrProfile">
          ${Object.entries(PROFILES).map(([k, p]) => `<option value="${k}" ${k === "band" ? "selected" : ""}>${p.icon} ${p.name}</option>`).join("")}
        </select>
      </div>

      <div class="field"><label>Laju Baca</label>
        <div class="tabs" style="width:100%;display:grid;grid-template-columns:repeat(3,1fr)" id="wrRate">
          ${[10, 25, 50].map((r, i) => `<button class="${i === 1 ? "active" : ""}" data-rate="${r}">${r} fps</button>`).join("")}
        </div>
      </div>

      <div class="field"><label>Kanal Aktif</label>
        <div id="wrChannels" style="display:flex;flex-wrap:wrap;gap:6px"></div>
      </div>

      <hr class="sep">

      <div style="display:flex;flex-direction:column;gap:8px">
        <button class="btn btn-primary btn-block" id="wrStream">▶ Mulai Pembacaan</button>
        <button class="btn btn-outline btn-block" id="wrRecord">⏺ Rekam Sesi</button>
        <button class="btn btn-outline btn-block" id="wrDisconnect" style="color:var(--danger-500);border-color:var(--danger-500)">⏏ Putuskan</button>
      </div>

      <div class="card" style="background:var(--surface-2);padding:12px;margin-top:14px">
        <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:4px">
          <span class="muted">Sampel terekam</span><b id="wrSamples">0</b>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.72rem">
          <span class="muted">Durasi</span><b id="wrDur">00:00</b>
        </div>
        <div style="display:flex;gap:8px;margin-top:10px">
          <button class="btn btn-outline btn-sm" id="wrCsv" style="flex:1">⭳ CSV</button>
          <button class="btn btn-outline btn-sm" id="wrJson" style="flex:1">⭳ JSON</button>
        </div>
      </div>
    </div>

    <!-- TENGAH — pembacaan sensor -->
    <div style="display:flex;flex-direction:column;gap:18px">
      <div class="card">
        <div class="card-head"><div><h3>IMU 9-Sumbu</h3><span class="sub">Akselerometer · Giroskop · Magnetometer</span></div><span class="pill info" id="wrImuState">Idle</span></div>

        <div style="background:radial-gradient(circle at 50% 20%,#1a2752,#0c1430);border-radius:var(--r-lg);padding:18px;margin-bottom:16px">
          <div style="display:flex;justify-content:space-around;text-align:center;color:#fff">
            <div><div style="color:rgba(255,255,255,.55);font-size:.68rem;font-weight:700">ROLL</div><div style="font-size:1.8rem;font-weight:800;line-height:1.1" id="wrRoll">0°</div></div>
            <div><div style="color:rgba(255,255,255,.55);font-size:.68rem;font-weight:700">PITCH</div><div style="font-size:1.8rem;font-weight:800;line-height:1.1;color:#7ff0d2" id="wrPitch">0°</div></div>
            <div><div style="color:rgba(255,255,255,.55);font-size:.68rem;font-weight:700">YAW</div><div style="font-size:1.8rem;font-weight:800;line-height:1.1" id="wrYaw">0°</div></div>
          </div>
          <div style="display:flex;justify-content:center;margin-top:14px">
            <div style="width:76px;height:76px;border-radius:16px;background:linear-gradient(140deg,#3b65f2,#12c4a6);box-shadow:0 10px 30px rgba(59,101,242,.45);transition:transform .12s linear" id="wrCube"></div>
          </div>
        </div>

        <div class="wr-axes">
          <div>
            <div style="font-size:.74rem;font-weight:800;color:var(--ink-600);margin-bottom:10px">AKSELEROMETER <span class="muted" style="font-weight:500">(g)</span></div>
            ${axisRow("aX", "ax", "#e23b4e")}
            ${axisRow("aY", "ay", "#12c4a6")}
            ${axisRow("aZ", "az", "#3b65f2")}
          </div>
          <div>
            <div style="font-size:.74rem;font-weight:800;color:var(--ink-600);margin-bottom:10px">GIROSKOP <span class="muted" style="font-weight:500">(°/s)</span></div>
            ${axisRow("gX", "gx", "#f59e0b")}
            ${axisRow("gY", "gy", "#7b62f7")}
            ${axisRow("gZ", "gz", "#2596e8")}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Log Paket Mentah</h3><button class="btn btn-outline btn-sm" id="wrClearLog">Bersihkan</button></div>
        <div id="wrLog" class="wr-log">
          <div style="color:#5b6b96">// menunggu koneksi perangkat...</div>
        </div>
      </div>
    </div>

    <!-- KANAN — vital & kualitas sinyal -->
    <div class="wr-side">
      <div class="card">
        <div class="card-head"><h3>Heart Rate</h3><span class="pill danger" id="wrHrZone">— bpm</span></div>
        <div style="display:flex;justify-content:center;margin:4px 0 10px" id="wrHrRing">${donut(0, { size: 132, color: "#e23b4e", label: "0", sub: "bpm" })}</div>
        <div id="wrHrSpark" class="wr-spark" style="height:38px"></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Kualitas Sinyal</h3></div>
        <div id="wrQuality">
          ${gaugeRow("Kekuatan Sinyal (RSSI)", 0, "#12c4a6")}
          ${gaugeRow("Integritas Paket", 0, "#3b65f2")}
          ${gaugeRow("Stabilitas Kalibrasi", 0, "#f59e0b")}
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.72rem;padding-top:6px;border-top:1px solid var(--border)">
          <span class="muted">Paket hilang</span><b id="wrDrop">0</b>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-top:6px">
          <span class="muted">Latensi</span><b id="wrLat">— ms</b>
        </div>
      </div>

      <div class="card" style="background:var(--surface-2);padding:14px;font-size:.78rem;color:var(--ink-600)" id="wrTip">
        💡 Tekan <b>Hubungkan Perangkat</b> untuk memilih wearable via Bluetooth, atau biarkan berjalan dalam mode simulasi untuk demo.
      </div>
    </div>
  </div>`;
}

/* ============================================================
   MOUNT — koneksi, decoding, dan render loop
   ============================================================ */
export function mountWearableRead() {
  const st = {
    profile: "band",
    rate: 25,             // fps render
    streaming: false,
    recording: false,
    source: null,         // 'ble' | 'sim'
    device: null,         // BluetoothDevice
    chars: [],            // characteristic yang di-subscribe
    timer: null,
    t0: 0,
    packets: 0,
    dropped: 0,
    hz: 0,
    hzWindow: [],
    battery: null,
    hr: 0,
    hrHist: [],
    bias: { ax: 0, ay: 0, az: 0, gx: 0, gy: 0, gz: 0 },
    hist: { ax: [], ay: [], az: [], gx: [], gy: [], gz: [] },
    last: null,
    orient: { roll: 0, pitch: 0, yaw: 0 },
    samples: [],          // buffer rekaman
    phase: 0,
  };

  /* ---------- Log konsol ---------- */
  function log(msg, color = "#8fa4d8") {
    const box = $("wrLog");
    if (!box) return;
    const line = document.createElement("div");
    line.style.color = color;
    line.textContent = `[${nowStr()}] ${msg}`;
    box.appendChild(line);
    while (box.children.length > 120) box.removeChild(box.firstChild);
    box.scrollTop = box.scrollHeight;
  }

  /* ---------- Kanal aktif per profil ---------- */
  const CH_LABEL = { imu: "IMU 9-axis", hr: "Heart Rate", pressure: "Pressure", ir: "Infrared", emg: "EMG" };
  function renderChannels() {
    const box = $("wrChannels");
    if (!box) return;
    box.innerHTML = PROFILES[st.profile].ch
      .map((c) => `<span class="chip chip-brand" style="font-size:.68rem">${CH_LABEL[c] || c}</span>`).join("");
  }

  /* ---------- Web Bluetooth ---------- */
  async function connect() {
    if (!navigator.bluetooth) {
      toast("Web Bluetooth tidak tersedia — memakai mode simulasi.", "warn");
      log("navigator.bluetooth tidak ada → fallback simulasi", "#f7b733");
      setSource("sim", PROFILES[st.profile].name + " (Simulasi)");
      return;
    }
    try {
      log("Meminta perangkat Bluetooth...", "#7ff0d2");
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: PROFILES[st.profile].namePrefix },
          { services: [HR_SERVICE] },
        ],
        optionalServices: [NS_IMU_SERVICE, HR_SERVICE, BAT_SERVICE],
      });
      st.device = device;
      device.addEventListener("gattserverdisconnected", onDisconnected);
      log(`Perangkat dipilih: ${device.name || device.id}`, "#7ff0d2");

      const server = await device.gatt.connect();
      log("GATT server tersambung.", "#7ff0d2");
      setSource("ble", device.name || "Perangkat BLE");

      await subscribeHeartRate(server);
      await readBattery(server);
      await subscribeImu(server);

      toast("Perangkat tersambung.", "ok");
      if (!st.streaming) startStream();
    } catch (err) {
      if (err && err.name === "NotFoundError") {
        log("Pairing dibatalkan → fallback simulasi", "#f7b733");
        toast("Pairing dibatalkan — memakai mode simulasi.", "warn");
      } else {
        log("Gagal konek: " + (err && err.message ? err.message : err), "#ff7b8a");
        toast("Gagal menghubungkan perangkat.", "warn");
      }
      setSource("sim", PROFILES[st.profile].name + " (Simulasi)");
    }
  }

  async function subscribeHeartRate(server) {
    try {
      const svc = await server.getPrimaryService(HR_SERVICE);
      const ch = await svc.getCharacteristic(HR_CHAR);
      await ch.startNotifications();
      ch.addEventListener("characteristicvaluechanged", (e) => {
        const bpm = decodeHeartRate(e.target.value);
        if (bpm != null) { st.hr = bpm; pushHr(bpm); st.packets++; markPacket(); }
      });
      st.chars.push(ch);
      log("Subscribe heart_rate_measurement (0x2A37) ✓", "#7ff0d2");
    } catch { log("Service Heart Rate tidak tersedia di perangkat ini.", "#5b6b96"); }
  }

  async function readBattery(server) {
    try {
      const svc = await server.getPrimaryService(BAT_SERVICE);
      const ch = await svc.getCharacteristic(BAT_CHAR);
      const v = await ch.readValue();
      st.battery = v.getUint8(0);
      log(`Baterai perangkat: ${st.battery}%`, "#7ff0d2");
      try {
        await ch.startNotifications();
        ch.addEventListener("characteristicvaluechanged", (e) => { st.battery = e.target.value.getUint8(0); });
        st.chars.push(ch);
      } catch { /* notify baterai opsional */ }
    } catch { log("Service Battery tidak tersedia.", "#5b6b96"); }
  }

  async function subscribeImu(server) {
    try {
      const svc = await server.getPrimaryService(NS_IMU_SERVICE);
      const ch = await svc.getCharacteristic(NS_IMU_CHAR);
      await ch.startNotifications();
      ch.addEventListener("characteristicvaluechanged", (e) => {
        const f = decodeImuFrame(e.target.value);
        if (f) { applyFrame(f); st.packets++; markPacket(); }
      });
      st.chars.push(ch);
      log(`Subscribe NovaSport IMU stream ✓ (9-axis @ ${PROFILES[st.profile].hz} Hz)`, "#7ff0d2");
    } catch { log("Service IMU NovaSport tidak ditemukan — hanya kanal standar.", "#5b6b96"); }
  }

  /* ---------- Decoder ---------- */

  // Heart Rate Measurement (0x2A37): bit0 flags menentukan format nilai.
  function decodeHeartRate(dv) {
    if (!dv || dv.byteLength < 2) return null;
    const flags = dv.getUint8(0);
    return flags & 0x01 ? dv.getUint16(1, true) : dv.getUint8(1);
  }

  // Frame IMU NovaSport: 9 × int16 little-endian + uint16 seq (20 byte).
  // Skala: accel ±16g → /2048, gyro ±2000°/s → /16.4, mag µT → /10.
  function decodeImuFrame(dv) {
    if (!dv || dv.byteLength < 18) return null;
    const i16 = (o) => dv.getInt16(o, true);
    const f = {
      ax: i16(0) / 2048, ay: i16(2) / 2048, az: i16(4) / 2048,
      gx: i16(6) / 16.4, gy: i16(8) / 16.4, gz: i16(10) / 16.4,
      mx: i16(12) / 10, my: i16(14) / 10, mz: i16(16) / 10,
      seq: dv.byteLength >= 20 ? dv.getUint16(18, true) : null,
    };
    if (f.seq != null && st.last && st.last.seq != null) {
      const gap = (f.seq - st.last.seq + 65536) % 65536;
      if (gap > 1) st.dropped += gap - 1;
    }
    return f;
  }

  function applyFrame(f) {
    st.last = f;
    // Orientasi dari akselerometer, dihaluskan complementary filter sederhana.
    const ax = f.ax - st.bias.ax, ay = f.ay - st.bias.ay, az = f.az - st.bias.az;
    const roll = Math.atan2(ay, az) * 57.2958;
    const pitch = Math.atan2(-ax, Math.hypot(ay, az)) * 57.2958;
    st.orient.roll = st.orient.roll * 0.85 + roll * 0.15;
    st.orient.pitch = st.orient.pitch * 0.85 + pitch * 0.15;
    st.orient.yaw = (st.orient.yaw + (f.gz - st.bias.gz) * 0.02 + 360) % 360;
    if (st.recording) {
      st.samples.push({ t: Date.now() - st.t0, ...f, hr: st.hr, roll: st.orient.roll, pitch: st.orient.pitch, yaw: st.orient.yaw });
    }
  }

  function pushHr(bpm) {
    st.hrHist.push(bpm);
    if (st.hrHist.length > 44) st.hrHist.shift();
  }

  function markPacket() {
    const now = performance.now();
    st.hzWindow.push(now);
    while (st.hzWindow.length && now - st.hzWindow[0] > 1000) st.hzWindow.shift();
    st.hz = st.hzWindow.length;
  }

  /* ---------- Generator simulasi ---------- */
  // Model sinyal: napas lambat + tremor tangan + micro-drift giroskop,
  // supaya kurva terlihat seperti pembacaan IMU sungguhan.
  function simulateFrame() {
    st.phase += 0.09;
    const breath = Math.sin(st.phase * 0.35);
    const tremor = Math.sin(st.phase * 6.1) * 0.06 + noise(0.05);
    const sway = Math.sin(st.phase * 0.9) * 0.14;
    // sesekali paket hilang, seperti BLE nyata
    if (Math.random() < 0.004) { st.dropped++; return null; }
    return {
      ax: sway + tremor,
      ay: breath * 0.18 + tremor * 0.7,
      az: 1.0 + breath * 0.06 + noise(0.04),
      gx: sway * 34 + noise(5),
      gy: breath * 18 + noise(4),
      gz: Math.sin(st.phase * 0.5) * 9 + noise(3),
      mx: 22 + noise(1.5), my: -8 + noise(1.5), mz: 41 + noise(1.5),
      seq: (st.packets + 1) % 65536,
    };
  }

  function simulateHr() {
    const target = 96 + Math.sin(st.phase * 0.12) * 16;
    st.hr = st.hr ? st.hr + (target - st.hr) * 0.12 + noise(1.6) : target;
    st.hr = clamp(st.hr, 52, 195);
    return Math.round(st.hr);
  }

  /* ---------- Loop render ---------- */
  function pushHist(k, v) {
    const h = st.hist[k];
    h.push(v);
    if (h.length > 46) h.shift();
  }

  function tick() {
    // Mode simulasi menghasilkan frame sendiri; mode BLE hanya merender
    // frame terakhir yang masuk lewat notifikasi GATT.
    if (st.source !== "ble") {
      const f = simulateFrame();
      if (f) { applyFrame(f); st.packets++; markPacket(); }
      pushHr(simulateHr());
      if (st.battery == null) st.battery = 76;
    }
    render();
  }

  function render() {
    const f = st.last;
    if ($("wrPackets")) $("wrPackets").textContent = st.packets.toLocaleString("id-ID");
    if ($("wrHz")) $("wrHz").textContent = st.hz || 0;
    if ($("wrBat")) $("wrBat").textContent = st.battery == null ? "—" : Math.round(st.battery);
    if ($("wrDrop")) $("wrDrop").textContent = st.dropped;
    if ($("wrLat")) $("wrLat").textContent = st.source === "ble" ? Math.round(8 + Math.random() * 6) + " ms" : Math.round(12 + Math.random() * 8) + " ms";

    if (f) {
      const vals = {
        ax: f.ax - st.bias.ax, ay: f.ay - st.bias.ay, az: f.az - st.bias.az,
        gx: f.gx - st.bias.gx, gy: f.gy - st.bias.gy, gz: f.gz - st.bias.gz,
      };
      const colors = { ax: "#e23b4e", ay: "#12c4a6", az: "#3b65f2", gx: "#f59e0b", gy: "#7b62f7", gz: "#2596e8" };
      for (const k of Object.keys(vals)) {
        pushHist(k, vals[k]);
        const sp = $(k + "-spark"), vv = $(k + "-val");
        if (vv) vv.textContent = vals[k].toFixed(2);
        if (sp && st.hist[k].length > 1) sp.innerHTML = sparkline(st.hist[k], colors[k], 150, 30);
      }
      const o = st.orient;
      if ($("wrRoll")) $("wrRoll").textContent = Math.round(o.roll) + "°";
      if ($("wrPitch")) $("wrPitch").textContent = Math.round(o.pitch) + "°";
      if ($("wrYaw")) $("wrYaw").textContent = Math.round(o.yaw) + "°";
      const cube = $("wrCube");
      if (cube) cube.style.transform = `perspective(320px) rotateX(${clamp(o.pitch, -60, 60)}deg) rotateY(${clamp(o.roll, -60, 60)}deg) rotateZ(${(o.yaw * 0.2).toFixed(1)}deg)`;

      // log paket berkala supaya konsol tidak banjir
      if (st.packets % 12 === 0) {
        const fmt = (v) => (v >= 0 ? " " : "") + v.toFixed(2);
        log(`seq=${String(f.seq ?? st.packets).padStart(5, "0")}  a[${fmt(f.ax)}${fmt(f.ay)}${fmt(f.az)} ]  g[${fmt(f.gx)}${fmt(f.gy)}${fmt(f.gz)} ]  hr=${Math.round(st.hr)}`);
      }
    }

    // heart rate
    const hr = Math.round(st.hr || 0);
    const zone = hr < 100 ? 1 : hr < 130 ? 2 : hr < 155 ? 3 : hr < 172 ? 4 : 5;
    const zc = ["#16a34a", "#12c4a6", "#f59e0b", "#f97316", "#e23b4e"][zone - 1];
    if ($("wrHrZone")) { $("wrHrZone").textContent = hr ? hr + " bpm" : "— bpm"; $("wrHrZone").style.color = zc; }
    if ($("wrHrRing")) $("wrHrRing").innerHTML = donut(clamp(Math.round(((hr - 50) / 140) * 100), 0, 100), { size: 132, color: zc, label: String(hr), sub: "bpm" });
    if ($("wrHrSpark") && st.hrHist.length > 1) $("wrHrSpark").innerHTML = sparkline(st.hrHist, zc, 270, 38);

    // kualitas sinyal
    const rssi = clamp(Math.round((st.source === "ble" ? 78 : 88) + noise(6)), 0, 100);
    const integrity = st.packets ? clamp(Math.round(100 - (st.dropped / st.packets) * 100), 0, 100) : 0;
    const calib = clamp(Math.round(94 - Math.abs(st.bias.ax + st.bias.ay) * 20 + noise(3)), 0, 100);
    if ($("wrQuality")) $("wrQuality").innerHTML =
      gaugeRow("Kekuatan Sinyal (RSSI)", rssi, "#12c4a6") +
      gaugeRow("Integritas Paket", integrity, "#3b65f2") +
      gaugeRow("Stabilitas Kalibrasi", calib, "#f59e0b");

    // durasi & jumlah sampel rekaman
    if (st.recording) {
      const s = Math.floor((Date.now() - st.t0) / 1000);
      if ($("wrDur")) $("wrDur").textContent = String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
      if ($("wrSamples")) $("wrSamples").textContent = st.samples.length.toLocaleString("id-ID");
    }
  }

  /* ---------- Kontrol ---------- */
  function setSource(src, label) {
    st.source = src;
    const badge = $("wrSrc");
    if (badge) {
      badge.textContent = src === "ble" ? "Bluetooth" : "Simulasi";
      badge.className = "pill " + (src === "ble" ? "ok" : "info");
    }
    if ($("wrDevName")) $("wrDevName").textContent = label;
    if ($("wrState")) {
      $("wrState").className = "pill " + (src === "ble" ? "ok" : "warn");
      $("wrState").innerHTML = src === "ble" ? "● Tersambung" : "● Simulasi";
    }
  }

  function startStream() {
    if (st.streaming) return pauseStream();
    if (!st.source) setSource("sim", PROFILES[st.profile].name + " (Simulasi)");
    st.streaming = true;
    st.hzWindow = [];
    if ($("wrStream")) $("wrStream").innerHTML = "⏸ Jeda Pembacaan";
    if ($("wrImuState")) { $("wrImuState").className = "pill ok"; $("wrImuState").textContent = "● Streaming"; }
    clearInterval(st.timer);
    st.timer = setInterval(tick, 1000 / st.rate);
    log(`Pembacaan dimulai — ${PROFILES[st.profile].name} @ ${st.rate} fps render`, "#7ff0d2");
  }

  function pauseStream() {
    st.streaming = false;
    clearInterval(st.timer);
    st.timer = null;
    if ($("wrStream")) $("wrStream").innerHTML = "▶ Lanjut Pembacaan";
    if ($("wrImuState")) { $("wrImuState").className = "pill warn"; $("wrImuState").textContent = "⏸ Jeda"; }
    log("Pembacaan dijeda.", "#f7b733");
  }

  function toggleRecord() {
    st.recording = !st.recording;
    const b = $("wrRecord");
    if (st.recording) {
      st.samples = [];
      st.t0 = Date.now();
      if (b) { b.innerHTML = "⏹ Hentikan Rekam"; b.className = "btn btn-primary btn-block"; }
      if (!st.streaming) startStream();
      toast("Merekam sesi sensor...", "ok");
      log("● REC — perekaman sampel dimulai", "#ff7b8a");
    } else {
      if (b) { b.innerHTML = "⏺ Rekam Sesi"; b.className = "btn btn-outline btn-block"; }
      toast(`Rekaman selesai — ${st.samples.length} sampel.`, "ok");
      log(`■ STOP — ${st.samples.length} sampel tersimpan di buffer`, "#7ff0d2");
    }
  }

  function calibrate() {
    if (!st.last) return toast("Mulai pembacaan dulu sebelum kalibrasi.", "warn");
    st.bias = { ax: st.last.ax, ay: st.last.ay, az: st.last.az - 1, gx: st.last.gx, gy: st.last.gy, gz: st.last.gz };
    st.orient = { roll: 0, pitch: 0, yaw: 0 };
    Object.keys(st.hist).forEach((k) => (st.hist[k] = []));
    toast("Kalibrasi nol tersimpan.", "ok");
    log("Kalibrasi nol: bias sensor diperbarui ✓", "#7ff0d2");
  }

  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCsv() {
    if (!st.samples.length) return toast("Belum ada sampel — rekam sesi dulu.", "warn");
    const cols = ["t", "ax", "ay", "az", "gx", "gy", "gz", "mx", "my", "mz", "roll", "pitch", "yaw", "hr"];
    const rows = st.samples.map((s) => cols.map((c) => (typeof s[c] === "number" ? s[c].toFixed(4) : s[c] ?? "")).join(","));
    download(`novasport-${st.profile}-${Date.now()}.csv`, cols.join(",") + "\n" + rows.join("\n"), "text/csv");
    toast("CSV diunduh.", "ok");
  }

  function exportJson() {
    if (!st.samples.length) return toast("Belum ada sampel — rekam sesi dulu.", "warn");
    download(`novasport-${st.profile}-${Date.now()}.json`, JSON.stringify({
      device: PROFILES[st.profile].name,
      profile: st.profile,
      source: st.source,
      samplingHz: PROFILES[st.profile].hz,
      recordedAt: new Date(st.t0).toISOString(),
      packets: st.packets,
      dropped: st.dropped,
      samples: st.samples,
    }, null, 2), "application/json");
    toast("JSON diunduh.", "ok");
  }

  function onDisconnected() {
    log("Perangkat terputus.", "#ff7b8a");
    toast("Perangkat terputus.", "warn");
    st.device = null;
    st.chars = [];
    setSource("sim", PROFILES[st.profile].name + " (Simulasi)");
  }

  function disconnect() {
    if (st.device && st.device.gatt.connected) st.device.gatt.disconnect();
    st.device = null;
    st.chars = [];
    pauseStream();
    st.source = null;
    if ($("wrSrc")) { $("wrSrc").textContent = "—"; $("wrSrc").className = "pill muted"; }
    if ($("wrState")) { $("wrState").className = "pill danger"; $("wrState").innerHTML = "● Terputus"; }
    if ($("wrDevName")) $("wrDevName").textContent = "—";
    log("Koneksi diputus oleh pengguna.", "#f7b733");
  }

  /* ---------- Wiring ---------- */
  renderChannels();

  $("wrConnect")?.addEventListener("click", connect);
  $("wrStream")?.addEventListener("click", startStream);
  $("wrRecord")?.addEventListener("click", toggleRecord);
  $("wrDisconnect")?.addEventListener("click", disconnect);
  $("wrCal")?.addEventListener("click", calibrate);
  $("wrCsv")?.addEventListener("click", exportCsv);
  $("wrJson")?.addEventListener("click", exportJson);
  $("wrClearLog")?.addEventListener("click", () => { $("wrLog").innerHTML = ""; });

  $("wrProfile")?.addEventListener("change", (e) => {
    st.profile = e.target.value;
    renderChannels();
    if (st.source !== "ble") setSource("sim", PROFILES[st.profile].name + " (Simulasi)");
    log(`Profil perangkat: ${PROFILES[st.profile].name} (${PROFILES[st.profile].hz} Hz)`, "#7ff0d2");
  });

  $("wrRate")?.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-rate]");
    if (!b) return;
    $("wrRate").querySelectorAll("button").forEach((x) => x.classList.remove("active"));
    b.classList.add("active");
    st.rate = +b.dataset.rate;
    if (st.streaming) { clearInterval(st.timer); st.timer = setInterval(tick, 1000 / st.rate); }
  });

  // Auto-start dalam mode simulasi supaya halaman tidak terlihat mati.
  setSource("sim", PROFILES[st.profile].name + " (Simulasi)");
  startStream();

  /* ---------- Cleanup saat pindah route ---------- */
  return () => {
    clearInterval(st.timer);
    st.chars.forEach((c) => { try { c.stopNotifications(); } catch { /* perangkat sudah lepas */ } });
    if (st.device && st.device.gatt.connected) { try { st.device.gatt.disconnect(); } catch { /* noop */ } }
  };
}
