/* ============================================================
   NovaSport — Orang Tua (parent) views
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { areaChart, barChart, donut } from "../charts.js";
import { pageHead } from "./components.js";

const O = DEMO.ortu;

function childCard(c, active) {
  return `<div class="card ${active ? "" : "hover"}" style="${active ? "border-color:var(--brand-300);box-shadow:0 0 0 3px rgba(59,101,242,.1)" : ""}">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px">
      <div class="avatar">${c.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
      <div><b style="color:var(--ink-900)">${c.name}</b><div class="muted" style="font-size:.74rem">${c.cls}</div></div>
    </div>
    <div class="grid g-2" style="gap:10px">
      <div class="card" style="padding:12px;background:var(--surface-2)"><div class="stat-val" style="font-size:1.3rem">${c.attendance}%</div><div class="stat-label" style="font-size:.72rem">Kehadiran</div></div>
      <div class="card" style="padding:12px;background:var(--surface-2)"><div class="stat-val" style="font-size:1.3rem">${c.perf}<span style="font-size:.8rem;color:var(--ink-400)">/10</span></div><div class="stat-label" style="font-size:.72rem">Performa</div></div>
      <div class="card" style="padding:12px;background:var(--surface-2)"><div style="font-size:1rem;font-weight:800;color:var(--ok-500)">${c.gizi}</div><div class="stat-label" style="font-size:.72rem">Status gizi</div></div>
      <div class="card" style="padding:12px;background:var(--surface-2)"><div class="stat-val" style="font-size:1.3rem">${c.rapor}</div><div class="stat-label" style="font-size:.72rem">Rapor RKM</div></div>
    </div>
  </div>`;
}

export function ortuDashboard(user) {
  return `
  ${pageHead("Beranda / Dashboard Orang Tua", `Selamat sore, ${user.name.split(" ").slice(0,2).join(" ")} 👪`, "Pantau latihan, gizi, dan tumbuh kembang anak di NovaSport.",
    `<button class="btn btn-outline btn-sm">💬 Pesan Guru</button><button class="btn btn-primary btn-sm">+ Tautkan Anak</button>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">TUMBUH KEMBANG ANAK</div>
      <h2>Perkembangan anak Anda minggu ini</h2>
      <p>Latihan konsisten dan status gizi terpantau baik — lihat detail progresnya di bawah.</p>
    </div>
  </div>

  <div class="grid g-2">
    ${O.children.map((c, i) => childCard(c, i === 0)).join("")}
  </div>

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><div><h3>Aktivitas Latihan Mingguan</h3><span class="sub">Aulia Putri R.</span></div></div>
      ${barChart(O.weekly.map((w) => ({ label: w.day, value: w.score })), { h: 180, color: "#3b65f2", highlight: 5 })}
      <div style="display:flex;gap:20px;margin-top:10px;font-size:.78rem" class="muted">
        <span>● <b style="color:var(--ink-700)">6 sesi</b> minggu ini</span>
        <span>● Skor rata-rata <b style="color:var(--ink-700)">8.5</b></span>
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Konsistensi Latihan</h3></div>
      <div style="display:flex;justify-content:center;margin:6px 0 14px">${donut(92, { size: 150, color: "#12c4a6", sub: "Bulan ini" })}</div>
      <p class="muted center" style="font-size:.78rem">Anak Anda berlatih 23 dari 25 hari terjadwal.</p>
    </div>
  </div>

  <div class="grid g-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><h3>Laporan & Rapor Terbaru</h3><a class="card-link" href="#/laporan">Semua</a></div>
      <div class="list">
        ${O.reports.map((r) => `<div class="list-row">
          <div class="stat-ic" style="width:40px;height:40px;background:var(--surface-2);font-size:1.1rem">📄</div>
          <div class="lr-main"><b>${r.title}</b><span>${r.note}</span></div>
          <div style="text-align:right"><div class="muted" style="font-size:.72rem">${r.date}</div><a class="card-link" href="#/laporan">Unduh</a></div>
        </div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Catatan dari Pelatih & Ahli Gizi</h3></div>
      <div class="list">
        ${[["👨‍🏫","Pak Hendra (Pelatih)","Konsistensi anchor Aulia meningkat pesat. Pertahankan latihan napas.","Kemarin"],
           ["🥗","Dr. Putu (Ahli Gizi)","Z-score membaik. Tambahkan asupan protein pasca latihan.","3 hari lalu"]]
          .map(([i,who,msg,t])=>`<div class="list-row" style="align-items:flex-start">
            <div class="stat-ic" style="width:40px;height:40px;background:var(--surface-2);font-size:1.1rem">${i}</div>
            <div class="lr-main"><b>${who}</b><span style="white-space:normal;color:var(--ink-600)">${msg}</span><div class="muted" style="font-size:.68rem;margin-top:4px">${t}</div></div>
          </div>`).join("")}
      </div>
    </div>
  </div>`;
}

export function ortuProgres() {
  return `
  ${pageHead("Anak / Progres", "Progres Anak", "Perkembangan performa dan pencapaian lintas waktu.")}
  <div class="grid g-3">
    <div class="card col-span-2">
      <div class="card-head"><h3>Tren Performa — Aulia Putri R.</h3><div class="tabs"><button class="active">12 Minggu</button><button data-noop>6 Bulan</button></div></div>
      ${areaChart(DEMO.performanceTrend, { h: 190, color: "#3b65f2" })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Pencapaian Terbaru</h3></div>
      ${["🏅 Anchor Master","🔥 Streak 14 Hari","🎯 Grouping <6cm"].map((b)=>`<div class="list-row"><div style="font-size:1.4rem">${b.split(" ")[0]}</div><div class="lr-main"><b>${b.split(" ").slice(1).join(" ")}</b><span>Diraih minggu ini</span></div></div>`).join("")}
    </div>
  </div>`;
}

export function ortuGizi() {
  return `
  ${pageHead("Kesehatan / Gizi & Tumbuh", "Gizi & Tumbuh Kembang", "Pemantauan status gizi anak Anda.")}
  <div class="grid g-4">
    <div class="card stat"><div class="stat-ic" style="background:var(--ok-50);color:var(--ok-500)">🥗</div><div class="stat-val" style="font-size:1.3rem">Gizi Baik</div><div class="stat-label">Status</div></div>
    <div class="card stat"><div class="stat-val">-0.4</div><div class="stat-label">Z-score BB/U</div></div>
    <div class="card stat"><div class="stat-val">162cm</div><div class="stat-label">Tinggi</div></div>
    <div class="card stat"><div class="stat-val">51kg</div><div class="stat-label">Berat</div></div>
  </div>
  <div class="card" style="margin-top:18px">
    <div class="card-head"><h3>Tren Z-score (8 bulan)</h3></div>
    ${areaChart(DEMO.gizi.zscoreTrend.map((v)=>v+2), { h: 170, color: "#0ea98e" })}
    <p class="muted" style="font-size:.8rem;margin-top:8px">Status gizi anak Anda terus membaik berkat program nutrisi dari ahli gizi sekolah.</p>
  </div>`;
}

export function ortuLaporan() {
  return `
  ${pageHead("Dokumen / Laporan & Rapor", "Laporan & Rapor", "Unduh rapor digital dan laporan berkala.")}
  <div class="card">
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Dokumen</th><th>Periode</th><th>Tanggal</th><th></th></tr></thead>
      <tbody>${[["Rapor Bulanan","Mei 2026","1 Jun 2026"],["Laporan Gizi Triwulan","Mar–Mei 2026","28 Mei 2026"],["Rapor Bulanan","April 2026","2 Mei 2026"],["Sertifikat Modul Biomekanika","—","20 Apr 2026"]]
        .map(([d,p,t])=>`<tr><td><b style="color:var(--ink-900)">📄 ${d}</b></td><td>${p}</td><td>${t}</td><td><button class="btn btn-outline btn-sm">⭳ Unduh PDF</button></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function ortuKomunikasi() {
  return `
  ${pageHead("Komunikasi / Pesan", "Komunikasi", "Terhubung dengan pelatih dan ahli gizi sekolah.")}
  <div class="grid g-3">
    <div class="card">
      <div class="card-head"><h3>Kontak</h3></div>
      ${[["👨‍🏫","Pak Hendra Wijaya","Pelatih Panahan"],["🥗","Dr. Putu Manarani","Ahli Gizi"],["🏫","Admin SMP Negeri 2","Administrasi"]]
        .map(([i,n,r],idx)=>`<div class="list-row" style="${idx===0?'background:var(--brand-50)':''}"><div class="stat-ic" style="width:40px;height:40px;background:var(--surface-2)">${i}</div><div class="lr-main"><b>${n}</b><span>${r}</span></div></div>`).join("")}
    </div>
    <div class="card col-span-2" style="display:flex;flex-direction:column">
      <div class="card-head"><h3>💬 Pak Hendra Wijaya</h3><span class="pill ok">● Online</span></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:10px;padding:8px 0">
        <div style="align-self:flex-start;max-width:70%;background:var(--surface-2);padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:.85rem">Selamat sore Bu, konsistensi anchor Aulia meningkat pesat minggu ini 👏</div>
        <div style="align-self:flex-end;max-width:70%;background:var(--grad-brand);color:#fff;padding:10px 14px;border-radius:14px 14px 4px 14px;font-size:.85rem">Terima kasih Pak! Apakah ada yang perlu kami dukung di rumah?</div>
        <div style="align-self:flex-start;max-width:70%;background:var(--surface-2);padding:10px 14px;border-radius:14px 14px 14px 4px;font-size:.85rem">Latihan pernapasan 10 menit sebelum tidur akan sangat membantu fokusnya 🫁</div>
      </div>
      <div style="display:flex;gap:10px;margin-top:10px">
        <input class="input" placeholder="Tulis pesan..."><button class="btn btn-primary">Kirim</button>
      </div>
    </div>
  </div>`;
}
