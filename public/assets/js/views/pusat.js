/* ============================================================
   NovaSport — Admin Pusat (platform) views
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { areaChart, donutMulti, barChart } from "../charts.js";
import { pageHead, kpiRow, statusPill, legendItem } from "./components.js";

const P = DEMO.pusat;

export function pusatDashboard(user) {
  return `
  ${pageHead("Beranda / Dashboard Platform", "Operasi Platform", "Tim Operasi NovaSport HQ · Pukul 16:42 WIB.",
    `<button class="btn btn-outline btn-sm">📅 Bulan Ini</button><button class="btn btn-primary btn-sm">⭳ Ekspor</button>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">OPERASI NASIONAL · NOVASPORT HQ</div>
      <h2>Pertumbuhan platform berjalan baik</h2>
      <p>11 sekolah mitra aktif, armada IoT terpantau, dan pendapatan naik 24% bulan ini.</p>
    </div>
  </div>

  ${kpiRow(P.kpis)}

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><div><h3>Pendapatan Bulanan (MRR)</h3><span class="sub">9 bulan terakhir · dalam juta rupiah</span></div>
        <span class="delta up">↑ 24% vs April</span></div>
      ${areaChart(P.revenueTrend, { h: 200, color: "#16a34a" })}
      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--ink-400);margin-top:6px">
        ${["Okt","Nov","Des","Jan","Feb","Mar","Apr","Mei","Jun"].map((m)=>`<span>${m}</span>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Armada Perangkat IoT</h3><a class="card-link" href="#/perangkat">Kelola</a></div>
      <div style="display:flex;justify-content:center;margin:6px 0 14px">
        ${donutMulti([{value:9,color:"#16a34a"},{value:2,color:"#f59e0b"},{value:1,color:"#e23b4e"}],{center:"12",centerSub:"unit"})}
      </div>
      ${legendItem("#16a34a","Online",9)}
      ${legendItem("#f59e0b","Kalibrasi",2)}
      ${legendItem("#e23b4e","Offline",1)}
    </div>
  </div>

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Sekolah Mitra</h3><a class="card-link" href="#/sekolah-mitra">Lihat semua</a></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Sekolah</th><th>Paket</th><th>Siswa</th><th>MRR</th><th>Kesehatan Akun</th></tr></thead>
        <tbody>${P.schools.map((s) => `<tr>
          <td><b style="color:var(--ink-900)">${s.name}</b></td>
          <td><span class="pill ${s.plan==="Enterprise"?"info":s.plan==="Pro"?"ok":"muted"}">${s.plan}</span></td>
          <td>${s.students}</td><td>${s.mrr}</td>
          <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:80px"><i style="width:${s.health}%;background:${s.health>85?"var(--ok-500)":s.health>70?"var(--warn-500)":"var(--danger-500)"}"></i></div>${s.health}%</div></td>
        </tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Sorotan Operasi</h3></div>
      <div class="list">
        ${[["✅","11/14 sekolah pilot aktif","Onboarding 3 sekolah sedang berjalan"],
           ["📈","Retensi 30 hari 86%","+4 poin dari kuartal lalu"],
           ["🎯","30 atlet ter-asesmen","Target diperluas Oktober 2026"],
           ["📡","SAB-0160 offline","Perlu pengecekan teknis"]]
          .map(([i,t,d])=>`<div class="list-row" style="align-items:flex-start"><div class="stat-ic" style="width:38px;height:38px;background:var(--surface-2)">${i}</div><div class="lr-main"><b>${t}</b><span style="white-space:normal">${d}</span></div></div>`).join("")}
      </div>
    </div>
  </div>`;
}

export function pusatSekolahMitra() {
  return `
  ${pageHead("Mitra / Sekolah", "Sekolah Mitra", "Kelola seluruh sekolah & klub mitra platform.",
    `<button class="btn btn-primary btn-sm">+ Onboard Sekolah</button>`)}
  <div class="card">
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Sekolah</th><th>Paket</th><th>Siswa</th><th>MRR</th><th>Kesehatan</th><th></th></tr></thead>
      <tbody>${[...P.schools,{name:"SMP Negeri 7",plan:"Starter",students:64,mrr:"Rp1,6 jt",health:55},{name:"Klub Panah Jogja",plan:"Pro",students:48,mrr:"Rp4,7 jt",health:79}].map((s) => `<tr>
        <td><b style="color:var(--ink-900)">${s.name}</b></td><td><span class="pill ${s.plan==="Enterprise"?"info":s.plan==="Pro"?"ok":"muted"}">${s.plan}</span></td>
        <td>${s.students}</td><td>${s.mrr}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:70px"><i style="width:${s.health}%;background:${s.health>85?"var(--ok-500)":s.health>70?"var(--warn-500)":"var(--danger-500)"}"></i></div>${s.health}%</div></td>
        <td><button class="btn btn-outline btn-sm">Detail</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function pusatPerangkat() {
  return `
  ${pageHead("Infrastruktur / Perangkat IoT", "Perangkat IoT", "Registrasi, kalibrasi, dan monitoring Smart Arrow Bow.",
    `<button class="btn btn-primary btn-sm">+ Daftarkan Perangkat</button>`)}
  <div class="grid g-4" style="margin-bottom:18px">
    <div class="card stat"><div class="stat-val">12</div><div class="stat-label">Total perangkat</div></div>
    <div class="card stat"><div class="stat-val" style="color:var(--ok-500)">9</div><div class="stat-label">Online</div></div>
    <div class="card stat"><div class="stat-val" style="color:var(--warn-500)">2</div><div class="stat-label">Kalibrasi</div></div>
    <div class="card stat"><div class="stat-val" style="color:var(--danger-500)">1</div><div class="stat-label">Offline</div></div>
  </div>
  <div class="card">
    <div class="card-head"><h3>Armada Smart Arrow Bow</h3></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>ID Perangkat</th><th>Sekolah</th><th>Status</th><th>Baterai</th><th>Sinkron Terakhir</th><th></th></tr></thead>
      <tbody>${P.devices.map((d) => `<tr>
        <td><b style="color:var(--ink-900)">📡 ${d.id}</b></td><td>${d.school}</td><td>${statusPill(d.status)}</td>
        <td><div style="display:flex;align-items:center;gap:8px"><div class="progress" style="width:60px"><i style="width:${d.battery}%;background:${d.battery>50?"var(--ok-500)":d.battery>20?"var(--warn-500)":"var(--danger-500)"}"></i></div>${d.battery}%</div></td>
        <td>${d.lastSync}</td><td><button class="btn btn-outline btn-sm">Kelola</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function pusatKonten() {
  return `
  ${pageHead("Konten / Kurikulum & Konten", "Kurikulum & Konten", "Kelola modul pembelajaran tingkat platform.",
    `<button class="btn btn-primary btn-sm">+ Modul Baru</button>`)}
  <div class="grid g-3">
    ${DEMO.modules.map((m) => `<div class="card hover">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
        <div class="stat-ic" style="background:var(--brand-50);color:var(--brand-600)">${m.icon}</div><span class="pill muted">${m.level}</span></div>
      <h3 style="font-size:.92rem;color:var(--ink-900)">${m.title}</h3>
      <p class="muted" style="font-size:.78rem;margin:4px 0 12px">${m.lessons} pelajaran · dipakai 11 sekolah</p>
      <div style="display:flex;gap:8px"><button class="btn btn-outline btn-sm">Edit</button><button class="btn btn-outline btn-sm">Statistik</button></div>
    </div>`).join("")}
  </div>`;
}

export function pusatBilling() {
  return `
  ${pageHead("Keuangan / Billing Global", "Billing Global", "Pendapatan, langganan, dan keuangan platform.")}
  <div class="grid g-4" style="margin-bottom:18px">
    <div class="card stat"><div class="stat-val" style="font-size:1.6rem">Rp412 jt</div><div class="stat-label">MRR bulan ini</div></div>
    <div class="card stat"><div class="stat-val" style="font-size:1.6rem">Rp4,9 M</div><div class="stat-label">ARR proyeksi</div></div>
    <div class="card stat"><div class="stat-val" style="font-size:1.6rem">14</div><div class="stat-label">Akun langganan</div></div>
    <div class="card stat"><div class="stat-val" style="font-size:1.6rem">3,2%</div><div class="stat-label">Churn bulanan</div></div>
  </div>
  <div class="grid g-3">
    <div class="card col-span-2"><div class="card-head"><h3>Pendapatan per Paket</h3></div>${barChart([{label:"Starter",value:48},{label:"Pro",value:186},{label:"Enterprise",value:178}],{h:190,color:"#16a34a",highlight:1})}</div>
    <div class="card"><div class="card-head"><h3>Komposisi MRR</h3></div><div style="display:flex;justify-content:center;margin:6px 0 14px">${donutMulti([{value:48,color:"#9099b8"},{value:186,color:"#12c4a6"},{value:178,color:"#3b65f2"}],{center:"Rp412jt"})}</div>${legendItem("#9099b8","Starter","12%")}${legendItem("#12c4a6","Pro","45%")}${legendItem("#3b65f2","Enterprise","43%")}</div>
  </div>`;
}

export function pusatAnalitik() {
  return `
  ${pageHead("Analitik / Platform", "Analitik Platform", "Metrik pertumbuhan dan engagement lintas sekolah.")}
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h3>Pengguna Aktif Bulanan</h3></div>${areaChart([1200,1480,1750,2100,2380,2680,2950,3180,3420],{h:190,color:"#3b65f2"})}</div>
    <div class="card"><div class="card-head"><h3>Retensi & Engagement</h3></div>${areaChart([72,74,76,79,80,82,84,85,86],{h:190,color:"#7b62f7"})}<p class="muted" style="font-size:.78rem;margin-top:8px">Retensi 30 hari naik konsisten — fitur simulator & gamifikasi mendorong engagement.</p></div>
  </div>`;
}
