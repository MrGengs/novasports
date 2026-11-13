/* ============================================================
   NovaSport — Simulator Panahan (data IMU busur, full web)
   Sumber bidik/tembakan: Smart Arrow Bow via Web Bluetooth (port archery-bridge),
   Mode HP (sensor gerak), atau Simulasi. Biomarker: smartwatch/oksimeter SpO2 + HR.
   Tombol "Lepaskan Anak Panah" & Auto-Sesi tetap ada untuk demo tanpa alat.
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { archeryTarget, donut, gaugeRow } from "../charts.js";
import { pageHead } from "./components.js";
import { toast } from "../ui.js";
import { BowLink, AXIS_LABELS } from "../devices/bow-ble.js";
import { WearLink, spo2Status } from "../devices/wearable-ble.js";
import { MuseLink, PRESETS as MUSE_PRESETS, CHANNELS as EEG_CH } from "../devices/eeg-muse.js";
import { db, firebaseReady, auth } from "../firebase-config.js";
import { getCurrentUser } from "../auth.js";

const TARGET_PX = 300;

export function simulatorView() {
  const c = DEMO.simulator.config;
  const devHead = (icon, title, sub, pillId, pillText) =>
    `<div class="card-head" style="margin-bottom:10px"><div><h3 style="font-size:.9rem">${icon} ${title}</h3><span class="sub">${sub}</span></div><span class="pill warn" id="${pillId}">● ${pillText}</span></div>`;
  return `
  <style>
    #simStage { display:grid; grid-template-columns:minmax(250px,300px) minmax(0,1fr) minmax(250px,300px); gap:16px; align-items:start; }
    #simStage .side { display:flex; flex-direction:column; gap:14px; }
    #simStage .side .card { padding:14px; }
    #simStage .side .card-head { margin-bottom:10px; }
    #simStage:fullscreen { background:var(--ink-50); padding:18px; overflow:auto; }
    #devBar { display:grid; grid-template-columns:1.4fr 1fr 1fr; gap:14px; margin-bottom:16px; }
    #devBar .card { padding:14px; }
    @media (max-width:1240px) { #simStage { grid-template-columns:1fr 1fr; } #simStage .stage-center { grid-column:1 / -1; order:-1; } #devBar { grid-template-columns:1fr; } }
    @media (max-width:720px) { #simStage { grid-template-columns:1fr; } }
  </style>
  ${pageHead("Latihan / Simulator", "Simulator Panahan", "Busur, smartwatch, dan EEG tersambung bersamaan lewat Bluetooth — semua data tampil di satu layar.",
    `<button class="btn btn-outline btn-sm" id="btnFull">⛶ Layar Penuh</button><button class="btn btn-outline btn-sm" id="simCsv">⭳ Unduh CSV</button><button class="btn btn-primary btn-sm" id="simSave">⊞ Simpan Sesi</button>`)}

  <!-- Koneksi 3 perangkat (masing-masing satu klik, bisa aktif bersamaan) -->
  <div id="devBar">
    <div class="card">
      ${devHead("🏹", "Busur", "Smart Arrow Bow · IMU + IR gate", "bowState", "Belum terhubung")}
      <div class="tabs" style="width:100%;display:grid;grid-template-columns:repeat(3,1fr);margin-bottom:8px" id="srcTabs">
        <button data-src="ble">🏹 Busur BLE</button><button data-src="phone">📱 Mode HP</button><button data-src="sim">🧪 Simulasi</button>
      </div>
      <div style="display:grid;grid-template-columns:auto auto 1fr auto;gap:8px;align-items:center">
        <button class="btn btn-outline btn-sm" id="btnCenter">⌖ Kalibrasi</button>
        <button class="btn btn-outline btn-sm" id="btnStopSrc">⏻ Putuskan</button>
        <select class="input" id="axisSel" title="Preset sumbu busur" style="padding:4px 8px">${AXIS_LABELS.map((l, i) => `<option value="${i}" ${i === 1 ? "selected" : ""}>${l}</option>`).join("")}</select>
        <label style="display:flex;gap:6px;align-items:center;font-size:.72rem;white-space:nowrap"><input type="checkbox" id="flipYaw"> Balik</label>
      </div>
      <div class="muted" style="font-size:.68rem;margin-top:8px" id="bowNote">Busur BLE butuh Chrome/Edge (desktop atau Android) dan HTTPS.</div>
    </div>
    <div class="card">
      ${devHead("⌚", "Smartwatch", "ESP32 OLED · MAX30102 · MLX90614 · MPU", "bioState", "Smartwatch")}
      <div style="display:grid;grid-template-columns:1fr auto;gap:8px">
        <button class="btn btn-outline btn-sm" id="btnBio">⌚ Hubungkan</button><button class="btn btn-outline btn-sm" id="btnBioSim">🧪 Simulasi</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:6px;margin-top:8px">
        <input class="input" id="manSpo2" type="number" min="70" max="100" placeholder="SpO₂ manual" style="padding:4px 8px"><input class="input" id="manHr" type="number" min="30" max="220" placeholder="HR manual" style="padding:4px 8px"><button class="btn btn-outline btn-sm" id="btnManual">✓</button>
      </div>
    </div>
    <div class="card">
      ${devHead("🧠", "EEG", "Muse S Athena · 4 kanal", "eegState", "EEG")}
      <div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px">
        <select class="input" id="museSel" style="width:auto;padding:4px 8px">${Object.entries(MUSE_PRESETS).map(([k, v]) => `<option value="${k}" title="${v}">${k}</option>`).join("")}</select>
        <button class="btn btn-outline btn-sm" id="btnEeg">🧠 Hubungkan</button><button class="btn btn-outline btn-sm" id="btnEegSim">🧪 Simulasi</button>
      </div>
      <div class="muted" style="font-size:.68rem;margin-top:8px">Tutup aplikasi Muse di HP dulu — satu alat hanya bisa ke satu aplikasi.</div>
    </div>
  </div>

  <div id="simStage">
    <!-- KIRI: smartwatch -->
    <div class="side">
      <div class="card">
        <div class="card-head"><h3 style="font-size:.88rem">❤️ Jantung & Oksigen</h3><span class="pill info" id="contactPill">—</span></div>
        <canvas id="ppgCanvas" height="60" style="width:100%;height:60px;background:#0c1430;border-radius:12px"></canvas>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-top:10px;text-align:center" id="ppgGrid"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3 style="font-size:.88rem">🌡️ Suhu & Gerak</h3><span class="pill info" id="steadyPill">—</span></div>
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;text-align:center" id="tmGrid"></div>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;margin:10px 0 6px"><span class="muted">Kestabilan tangan</span><b id="steadyVal">—</b></div>
        <div class="progress"><i id="steadyBar" style="width:0%"></i></div>
        <div class="muted" style="font-size:.62rem;margin-top:8px" id="bioNote">Estimasi latihan, bukan diagnosis medis.</div>
      </div>
    </div>

    <!-- TENGAH: game -->
    <div class="card stage-center">
      <div class="card-head">
        <div><h3>Papan Skor Langsung</h3><span class="sub">Jarak <b id="distNow">${c.distance}</b> m · End <b id="endNow">0</b> · Anak panah <b id="shotNow">0</b>/<span id="shotMax">30</span></span></div>
        <span class="pill warn" id="simState">⏸ Siap</span>
      </div>
      <div class="tabs" style="width:100%;display:grid;grid-template-columns:repeat(4,1fr);margin-bottom:10px" id="distTabs">
        ${[10, 18, 30, 70].map((d) => `<button class="${d === c.distance ? "active" : ""}" data-dist="${d}">${d} m</button>`).join("")}
      </div>
      <div style="position:relative;background:radial-gradient(circle at 50% 40%, #1a2752, #0c1430);border-radius:var(--r-lg);padding:18px;min-height:${TARGET_PX + 60}px;display:grid;place-items:center;touch-action:none;user-select:none" id="targetWrap">
        <div id="targetBox" style="width:${TARGET_PX}px;height:${TARGET_PX}px;position:relative">${archeryTarget([], TARGET_PX)}</div>
        <div id="reticle" style="position:absolute;width:30px;height:30px;margin:-15px 0 0 -15px;border:2px solid #7ff0d2;border-radius:50%;box-shadow:0 0 12px #7ff0d2;pointer-events:none;display:none;left:50%;top:50%">
          <div style="position:absolute;left:50%;top:-6px;bottom:-6px;width:2px;margin-left:-1px;background:#7ff0d2"></div>
          <div style="position:absolute;top:50%;left:-6px;right:-6px;height:2px;margin-top:-1px;background:#7ff0d2"></div>
        </div>
        <div style="position:absolute;top:10px;left:12px;right:12px;display:flex;justify-content:space-between;color:#cfe0ff;font:600 .68rem monospace;pointer-events:none">
          <span><span id="mHz">0</span> Hz · <span id="mSpeed">—</span> m/s · hilang <span id="mDrop">0</span></span><span id="mAim">yaw 0.0° · pitch 0.0°</span>
        </div>
        <div id="phoneHint" style="position:absolute;bottom:10px;left:0;right:0;text-align:center;color:#cfe0ff;font-size:.72rem;display:none">Tekan-tahan area ini untuk menarik, lepas untuk menembak</div>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:.7rem;margin:10px 0 6px"><span class="muted">Kekuatan tarikan (draw)</span><b id="mDraw">0%</b></div>
      <div class="progress teal"><i id="drawBar" style="width:0%"></i></div>
      <div class="grid g-3" style="margin-top:14px">
        <div class="card" style="padding:12px;text-align:center"><div class="stat-val" style="font-size:1.4rem" id="mDur">00:00</div><div class="stat-label">Durasi</div></div>
        <div class="card" style="padding:12px;text-align:center"><div class="stat-val" style="font-size:1.4rem"><span id="mScore">0</span><span style="font-size:.9rem;color:var(--ink-400)">/<span id="mMax">300</span></span></div><div class="stat-label">Skor sesi</div></div>
        <div class="card" style="padding:12px;text-align:center"><div class="stat-val" style="font-size:1.4rem" id="mGroup">—</div><div class="stat-label">Grouping (cm)</div></div>
      </div>
      <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap">
        <button class="btn btn-primary" style="flex:1" id="btnShoot">🏹 Lepaskan Anak Panah</button>
        <button class="btn btn-outline" id="btnAuto">⚡ Auto-Sesi</button>
        <button class="btn btn-outline" id="btnReset">↺ Reset</button>
        <select class="input" id="arrowCount" style="width:auto"><option value="30">30 panah</option><option value="36">36 panah</option><option value="24">24 panah</option><option value="12">12 panah</option></select>
      </div>
      <div class="card" style="background:#0c1430;color:#8fa4d8;font-family:monospace;font-size:.68rem;padding:10px;margin-top:12px;max-height:84px;overflow:auto" id="simLog"></div>
    </div>

    <!-- KANAN: EEG + skor/AI -->
    <div class="side">
      <div class="card">
        <div class="card-head"><h3 style="font-size:.88rem">🧠 Otak · EEG</h3><span class="pill info" id="eegBat">—</span></div>
        <canvas id="eegCanvas" height="60" style="width:100%;height:60px;background:#0c1430;border-radius:12px"></canvas>
        <div id="eegMetrics" style="margin-top:10px"></div>
        <div style="display:flex;gap:4px;align-items:flex-end;height:46px;margin-top:4px" id="bandBars"></div>
        <div style="display:flex;gap:4px;margin-top:8px;font-size:.66rem;flex-wrap:wrap" id="eegQual"></div>
      </div>
      <div class="card">
        <div class="card-head"><h3 style="font-size:.88rem">🎯 Skor & Analisis AI</h3><span class="pill info" id="accPill">0%</span></div>
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
          <div id="scoreRing">${donut(0, { size: 96, color: "#12c4a6", label: "0", sub: "dari 300" })}</div>
          <div style="display:grid;gap:4px;font-size:.7rem">
            <div><b style="color:var(--ink-900)" id="avgArrow">0.0</b> <span class="muted">rata/panah</span></div>
            <div><b style="color:var(--ink-900)" id="tensCount">0</b> <span class="muted">X/10</span></div>
            <div><b style="color:var(--ink-900)" id="avgSpeed">—</b> <span class="muted">rata m/s</span></div>
          </div>
        </div>
        <div id="aiBox">
          ${gaugeRow("Stabilitas Bidik", 0, "#3b65f2")}
          ${gaugeRow("Konsistensi Tarikan", 0, "#12c4a6")}
          ${gaugeRow("Kontrol Pernapasan", 0, "#f59e0b")}
        </div>
        <div style="background:var(--surface-2);border-radius:12px;padding:10px;margin-top:6px;font-size:.74rem;color:var(--ink-600)" id="aiTip">
          💡 Hubungkan busur (atau pilih simulasi), tekan Kalibrasi sambil membidik pusat target, lalu mulai menembak.
        </div>
      </div>
    </div>
  </div>`;
}

/** Wire up the simulator after it's in the DOM. */
export function mountSimulator() {
  const $ = (id) => document.getElementById(id);
  const bow = new BowLink();
  const bio = new WearLink();
  const eeg = new MuseLink();
  const SNAP_KEYS = ["hr", "spo2", "rmssd", "sdnn", "resp", "pi", "tempSkin", "tempAmb", "tremor"];
  const state = { dist: 18, maxArrows: 30, shots: 0, end: 0, score: 0, tens: 0, hits: [], t0: null, timer: null, auto: null, aim: null, aimHist: [] };

  // ---------------------------------------------------------------- helpers
  const log = (text, level = "info") => {
    const el = $("simLog"); if (!el) return;
    const color = level === "warn" ? "#f7b733" : level === "error" ? "#ff8a99" : level === "ok" ? "#7ff0d2" : "#8fa4d8";
    const t = new Date().toLocaleTimeString("id-ID");
    el.insertAdjacentHTML("afterbegin", `<div style="color:${color}">[${t}] ${text}</div>`);
  };
  /** Lebar sudut (derajat) dari pusat ke tepi wajah target untuk jarak ini (dipermudah agar nyaman dibidik). */
  const aimSpan = () => 3.2 * 18 / state.dist;
  const ringScale = () => state.dist >= 30 ? 1.35 : state.dist >= 18 ? 1 : 0.7;
  const scoreOf = (d) => d < 0.1 ? 10 : d < 1 ? 10 - Math.floor(d * 10) : 0;   // 10 ring, M di luar

  function startClock() {
    if (state.t0) return;
    state.t0 = Date.now();
    state.timer = setInterval(() => ($("mDur").textContent = fmtTime()), 1000);
  }
  function fmtTime() {
    if (!state.t0) return "00:00";
    const s = Math.floor((Date.now() - state.t0) / 1000);
    return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  }
  function grouping() {
    const h = state.hits.filter((x) => x.score > 0);
    if (h.length < 2) return 0;
    const cx = h.reduce((a, p) => a + p.x, 0) / h.length, cy = h.reduce((a, p) => a + p.y, 0) / h.length;
    return Math.max(...h.map((p) => Math.hypot(p.x - cx, p.y - cy))) * 18 * ringScale();
  }

  // ---------------------------------------------------------------- tembakan
  function addShot(hit) {
    if (state.shots >= state.maxArrows) { toast("Sesi selesai — semua anak panah dilepas.", "ok"); stopAuto(); return; }
    startClock();
    hit.t = Date.now();
    if (bio.source || bio.v.fwHr) { SNAP_KEYS.forEach((k) => (hit[k] = bio.v[k] ?? null)); hit.steady = bio.steadyBefore(2000); }
    if (eeg.last) { hit.focus = eeg.last.metrics.fokus; hit.calm = eeg.last.metrics.tenang; hit.drowsy = eeg.last.metrics.kantuk; hit.alpha = +eeg.last.rel.alpha.toFixed(3); }
    state.hits.push(hit);
    state.shots++; state.score += hit.score;
    if (hit.score === 10) state.tens++;
    state.end = Math.ceil(state.shots / 3);
    $("simState").className = "pill ok"; $("simState").innerHTML = "● Sesi Aktif";
    bio.bumpEffort(3); eeg.nudgeFocus(-0.1);
    updateTip(hit);
    render();
  }

  /** Tembakan nyata dari sensor: titik kena = arah bidik saat lepas + jatuh karena tarikan lemah. */
  function shotFromSensor(e) {
    const { aim, draw, speed } = e.detail;
    const span = aimSpan();
    // goyangan bidik 0,5 detik terakhir -> sebaran kecil
    const recent = state.aimHist.slice(-30);
    const wob = recent.length > 2 ? Math.hypot(sd(recent.map((a) => a.yaw)), sd(recent.map((a) => a.pitch))) / span : 0.02;
    const drop = (1 - Math.min(1, draw)) * 0.28 * (state.dist / 18);
    const x = aim.yaw / span + gauss() * wob * 0.5;
    const y = -aim.pitch / span + drop + gauss() * wob * 0.5;
    const d = Math.hypot(x, y);
    addShot({ x: Math.max(-1.08, Math.min(1.08, x)), y: Math.max(-1.08, Math.min(1.08, y)), score: scoreOf(d), speed, draw, yaw: aim.yaw, pitch: aim.pitch, wobble: +(wob * span).toFixed(2), source: bow.source });
    log(`Tembakan #${state.shots}: ${scoreOf(d) || "M"} · ${speed.toFixed(1)} m/s · draw ${(draw * 100).toFixed(0)}%`, "ok");
  }

  /** Tembakan demo tanpa alat (model keterampilan acak, perilaku lama). */
  function shootDemo() {
    if (bow.source && bow.aim) {   // ada sensor: lepas manual memakai bidikan sekarang
      shotFromSensor({ detail: { aim: bow.aim, draw: 0.75, speed: 40 } });
      return;
    }
    const skill = 0.34 - Math.min(state.shots, 20) * 0.006 + state.dist * 0.0016;
    const ang = Math.random() * Math.PI * 2, rad = Math.abs(gauss()) * skill;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad - 0.02;
    addShot({ x, y, score: scoreOf(Math.hypot(x, y)), speed: null, draw: null, source: "demo" });
  }
  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
  const sd = (a) => { const m = a.reduce((s, v) => s + v, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length); };

  function updateTip(hit) {
    let tip;
    const v = bio.v;
    if (v.spo2 != null && v.spo2 < 94) tip = "🫁 SpO₂ turun — tarik napas dalam 2–3 kali dan istirahat sejenak sebelum tembakan berikutnya.";
    else if (v.hr != null && v.hr > 110) tip = `💓 Detak jantung ${v.hr} bpm — tunggu sampai di bawah 100 bpm; buang napas panjang sebelum menarik.`;
    else if (hit.steady != null && hit.steady < 55) tip = "✋ Tangan bergetar saat lepas (tremor tinggi) — kendurkan genggaman dan tahan bidikan lebih singkat.";
    else if (hit.focus != null && hit.focus < 35) tip = "🧠 Fokus EEG rendah menjelang tembakan — pakai rutinitas pra-tembakan yang sama sebelum menarik.";
    else if (v.tempSkin != null && v.tempSkin > 37.2) tip = "🌡️ Suhu kulit meningkat — minum dan istirahat di tempat teduh.";
    else if (hit.draw != null && hit.draw < 0.35) tip = "💪 Tarikan kurang penuh — lesatan lambat membuat panah jatuh. Tarik sampai anchor yang sama tiap kali.";
    else if (hit.wobble != null && hit.wobble > 0.8) tip = "🎯 Bidikan masih bergoyang saat lepas — tahan 1 detik lebih lama dan lepaskan di puncak napas buang.";
    else tip = { 10: "🎯 Sempurna! Pertahankan ritme napas dan anchor point.", 9: "👍 Sangat baik. Stabilitas tarikan konsisten.", 8: "⚠️ Sedikit melebar — periksa posisi jari di rahang.", 0: "🔄 Meleset — kalibrasi tengah ulang bila arah bidik terasa bergeser." }[hit.score] || "🔧 Jaga garis bahu tetap level dan follow-through setelah lepas.";
    $("aiTip").innerHTML = "💡 " + tip;
  }

  // ---------------------------------------------------------------- render
  function render() {
    const maxScore = state.maxArrows * 10;
    $("shotNow").textContent = state.shots; $("endNow").textContent = state.end;
    $("mScore").textContent = state.score; $("mMax").textContent = maxScore; $("mDur").textContent = fmtTime();
    $("avgArrow").textContent = (state.shots ? state.score / state.shots : 0).toFixed(1);
    $("tensCount").textContent = state.tens;
    const sp = state.hits.filter((h) => h.speed);
    $("avgSpeed").textContent = sp.length ? (sp.reduce((a, h) => a + h.speed, 0) / sp.length).toFixed(1) : "—";
    $("targetBox").innerHTML = archeryTarget(state.hits.map((h) => ({ x: h.x, y: h.y })), TARGET_PX);
    const acc = state.shots ? Math.round((state.score / (state.shots * 10)) * 100) : 0;
    $("accPill").textContent = acc + "%";
    $("scoreRing").innerHTML = donut(Math.round((state.score / maxScore) * 100), { size: 96, color: "#12c4a6", label: String(state.score), sub: "dari " + maxScore });
    $("mGroup").textContent = state.hits.length >= 2 ? grouping().toFixed(1) : "—";

    const wob = state.hits.filter((h) => h.wobble != null).map((h) => h.wobble);
    const draws = state.hits.filter((h) => h.draw != null).map((h) => h.draw);
    const stab = wob.length ? Math.max(20, 100 - (wob.reduce((a, b) => a + b, 0) / wob.length) * 60) : Math.min(95, 60 + state.shots * 1.4);
    const cons = draws.length > 1 ? Math.max(20, 100 - sd(draws) * 250) : Math.min(94, 55 + state.shots * 1.2);
    const v = bio.v;
    const breath = v.rmssd != null ? Math.max(20, Math.min(98, v.rmssd * 1.6 + (v.spo2 ? (v.spo2 - 92) * 3 : 0)))
      : v.spo2 != null ? Math.max(20, Math.min(98, (v.spo2 - 88) * 9)) : Math.min(92, 60 + state.shots);
    const steadyHits = state.hits.filter((h) => h.steady != null).map((h) => h.steady);
    const stab2 = steadyHits.length ? (stab + steadyHits.reduce((a, b) => a + b, 0) / steadyHits.length) / 2 : stab;
    $("aiBox").innerHTML = gaugeRow("Stabilitas Bidik", Math.round(stab2), "#3b65f2") +
      gaugeRow("Konsistensi Tarikan", Math.round(cons), "#12c4a6") + gaugeRow("Kontrol Pernapasan", Math.round(breath), "#f59e0b") +
      (eeg.last ? gaugeRow("Fokus Mental (EEG)", eeg.last.metrics.fokus, "#8b5cf6") : "");
  }

  function placeReticle(aim) {
    const wrap = $("targetWrap"), box = $("targetBox"), ret = $("reticle");
    if (!wrap || !box) return;
    const span = aimSpan(), R = TARGET_PX / 2 - 4;
    const wr = wrap.getBoundingClientRect(), br = box.getBoundingClientRect();
    const cx = br.left - wr.left + br.width / 2, cy = br.top - wr.top + br.height / 2;
    const x = Math.max(-1.3, Math.min(1.3, aim.yaw / span)), y = Math.max(-1.3, Math.min(1.3, -aim.pitch / span));
    ret.style.left = cx + x * R * 0.92 + "px"; ret.style.top = cy + y * R * 0.92 + "px"; ret.style.display = "block";
  }

  // ---------------------------------------------------------------- event busur
  bow.addEventListener("packet", (e) => {
    const p = e.detail;
    state.aim = p.aim; state.aimHist.push(p.aim); if (state.aimHist.length > 120) state.aimHist.shift();
    $("mHz").textContent = p.hz; $("mDrop").textContent = p.dropped;
    $("mSpeed").textContent = p.speed ? p.speed.toFixed(1) : "—";
    $("mDraw").textContent = Math.round(p.draw * 100) + "%"; $("drawBar").style.width = Math.round(p.draw * 100) + "%";
    $("mAim").textContent = `yaw ${p.aim.yaw.toFixed(1)}° · pitch ${p.aim.pitch.toFixed(1)}° · roll ${p.aim.roll.toFixed(1)}°`;
    placeReticle(p.aim);
  });
  bow.addEventListener("shot", shotFromSensor);
  bow.addEventListener("status", (e) => {
    const { state: s, text } = e.detail;
    const cls = s === "live" ? "ok" : s === "error" ? "danger" : "warn";
    $("bowState").className = "pill " + cls; $("bowState").textContent = "● " + (s === "live" ? "Live" : s === "idle" ? "Belum terhubung" : text.split("—")[0]);
    $("bowNote").textContent = text;
    $("phoneHint").style.display = bow.source === "phone" && s === "live" ? "block" : "none";
    if (s === "idle") $("reticle").style.display = "none";
    log(text, s === "error" ? "error" : s === "retry" ? "warn" : "info");
  });
  bow.addEventListener("log", (e) => log(e.detail.text, e.detail.level));

  // ---------------------------------------------------------------- wearable (MAX30102 · MLX90614 · MPU)
  const cell = (val, lab, unit = "") => `<div class="card" style="padding:8px"><b style="font-size:1rem;color:var(--ink-900)">${val ?? "—"}${val != null && unit ? `<small style="font-size:.6rem;color:var(--ink-400)"> ${unit}</small>` : ""}</b><div class="muted" style="font-size:.6rem">${lab}</div></div>`;
  function scope(canvas, data, color) {
    const c = $(canvas); if (!c) return;
    const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = 70 * devicePixelRatio), g = c.getContext("2d");
    g.clearRect(0, 0, w, h); if (data.length < 2) return;
    let lo = Infinity, hi = -Infinity; for (const v of data) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const sp = hi - lo || 1;
    g.strokeStyle = color; g.lineWidth = 1.5 * devicePixelRatio; g.beginPath();
    data.forEach((v, i) => { const x = (i / (data.length - 1)) * w, y = h - 6 - ((v - lo) / sp) * (h - 12); i ? g.lineTo(x, y) : g.moveTo(x, y); });
    g.stroke();
  }
  bio.addEventListener("vitals", (e) => {
    const v = e.detail, st = spo2Status(v.spo2);
    $("ppgGrid").innerHTML = cell(v.hr, "HR", "bpm") + cell(v.spo2, `SpO₂ · ${st.label}`, "%") + cell(v.rmssd, "HRV RMSSD", "ms") + cell(v.sdnn, "SDNN", "ms") +
      cell(v.pnn50, "pNN50", "%") + cell(v.rr, "Interval RR", "ms") + cell(v.pi, "Perfusi (PI)", "%") + cell(v.resp, "Napas", "/mnt");
    $("contactPill").className = "pill " + (v.contact ? "ok" : bio.source ? "warn" : "info");
    $("contactPill").textContent = v.contact ? "● Kontak baik" : bio.source ? "Kulit tidak menempel" : "—";
    $("tmGrid").innerHTML = cell(v.tempSkin, "Suhu kulit", "°C") + cell(v.tempAmb, "Suhu lingkungan", "°C") + cell(v.tempTrend, "Tren", "°C/mnt") +
      cell(v.tremor, "Tremor", "dps") + cell(v.motion, "Variasi gerak", "g") + cell(v.battery, "Baterai", "%");
    $("steadyVal").textContent = v.steady != null ? v.steady + "%" : "—";
    $("steadyBar").style.width = (v.steady ?? 0) + "%";
    $("steadyPill").className = "pill " + (v.steady == null ? "info" : v.steady >= 70 ? "ok" : v.steady >= 50 ? "warn" : "danger");
    $("steadyPill").textContent = v.steady == null ? "—" : v.steady >= 70 ? "Stabil" : v.steady >= 50 ? "Sedikit goyang" : "Tremor tinggi";
    scope("ppgCanvas", bio.ppg.f.slice(-bio.fs * 4), "#ff6b81");
  });
  bio.addEventListener("jolt", () => log("MPU: hentakan terdeteksi (kemungkinan saat melepas panah)"));
  bio.addEventListener("status", (e) => {
    const { state: s, text } = e.detail;
    $("bioState").className = "pill " + (s === "live" ? "ok" : s === "error" ? "danger" : "info");
    $("bioState").textContent = "● " + (s === "live" ? "Smartwatch live" : s === "idle" ? "Smartwatch" : "…");
    $("bioNote").textContent = text;
    log("Wearable: " + text, s === "error" ? "error" : "info");
  });
  bio.addEventListener("log", (e) => log("Wearable: " + e.detail.text, e.detail.level));

  // ---------------------------------------------------------------- EEG Muse S Athena
  const eegWave = [];
  eeg.addEventListener("samples", (e) => {
    const af = e.detail.ch[1].map((v, i) => (v + e.detail.ch[2][i]) / 2);   // rata-rata AF7 & AF8 (dahi)
    eegWave.push(...af); if (eegWave.length > 768) eegWave.splice(0, eegWave.length - 768);
  });
  eeg.addEventListener("bands", (e) => {
    const { rel, metrics, quality } = e.detail;
    $("eegMetrics").innerHTML = gaugeRow("Fokus", metrics.fokus, "#8b5cf6") + gaugeRow("Tenang", metrics.tenang, "#12c4a6") + gaugeRow("Kantuk", metrics.kantuk, "#f59e0b");
    const names = { delta: "δ", theta: "θ", alpha: "α", beta: "β", gamma: "γ" };
    const cols = { delta: "#64748b", theta: "#f59e0b", alpha: "#12c4a6", beta: "#3b65f2", gamma: "#8b5cf6" };
    $("bandBars").innerHTML = Object.entries(rel).map(([k, v]) =>
      `<div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%;text-align:center"><div style="height:${Math.max(3, Math.min(30, v * 60))}px;background:${cols[k]};border-radius:4px 4px 0 0" title="${k} ${(v * 100).toFixed(0)}%"></div><div class="muted" style="font-size:.62rem">${names[k]} ${(v * 100).toFixed(0)}%</div></div>`).join("");
    $("eegQual").innerHTML = EEG_CH.map((c, i) => `<span class="pill ${quality[i] === "baik" ? "ok" : quality[i] === "cukup" ? "info" : "warn"}" style="font-size:.6rem">${c} ${quality[i]}</span>`).join("");
    scope("eegCanvas", eegWave.slice(-512), "#8bd3ff");
  });
  eeg.addEventListener("battery", (e) => { $("eegBat").textContent = `🔋 ${Math.round(e.detail.pct)}%`; });
  eeg.addEventListener("status", (e) => {
    const { state: s, text } = e.detail;
    $("eegState").className = "pill " + (s === "live" ? "ok" : s === "error" ? "danger" : "info");
    $("eegState").textContent = "● " + (s === "live" ? "EEG live" : s === "idle" ? "EEG" : "…");
    log("EEG: " + text, s === "error" ? "error" : "info");
  });
  eeg.addEventListener("log", (e) => log("EEG: " + e.detail.text, e.detail.level));

  // ---------------------------------------------------------------- kontrol
  const guard = (fn) => async () => { try { await fn(); } catch (err) { if (err?.name !== "NotFoundError") { toast(err.message || String(err), "warn"); log(err.message || String(err), "error"); } } };
  $("srcTabs").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-src]"); if (!b) return;
    $("srcTabs").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
    try {
      if (b.dataset.src === "ble") { const n = await bow.connectBle(); toast(`Busur ${n} terhubung — tekan Kalibrasi Tengah sambil membidik pusat.`, "ok"); }
      else if (b.dataset.src === "phone") await bow.startPhone();
      else await bow.startSim();
    } catch (err) {
      b.classList.remove("active");
      if (err?.name === "NotFoundError") log("Pemilihan perangkat dibatalkan.", "warn");
      else { toast(err.message || String(err), "warn"); log(err.message || String(err), "error"); }
    }
  });
  $("btnCenter").addEventListener("click", () => { bow.center(); toast("Titik tengah dikalibrasi.", "ok"); });
  $("btnStopSrc").addEventListener("click", () => { bow.stop(); $("srcTabs").querySelectorAll("button").forEach((x) => x.classList.remove("active")); });
  $("axisSel").addEventListener("change", (e) => bow.setAxis(+e.target.value));
  $("flipYaw").addEventListener("change", (e) => { bow.flipYaw = e.target.checked; });

  // Mode HP: tahan = tarik, lepas = tembak
  const tw = $("targetWrap");
  tw.addEventListener("pointerdown", () => bow.phonePress());
  ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => tw.addEventListener(ev, () => bow.phoneRelease()));

  $("btnBio").addEventListener("click", guard(async () => { const n = await bio.connectBle(); toast(`${n} terhubung.`, "ok"); }));
  $("btnEeg").addEventListener("click", guard(async () => { const n = await eeg.connectBle($("museSel").value); toast(`${n} terhubung — tunggu ±2 detik untuk analisis gelombang otak.`, "ok"); }));
  $("btnEegSim").addEventListener("click", guard(() => eeg.startSim()));
  $("btnBioSim").addEventListener("click", guard(() => bio.startSim()));
  $("btnFull").addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else $("simStage").requestFullscreen?.().catch(() => toast("Layar penuh tidak didukung browser ini.", "warn"));
  });
  document.addEventListener("fullscreenchange", () => { const b = $("btnFull"); if (b) b.textContent = document.fullscreenElement ? "⛶ Keluar Layar Penuh" : "⛶ Layar Penuh"; });
  $("btnManual").addEventListener("click", () => bio.manual($("manSpo2").value, $("manHr").value));

  function startAuto() {
    if (state.auto) return stopAuto();
    $("btnAuto").innerHTML = "⏹ Berhenti";
    state.auto = setInterval(() => { if (state.shots >= state.maxArrows) return stopAuto(); shootDemo(); }, 650);
  }
  function stopAuto() { clearInterval(state.auto); state.auto = null; const b = $("btnAuto"); if (b) b.innerHTML = "⚡ Auto-Sesi"; }
  function reset() {
    stopAuto(); clearInterval(state.timer);
    Object.assign(state, { shots: 0, end: 0, score: 0, tens: 0, hits: [], t0: null, timer: null });
    $("simState").className = "pill warn"; $("simState").innerHTML = "⏸ Siap";
    render();
  }
  $("btnShoot").addEventListener("click", shootDemo);
  $("btnAuto").addEventListener("click", startAuto);
  $("btnReset").addEventListener("click", reset);
  $("distTabs").addEventListener("click", (e) => {
    const b = e.target.closest("[data-dist]"); if (!b) return;
    state.dist = +b.dataset.dist; $("distNow").textContent = state.dist;
    $("distTabs").querySelectorAll("button").forEach((x) => x.classList.toggle("active", x === b));
  });
  $("arrowCount").addEventListener("change", (e) => { state.maxArrows = +e.target.value; $("shotMax").textContent = state.maxArrows; render(); });

  // ---------------------------------------------------------------- ekspor & simpan
  function sessionDoc() {
    const user = getCurrentUser() || {};
    return {
      ownerId: auth?.currentUser?.uid || user.uid || "demo",
      ownerName: user.name || null, sport: "archery", distance: state.dist, arrows: state.maxArrows,
      score: state.score, shots: state.shots, tens: state.tens, grouping_cm: +grouping().toFixed(1),
      source: bow.source || "demo", device: bow.device?.name || null,
      startedAt: state.t0 ? new Date(state.t0).toISOString() : null, savedAt: new Date().toISOString(),
      hits: state.hits.map((h) => ({ t: h.t, x: +h.x.toFixed(4), y: +h.y.toFixed(4), score: h.score, speed: h.speed ?? null, draw: h.draw ?? null,
        yaw: h.yaw ?? null, pitch: h.pitch ?? null, wobble: h.wobble ?? null, source: h.source,
        ...Object.fromEntries([...SNAP_KEYS, "steady", "focus", "calm", "drowsy", "alpha"].map((k) => [k, h[k] ?? null])) })),
      wearable: { source: bio.source, device: bio.device?.name || null },
      eeg: { source: eeg.source, device: eeg.device?.name || null, preset: eeg.preset, firmware: eeg.fw || null },
      biomarkers: bio.history.slice(-600).map(({ hr, spo2, rmssd, resp, tempSkin, tremor, steady, t }) => ({ hr, spo2, rmssd, resp, tempSkin, tremor, steady, t })),
    };
  }
  $("simCsv").addEventListener("click", () => {
    if (!state.hits.length) return toast("Belum ada tembakan untuk diunduh.", "warn");
    const extra = [...SNAP_KEYS, "steady", "focus", "calm", "drowsy", "alpha"];
    const cols = ["no", "waktu", "skor", "x", "y", "kecepatan_ms", "draw", "yaw_deg", "pitch_deg", "goyangan_deg", ...extra, "sumber"];
    const rows = state.hits.map((h, i) => [i + 1, new Date(h.t).toISOString(), h.score, h.x.toFixed(4), h.y.toFixed(4), h.speed?.toFixed(2) ?? "", h.draw?.toFixed(3) ?? "",
      h.yaw?.toFixed(2) ?? "", h.pitch?.toFixed(2) ?? "", h.wobble ?? "", ...extra.map((k) => h[k] ?? ""), h.source].join(","));
    const blob = new Blob([cols.join(",") + "\n" + rows.join("\n")], { type: "text/csv" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `novasport-panahan-${Date.now()}.csv` });
    a.click(); URL.revokeObjectURL(a.href);
  });
  $("simSave").addEventListener("click", async () => {
    if (!state.hits.length) return toast("Belum ada tembakan untuk disimpan.", "warn");
    const doc = sessionDoc();
    const user = getCurrentUser();
    if (firebaseReady && auth?.currentUser && !user?.demo) {
      try {
        const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
        const ref = await f.addDoc(f.collection(db, "sessions"), { ...doc, biomarkers: doc.biomarkers.slice(-300) });
        toast("Sesi tersimpan ke cloud.", "ok"); log(`Sesi disimpan ke Firestore (sessions/${ref.id})`, "ok");
        return;
      } catch (err) { log("Gagal menyimpan ke Firestore: " + err.message + " — disimpan lokal.", "warn"); }
    }
    try {
      const k = "novasport.sessions"; const all = JSON.parse(localStorage.getItem(k) || "[]");
      all.push(doc); localStorage.setItem(k, JSON.stringify(all.slice(-20)));
      toast("Sesi disimpan di perangkat ini (mode demo).", "ok"); log("Sesi disimpan ke penyimpanan lokal browser.", "ok");
    } catch { toast("Penyimpanan lokal tidak tersedia.", "warn"); }
  });

  if (!BowLink.bluetoothAvailable) log("Web Bluetooth tidak tersedia di browser ini — gunakan Mode HP atau Simulasi, atau buka di Chrome/Edge.", "warn");
  render();
  return () => { clearInterval(state.timer); stopAuto(); bow.stop(); bio.stop(); eeg.stop(); };
}
