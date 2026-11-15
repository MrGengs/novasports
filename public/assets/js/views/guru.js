/* ============================================================
   NovaSport — Guru / Pelatih views
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { areaChart, sparkline, barChart, donutMulti } from "../charts.js";
import { pageHead, kpiRow, userCell, statusPill, legendItem } from "./components.js";

const G = DEMO.guru;

export function guruDashboard(user) {
  return `
  ${pageHead("Beranda / Dashboard", `Selamat datang, ${user.name.split(" ")[1] || user.name} 📋`, "3 kelas berjalan · 14 sesi terjadwal pekan ini · 8 tugas perlu dinilai.",
    `<button class="btn btn-outline btn-sm">📅 Pekan Ini</button><a href="#/program" class="btn btn-primary btn-sm">+ Buat Program Latihan</a>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">PROGRAM PEMBINAAN · PANAHAN</div>
      <h2>3 kelas panahan aktif pekan ini</h2>
      <p>14 sesi terjadwal dan 8 tugas menunggu penilaian — mulai dari yang paling mendesak.</p>
    </div>
    <div class="w-actions"><a href="#/penilaian" class="btn btn-light btn-sm">Nilai Tugas</a></div>
  </div>

  ${kpiRow(G.kpis)}

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Siswa Perlu Perhatian</h3><a class="card-link" href="#/kelas-siswa">Lihat 7 →</a></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Siswa</th><th>Kelas</th><th>Tren (5 sesi)</th><th>Performa</th><th>Gizi</th><th></th></tr></thead>
        <tbody>${G.attention.map((s) => `<tr>
          <td>${userCell(s.name, "")}</td>
          <td>${s.cls}</td>
          <td>${sparkline(s.trend, s.perf < 7 ? "#e23b4e" : "#f59e0b")}</td>
          <td><b style="color:var(--ink-900)">${s.perf}</b><span class="muted">/10</span></td>
          <td><span class="pill ${s.gizi === "Baik" ? "ok" : "warn"}">${s.gizi}</span></td>
          <td><button class="btn btn-outline btn-sm">Buka</button></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Sesi Hari Ini</h3></div>
      <div class="list">
        ${[["14:00","Recurve 18m Indoor","SMP-7A · 12 siswa","ok"],["15:30","Anchor Drill","SMP-8B · 18 siswa","info"],["17:00","Recurve Pro","SMA-10A · 10 siswa","muted"]]
          .map(([t,n,w,st])=>`<div class="list-row">
            <div style="font-weight:800;color:var(--brand-600);width:46px">${t}</div>
            <div class="lr-main"><b>${n}</b><span>${w}</span></div>
            <span class="pill ${st}">${st==="ok"?"Aktif":st==="info"?"Berikutnya":"14:00"}</span>
          </div>`).join("")}
      </div>
    </div>
  </div>

  <div class="grid g-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><h3>Rata-rata Performa Kelas</h3><span class="sub">12 minggu</span></div>
      ${areaChart(DEMO.performanceTrend, { h: 170, color: "#12c4a6" })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Kelas Saya</h3><a class="card-link" href="#/kelas-siswa">Kelola</a></div>
      ${G.classes.map((c) => `<div style="margin-bottom:16px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <div><b style="font-size:.85rem;color:var(--ink-900)">${c.name}</b><span class="muted" style="font-size:.72rem;margin-left:6px">${c.students} siswa</span></div>
          <span class="muted" style="font-size:.72rem">${c.progress}% · ${c.next}</span>
        </div>
        <div class="progress"><i style="width:${c.progress}%"></i></div>
      </div>`).join("")}
    </div>
  </div>`;
}

export function guruKelasSiswa() {
  return `
  ${pageHead("Manajemen / Kelas & Siswa", "Kelas & Siswa", "Kelola seluruh siswa binaan dan performanya.",
    `<button class="btn btn-outline btn-sm">⭳ Ekspor</button><button class="btn btn-primary btn-sm">+ Tambah Siswa</button>`)}
  <div class="card">
    <div class="card-head"><h3>Daftar Siswa (48)</h3>
      <div class="searchbar" style="max-width:260px"><span class="si">🔍</span><input placeholder="Cari siswa..."></div></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Siswa</th><th>Kelas</th><th>Performa</th><th>Akurasi</th><th>Status</th><th></th></tr></thead>
      <tbody>${G.roster.map((s) => `<tr>
        <td>${userCell(s.name, "Recurve")}</td><td>${s.cls}</td>
        <td><b style="color:var(--ink-900)">${s.perf}</b>/10</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:70px"><i style="width:${s.acc}%"></i></div>${s.acc}%</div></td>
        <td>${statusPill(s.status)}</td>
        <td><button class="btn btn-outline btn-sm">Rapor</button></td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function guruProgram() {
  const phases = [
    { w: "Minggu 1-2", t: "Fondasi Postur & Stance", d: "Bangun konsistensi dasar bidik.", done: true },
    { w: "Minggu 3-4", t: "Anchor & Pelepasan", d: "Latih anchor point stabil + clean release.", done: true },
    { w: "Minggu 5-6", t: "Kontrol Napas & Fokus", d: "Integrasi ritme napas dengan tembakan.", done: false },
    { w: "Minggu 7-8", t: "Konsistensi Jarak", d: "Naikkan jarak 18m → 30m bertahap.", done: false },
    { w: "Minggu 9-10", t: "Simulasi Kompetisi", d: "Ronde penuh + tekanan waktu.", done: false },
  ];
  return `
  ${pageHead("Pembinaan / Program Latihan", "Program Latihan", "Susun dan pantau program pembinaan berbasis fase.",
    `<button class="btn btn-primary btn-sm">+ Program Baru</button>`)}
  <div class="grid g-3">
    <div class="card col-span-2">
      <div class="card-head"><h3>Program "Anchor Konsisten" · 10 Minggu</h3><span class="pill ok">Aktif</span></div>
      <div style="position:relative;padding-left:8px">
        ${phases.map((p, i) => `<div style="display:flex;gap:16px;padding-bottom:${i===phases.length-1?0:18}px;position:relative">
          <div style="display:flex;flex-direction:column;align-items:center">
            <div style="width:32px;height:32px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#fff;background:${p.done?"var(--ok-500)":"var(--ink-300)"};flex:none">${p.done?"✓":i+1}</div>
            ${i<phases.length-1?`<div style="width:2px;flex:1;background:var(--border);margin:4px 0"></div>`:""}
          </div>
          <div style="padding-bottom:6px"><div class="muted" style="font-size:.7rem;font-weight:700">${p.w}</div>
            <b style="color:var(--ink-900);font-size:.92rem">${p.t}</b><p class="muted" style="font-size:.8rem">${p.d}</p></div>
        </div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Distribusi Kelas</h3></div>
      <div style="display:flex;justify-content:center;margin:8px 0 16px">
        ${donutMulti([{value:14,color:"#3b65f2"},{value:18,color:"#12c4a6"},{value:16,color:"#f59e0b"}],{center:"48",centerSub:"siswa"})}
      </div>
      ${legendItem("#3b65f2","SMP-7A Panahan Lanjut",14)}
      ${legendItem("#12c4a6","SMP-8B Panahan Dasar",18)}
      ${legendItem("#f59e0b","SMA-10A Recurve Pro",16)}
    </div>
  </div>`;
}

export function guruPenilaian() {
  const rows = [
    { s: "Aulia Putri R.", task: "Refleksi Sesi 12", sub: "5 Jun", grade: "A", status: "ok" },
    { s: "Raka Saputra", task: "Kuis Biomekanika", sub: "5 Jun", grade: "—", status: "warn" },
    { s: "Dewi Anjani", task: "Video Teknik Anchor", sub: "4 Jun", grade: "—", status: "warn" },
    { s: "Bagas Pratama", task: "Refleksi Sesi 12", sub: "4 Jun", grade: "B+", status: "ok" },
  ];
  return `
  ${pageHead("Penilaian / Rapor", "Penilaian & Rapor", "8 tugas menunggu penilaian.",
    `<button class="btn btn-outline btn-sm">Generate Rapor</button>`)}
  <div class="card">
    <div class="card-head"><h3>Antrian Penilaian</h3><div class="tabs"><button class="active">Perlu Dinilai</button><button data-noop>Selesai</button></div></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Siswa</th><th>Tugas</th><th>Dikumpulkan</th><th>Nilai</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr><td>${userCell(r.s)}</td><td><b style="color:var(--ink-900)">${r.task}</b></td><td>${r.sub}</td>
        <td>${r.grade==="—"?'<span class="pill warn">Belum</span>':`<span class="pill ok">${r.grade}</span>`}</td>
        <td><button class="btn ${r.status==="warn"?"btn-primary":"btn-outline"} btn-sm">${r.status==="warn"?"Nilai":"Tinjau"}</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function guruMateri() {
  return `
  ${pageHead("Konten / Bank Materi", "Bank Materi", "Materi sport science dan teknik untuk dibagikan ke kelas.",
    `<button class="btn btn-primary btn-sm">+ Unggah Materi</button>`)}
  <div class="grid g-3">
    ${DEMO.modules.map((m) => `<div class="card hover">
      <div class="stat-ic" style="background:var(--brand-50);color:var(--brand-600);margin-bottom:12px">${m.icon}</div>
      <h3 style="font-size:.92rem;color:var(--ink-900)">${m.title}</h3>
      <p class="muted" style="font-size:.78rem;margin:4px 0 12px">${m.lessons} pelajaran · ${m.level}</p>
      <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm">Pratinjau</button><button class="btn btn-primary btn-sm">Bagikan</button></div>
    </div>`).join("")}
  </div>`;
}
