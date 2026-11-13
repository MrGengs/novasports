/* ============================================================
   NovaSport — Siswa / Atlet views
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { areaChart, barChart, donut, sparkline, gaugeRow } from "../charts.js";
import { pageHead, kpiRow, welcomeBanner, leaderboardCard, emptyState } from "./components.js";

const S = DEMO.siswa;

export function siswaDashboard(user) {
  const prog = S.program;
  const pct = Math.round((prog.day / prog.total) * 100);
  return `
  ${pageHead("Beranda / Dashboard", `Selamat sore, ${user.name.split(" ")[0]} 🔥`, "Kamu memiliki 3 sesi latihan dijadwalkan minggu ini.",
    `<a href="#/simulator" class="btn btn-outline btn-sm">Buka Tweaks</a><a href="#/simulator" class="btn btn-primary btn-sm">▶ Mulai Latihan</a>`)}

  <div class="welcome" style="margin-bottom:18px">
    <div class="hero-grid"></div>
    <div>
      <div class="chip chip-glass" style="margin-bottom:10px">PROGRAM PEMBINAAN · PANAHAN</div>
      <h2>Hari ke-${prog.day} program "${prog.name}"</h2>
      <p>${prog.note}</p>
    </div>
    <div class="w-actions">
      <a href="#/kelas" class="btn btn-light btn-sm">Lihat Program</a>
      <a href="#/simulator" class="btn btn-ghost btn-sm">Buka Simulator →</a>
    </div>
  </div>

  ${kpiRow(S.kpis)}

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><div><h3>Tren Performa</h3><span class="sub">Rata-rata skor 12 minggu terakhir</span></div>
        <div class="tabs"><button class="active">Performa</button><button data-noop>Akurasi</button></div></div>
      ${areaChart(DEMO.performanceTrend, { h: 180, color: "#3b65f2" })}
      <div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--ink-400);margin-top:6px">
        ${DEMO.weeks.map((w) => `<span>${w}</span>`).join("")}
      </div>
    </div>
    ${leaderboardCard(DEMO.leaderboard)}
  </div>

  <div class="grid g-3" style="margin-top:18px">
    <div class="card col-span-2">
      <div class="card-head"><h3>Riwayat Latihan Terbaru</h3><a class="card-link" href="#/riwayat">Lihat semua</a></div>
      <div class="list">
        ${S.sessions.map((s) => `<div class="list-row">
          <div class="stat-ic" style="width:38px;height:38px;background:var(--brand-50);color:var(--brand-600);font-size:1rem">🎯</div>
          <div class="lr-main"><b>${s.name}</b><span>${s.date}</span></div>
          <span class="pill ${s.state}">${s.score}</span>
        </div>`).join("")}
      </div>
    </div>
    <div class="card">
      <div class="card-head"><h3>Tugas Mendekati Tenggat</h3></div>
      <div class="list">
        ${S.tasks.map((t) => `<div class="list-row">
          <input type="checkbox" ${t.done ? "checked" : ""} style="width:18px;height:18px;accent-color:var(--brand-500)">
          <div class="lr-main"><b style="${t.done ? "text-decoration:line-through;color:var(--ink-400)" : ""}">${t.name}</b><span>${t.due}</span></div>
        </div>`).join("")}
      </div>
      <hr class="sep">
      <h3 style="font-size:.9rem;margin-bottom:12px">Pencapaian</h3>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        ${S.achievements.map((a) => `<div style="text-align:center;flex:1;min-width:70px">
          <div style="font-size:1.6rem">${a.icon}</div>
          <div style="font-size:.7rem;font-weight:700;color:var(--ink-800);margin-top:4px">${a.name}</div>
          <div style="font-size:.62rem;color:var(--ink-400)">${a.desc}</div>
        </div>`).join("")}
      </div>
    </div>
  </div>`;
}

export function siswaKelas() {
  return `
  ${pageHead("Pembelajaran / Kelas Saya", "Kelas & Modul Saya", "Lanjutkan pembelajaran sport science dan teknik panahanmu.")}
  <div class="grid g-3">
    ${DEMO.modules.map((m) => `<div class="card hover">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px">
        <div class="stat-ic" style="background:var(--brand-50);color:var(--brand-600)">${m.icon}</div>
        <span class="pill muted">${m.level}</span>
      </div>
      <h3 style="font-size:.95rem;color:var(--ink-900);margin-bottom:4px">${m.title}</h3>
      <p class="muted" style="font-size:.78rem;margin-bottom:14px">${m.lessons} pelajaran</p>
      <div style="display:flex;justify-content:space-between;font-size:.72rem;margin-bottom:6px"><span class="muted">Progres</span><b>${m.progress}%</b></div>
      <div class="progress"><i style="width:${m.progress}%"></i></div>
      <a href="#/kelas" class="btn ${m.progress === 100 ? "btn-outline" : "btn-primary"} btn-sm btn-block" style="margin-top:14px">${m.progress === 100 ? "Tinjau Ulang" : m.progress === 0 ? "Mulai Modul" : "Lanjutkan"}</a>
    </div>`).join("")}
  </div>`;
}

export function siswaRiwayat() {
  const rows = [
    { d: "5 Jun 2026", n: "Recurve 18m Indoor", arrows: 30, score: "137/150", acc: 91, ai: 86 },
    { d: "4 Jun 2026", n: "Anchor Drill", arrows: 24, score: "—", acc: 0, ai: 88 },
    { d: "2 Jun 2026", n: "Stabilitas Tarikan", arrows: 18, score: "—", acc: 0, ai: 82 },
    { d: "1 Jun 2026", n: "Recurve 30m Outdoor", arrows: 30, score: "121/150", acc: 80, ai: 76 },
    { d: "29 Mei 2026", n: "Simulasi Kompetisi", arrows: 36, score: "318/360", acc: 88, ai: 84 },
  ];
  return `
  ${pageHead("Latihan / Riwayat", "Riwayat Latihan", "Semua sesi latihan dan hasil analisis biomekanika.",
    `<button class="btn btn-outline btn-sm">⭳ Unduh CSV</button>`)}
  <div class="grid g-4" style="margin-bottom:18px">
    <div class="card stat"><div class="stat-val">128</div><div class="stat-label">Total sesi</div></div>
    <div class="card stat"><div class="stat-val">3.840</div><div class="stat-label">Anak panah dilepas</div></div>
    <div class="card stat"><div class="stat-val">8.4<span style="font-size:1rem;color:var(--ink-400)">/10</span></div><div class="stat-label">Rata performa</div></div>
    <div class="card stat"><div class="stat-val">86%</div><div class="stat-label">Akurasi rata-rata</div></div>
  </div>
  <div class="card">
    <div class="card-head"><h3>Sesi Latihan</h3><div class="tabs"><button class="active">Semua</button><button data-noop>Panahan</button><button data-noop>Drill</button></div></div>
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>Tanggal</th><th>Sesi</th><th>Anak Panah</th><th>Skor</th><th>Akurasi</th><th>Skor AI</th><th></th></tr></thead>
      <tbody>${rows.map((r) => `<tr>
        <td>${r.d}</td><td><b style="color:var(--ink-900)">${r.n}</b></td><td>${r.arrows}</td>
        <td>${r.score}</td><td>${r.acc ? r.acc + "%" : "—"}</td>
        <td><span class="pill ${r.ai >= 84 ? "ok" : r.ai >= 78 ? "warn" : "danger"}">${r.ai}</span></td>
        <td><a class="card-link" href="#/analitik">Detail →</a></td>
      </tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function siswaAnalitik() {
  const ai = DEMO.simulator.ai;
  return `
  ${pageHead("Latihan / Analitik", "Analitik Performa", "Insight biomekanika dari AI Biomekanika Engine.")}
  <div class="grid g-3">
    <div class="card col-span-2">
      <div class="card-head"><div><h3>Tren Akurasi</h3><span class="sub">Persentase 12 minggu</span></div></div>
      ${areaChart(DEMO.accuracyTrend, { h: 180, color: "#12c4a6" })}
    </div>
    <div class="card">
      <div class="card-head"><h3>Konsistensi Sesi Terakhir</h3></div>
      <div style="display:flex;justify-content:center;margin:6px 0 16px">${donut(86, { size: 150, color: "#3b65f2", sub: "Stabilitas" })}</div>
      <p class="muted center" style="font-size:.78rem">Stabilitas tarikan meningkat 12% sejak bulan lalu.</p>
    </div>
  </div>
  <div class="grid g-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><h3>Analisis AI Biomekanika</h3><span class="pill info">Rule-based</span></div>
      ${gaugeRow("Stabilitas Tarikan", ai.stabilitasTarikan, "#3b65f2")}
      ${gaugeRow("Konsistensi Anchor", ai.konsistensiAnchor, "#12c4a6")}
      ${gaugeRow("Kontrol Pernapasan", ai.kontrolNapas, "#f59e0b")}
      ${gaugeRow("Follow Through", ai.followThrough, "#7b62f7")}
    </div>
    <div class="card">
      <div class="card-head"><h3>Rekomendasi Pengembangan</h3></div>
      <div class="list">
        ${[
          { i: "🫁", t: "Perbaiki ritme napas fase 4", d: "Tahan 1 detik lebih lama sebelum pelepasan." },
          { i: "🎯", t: "Latih konsistensi anchor", d: "Anchor point bergeser 3mm pada 5 tembakan terakhir." },
          { i: "💪", t: "Tambah latihan stabilisasi core", d: "Mendukung stabilitas tarikan jarak jauh." },
        ].map((r) => `<div class="list-row">
          <div class="stat-ic" style="width:40px;height:40px;background:var(--surface-2);font-size:1.1rem">${r.i}</div>
          <div class="lr-main"><b>${r.t}</b><span>${r.d}</span></div>
        </div>`).join("")}
      </div>
    </div>
  </div>`;
}

export function siswaGizi() {
  return `
  ${pageHead("Kesehatan / Gizi & Tumbuh Kembang", "Gizi & Tumbuh Kembang", "Status gizi dan rekomendasi nutrisi untuk performa optimal.")}
  <div class="grid g-4">
    <div class="card stat"><div class="stat-ic" style="background:var(--ok-50);color:var(--ok-500)">🥗</div><div class="stat-val" style="font-size:1.4rem">Gizi Baik</div><div class="stat-label">Status terkini</div></div>
    <div class="card stat"><div class="stat-val">-0.4</div><div class="stat-label">Z-score BB/U</div></div>
    <div class="card stat"><div class="stat-val">162<span style="font-size:1rem;color:var(--ink-400)">cm</span></div><div class="stat-label">Tinggi badan</div></div>
    <div class="card stat"><div class="stat-val">51<span style="font-size:1rem;color:var(--ink-400)">kg</span></div><div class="stat-label">Berat badan</div></div>
  </div>
  <div class="grid g-2" style="margin-top:18px">
    <div class="card">
      <div class="card-head"><h3>Tren Z-score (8 bulan)</h3></div>
      ${areaChart(DEMO.gizi.zscoreTrend.map((v) => v + 2), { h: 160, color: "#0ea98e" })}
      <p class="muted center" style="font-size:.78rem;margin-top:8px">Tren membaik — mendekati ambang gizi optimal.</p>
    </div>
    <div class="card">
      <div class="card-head"><h3>Anjuran Nutrisi Hari Ini</h3></div>
      <div class="list">
        ${[["🍚","Karbohidrat kompleks","Sebelum latihan, energi tahan lama"],["🍗","Protein 1.4g/kg","Pemulihan otot pasca latihan"],["💧","Hidrasi 2.5L","Jaga fokus & stabilitas"],["🥦","Mikronutrien","Sayur & buah tiap makan"]]
          .map(([i,t,d]) => `<div class="list-row"><div class="stat-ic" style="width:38px;height:38px;background:var(--surface-2)">${i}</div><div class="lr-main"><b>${t}</b><span>${d}</span></div></div>`).join("")}
      </div>
    </div>
  </div>`;
}

export function siswaJadwal() {
  return `
  ${pageHead("Latihan / Jadwal", "Jadwal Latihan", "Agenda latihan dan pembelajaranmu pekan ini.")}
  <div class="grid g-2">
    ${DEMO.schedule.map((d) => `<div class="card">
      <div class="card-head"><h3>${d.day}</h3><span class="sub">${d.items.length} agenda</span></div>
      ${d.items.length ? `<div class="list">${d.items.map((it) => `<div class="list-row">
        <div style="font-weight:800;color:var(--brand-600);width:48px">${it.t}</div>
        <div class="lr-main"><b>${it.n}</b><span>${it.who}</span></div>
      </div>`).join("")}</div>` : `<p class="muted" style="font-size:.82rem;padding:8px">Tidak ada agenda — hari pemulihan 💤</p>`}
    </div>`).join("")}
  </div>`;
}

export function siswaProfil(user) {
  return `
  ${pageHead("Akun / Profil", "Profil & Pencapaian", "Kelola identitas dan lihat lencana pencapaianmu.")}
  <div class="grid g-3">
    <div class="card center">
      <div class="avatar lg" style="margin:6px auto 12px;width:80px;height:80px;font-size:1.6rem">${user.name.split(" ").slice(0,2).map(w=>w[0]).join("")}</div>
      <h3 style="color:var(--ink-900)">${user.name}</h3>
      <p class="muted" style="font-size:.82rem">${user.grade || "Kelas 7B"} · ${user.school || "SMP Negeri 2"}</p>
      <span class="pill info" style="margin-top:10px">🏹 Recurve Athlete</span>
      <hr class="sep">
      <div style="display:flex;justify-content:space-around;text-align:center">
        <div><b style="font-size:1.3rem;color:var(--ink-900)">128</b><div class="muted" style="font-size:.72rem">Sesi</div></div>
        <div><b style="font-size:1.3rem;color:var(--ink-900)">#2</b><div class="muted" style="font-size:.72rem">Peringkat</div></div>
        <div><b style="font-size:1.3rem;color:var(--ink-900)">14</b><div class="muted" style="font-size:.72rem">Lencana</div></div>
      </div>
    </div>
    <div class="card col-span-2">
      <div class="card-head"><h3>Lencana Pencapaian</h3></div>
      <div class="grid g-4" style="gap:12px">
        ${["🏅 Anchor Master","🔥 Streak 14 Hari","🎯 Grouping <6cm","🧠 Quiz Jenius","📚 8 Modul","⚡ Quick Learner","🏹 100 Sesi","🥇 Juara Liga"].map((b)=>`
          <div class="card" style="text-align:center;padding:16px 8px;background:var(--surface-2)">
            <div style="font-size:1.8rem">${b.split(" ")[0]}</div>
            <div style="font-size:.72rem;font-weight:700;color:var(--ink-700);margin-top:6px">${b.split(" ").slice(1).join(" ")}</div>
          </div>`).join("")}
      </div>
    </div>
  </div>`;
}
