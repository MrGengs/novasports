/* ============================================================
   NovaSport — shared view components (HTML string builders)
   ============================================================ */
import { initials } from "../demo-data.js";
import { resolveIcon, icon } from "../icons.js";

export function pageHead(crumb, title, sub, actions = "") {
  return `<div class="page-head">
    <div>
      <div class="crumb">${crumb}</div>
      <h1>${title}</h1>
      ${sub ? `<p>${sub}</p>` : ""}
    </div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ""}
  </div>`;
}

export function kpiCard(k) {
  const dir = k.dir || "flat";
  const arrow = dir === "up" ? "↑" : dir === "down" ? "↓" : "→";
  return `<div class="card hover stat">
    <div class="stat-top">
      <div class="stat-ic" style="background:${hexA(k.color, .12)};color:${k.color}">${resolveIcon(k.icon, 24)}</div>
      <span class="delta ${dir}">${arrow} ${k.delta || ""}</span>
    </div>
    <div>
      <div class="stat-val">${k.value}${k.suffix ? `<span style="font-size:1rem;color:var(--ink-400);font-weight:700">${k.suffix}</span>` : ""}</div>
      <div class="stat-label">${k.label}</div>
    </div>
  </div>`;
}

export function kpiRow(kpis) {
  return `<div class="grid g-4">${kpis.map(kpiCard).join("")}</div>`;
}

export function welcomeBanner(name, msg, actions = "") {
  const hour = 12; // demo greeting
  const greet = hour < 11 ? "Selamat pagi" : hour < 15 ? "Selamat siang" : "Selamat sore";
  return `<div class="welcome">
    <div class="hero-grid"></div>
    <div>
      <h2>${greet}, ${name.split(" ")[0]} 👋</h2>
      <p>${msg}</p>
    </div>
    ${actions ? `<div class="w-actions">${actions}</div>` : ""}
  </div>`;
}

export function avatar(name, cls = "") {
  return `<div class="avatar ${cls}">${initials(name)}</div>`;
}

export function userCell(name, sub) {
  return `<div class="u">${avatar(name, "sm")}<div><b style="display:block;color:var(--ink-900);font-size:.85rem">${name}</b>${sub ? `<span style="font-size:.72rem;color:var(--ink-400)">${sub}</span>` : ""}</div></div>`;
}

export function statusPill(status, labelMap = {}) {
  const map = { ok: "Baik", warn: "Pemantauan", danger: "Perlu Tindak", info: "Terjadwal", online: "Online", offline: "Offline", kalibrasi: "Kalibrasi", ...labelMap };
  const cls = status === "online" ? "ok" : status === "offline" ? "danger" : status === "kalibrasi" ? "warn" : status;
  return `<span class="pill ${cls}">${map[status] || status}</span>`;
}

/** Convert hex + alpha to rgba string. */
export function hexA(hex, a) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function emptyState(icon, title, sub) {
  return `<div class="card center" style="padding:48px 24px">
    <div style="font-size:2.4rem;margin-bottom:10px">${icon}</div>
    <h3 style="color:var(--ink-800);margin-bottom:6px">${title}</h3>
    <p class="muted" style="font-size:.85rem">${sub}</p>
  </div>`;
}

export function legendItem(color, label, value) {
  return `<div style="display:flex;align-items:center;gap:8px;font-size:.82rem;margin-bottom:8px">
    <span class="badge-dot" style="background:${color}"></span>
    <span style="color:var(--ink-600);flex:1">${label}</span>
    <b style="color:var(--ink-900)">${value}</b>
  </div>`;
}

export function leaderboardCard(rows) {
  return `<div class="card">
    <div class="card-head"><h3 style="display:flex;align-items:center;gap:8px">${icon("trophy", { size: 18 })} NovaSport League</h3><a class="card-link" href="#/leaderboard">Lihat semua</a></div>
    <div class="list">
      ${rows.map((r) => `<div class="list-row" ${r.you ? 'style="background:var(--brand-50)"' : ""}>
        <div style="width:26px;text-align:center;font-weight:800;color:${r.rank <= 3 ? "var(--gold-500)" : "var(--ink-400)"}">${r.rank}</div>
        ${avatar(r.name, "sm")}
        <div class="lr-main"><b>${r.name} ${r.you ? '<span class="pill info" style="margin-left:4px">Kamu</span>' : ""}</b><span>${r.club}</span></div>
        <div class="lr-side">${r.score.toLocaleString("id-ID")} pts</div>
      </div>`).join("")}
    </div>
  </div>`;
}
