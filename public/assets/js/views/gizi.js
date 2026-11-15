/* ============================================================
   NovaSport — Ahli Gizi (nutritionist) views
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { areaChart, donutMulti } from "../charts.js";
import { pageHead, kpiRow, userCell, statusPill, legendItem } from "./components.js";
import { toast } from "../ui.js";

const N = DEMO.gizi;

export function giziDashboard(user) {
  return `
  ${pageHead("Beranda / Dashboard Gizi", `Selamat datang, ${user.name} 🥗`, "Status gizi 248 peserta didik · 3 sekolah ampuan · 12 kasus perlu tindak lanjut.",
    `<button class="btn btn-outline btn-sm">⭳ Ekspor CSV</button><button class="btn btn-primary btn-sm" id="inputCheck">+ Input Pemeriksaan</button>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">PEMANTAUAN GIZI · NOVASPORT</div>
      <h2>248 peserta didik dalam pemantauan</h2>
      <p>12 kasus perlu tindak lanjut minggu ini — prioritaskan siswa atlet binaan.</p>
    </div>
  </div>

  ${kpiRow(N.kpis)}

  <div class="grid g-3" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><h3>Status Gizi Populasi</h3><select class="input" style="width:auto;padding:6px 28px 6px 12px;font-size:.78rem"><option>Semua Sekolah</option></select></div>
      <div style="display:flex;justify-content:center;margin:8px 0 16px">
        ${donutMulti(N.distribution, { center: "248", centerSub: "peserta" })}
      </div>
      ${N.distribution.map((d) => legendItem(d.color, d.label, `${Math.round(d.value/2.48)}%`)).join("")}
    </div>
    <div class="card col-span-2">
      <div class="card-head"><div><h3>Tren Z-score Populasi · 8 Bulan</h3><span class="sub">Median Z-score (BB/U) — semakin dekat 0, semakin ideal</span></div></div>
      ${areaChart(N.zscoreTrend.map((v)=>v+2), { h: 200, color: "#0ea98e" })}
      <p class="muted" style="font-size:.78rem;margin-top:8px">Median Z-score membaik dari -0.9 menjadi -0.46 sejak program nutrisi terintegrasi.</p>
    </div>
  </div>

  <div class="card" style="margin-top:18px">
    <div class="card-head"><h3>Antrian Tindak Lanjut</h3><a class="card-link" href="#/peserta">Lihat semua</a></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Peserta Didik</th><th>Kelas</th><th>Catatan</th><th>Z-score</th><th>Status</th><th></th></tr></thead>
      <tbody>${N.queue.map((q) => `<tr>
        <td>${userCell(q.name)}</td><td>${q.cls}</td><td>${q.flag}</td>
        <td><b style="color:${q.z<-1.5?"var(--danger-500)":q.z<-0.8?"var(--warn-500)":"var(--ink-900)"}">${q.z}</b></td>
        <td>${statusPill(q.status)}</td>
        <td><button class="btn btn-outline btn-sm">Tindak Lanjut</button></td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function mountGizi() {
  document.getElementById("inputCheck")?.addEventListener("click", () =>
    toast("Form input pemeriksaan dibuka.", "ok"));
}

export function giziPeserta() {
  const rows = [...N.queue, { name: "Aulia Putri R.", cls: "SMP-7B", flag: "Gizi baik", z: -0.4, status: "ok" },
    { name: "Fariz Putra R.", cls: "SD-5A", flag: "Pemantauan", z: -0.8, status: "warn" }];
  return `
  ${pageHead("Pemantauan / Peserta Didik", "Peserta Didik", "Data gizi seluruh peserta didik ampuan.",
    `<button class="btn btn-primary btn-sm">+ Tambah Peserta</button>`)}
  <div class="card">
    <div class="card-head"><h3>Daftar Peserta (248)</h3>
      <div class="searchbar" style="max-width:240px"><span class="si">🔍</span><input placeholder="Cari nama..."></div></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Nama</th><th>Kelas</th><th>Catatan</th><th>Z-score</th><th>Status</th><th></th></tr></thead>
      <tbody>${rows.map((q) => `<tr><td>${userCell(q.name)}</td><td>${q.cls}</td><td>${q.flag}</td>
        <td><b>${q.z}</b></td><td>${statusPill(q.status)}</td><td><button class="btn btn-outline btn-sm">Detail</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function giziPemeriksaan() {
  return `
  ${pageHead("Input / Pemeriksaan", "Input Pemeriksaan Gizi", "Catat hasil pengukuran antropometri peserta didik.")}
  <div class="grid g-2">
    <div class="card">
      <div class="card-head"><h3>Form Pemeriksaan</h3></div>
      <div class="field"><label>Peserta Didik</label><select class="input"><option>Pilih peserta...</option><option>Raka Saputra (SMP-8B)</option><option>Sinta Lestari (SD-5A)</option></select></div>
      <div class="field-row">
        <div class="field"><label>Tinggi (cm)</label><input class="input" type="number" placeholder="162"></div>
        <div class="field"><label>Berat (kg)</label><input class="input" type="number" placeholder="51"></div>
      </div>
      <div class="field-row">
        <div class="field"><label>Lingkar Lengan (cm)</label><input class="input" type="number" placeholder="24"></div>
        <div class="field"><label>Tanggal</label><input class="input" type="date" value="2026-06-05"></div>
      </div>
      <div class="field"><label>Catatan</label><textarea class="input" rows="3" placeholder="Observasi & rekomendasi..."></textarea></div>
      <button class="btn btn-primary btn-block" onclick="window.__nsToast&&window.__nsToast('Pemeriksaan tersimpan.','ok')">Simpan Pemeriksaan</button>
    </div>
    <div class="card">
      <div class="card-head"><h3>Pratinjau Z-score</h3></div>
      <div style="display:grid;gap:14px">
        <div class="card" style="background:var(--surface-2);padding:16px"><div style="display:flex;justify-content:space-between"><span class="muted">BB/U (Berat per Umur)</span><b style="color:var(--ok-500)">-0.4 · Normal</b></div></div>
        <div class="card" style="background:var(--surface-2);padding:16px"><div style="display:flex;justify-content:space-between"><span class="muted">TB/U (Tinggi per Umur)</span><b style="color:var(--warn-500)">-1.2 · Pantau</b></div></div>
        <div class="card" style="background:var(--surface-2);padding:16px"><div style="display:flex;justify-content:space-between"><span class="muted">IMT/U</span><b style="color:var(--ok-500)">+0.1 · Normal</b></div></div>
      </div>
      <p class="muted" style="font-size:.78rem;margin-top:14px">Z-score dihitung otomatis berdasarkan standar WHO Child Growth Standards.</p>
    </div>
  </div>`;
}

export function giziProgram() {
  return `
  ${pageHead("Program / Gizi", "Program Gizi", "Rancang dan pantau intervensi nutrisi.",
    `<button class="btn btn-primary btn-sm">+ Program Baru</button>`)}
  <div class="grid g-3">
    ${[["🍗","Protein Boost Atlet","Untuk siswa pemantauan BB/U","32 peserta",68],
       ["🥦","Mikronutrien Harian","Suplementasi sayur & buah","248 peserta",91],
       ["💧","Hidrasi Latihan","Protokol cairan saat latihan","142 atlet",84]]
      .map(([i,t,d,p,pct])=>`<div class="card hover">
        <div class="stat-ic" style="background:#e2f8f3;color:var(--accent-600);margin-bottom:12px">${i}</div>
        <h3 style="font-size:.92rem;color:var(--ink-900)">${t}</h3>
        <p class="muted" style="font-size:.78rem;margin:4px 0 6px">${d}</p>
        <p style="font-size:.74rem;color:var(--brand-600);font-weight:700;margin-bottom:10px">${p}</p>
        <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:6px"><span class="muted">Kepatuhan</span><b>${pct}%</b></div>
        <div class="progress teal"><i style="width:${pct}%"></i></div>
      </div>`).join("")}
  </div>`;
}

export function giziAnalitik() {
  return `
  ${pageHead("Analitik / Gizi", "Analitik Gizi", "Insight populasi dan korelasi gizi-performa.")}
  <div class="grid g-2">
    <div class="card">
      <div class="card-head"><h3>Korelasi Gizi & Performa</h3></div>
      ${areaChart([6.8,7.0,7.3,7.6,7.9,8.1,8.3,8.4], { h: 180, color: "#3b65f2" })}
      <p class="muted" style="font-size:.78rem;margin-top:8px">Peningkatan status gizi berkorelasi positif dengan rata-rata performa atlet (+0.3/bulan).</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Distribusi per Sekolah</h3></div>
      ${["SKO Ragunan|92","SMP Negeri 2|81","Klub Panah Solo|74"].map((s)=>{const[n,p]=s.split("|");return `<div style="margin-bottom:16px"><div style="display:flex;justify-content:space-between;font-size:.82rem;margin-bottom:6px"><span>${n}</span><b>${p}% gizi baik</b></div><div class="progress teal"><i style="width:${p}%"></i></div></div>`;}).join("")}
    </div>
  </div>`;
}
