/* ============================================================
   NovaSport — shared views available to every role
   ============================================================ */
import { DEMO } from "../demo-data.js";
import { pageHead, kpiRow } from "./components.js";
import { ROLES } from "../auth.js";

export function leaderboardPage() {
  const rows = [...DEMO.leaderboard,
    { rank: 6, name: "Yoga Pradana", club: "SMP-7A", score: 1240, you: false },
    { rank: 7, name: "Sinta Lestari", club: "SD-5A", score: 1188, you: false },
    { rank: 8, name: "Mira Cahya", club: "SMA-10A", score: 1142, you: false }];
  return `
  ${pageHead("Kompetisi / Leaderboard", "🏆 NovaSport League", "Peringkat daring antar pengguna lintas klub & sekolah.",
    `<div class="tabs"><button class="active">Nasional</button><button data-noop>Sekolahku</button><button data-noop>Pekan Ini</button></div>`)}
  <div class="grid g-3" style="margin-bottom:18px">
    ${DEMO.leaderboard.slice(0,3).map((r,i)=>`<div class="card center" style="${i===0?'border-color:var(--gold-400);box-shadow:0 0 0 3px rgba(247,183,51,.18)':''}">
      <div style="font-size:2rem">${["🥇","🥈","🥉"][i]}</div>
      <div class="avatar lg" style="margin:8px auto">${r.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
      <h3 style="color:var(--ink-900)">${r.name}</h3><p class="muted" style="font-size:.78rem">${r.club}</p>
      <div style="font-size:1.4rem;font-weight:800;color:var(--brand-600);margin-top:6px">${r.score.toLocaleString("id-ID")} pts</div>
    </div>`).join("")}
  </div>
  <div class="card">
    <div class="table-wrap"><table class="tbl">
      <thead><tr><th>#</th><th>Atlet</th><th>Klub</th><th>Poin</th><th>Tren</th></tr></thead>
      <tbody>${rows.map((r)=>`<tr ${r.you?'style="background:var(--brand-50)"':''}>
        <td><b style="color:${r.rank<=3?'var(--gold-500)':'var(--ink-500)'}">${r.rank}</b></td>
        <td><div class="u"><div class="avatar sm">${r.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div><b style="color:var(--ink-900)">${r.name} ${r.you?'<span class="pill info">Kamu</span>':''}</b></div></td>
        <td>${r.club}</td><td><b>${r.score.toLocaleString("id-ID")}</b></td>
        <td><span class="pill ${r.rank%2?'ok':'muted'}">${r.rank%2?'▲ naik':'– tetap'}</span></td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

export function settingsPage(user) {
  const role = ROLES[user.role];
  return `
  ${pageHead("Akun / Pengaturan", "Pengaturan", "Kelola profil, preferensi, dan keamanan akun.")}
  <div class="grid g-3">
    <div class="card center">
      <div class="avatar lg" style="margin:6px auto 12px;width:84px;height:84px;font-size:1.7rem">${user.name.split(" ").map(w=>w[0]).slice(0,2).join("")}</div>
      <h3 style="color:var(--ink-900)">${user.name}</h3>
      <p class="muted" style="font-size:.8rem">${user.email || ""}</p>
      <span class="pill info" style="margin-top:10px">${role.icon} ${role.label}</span>
      ${user.demo?'<p class="muted" style="font-size:.72rem;margin-top:10px">Mode Demo — data tidak disimpan permanen</p>':''}
    </div>
    <div class="card col-span-2">
      <div class="card-head"><h3>Informasi Profil</h3></div>
      <div class="field-row"><div class="field"><label>Nama Lengkap</label><input class="input" value="${user.name}"></div><div class="field"><label>Email</label><input class="input" value="${user.email||''}"></div></div>
      <div class="field-row"><div class="field"><label>Sekolah / Institusi</label><input class="input" value="${user.school||user.child||'-'}"></div><div class="field"><label>Peran</label><input class="input" value="${role.label}" disabled></div></div>
      <div class="field"><label>Bahasa</label><select class="input"><option>Bahasa Indonesia</option><option>English</option></select></div>
      <button class="btn btn-primary" onclick="window.__nsToast&&window.__nsToast('Profil diperbarui.','ok')">Simpan Perubahan</button>
    </div>
  </div>
  <div class="grid g-2" style="margin-top:18px">
    <div class="card"><div class="card-head"><h3>Notifikasi</h3></div>
      ${["Pengingat jadwal latihan","Hasil analisis AI","Pesan dari pelatih","Update leaderboard"].map((n,i)=>`<div class="list-row"><div class="lr-main"><b>${n}</b></div><label style="position:relative;display:inline-block;width:42px;height:24px"><input type="checkbox" ${i<3?'checked':''} style="opacity:0;width:0;height:0" onchange="this.nextElementSibling.style.background=this.checked?'var(--brand-500)':'var(--ink-200)';this.nextElementSibling.firstElementChild.style.transform=this.checked?'translateX(18px)':'none'"><span style="position:absolute;inset:0;background:${i<3?'var(--brand-500)':'var(--ink-200)'};border-radius:999px;transition:.2s"><span style="position:absolute;top:3px;left:3px;width:18px;height:18px;background:#fff;border-radius:50%;transition:.2s;transform:${i<3?'translateX(18px)':'none'}"></span></span></label></div>`).join("")}
    </div>
    <div class="card"><div class="card-head"><h3>Keamanan</h3></div>
      <div class="field"><label>Kata Sandi Baru</label><input class="input" type="password" placeholder="••••••••"></div>
      <div class="field"><label>Konfirmasi</label><input class="input" type="password" placeholder="••••••••"></div>
      <button class="btn btn-outline">Perbarui Kata Sandi</button>
    </div>
  </div>`;
}
