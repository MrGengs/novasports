/* ============================================================
   NovaSport — Admin Sekolah views
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { areaChart, donutMulti, barChart } from "../charts.js";
import { pageHead, kpiRow, userCell, statusPill, legendItem } from "./components.js";

const A = DEMO.sekolah;

export function sekolahDashboard(user) {
  const b = A.billing;
  return `
  ${pageHead("Beranda / Dashboard Sekolah", `Operasi Sekolah`, `${user.name} · Admin Sekolah · Periode Tahun Ajaran 2025/2026.`,
    `<button class="btn btn-outline btn-sm">⭳ Laporan Tahunan</button><button class="btn btn-primary btn-sm">+ Undang Guru</button>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">TAHUN AJARAN 2025/2026 · SKO RAGUNAN</div>
      <h2>312 siswa aktif di 3 cabang olahraga</h2>
      <p>Kelola guru, kelas, kurikulum, dan langganan sekolah dari satu dashboard.</p>
    </div>
  </div>

  ${kpiRow(A.kpis)}

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Pertumbuhan Siswa Aktif</h3><div class="tabs"><button class="active">Semester</button><button data-noop>Tahun</button></div></div>
      ${areaChart([248,256,268,275,289,298,305,312], { h: 190, color: "#7b62f7" })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Cabang Olahraga</h3></div>
      <div style="display:flex;justify-content:center;margin:6px 0 14px">
        ${donutMulti(A.branches.map((b,i)=>({value:b.students,color:["#3b65f2","#12c4a6","#f59e0b"][i]})),{center:"312",centerSub:"siswa"})}
      </div>
      ${A.branches.map((b,i)=>legendItem(["#3b65f2","#12c4a6","#f59e0b"][i], b.name, b.students)).join("")}
    </div>
  </div>

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Guru & Staf</h3><a class="card-link" href="#/guru-staf">Kelola</a></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Nama</th><th>Peran</th><th>Kelas</th><th>Status</th></tr></thead>
        <tbody>${A.staff.map((s) => `<tr><td>${userCell(s.name)}</td><td>${s.role}</td><td>${s.classes} kelas</td><td>${statusPill(s.status, {ok:"Aktif",warn:"Cuti"})}</td></tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="card" style="background:var(--grad-hero);color:#fff;position:relative;overflow:hidden">
      <div class="hero-grid"></div>
      <div style="position:relative">
        <div class="card-head"><h3 style="color:#fff">Langganan NovaSport</h3></div>
        <div style="font-size:2rem;font-weight:800">${b.price}<span style="font-size:.9rem;opacity:.7">${b.per}</span></div>
        <p style="opacity:.8;font-size:.78rem;margin:4px 0 14px">${b.detail}</p>
        <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:6px"><span style="opacity:.8">Pemakaian kuota</span><b>${b.usagePct}%</b></div>
        <div class="progress" style="background:rgba(255,255,255,.2)"><i style="width:${b.usagePct}%;background:#7ff0d2"></i></div>
        <div style="display:flex;gap:8px;margin-top:16px"><button class="btn btn-light btn-sm">Faktur</button><button class="btn btn-ghost btn-sm">Upgrade ke Enterprise</button></div>
        <p style="opacity:.6;font-size:.7rem;margin-top:12px">Tagihan berikutnya ${b.nextBill}</p>
      </div>
    </div>
  </div>`;
}

export function sekolahGuruStaf() {
  const staff = [...A.staff, { name: "Bu Rina Kartika", role: "Guru Sport Science", classes: 2, status: "ok" },
    { name: "Pak Adi Nugroho", role: "Pelatih Panahan", classes: 3, status: "ok" }];
  return `
  ${pageHead("Manajemen / Guru & Staf", "Guru & Staf", "Kelola tenaga pendidik dan staf sekolah.",
    `<button class="btn btn-primary btn-sm">+ Undang Guru</button>`)}
  <div class="card">
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Nama</th><th>Peran</th><th>Kelas Diampu</th><th>Status</th><th></th></tr></thead>
      <tbody>${staff.map((s) => `<tr><td>${userCell(s.name)}</td><td>${s.role}</td><td>${s.classes} kelas</td><td>${statusPill(s.status,{ok:"Aktif",warn:"Cuti"})}</td><td><button class="btn btn-outline btn-sm">Kelola</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function sekolahSiswaKelas() {
  return `
  ${pageHead("Manajemen / Siswa & Kelas", "Siswa & Kelas", "Kelola pendaftaran siswa dan struktur kelas.",
    `<button class="btn btn-outline btn-sm">⭳ Impor CSV</button><button class="btn btn-primary btn-sm">+ Tambah Kelas</button>`)}
  <div class="grid g-3">
    ${["SMP-7A Panahan Lanjut|14|Pak Hendra","SMP-8B Panahan Dasar|18|Pak Adi","SMA-10A Recurve Pro|16|Pak Hendra","SMP-7B Menembak|20|Pak Surya","Sport Science 1|24|Bu Maya","Sport Science 2|22|Bu Rina"]
      .map((c)=>{const[n,s,g]=c.split("|");return `<div class="card hover"><div class="card-head"><h3 style="font-size:.9rem">${n}</h3><span class="pill info">${s} siswa</span></div><p class="muted" style="font-size:.78rem">Wali: ${g}</p><div style="display:flex;gap:8px;margin-top:12px"><button class="btn btn-outline btn-sm">Siswa</button><button class="btn btn-outline btn-sm">Jadwal</button></div></div>`;}).join("")}
  </div>`;
}

export function sekolahKurikulum() {
  return `
  ${pageHead("Akademik / Kurikulum", "Kurikulum", "Susun kurikulum sport science tiap cabang.")}
  <div class="grid g-2">
    ${A.branches.map((b)=>`<div class="card">
      <div class="card-head"><h3>${b.name}</h3><span class="pill info">${b.classes} kelas</span></div>
      ${["Modul Dasar","Modul Menengah","Modul Lanjut","Evaluasi & Rapor"].map((m,i)=>`<div class="list-row"><div class="stat-ic" style="width:36px;height:36px;background:var(--surface-2)">${["📘","📗","📙","📝"][i]}</div><div class="lr-main"><b>${m}</b><span>${[6,8,9,3][i]} pelajaran</span></div><span class="pill ${i<2?"ok":"muted"}">${i<2?"Aktif":"Draft"}</span></div>`).join("")}
    </div>`).join("")}
  </div>`;
}

export function sekolahLangganan() {
  const b = A.billing;
  return `
  ${pageHead("Keuangan / Langganan & Billing", "Langganan & Billing", "Kelola paket, faktur, dan pembayaran.")}
  <div class="grid g-3">
    <div class="card col-span-2">
      <div class="card-head"><h3>Riwayat Faktur</h3></div>
      <div class="table-wrap"><table class="tbl">
        <thead><tr><th>Faktur</th><th>Periode</th><th>Jumlah</th><th>Status</th><th></th></tr></thead>
        <tbody>${[["INV-2606","Jun 2026","Rp14,2 jt","pending"],["INV-2605","Mei 2026","Rp13,8 jt","ok"],["INV-2604","Apr 2026","Rp13,2 jt","ok"]]
          .map(([f,p,j,s])=>`<tr><td><b style="color:var(--ink-900)">${f}</b></td><td>${p}</td><td>${j}</td><td><span class="pill ${s}">${s==="ok"?"Lunas":"Menunggu"}</span></td><td><button class="btn btn-outline btn-sm">PDF</button></td></tr>`).join("")}</tbody>
      </table></div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Paket Aktif</h3></div>
      <span class="pill info" style="margin-bottom:10px">${b.plan}</span>
      <div style="font-size:1.8rem;font-weight:800;color:var(--ink-900)">${b.price}<span style="font-size:.8rem;color:var(--ink-400)">${b.per}</span></div>
      <p class="muted" style="font-size:.78rem;margin:6px 0 14px">${b.detail}</p>
      <button class="btn btn-primary btn-block">Upgrade ke Enterprise</button>
    </div>
  </div>`;
}

export function sekolahLaporan() {
  return `
  ${pageHead("Laporan / Sekolah", "Laporan Sekolah", "Ringkasan kinerja akademik dan operasional.")}
  <div class="grid g-2">
    <div class="card"><div class="card-head"><h3>Performa Rata-rata Sekolah</h3></div>${areaChart(DEMO.performanceTrend,{h:180,color:"#3b65f2"})}</div>
    <div class="card"><div class="card-head"><h3>Distribusi Cabang</h3></div>${barChart(A.branches.map(b=>({label:b.name.slice(0,6),value:b.students})),{h:180,color:"#7b62f7",highlight:0})}</div>
  </div>`;
}
