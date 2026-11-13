/* ============================================================
   NovaSport — Extra athlete features:
   Perangkat Saya (wearables), AI Coach, Kesiapan (recovery)
   ============================================================ */
import { donut, areaChart, sparkline, gaugeRow } from "../charts.js";
import { pageHead } from "./components.js";
import { toast } from "../ui.js";

/* ---------- Perangkat Saya (wearables / IoT) ---------- */
const DEVICES = [
  { name: "Smart Arrow Bow", id: "SAB-0143", icon: "🏹", type: "Panahan", status: "online", battery: 82, fw: "v2.4.1", hz: "200 Hz" },
  { name: "IMU Wearable Band", id: "IMU-0027", icon: "⌚", type: "Lari / Gait", status: "online", battery: 76, fw: "v1.8.0", hz: "100 Hz" },
  { name: "Smart Suit M-16", id: "SUIT-0009", icon: "🦾", type: "Full-body", status: "online", battery: 91, fw: "v3.1.2", hz: "16×IMU" },
  { name: "Smart Precision Pistol", id: "SPP-0011", icon: "🎯", type: "Menembak", status: "kalibrasi", battery: 54, fw: "v1.2.0", hz: "200 Hz" },
  { name: "HR Chest Strap", id: "HR-0044", icon: "❤️", type: "Heart Rate", status: "offline", battery: 0, fw: "v1.0.3", hz: "1 Hz" },
];

export function wearablesView() {
  const pill = (s) => s === "online" ? '<span class="pill ok">● Online</span>' : s === "kalibrasi" ? '<span class="pill warn">● Kalibrasi</span>' : '<span class="pill danger">● Offline</span>';
  return `
  ${pageHead("Perangkat / Wearables", "Perangkat Saya", "Kelola Smart-Enabled Equipment & wearable yang terhubung ke akunmu.",
    `<a href="#/pembacaan" class="btn btn-outline btn-sm">📈 Pembacaan Live</a>
     <button class="btn btn-primary btn-sm" id="pairBtn">+ Hubungkan Perangkat</button>`)}
  <div class="grid g-4" style="margin-bottom:18px">
    <div class="card stat"><div class="stat-val">5</div><div class="stat-label">Perangkat terdaftar</div></div>
    <div class="card stat"><div class="stat-val" style="color:var(--ok-500)">3</div><div class="stat-label">Online</div></div>
    <div class="card stat"><div class="stat-val" style="color:var(--warn-500)">1</div><div class="stat-label">Perlu kalibrasi</div></div>
    <div class="card stat"><div class="stat-val">200<span style="font-size:1rem;color:var(--ink-400)">Hz</span></div><div class="stat-label">Sampling tertinggi</div></div>
  </div>
  <div class="grid g-2">
    ${DEVICES.map((d) => `<div class="card hover">
      <div style="display:flex;gap:14px;align-items:flex-start">
        <div class="stat-ic" style="width:52px;height:52px;font-size:1.5rem;background:var(--surface-2)">${d.icon}</div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
            <b style="color:var(--ink-900)">${d.name}</b>${pill(d.status)}
          </div>
          <div class="muted" style="font-size:.74rem;margin:2px 0 10px">${d.type} · ${d.id} · ${d.fw} · ${d.hz}</div>
          <div style="display:flex;justify-content:space-between;font-size:.7rem;margin-bottom:5px"><span class="muted">Baterai</span><b>${d.status==="offline"?"—":d.battery+"%"}</b></div>
          <div class="progress ${d.battery>50?"teal":d.battery>20?"gold":""}"><i style="width:${d.battery}%;${d.battery<=20&&d.battery>0?"background:var(--danger-500)":""}"></i></div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <a href="#/pembacaan" class="btn btn-primary btn-sm" ${d.status==="offline"?'style="pointer-events:none;opacity:.5"':""}>📈 Baca Live</a>
            <button class="btn btn-outline btn-sm dev-cal">${d.status==="kalibrasi"?"Lanjut Kalibrasi":"Kalibrasi"}</button>
          </div>
        </div>
      </div>
    </div>`).join("")}
  </div>`;
}

export function mountWearables() {
  // Pairing sesungguhnya dilakukan di halaman Pembacaan Sensor (Web Bluetooth).
  document.getElementById("pairBtn")?.addEventListener("click", () => {
    toast("Membuka pembacaan live — pairing perangkat di sana.", "");
    location.hash = "#/pembacaan";
  });
  document.querySelectorAll(".dev-cal").forEach((b) => b.addEventListener("click", () => toast("Kalibrasi sensor dimulai...", "ok")));
}

/* ---------- AI Coach ---------- */
export function aiCoachView() {
  const plan = [
    { t: "06:00", n: "Lari Endurance 5K Zona 2", d: "Jaga HR < 145 bpm, kadens ~175 spm", icon: "🏃", done: true },
    { t: "16:00", n: "Sesi Panahan — Anchor Drill", d: "Fokus konsistensi anchor, 30 anak panah", icon: "🏹", done: false },
    { t: "19:30", n: "Mobilitas + Pernapasan", d: "10 menit box breathing sebelum tidur", icon: "🧘", done: false },
  ];
  return `
  ${pageHead("AI / Pelatih Virtual", "AI Coach", "Rekomendasi latihan harian berbasis performa, kesiapan, dan gizimu.")}
  <div class="grid g-3">
    <div class="card col-span-2" style="background:var(--grad-hero);color:#fff;position:relative;overflow:hidden">
      <div class="hero-grid"></div>
      <div style="position:relative">
        <div class="chip chip-glass" style="margin-bottom:12px">🧠 INSIGHT HARI INI</div>
        <h2 style="font-size:1.3rem;margin-bottom:8px">Kesiapanmu 82% — hari yang baik untuk latihan kualitas.</h2>
        <p style="opacity:.85;font-size:.88rem;max-width:560px">HRV membaik dan tidurmu cukup. AI menyarankan sesi anchor drill intensitas sedang sore ini, lalu pemulihan aktif. Hindari beban berat pada bahu kanan — terdeteksi sedikit asimetri kemarin.</p>
        <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap">
          <a href="#/sim/archery" class="btn btn-light btn-sm">Mulai Sesi Disarankan</a>
          <button class="btn btn-ghost btn-sm" id="askAi">Tanya AI Coach</button>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Skor Kesiapan</h3></div>
      <div style="display:flex;justify-content:center;margin:6px 0 10px">${donut(82,{size:140,color:"#12c4a6",sub:"Readiness"})}</div>
      <div style="font-size:.78rem" id="readyBreak">
        ${gaugeRow("Pemulihan (HRV)", 84, "#12c4a6")}
        ${gaugeRow("Kualitas Tidur", 78, "#3b65f2")}
        ${gaugeRow("Beban Latihan", 71, "#f59e0b")}
      </div>
    </div>
  </div>

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Rencana Latihan Hari Ini</h3><span class="pill info">Disesuaikan AI</span></div>
      <div class="list">
        ${plan.map((p) => `<div class="list-row">
          <input type="checkbox" ${p.done ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--brand-500)">
          <div class="stat-ic" style="width:40px;height:40px;background:var(--surface-2);font-size:1.1rem">${p.icon}</div>
          <div class="lr-main"><b style="${p.done?"color:var(--ink-400)":""}">${p.n}</b><span>${p.d}</span></div>
          <span class="pill ${p.done?"ok":"muted"}">${p.t}</span>
        </div>`).join("")}
      </div>
    </div>
    <div class="card" style="display:flex;flex-direction:column">
      <div class="card-head"><h3>💬 Tanya Coach</h3></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px;min-height:200px" id="aiChat">
        <div style="align-self:flex-start;max-width:85%;background:var(--surface-2);padding:10px 13px;border-radius:14px 14px 14px 4px;font-size:.82rem">Halo Aulia! Ada yang ingin kamu tanyakan soal latihan hari ini? 👋</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:10px"><input class="input" id="aiInput" placeholder="cth: kenapa pace saya lambat?"><button class="btn btn-primary" id="aiSend">➤</button></div>
    </div>
  </div>`;
}

export function mountAiCoach() {
  const chat = document.getElementById("aiChat");
  const input = document.getElementById("aiInput");
  const replies = [
    "Berdasarkan data IMU-mu, kadens turun ke 162 spm di km terakhir — coba naikkan ke ~175 untuk efisiensi lebih baik.",
    "Asimetri L/R-mu 8% kemarin. Tambahkan single-leg drill agar lebih seimbang.",
    "HRV-mu naik 6ms — pemulihan bagus. Aman untuk sesi tempo hari ini.",
    "Stabilitas anchor-mu meningkat 12% bulan ini. Pertahankan ritme pernapasan 4-detik.",
    "Asupan protein pasca latihan masih kurang. Target 1.4 g/kg untuk pemulihan optimal.",
  ];
  let i = 0;
  function send() {
    const v = input.value.trim(); if (!v) return;
    const me = document.createElement("div");
    me.style.cssText = "align-self:flex-end;max-width:85%;background:var(--grad-brand);color:#fff;padding:10px 13px;border-radius:14px 14px 4px 14px;font-size:.82rem";
    me.textContent = v; chat.appendChild(me); input.value = "";
    chat.scrollTop = chat.scrollHeight;
    setTimeout(() => {
      const ai = document.createElement("div");
      ai.style.cssText = "align-self:flex-start;max-width:85%;background:var(--surface-2);padding:10px 13px;border-radius:14px 14px 14px 4px;font-size:.82rem";
      ai.textContent = "🧠 " + replies[i++ % replies.length]; chat.appendChild(ai);
      chat.scrollTop = chat.scrollHeight;
    }, 600);
  }
  document.getElementById("aiSend")?.addEventListener("click", send);
  input?.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
  document.getElementById("askAi")?.addEventListener("click", () => { input?.focus(); });
}

/* ---------- Kesiapan / Recovery ---------- */
export function readinessView() {
  return `
  ${pageHead("Kesehatan / Kesiapan", "Kesiapan & Pemulihan", "Pantau HRV, tidur, dan beban latihan untuk mencegah overtraining.")}
  <div class="grid g-4">
    <div class="card stat"><div class="stat-ic" style="background:#e2f8f3;color:var(--accent-600)">💚</div><div class="stat-val">82<span style="font-size:1rem;color:var(--ink-400)">/100</span></div><div class="stat-label">Skor kesiapan</div></div>
    <div class="card stat"><div class="stat-val">64<span style="font-size:1rem;color:var(--ink-400)">ms</span></div><div class="stat-label">HRV (rMSSD)</div></div>
    <div class="card stat"><div class="stat-val">7.4<span style="font-size:1rem;color:var(--ink-400)">jam</span></div><div class="stat-label">Tidur semalam</div></div>
    <div class="card stat"><div class="stat-val">48<span style="font-size:1rem;color:var(--ink-400)">bpm</span></div><div class="stat-label">Resting HR</div></div>
  </div>
  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><div><h3>Tren HRV (14 hari)</h3><span class="sub">Semakin tinggi & stabil, semakin baik pemulihan</span></div></div>
      ${areaChart([52,58,55,61,60,57,63,66,62,68,64,70,67,72], { h: 190, color: "#12c4a6" })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Beban Latihan</h3></div>
      <div style="display:flex;justify-content:center;margin:6px 0 12px">${donut(71,{size:140,color:"#f59e0b",label:"Optimal",fs:16,sub:"ACWR 1.1"})}</div>
      <p class="muted center" style="font-size:.78rem">Rasio beban akut:kronis 1.1 — zona aman. Hindari lonjakan beban mendadak.</p>
    </div>
  </div>
  <div class="grid g-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><h3>Komposisi Tidur Semalam</h3></div>
      ${gaugeRow("Tidur Dalam (Deep)", 24, "#1d306e")}
      ${gaugeRow("Tidur REM", 21, "#7b62f7")}
      ${gaugeRow("Tidur Ringan", 48, "#3b65f2")}
      ${gaugeRow("Terjaga", 7, "#e23b4e")}
    </div>
    <div class="card">
      <div class="card-head"><h3>Rekomendasi Pemulihan</h3></div>
      <div class="list">
        ${[["💧","Hidrasi","Minum 500ml setelah bangun tidur"],["🧘","Mobilitas bahu","Fokus area asimetri kanan"],["🥗","Protein pemulihan","1.4 g/kg dalam 2 jam pasca latihan"],["😴","Target tidur","8 jam malam ini untuk pulihkan HRV"]]
          .map(([i,t,d])=>`<div class="list-row"><div class="stat-ic" style="width:38px;height:38px;background:var(--surface-2)">${i}</div><div class="lr-main"><b>${t}</b><span>${d}</span></div></div>`).join("")}
      </div>
    </div>
  </div>`;
}
