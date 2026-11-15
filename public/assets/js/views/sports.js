/* ============================================================
   NovaSport — Multi-sport simulator hub + new sports
   (Running IMU, Smart Suit biomechanics, Precision Pistol)
   ============================================================ */
import { donut, gaugeRow, sparkline, archeryTarget } from "../charts.js";
import { pageHead } from "./components.js";
import { toast } from "../ui.js";

/* ---------- Sport catalog ---------- */
export const SPORTS = [
  { key: "archery", name: "Panahan", icon: "🏹", route: "/sim/archery", device: "Smart Arrow Bow", tag: "IMU 9-sumbu", color: "#3b65f2", status: "ready", desc: "Recurve & compound — stabilitas tarikan, anchor, pelepasan." },
  { key: "lari", name: "Lari", icon: "🏃", route: "/sim/lari", device: "IMU Wearable Band", tag: "Cadence & Gait", color: "#12c4a6", status: "ready", desc: "Analisis gait: kadens, ground contact, vertical oscillation, zona HR." },
  { key: "suit", name: "Smart Suit", icon: "🦾", route: "/sim/suit", device: "Smart Suit Sensor", tag: "Full-body Mocap", color: "#7b62f7", status: "ready", desc: "Biomekanika full-body: postur, simetri, keseimbangan, beban sendi." },
  { key: "pistol", name: "Menembak Presisi", icon: "🎯", route: "/sim/pistol", device: "Smart Precision Pistol", tag: "10m Air Pistol", color: "#e23b4e", status: "ready", desc: "Stabilitas hold, trigger control, dan grouping presisi." },
  { key: "golf", name: "Golf", icon: "⛳", route: "/sim/archery", device: "Smart Glove IMU", tag: "Swing Path", color: "#16a34a", status: "soon", desc: "Analisis swing path & tempo. Ekspansi cabang akurasi berikutnya." },
  { key: "biliar", name: "Biliar", icon: "🎱", route: "/sim/archery", device: "Cue Sensor", tag: "Stroke Line", color: "#f59e0b", status: "soon", desc: "Konsistensi stroke & bridge. Roadmap open-ecosystem NovaSport." },
];

/* ---------- Hub (sport picker) ---------- */
export function simHub() {
  return `
  ${pageHead("Latihan / Simulator", "Simulator Multi-Olahraga", "Pilih cabang olahraga presisi & ketahanan. Tiap cabang terhubung Smart-Enabled Equipment dan AI Biomekanika Engine.",
    `<span class="pill ok">● 3 perangkat terhubung</span>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">AIoT · SMART-ENABLED EQUIPMENT</div>
      <h2>Satu ekosistem, banyak cabang olahraga</h2>
      <p>Mulai dari panahan, lari dengan wearable IMU, hingga Smart Suit full-body — semua dianalisis real-time.</p>
    </div>
  </div>

  <div class="grid g-3">
    ${SPORTS.map((s) => `<div class="card hover" style="position:relative;${s.status === "soon" ? "opacity:.72" : ""}">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div class="stat-ic" style="width:52px;height:52px;font-size:1.5rem;background:${hexa(s.color,.12)};color:${s.color}">${s.icon}</div>
        ${s.status === "soon" ? `<span class="pill muted">Segera</span>` : `<span class="pill ok">Siap</span>`}
      </div>
      <h3 style="font-size:1.05rem;color:var(--ink-900);margin-bottom:4px">${s.name}</h3>
      <p class="muted" style="font-size:.8rem;min-height:54px">${s.desc}</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:10px 0 14px">
        <span class="pill info" style="font-size:.66rem">📡 ${s.device}</span>
        <span class="pill muted" style="font-size:.66rem">${s.tag}</span>
      </div>
      ${s.status === "soon"
        ? `<button class="btn btn-outline btn-sm btn-block" disabled>Dalam Pengembangan</button>`
        : `<a href="#${s.route}" class="btn btn-primary btn-sm btn-block">▶ Mulai Sesi ${s.name}</a>`}
    </div>`).join("")}
  </div>`;
}

function hexa(hex, a) {
  const h = hex.replace("#", "");
  return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`;
}
function metricTile(val, label, sub = "", color = "var(--ink-900)") {
  return `<div class="card" style="padding:14px;text-align:center"><div class="stat-val" style="font-size:1.4rem;color:${color}">${val}</div><div class="stat-label" style="font-size:.72rem">${label}</div>${sub ? `<div class="muted" style="font-size:.64rem">${sub}</div>` : ""}</div>`;
}
function backBar(name) {
  return `<a href="#/simulator" class="back" style="display:inline-flex;gap:6px;align-items:center;color:var(--ink-500);font-size:.82rem;margin-bottom:14px">← Semua cabang olahraga</a>`;
}

/* ============================================================
   1) RUNNING — Wearable IMU gait analysis
   ============================================================ */
export function runningView() {
  return `
  ${backBar()}
  ${pageHead("Simulator / Lari", "🏃 Simulator Lari — Wearable IMU", "Analisis gait real-time dari IMU Wearable Band di pergelangan & pinggang.",
    `<button class="btn btn-outline btn-sm">⭳ Unduh GPX</button><button class="btn btn-primary btn-sm" id="runSave">⊞ Simpan Sesi</button>`)}

  <div class="grid" style="grid-template-columns:300px 1fr 300px;gap:18px">
    <!-- config -->
    <div class="card">
      <div class="card-head"><h3>Konfigurasi Lari</h3><span class="pill info" id="runMode">● IMU Band</span></div>
      <div class="field"><label>Target Jarak</label>
        <div class="tabs" style="width:100%;display:grid;grid-template-columns:repeat(4,1fr)" id="distTabs">
          ${[1,3,5,10].map((d,i)=>`<button class="${i===1?"active":""}" data-km="${d}">${d}K</button>`).join("")}
        </div>
      </div>
      <div class="field"><label>Tipe Sesi</label><select class="input" id="runType"><option>Endurance Run</option><option>Tempo Run</option><option>Interval 400m</option></select></div>
      <div class="field"><label>Permukaan</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
          <div class="card" style="padding:10px;text-align:center"><div style="font-size:1.1rem">🏟️</div><b style="font-size:.78rem">Track</b></div>
          <div class="card" style="padding:10px;text-align:center"><div style="font-size:1.1rem">🌳</div><b style="font-size:.78rem">25°C</b></div>
          <div class="card" style="padding:10px;text-align:center"><div style="font-size:1.1rem">💨</div><b style="font-size:.78rem">5 km/j</b></div>
        </div>
      </div>
      <div class="card" style="background:var(--surface-2);padding:14px;margin-top:6px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:.85rem;color:var(--ink-900)">IMU Band #2</b><div class="muted" style="font-size:.7rem">Pinggang + Pergelangan</div></div><span class="pill ok">● 100Hz</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;margin:10px 0 6px"><span class="muted">Baterai</span><b>76%</b></div>
        <div class="progress teal"><i style="width:76%"></i></div>
      </div>
    </div>

    <!-- live -->
    <div class="card">
      <div class="card-head"><div><h3>Sesi Langsung</h3><span class="sub"><b id="runDist">0.00</b> / <span id="runTarget">3.0</span> km · <span id="runLap">Lap 0</span></span></div><span class="pill warn" id="runState">⏸ Siap</span></div>
      <!-- track -->
      <div style="background:radial-gradient(circle at 50% 30%,#1a2752,#0c1430);border-radius:var(--r-lg);padding:24px 18px;position:relative;overflow:hidden">
        <div style="position:relative;height:54px;display:flex;align-items:center">
          <div style="position:absolute;left:0;right:0;height:8px;background:rgba(255,255,255,.12);border-radius:99px"></div>
          <div style="position:absolute;left:0;height:8px;width:0%;background:linear-gradient(90deg,#12c4a6,#2596e8);border-radius:99px;transition:width .4s" id="runBar"></div>
          <div style="position:absolute;left:0;font-size:1.7rem;transition:left .4s;transform:translateX(-50%)" id="runDot">🏃</div>
        </div>
        <div style="display:flex;justify-content:space-between;color:rgba(255,255,255,.55);font-size:.7rem;margin-top:6px"><span>0 km</span><span id="runHalf">1.5 km</span><span id="runEnd">3 km</span></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:18px">
          <div><div style="color:rgba(255,255,255,.6);font-size:.72rem;font-weight:700">PACE</div><div style="color:#fff;font-size:2.2rem;font-weight:800;line-height:1" id="runPace">--:--</div><div style="color:rgba(255,255,255,.55);font-size:.72rem">min/km</div></div>
          <div style="text-align:right"><div style="color:rgba(255,255,255,.6);font-size:.72rem;font-weight:700">DURASI</div><div style="color:#7ff0d2;font-size:1.6rem;font-weight:800" id="runTime">00:00</div></div>
        </div>
      </div>
      <div class="grid g-4" style="margin-top:16px;gap:12px">
        ${metricTile('<span id="mCad">0</span>',"Kadens","spm")}
        ${metricTile('<span id="mStride">0.00</span>',"Panjang langkah","m")}
        ${metricTile('<span id="mGct">0</span>',"Ground contact","ms")}
        ${metricTile('<span id="mVo">0.0</span>',"Vert. oscillation","cm")}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary btn-block" id="runStart">▶ Mulai Lari</button>
        <button class="btn btn-outline" id="runSprint">⚡ Sprint</button>
        <button class="btn btn-outline" id="runReset">↺ Reset</button>
      </div>
    </div>

    <!-- HR + AI -->
    <div class="card">
      <div class="card-head"><h3>Heart Rate</h3><span class="pill danger" id="hrZone">— bpm</span></div>
      <div style="display:flex;justify-content:center;margin:4px 0 10px" id="hrRing">${donut(0,{size:130,color:"#e23b4e",label:"0",sub:"bpm"})}</div>
      <div id="hrSpark" style="height:38px;margin-bottom:6px"></div>
      <div style="display:flex;justify-content:space-around;text-align:center;margin-bottom:10px">
        <div><b style="color:var(--ink-900)" id="mKcal">0</b><div class="muted" style="font-size:.64rem">kkal</div></div>
        <div><b style="color:var(--ink-900)" id="mSteps">0</b><div class="muted" style="font-size:.64rem">langkah</div></div>
        <div><b style="color:var(--ink-900)" id="mZoneTxt">Z1</b><div class="muted" style="font-size:.64rem">zona</div></div>
      </div>
      <hr class="sep">
      <h3 style="font-size:.9rem;margin-bottom:12px">Analisis Gait (AI)</h3>
      <div id="runAi">
        ${gaugeRow("Konsistensi Kadens", 0, "#12c4a6")}
        ${gaugeRow("Simetri L/R", 0, "#3b65f2")}
        ${gaugeRow("Efisiensi Vertikal", 0, "#f59e0b")}
      </div>
      <div class="card" style="background:var(--surface-2);padding:12px;font-size:.78rem;color:var(--ink-600)" id="runTip">💡 Mulai berlari untuk menerima koreksi gait real-time.</div>
    </div>
  </div>`;
}

export function mountRunning() {
  const $ = (id) => document.getElementById(id);
  const st = { km: 3, dist: 0, t: 0, running: false, sprint: 0, timer: null, hr: 92, hrHist: [], cad: 0, steps: 0, kcal: 0, lap: 0 };

  function paceStr(secPerKm) {
    if (!secPerKm || !isFinite(secPerKm)) return "--:--";
    return Math.floor(secPerKm / 60) + ":" + String(Math.round(secPerKm % 60)).padStart(2, "0");
  }
  function timeStr(s) { return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(Math.floor(s % 60)).padStart(2, "0"); }
  const noise = (a) => (Math.random() - 0.5) * a;

  function tick() {
    const dt = 4; // sim seconds per tick
    st.t += dt;
    // speed model: base ~3.0 m/s, sprint boost, slight fatigue
    const base = 3.0 + st.sprint * 1.4 - Math.min(st.t / 600, 0.4);
    const speed = Math.max(2.2, base + noise(0.15)); // m/s
    st.dist += (speed * dt) / 1000; // km
    if (st.dist >= st.km) { st.dist = st.km; finish(); }

    const secPerKm = 1000 / speed;
    st.cad = Math.round(166 + st.sprint * 12 + noise(6));
    const stride = (speed * 60) / st.cad; // m
    const gct = Math.round(250 - st.sprint * 30 + noise(12));
    const vo = (8.4 - st.sprint * 1.1 + noise(0.5));
    st.steps += Math.round((st.cad / 60) * dt);
    // HR rises toward target zone
    const targetHr = 138 + st.sprint * 32 + Math.min(st.t / 20, 22);
    st.hr += (targetHr - st.hr) * 0.25 + noise(2);
    st.hr = Math.max(90, Math.min(190, st.hr));
    st.hrHist.push(st.hr); if (st.hrHist.length > 40) st.hrHist.shift();
    st.kcal += dt * (0.18 + st.sprint * 0.08);
    st.lap = Math.floor(st.dist / 0.4);

    // render
    const pct = (st.dist / st.km) * 100;
    $("runDist").textContent = st.dist.toFixed(2);
    $("runBar").style.width = pct + "%";
    $("runDot").style.left = pct + "%";
    $("runLap").textContent = "Lap " + st.lap;
    $("runPace").textContent = paceStr(secPerKm);
    $("runTime").textContent = timeStr(st.t);
    $("mCad").textContent = st.cad;
    $("mStride").textContent = stride.toFixed(2);
    $("mGct").textContent = gct;
    $("mVo").textContent = vo.toFixed(1);
    $("mKcal").textContent = Math.round(st.kcal);
    $("mSteps").textContent = st.steps.toLocaleString("id-ID");

    const hr = Math.round(st.hr);
    const zone = hr < 120 ? 1 : hr < 140 ? 2 : hr < 160 ? 3 : hr < 175 ? 4 : 5;
    const zoneColor = ["#16a34a", "#12c4a6", "#f59e0b", "#f97316", "#e23b4e"][zone - 1];
    $("hrZone").textContent = hr + " bpm";
    $("hrZone").style.background = hexa(zoneColor, .14); $("hrZone").style.color = zoneColor;
    $("mZoneTxt").textContent = "Z" + zone;
    $("hrRing").innerHTML = donut(Math.round(((hr - 60) / 130) * 100), { size: 130, color: zoneColor, label: String(hr), sub: "bpm" });
    $("hrSpark").innerHTML = sparkline(st.hrHist.length > 1 ? st.hrHist : [hr, hr], zoneColor, 260, 38);

    // AI gait
    const warm = Math.min(st.t / 8, 30);
    const cadCons = Math.round(Math.min(96, 64 + warm + noise(4)));
    const sym = Math.round(Math.min(98, 80 + warm * 0.4 + noise(5)));
    const vert = Math.round(Math.min(94, 70 + (8.4 - vo) * 8 + noise(4)));
    $("runAi").innerHTML = gaugeRow("Konsistensi Kadens", cadCons, "#12c4a6") + gaugeRow("Simetri L/R", sym, "#3b65f2") + gaugeRow("Efisiensi Vertikal", vert, "#f59e0b");

    const tips = [
      vo > 9 ? "⬆️ Oskilasi vertikal tinggi — kurangi pantulan, dorong ke depan." : null,
      st.cad < 165 ? "🦶 Naikkan kadens ke ~175 spm untuk efisiensi lebih baik." : null,
      hr > 172 ? "❤️ HR di zona 5 — turunkan tempo agar tak cepat lelah." : null,
      gct > 260 ? "⏱️ Ground contact lama — perpendek waktu kontak kaki." : null,
    ].filter(Boolean);
    if (tips.length) $("runTip").innerHTML = "💡 " + tips[Math.floor(Math.random() * tips.length)];
  }

  function finish() { stop(); $("runState").className = "pill ok"; $("runState").innerHTML = "🏁 Selesai"; toast("Target tercapai! Sesi lari selesai.", "ok"); }
  function start() {
    if (st.running) return pause();
    if (st.dist >= st.km) reset();
    st.running = true; $("runStart").innerHTML = "⏸ Jeda"; $("runState").className = "pill ok"; $("runState").innerHTML = "● Berlari";
    st.timer = setInterval(tick, 500);
  }
  function pause() { st.running = false; clearInterval(st.timer); $("runStart").innerHTML = "▶ Lanjut"; $("runState").className = "pill warn"; $("runState").innerHTML = "⏸ Jeda"; }
  function stop() { st.running = false; clearInterval(st.timer); $("runStart").innerHTML = "▶ Mulai Lari"; }
  function reset() {
    stop(); Object.assign(st, { dist: 0, t: 0, sprint: 0, hr: 92, hrHist: [], cad: 0, steps: 0, kcal: 0, lap: 0 });
    $("runState").className = "pill warn"; $("runState").innerHTML = "⏸ Siap";
    $("runDist").textContent = "0.00"; $("runBar").style.width = "0%"; $("runDot").style.left = "0%";
    $("runPace").textContent = "--:--"; $("runTime").textContent = "00:00";
    ["mCad","mGct","mSteps","mKcal"].forEach((i)=>$(i).textContent="0"); $("mStride").textContent="0.00"; $("mVo").textContent="0.0";
    $("hrRing").innerHTML = donut(0,{size:130,color:"#e23b4e",label:"0",sub:"bpm"}); $("hrSpark").innerHTML=""; $("hrZone").textContent="— bpm";
    $("runTip").innerHTML = "💡 Mulai berlari untuk menerima koreksi gait real-time.";
  }

  $("runStart").addEventListener("click", start);
  $("runReset").addEventListener("click", reset);
  $("runSprint").addEventListener("click", () => { st.sprint = st.sprint ? 0 : 1; $("runSprint").innerHTML = st.sprint ? "🐢 Normal" : "⚡ Sprint"; });
  $("runSave")?.addEventListener("click", () => toast("Sesi lari disimpan ke riwayat.", "ok"));
  $("distTabs").addEventListener("click", (e) => { const b = e.target.closest("[data-km]"); if (!b) return; st.km = +b.dataset.km; $("distTabs").querySelectorAll("button").forEach((x)=>x.classList.toggle("active",x===b)); $("runTarget").textContent = st.km.toFixed(1); $("runEnd").textContent = st.km + " km"; $("runHalf").textContent = (st.km/2) + " km"; reset(); });

  return () => { clearInterval(st.timer); };
}

/* ============================================================
   2) SMART SUIT — Full-body biomechanics
   ============================================================ */
const EXERCISES = {
  squat: { name: "Back Squat", muscles: ["quad", "glute", "core"], emoji: "🏋️" },
  lunge: { name: "Walking Lunge", muscles: ["glute", "quad", "calf"], emoji: "🦵" },
  jump: { name: "Vertical Jump", muscles: ["calf", "quad", "glute"], emoji: "⬆️" },
  plank: { name: "Plank Hold", muscles: ["core", "shoulder"], emoji: "🧘" },
};

function bodySvg(active = []) {
  const c = (m) => (active.includes(m) ? "#f97316" : "#cdd6ea");
  return `<svg viewBox="0 0 140 240" width="100%" height="260" style="max-width:160px;margin:0 auto;display:block">
    <circle cx="70" cy="26" r="16" fill="none" stroke="${c('head')}" stroke-width="3"/>
    <rect x="56" y="44" width="28" height="56" rx="12" fill="${hexa('#3b65f2',.08)}" stroke="${c('core')}" stroke-width="3"/>
    <line x1="56" y1="52" x2="34" y2="96" stroke="${c('shoulder')}" stroke-width="6" stroke-linecap="round"/>
    <line x1="84" y1="52" x2="106" y2="96" stroke="${c('shoulder')}" stroke-width="6" stroke-linecap="round"/>
    <line x1="34" y1="96" x2="30" y2="138" stroke="#cdd6ea" stroke-width="5" stroke-linecap="round"/>
    <line x1="106" y1="96" x2="110" y2="138" stroke="#cdd6ea" stroke-width="5" stroke-linecap="round"/>
    <line x1="62" y1="100" x2="56" y2="150" stroke="${c('glute')}" stroke-width="8" stroke-linecap="round"/>
    <line x1="78" y1="100" x2="84" y2="150" stroke="${c('glute')}" stroke-width="8" stroke-linecap="round"/>
    <line x1="56" y1="150" x2="52" y2="200" stroke="${c('quad')}" stroke-width="7" stroke-linecap="round"/>
    <line x1="84" y1="150" x2="88" y2="200" stroke="${c('quad')}" stroke-width="7" stroke-linecap="round"/>
    <line x1="52" y1="200" x2="50" y2="228" stroke="${c('calf')}" stroke-width="5" stroke-linecap="round"/>
    <line x1="88" y1="200" x2="90" y2="228" stroke="${c('calf')}" stroke-width="5" stroke-linecap="round"/>
    ${["head:70:26","core:70:72","shoulder:34:96","shoulder:106:96","glute:62:120","glute:78:120","quad:54:175","quad:86:175","calf:51:214","calf:89:214"]
      .map((p)=>{const[m,x,y]=p.split(":");return `<circle cx="${x}" cy="${y}" r="4" fill="${active.includes(m)?'#f97316':'#9099b8'}"/>`}).join("")}
  </svg>`;
}

export function smartSuitView() {
  return `
  ${backBar()}
  ${pageHead("Simulator / Smart Suit", "🦾 Smart Suit — Biomekanika Full-Body", "Motion capture full-body dari 16 titik sensor Smart Suit untuk analisis form latihan.",
    `<button class="btn btn-primary btn-sm" id="suitSave">⊞ Simpan Sesi</button>`)}

  <div class="grid" style="grid-template-columns:300px 1fr 300px;gap:18px">
    <div class="card">
      <div class="card-head"><h3>Pilih Latihan</h3></div>
      <div style="display:grid;gap:8px" id="exList">
        ${Object.entries(EXERCISES).map(([k,e],i)=>`<button class="role-pick ${i===0?"active":""}" data-ex="${k}" style="flex-direction:row;justify-content:flex-start;gap:12px;text-align:left"><span class="e">${e.emoji}</span><span style="font-size:.85rem">${e.name}</span></button>`).join("")}
      </div>
      <div class="card" style="background:var(--surface-2);padding:14px;margin-top:14px">
        <div style="display:flex;justify-content:space-between;align-items:center"><div><b style="font-size:.85rem;color:var(--ink-900)">Smart Suit M-16</b><div class="muted" style="font-size:.7rem">16 IMU · EMG x4</div></div><span class="pill ok">● Sync</span></div>
        <div style="display:flex;justify-content:space-between;font-size:.7rem;margin:10px 0 6px"><span class="muted">Baterai</span><b>91%</b></div>
        <div class="progress"><i style="width:91%"></i></div>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div><h3>Sesi Langsung</h3><span class="sub" id="exName">Back Squat · <b id="repNow">0</b> rep</span></div><span class="pill warn" id="suitState">⏸ Siap</span></div>
      <div style="background:radial-gradient(circle at 50% 25%,#1a2752,#0c1430);border-radius:var(--r-lg);padding:18px;display:grid;grid-template-columns:1fr 1.1fr;gap:10px;align-items:center">
        <div id="bodyBox">${bodySvg(["quad","glute","core"])}</div>
        <div>
          <div style="color:rgba(255,255,255,.6);font-size:.72rem;font-weight:700">FORM SCORE</div>
          <div style="color:#fff;font-size:3rem;font-weight:800;line-height:1" id="formScore">--</div>
          <div style="color:#7ff0d2;font-size:.8rem;margin-bottom:14px" id="formLabel">Mulai untuk menilai</div>
          <div style="display:flex;gap:8px"><div style="flex:1;background:rgba(255,255,255,.08);border-radius:10px;padding:8px;text-align:center"><b style="color:#fff;font-size:1.1rem" id="suitTempo">0.0</b><div style="color:rgba(255,255,255,.5);font-size:.62rem">tempo (s)</div></div><div style="flex:1;background:rgba(255,255,255,.08);border-radius:10px;padding:8px;text-align:center"><b style="color:#fff;font-size:1.1rem" id="suitDepth">0°</b><div style="color:rgba(255,255,255,.5);font-size:.62rem">kedalaman</div></div></div>
        </div>
      </div>
      <div class="grid g-3" style="margin-top:16px;gap:12px">
        ${metricTile('<span id="suitReps">0</span>',"Repetisi","total")}
        ${metricTile('<span id="suitBest">0</span>',"Form terbaik","skor")}
        ${metricTile('<span id="suitCal">0</span>',"Kalori","kkal")}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary btn-block" id="suitRep">⬇ Lakukan Rep</button>
        <button class="btn btn-outline" id="suitAuto">⚡ Auto-Set</button>
        <button class="btn btn-outline" id="suitReset">↺ Reset</button>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><h3>Analisis Biomekanika</h3></div>
      <div id="suitAi">
        ${gaugeRow("Postur Tulang Belakang", 0, "#7b62f7")}
        ${gaugeRow("Simetri Kiri / Kanan", 0, "#3b65f2")}
        ${gaugeRow("Keseimbangan", 0, "#12c4a6")}
        ${gaugeRow("Distribusi Beban Sendi", 0, "#f59e0b")}
      </div>
      <hr class="sep">
      <h3 style="font-size:.9rem;margin-bottom:10px">Aktivasi Otot</h3>
      <div id="muscleLegend" style="font-size:.78rem"></div>
      <div class="card" style="background:var(--surface-2);padding:12px;margin-top:10px;font-size:.78rem;color:var(--ink-600)" id="suitTip">💡 Pilih latihan dan lakukan rep untuk analisis form.</div>
    </div>
  </div>`;
}

export function mountSmartSuit() {
  const $ = (id) => document.getElementById(id);
  const st = { ex: "squat", reps: 0, best: 0, cal: 0, scores: [], auto: null };
  const noise = (a) => (Math.random() - 0.5) * a;

  function muscleLegend(active) {
    const names = { quad: "Quadriceps", glute: "Gluteus", core: "Core", calf: "Calf", shoulder: "Bahu", head: "Leher" };
    $("muscleLegend").innerHTML = active.map((m) => `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="badge-dot" style="background:#f97316"></span><span style="color:var(--ink-600);flex:1">${names[m]||m}</span><b style="color:var(--ink-900)">${Math.round(70+Math.random()*28)}%</b></div>`).join("");
  }

  function setEx(k) {
    st.ex = k;
    const e = EXERCISES[k];
    $("exName").innerHTML = `${e.name} · <b id="repNow">${st.reps}</b> rep`;
    $("bodyBox").innerHTML = bodySvg(e.muscles);
    muscleLegend(e.muscles);
    $("exList").querySelectorAll("[data-ex]").forEach((b) => b.classList.toggle("active", b.dataset.ex === k));
  }

  function rep() {
    st.reps++;
    const form = Math.round(Math.min(99, 72 + Math.min(st.reps, 8) * 1.5 + noise(14)));
    st.scores.push(form);
    st.best = Math.max(st.best, form);
    st.cal += 0.8 + Math.random() * 0.5;
    const tempo = (2.4 + noise(0.8)).toFixed(1);
    const depth = st.ex === "squat" ? Math.round(95 + noise(16)) + "°" : st.ex === "jump" ? Math.round(38 + noise(8)) + "cm" : Math.round(80 + noise(20)) + "°";

    $("repNow").textContent = st.reps; $("suitReps").textContent = st.reps;
    $("suitBest").textContent = st.best; $("suitCal").textContent = Math.round(st.cal);
    $("formScore").textContent = form;
    $("formScore").style.color = form >= 85 ? "#7ff0d2" : form >= 70 ? "#f7b733" : "#ff8a98";
    $("formLabel").textContent = form >= 85 ? "Form sangat baik 👏" : form >= 70 ? "Form cukup baik" : "Perbaiki teknik";
    $("suitTempo").textContent = tempo; $("suitDepth").textContent = depth;
    $("suitState").className = "pill ok"; $("suitState").innerHTML = "● Aktif";

    const warm = Math.min(st.reps * 2, 24);
    $("suitAi").innerHTML =
      gaugeRow("Postur Tulang Belakang", Math.round(Math.min(97, 70 + warm + noise(6))), "#7b62f7") +
      gaugeRow("Simetri Kiri / Kanan", Math.round(Math.min(98, 78 + warm + noise(8))), "#3b65f2") +
      gaugeRow("Keseimbangan", Math.round(Math.min(96, 74 + warm + noise(7))), "#12c4a6") +
      gaugeRow("Distribusi Beban Sendi", Math.round(Math.min(95, 72 + warm + noise(9))), "#f59e0b");

    const tips = {
      squat: ["🦵 Jaga lutut sejajar ujung kaki.", "⬇️ Turunkan pinggul hingga paha sejajar lantai.", "🔙 Pertahankan punggung netral."],
      lunge: ["📏 Langkah cukup panjang, lutut depan 90°.", "⚖️ Jaga keseimbangan, hindari goyang."],
      jump: ["💥 Maksimalkan ekstensi pinggul saat lepas landas.", "🛬 Mendarat lembut, tekuk lutut."],
      plank: ["➖ Tubuh lurus dari kepala ke tumit.", "🔥 Aktifkan core, jangan turunkan pinggul."],
    };
    const t = tips[st.ex]; $("suitTip").innerHTML = "💡 " + t[Math.floor(Math.random() * t.length)];
  }

  function reset() {
    stopAuto(); Object.assign(st, { reps: 0, best: 0, cal: 0, scores: [] });
    $("suitReps").textContent = "0"; $("suitBest").textContent = "0"; $("suitCal").textContent = "0";
    $("repNow").textContent = "0"; $("formScore").textContent = "--"; $("formLabel").textContent = "Mulai untuk menilai";
    $("suitState").className = "pill warn"; $("suitState").innerHTML = "⏸ Siap";
    $("suitAi").innerHTML = gaugeRow("Postur Tulang Belakang",0,"#7b62f7")+gaugeRow("Simetri Kiri / Kanan",0,"#3b65f2")+gaugeRow("Keseimbangan",0,"#12c4a6")+gaugeRow("Distribusi Beban Sendi",0,"#f59e0b");
    $("suitTip").innerHTML = "💡 Pilih latihan dan lakukan rep untuk analisis form.";
  }
  function startAuto() { if (st.auto) return stopAuto(); $("suitAuto").innerHTML = "⏹ Stop"; st.auto = setInterval(rep, 900); }
  function stopAuto() { clearInterval(st.auto); st.auto = null; const b = $("suitAuto"); if (b) b.innerHTML = "⚡ Auto-Set"; }

  $("exList").addEventListener("click", (e) => { const b = e.target.closest("[data-ex]"); if (b) setEx(b.dataset.ex); });
  $("suitRep").addEventListener("click", rep);
  $("suitAuto").addEventListener("click", startAuto);
  $("suitReset").addEventListener("click", reset);
  $("suitSave")?.addEventListener("click", () => toast("Sesi Smart Suit disimpan.", "ok"));
  setEx("squat");
  return () => stopAuto();
}

/* ============================================================
   3) PRECISION PISTOL — 10m air pistol
   ============================================================ */
export function pistolView() {
  return `
  ${backBar()}
  ${pageHead("Simulator / Menembak Presisi", "🎯 Smart Precision Pistol — 10m", "Air pistol presisi dengan analisis hold stability & trigger control.",
    `<button class="btn btn-primary btn-sm" id="pSave">⊞ Simpan Sesi</button>`)}
  <div class="grid" style="grid-template-columns:1fr 320px;gap:18px">
    <div class="card">
      <div class="card-head"><div><h3>Papan Skor Langsung</h3><span class="sub">Tembakan <b id="pShot">0</b>/<span id="pMax">20</span></span></div><span class="pill warn" id="pState">⏸ Siap</span></div>
      <div style="background:radial-gradient(circle at 50% 40%,#1a2752,#0c1430);border-radius:var(--r-lg);padding:18px;display:grid;place-items:center" id="pTarget">${archeryTarget([],240)}</div>
      <div class="grid g-4" style="margin-top:16px;gap:12px">
        ${metricTile('<span id="pScore">0</span>',"Skor","")}
        ${metricTile('<span id="pAvg">0.0</span>',"Rata/tembak","")}
        ${metricTile('<span id="pGroup">—</span>',"Grouping","mm")}
        ${metricTile('<span id="pInner">0</span>',"Inner 10","")}
      </div>
      <div style="display:flex;gap:10px;margin-top:16px">
        <button class="btn btn-primary btn-block" id="pShoot">🔫 Tembak</button>
        <button class="btn btn-outline" id="pAuto">⚡ Auto</button>
        <button class="btn btn-outline" id="pReset">↺ Reset</button>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Analisis AI</h3><span class="pill info" id="pAcc">0%</span></div>
      <div style="display:flex;justify-content:center;margin:6px 0 14px" id="pRing">${donut(0,{size:140,color:"#e23b4e",label:"0",sub:"dari 200"})}</div>
      <div id="pAi">
        ${gaugeRow("Stabilitas Hold", 0, "#3b65f2")}
        ${gaugeRow("Trigger Control", 0, "#12c4a6")}
        ${gaugeRow("Follow Through", 0, "#f59e0b")}
      </div>
      <div class="card" style="background:var(--surface-2);padding:12px;font-size:.78rem;color:var(--ink-600)" id="pTip">💡 Mulai untuk umpan balik real-time.</div>
    </div>
  </div>`;
}

export function mountPistol() {
  const $ = (id) => document.getElementById(id);
  const st = { max: 20, shots: 0, score: 0, inner: 0, hits: [], auto: null };
  const g = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  function grouping() {
    if (st.hits.length < 2) return 0;
    const cx = st.hits.reduce((a, h) => a + h.x, 0) / st.hits.length, cy = st.hits.reduce((a, h) => a + h.y, 0) / st.hits.length;
    return Math.max(...st.hits.map((h) => Math.hypot(h.x - cx, h.y - cy))) * 155;
  }
  function shoot() {
    if (st.shots >= st.max) { toast("Sesi selesai.", "ok"); return stopAuto(); }
    const skill = 0.3 - Math.min(st.shots, 16) * 0.007;
    const ang = Math.random() * Math.PI * 2, rad = Math.abs(g()) * skill;
    const x = Math.cos(ang) * rad, y = Math.sin(ang) * rad;
    const d = Math.hypot(x, y);
    const score = d < 0.06 ? 10 : d < 0.14 ? 9 : d < 0.24 ? 8 : d < 0.36 ? 7 : d < 0.5 ? 6 : 5;
    if (d < 0.06) st.inner++;
    st.hits.push({ x, y, score }); st.shots++; st.score += score;
    const max = st.max * 10;
    $("pShot").textContent = st.shots; $("pScore").textContent = st.score;
    $("pAvg").textContent = (st.score / st.shots).toFixed(1); $("pInner").textContent = st.inner;
    $("pGroup").textContent = grouping().toFixed(0);
    $("pTarget").innerHTML = archeryTarget(st.hits, 240);
    const acc = Math.round((st.score / (st.shots * 10)) * 100);
    $("pAcc").textContent = acc + "%";
    $("pRing").innerHTML = donut(Math.round((st.score / max) * 100), { size: 140, color: "#e23b4e", label: String(st.score), sub: "dari " + max });
    const warm = Math.min(st.shots * 2, 26);
    $("pAi").innerHTML = gaugeRow("Stabilitas Hold", Math.round(Math.min(96,66+warm+g()*6)), "#3b65f2") + gaugeRow("Trigger Control", Math.round(Math.min(94,70+warm+g()*6)), "#12c4a6") + gaugeRow("Follow Through", Math.round(Math.min(92,68+warm+g()*6)), "#f59e0b");
    const tips = { 10: "🎯 X-ring! Trigger control sempurna.", 9: "👍 Hold stabil, pertahankan.", 8: "⚠️ Sedikit antisipasi recoil — rilekskan grip.", 7: "🫁 Tahan napas saat squeeze trigger.", 6: "🤚 Hold goyang — perkuat postur bahu.", 5: "🧘 Reset, fokus pada front sight." };
    $("pTip").innerHTML = "💡 " + (tips[score] || tips[8]);
    $("pState").className = "pill ok"; $("pState").innerHTML = "● Aktif";
  }
  function reset() { stopAuto(); Object.assign(st, { shots: 0, score: 0, inner: 0, hits: [] }); $("pShot").textContent="0";$("pScore").textContent="0";$("pAvg").textContent="0.0";$("pInner").textContent="0";$("pGroup").textContent="—"; $("pTarget").innerHTML=archeryTarget([],240); $("pRing").innerHTML=donut(0,{size:140,color:"#e23b4e",label:"0",sub:"dari 200"}); $("pState").className="pill warn";$("pState").innerHTML="⏸ Siap"; $("pTip").innerHTML="💡 Mulai untuk umpan balik real-time."; }
  function startAuto() { if (st.auto) return stopAuto(); $("pAuto").innerHTML="⏹ Stop"; st.auto=setInterval(shoot,600); }
  function stopAuto() { clearInterval(st.auto); st.auto=null; const b=$("pAuto"); if(b)b.innerHTML="⚡ Auto"; }
  $("pShoot").addEventListener("click", shoot); $("pAuto").addEventListener("click", startAuto); $("pReset").addEventListener("click", reset);
  $("pSave")?.addEventListener("click", () => toast("Sesi pistol disimpan.", "ok"));
  return () => stopAuto();
}
