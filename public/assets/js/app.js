/* ============================================================
   NovaSport — Application shell, router, login.
   Native ES-module SPA with a hash router and role-based nav.
   ============================================================ */
import { ROLES, onAuthChange, getCurrentUser, demoLogin, signIn, signUp, signOutUser, initAuth } from "./auth.js";
import { initials } from "./demo-data.js";
import { toast } from "./ui.js";
import { icon, resolveIcon, enhanceIcons } from "./icons.js";

import { siswaDashboard, siswaKelas, siswaRiwayat, siswaAnalitik, siswaGizi, siswaJadwal, siswaProfil } from "./views/siswa.js";
import { simulatorView, mountSimulator } from "./views/simulator.js";
import { simHub, runningView, mountRunning, smartSuitView, mountSmartSuit, pistolView, mountPistol } from "./views/sports.js";
import { wearablesView, mountWearables, aiCoachView, mountAiCoach, readinessView } from "./views/extra.js";
import { wearableReadView, mountWearableRead } from "./views/wearable-read.js";
import { guruDashboard, guruKelasSiswa, guruProgram, guruPenilaian, guruMateri } from "./views/guru.js";
import { ortuDashboard, ortuProgres, ortuGizi, ortuLaporan, ortuKomunikasi } from "./views/ortu.js";
import { giziDashboard, mountGizi, giziPeserta, giziPemeriksaan, giziProgram, giziAnalitik } from "./views/gizi.js";
import { sekolahDashboard, sekolahGuruStaf, sekolahSiswaKelas, sekolahKurikulum, sekolahLangganan, sekolahLaporan } from "./views/sekolah.js";
import { pusatDashboard, pusatSekolahMitra, pusatPerangkat, pusatKonten, pusatBilling, pusatAnalitik } from "./views/pusat.js";
import { leaderboardPage, settingsPage } from "./views/shared.js";

window.__nsToast = toast; // used by inline onclick handlers in views

/* ---------- Navigation per role ---------- */
const NAV = {
  siswa: [
    { sec: "Utama" },
    { p: "/dashboard", l: "Dashboard", i: "🏠" },
    { p: "/kelas", l: "Kelas Saya", i: "📚" },
    { p: "/simulator", l: "Simulator Olahraga", i: "🎮", badge: "NEW" },
    { p: "/ai-coach", l: "AI Coach", i: "🧠", badge: "AI" },
    { sec: "Performa" },
    { p: "/riwayat", l: "Riwayat Latihan", i: "🕑" },
    { p: "/analitik", l: "Analitik Performa", i: "📊" },
    { p: "/kesiapan", l: "Kesiapan & Pemulihan", i: "💚" },
    { p: "/gizi", l: "Gizi & Tumbuh Kembang", i: "🥗" },
    { sec: "Lainnya" },
    { p: "/perangkat-saya", l: "Perangkat Saya", i: "📡" },
    { p: "/pembacaan", l: "Pembacaan Sensor", i: "📈", badge: "LIVE" },
    { p: "/jadwal", l: "Jadwal", i: "📅" },
    { p: "/leaderboard", l: "Leaderboard", i: "🏆" },
    { p: "/profil", l: "Profil & Pencapaian", i: "👤" },
  ],
  guru: [
    { sec: "Utama" },
    { p: "/guru", l: "Dashboard", i: "🏠" },
    { p: "/kelas-siswa", l: "Kelas & Siswa", i: "👥" },
    { p: "/program", l: "Program Latihan", i: "🗂️" },
    { sec: "Penilaian" },
    { p: "/penilaian", l: "Penilaian & Rapor", i: "📝" },
    { p: "/materi", l: "Bank Materi", i: "📚" },
    { p: "/analitik-kelas", l: "Analitik Kelas", i: "📊" },
    { sec: "Lainnya" },
    { p: "/pembacaan", l: "Pembacaan Sensor", i: "📈", badge: "LIVE" },
    { p: "/leaderboard", l: "Leaderboard", i: "🏆" },
  ],
  orang_tua: [
    { sec: "Utama" },
    { p: "/ortu", l: "Dashboard", i: "🏠" },
    { p: "/progres", l: "Progres Anak", i: "📈" },
    { p: "/gizi-anak", l: "Gizi & Tumbuh", i: "🥗" },
    { sec: "Lainnya" },
    { p: "/laporan", l: "Laporan & Rapor", i: "📄" },
    { p: "/komunikasi", l: "Komunikasi", i: "💬", badge: "2" },
  ],
  ahli_gizi: [
    { sec: "Utama" },
    { p: "/gizi", l: "Dashboard Gizi", i: "🏠" },
    { p: "/peserta", l: "Peserta Didik", i: "🧒" },
    { p: "/pemeriksaan", l: "Input Pemeriksaan", i: "🩺" },
    { sec: "Program" },
    { p: "/program-gizi", l: "Program Gizi", i: "🥗" },
    { p: "/analitik-gizi", l: "Analitik Gizi", i: "📊" },
  ],
  admin_sekolah: [
    { sec: "Utama" },
    { p: "/sekolah", l: "Dashboard Sekolah", i: "🏠" },
    { p: "/guru-staf", l: "Guru & Staf", i: "👨‍🏫" },
    { p: "/siswa-kelas", l: "Siswa & Kelas", i: "🎓" },
    { sec: "Akademik" },
    { p: "/kurikulum", l: "Kurikulum", i: "📘" },
    { p: "/laporan-sekolah", l: "Laporan", i: "📊" },
    { sec: "Keuangan" },
    { p: "/langganan", l: "Langganan & Billing", i: "💳" },
  ],
  admin_pusat: [
    { sec: "Utama" },
    { p: "/pusat", l: "Dashboard Platform", i: "🏠" },
    { p: "/sekolah-mitra", l: "Sekolah Mitra", i: "🏫" },
    { p: "/perangkat", l: "Perangkat IoT", i: "📡" },
    { sec: "Konten & Keuangan" },
    { p: "/konten", l: "Kurikulum & Konten", i: "📚" },
    { p: "/billing", l: "Billing Global", i: "💰" },
    { p: "/analitik-platform", l: "Analitik Platform", i: "📊" },
  ],
};

/* ---------- Route table: path -> {render, mount} ---------- */
const ROUTES = {
  // Siswa
  "/dashboard": { r: siswaDashboard },
  "/kelas": { r: siswaKelas },
  "/simulator": { r: simHub },
  "/sim/archery": { r: simulatorView, m: mountSimulator },
  "/sim/lari": { r: runningView, m: mountRunning },
  "/sim/suit": { r: smartSuitView, m: mountSmartSuit },
  "/sim/pistol": { r: pistolView, m: mountPistol },
  "/ai-coach": { r: aiCoachView, m: mountAiCoach },
  "/kesiapan": { r: readinessView },
  "/perangkat-saya": { r: wearablesView, m: mountWearables },
  "/pembacaan": { r: wearableReadView, m: mountWearableRead },
  "/riwayat": { r: siswaRiwayat },
  "/analitik": { r: siswaAnalitik },
  "/gizi-siswa": { r: siswaGizi },
  "/jadwal": { r: siswaJadwal },
  "/profil": { r: siswaProfil },
  // Guru
  "/guru": { r: guruDashboard },
  "/kelas-siswa": { r: guruKelasSiswa },
  "/program": { r: guruProgram },
  "/penilaian": { r: guruPenilaian },
  "/materi": { r: guruMateri },
  "/analitik-kelas": { r: siswaAnalitik },
  // Ortu
  "/ortu": { r: ortuDashboard },
  "/progres": { r: ortuProgres },
  "/gizi-anak": { r: ortuGizi },
  "/laporan": { r: ortuLaporan },
  "/komunikasi": { r: ortuKomunikasi },
  // Gizi
  "/gizi": { r: giziDashboard, m: mountGizi },
  "/peserta": { r: giziPeserta },
  "/pemeriksaan": { r: giziPemeriksaan },
  "/program-gizi": { r: giziProgram },
  "/analitik-gizi": { r: giziAnalitik },
  // Sekolah
  "/sekolah": { r: sekolahDashboard },
  "/guru-staf": { r: sekolahGuruStaf },
  "/siswa-kelas": { r: sekolahSiswaKelas },
  "/kurikulum": { r: sekolahKurikulum },
  "/langganan": { r: sekolahLangganan },
  "/laporan-sekolah": { r: sekolahLaporan },
  // Pusat
  "/pusat": { r: pusatDashboard },
  "/sekolah-mitra": { r: pusatSekolahMitra },
  "/perangkat": { r: pusatPerangkat },
  "/konten": { r: pusatKonten },
  "/billing": { r: pusatBilling },
  "/analitik-platform": { r: pusatAnalitik },
  // Shared
  "/leaderboard": { r: leaderboardPage },
  "/pengaturan": { r: settingsPage },
  // Map siswa /gizi nav (conflict) — siswa uses /gizi-siswa via nav fix below
};

// Siswa nav uses /gizi for "Gizi & Tumbuh Kembang"; map it to the siswa view.
NAV.siswa = NAV.siswa.map((n) => (n.p === "/gizi" ? { ...n, p: "/gizi-siswa" } : n));

const app = document.getElementById("app");
let cleanup = null;

/* ---------- Login screen ---------- */
let loginRole = "siswa";
let loginMode = "login"; // 'login' | 'register'

function renderLogin() {
  if (cleanup) { cleanup(); cleanup = null; }
  document.body.classList.remove("app");
  const roleKeys = Object.keys(ROLES);
  app.innerHTML = `
  <div class="auth-wrap">
    <aside class="auth-aside">
      <div class="hero-grid"></div>
      <a href="/" class="logo"><span class="logo-mark">N</span><span class="logo-text"><b>NovaSport</b><span>Sport Education Platform</span></span></a>
      <div>
        <span class="chip chip-glass">⚡ NextGen Simulator · AIoT</span>
        <h2>Digital Sport Education dengan Smart Archery Technology</h2>
        <p>Masuk untuk mengakses simulator, analitik biomekanika, dan ekosistem pembinaan atlet presisi.</p>
        <ul class="auth-points">
          <li><span class="ic">🎯</span> Simulator panahan imersif dengan live scoring</li>
          <li><span class="ic">🧠</span> AI Biomekanika Engine real-time</li>
          <li><span class="ic">📊</span> Analitik performa & rapor digital</li>
        </ul>
      </div>
      <div class="auth-quote">"NovaSport menempatkan data biomekanika ke tangan pelatih daerah — sesuatu yang dulu hanya milik pusat pelatihan nasional."
        <b>— TIM NOVASPORT UNS</b></div>
    </aside>

    <main class="auth-main">
      <div class="auth-card">
        <a href="/" class="back">← Kembali ke beranda</a>
        <h1>${loginMode === "login" ? "Masuk ke NovaSport" : "Daftar Akun Baru"}</h1>
        <p class="sub">${loginMode === "login" ? "Belum punya akun? " : "Sudah punya akun? "}
          <a href="#" id="toggleMode" style="color:var(--brand-600);font-weight:700">${loginMode === "login" ? "Daftar di sini" : "Masuk di sini"}</a></p>

        <div class="err-msg" id="errMsg"></div>

        <label style="font-size:.75rem;font-weight:700;color:var(--ink-600);display:block;margin-bottom:8px">Saya masuk sebagai</label>
        <div class="role-grid" id="roleGrid">
          ${roleKeys.map((k) => `<button class="role-pick ${k === loginRole ? "active" : ""}" data-role="${k}">
            <span class="e">${ROLES[k].icon}</span><span>${ROLES[k].label}</span></button>`).join("")}
        </div>

        <form id="authForm">
          ${loginMode === "register" ? `<div class="field"><label>Nama Lengkap</label><input class="input" id="fName" placeholder="Nama lengkap" required></div>` : ""}
          <div class="field"><label>Email</label><input class="input" id="fEmail" type="email" placeholder="nama@email.com" required></div>
          <div class="field"><label>Kata Sandi <span class="muted" style="font-weight:500">(min. 6 karakter)</span></label><input class="input" id="fPass" type="password" placeholder="••••••••" required></div>
          ${loginMode === "register" ? `<div class="field"><label>Sekolah / Institusi <span class="muted" style="font-weight:500">(opsional)</span></label><input class="input" id="fSchool" placeholder="Nama sekolah"></div>` : ""}
          ${loginMode === "login" ? `<div class="auth-meta"><label style="display:flex;gap:7px;align-items:center;color:var(--ink-600)"><input type="checkbox" checked style="accent-color:var(--brand-500)"> Ingat saya</label><a href="#">Lupa kata sandi?</a></div>` : '<div style="height:8px"></div>'}
          <button class="btn btn-primary btn-block" type="submit">${loginMode === "login" ? "Masuk →" : "Buat Akun →"}</button>
        </form>

        <div class="divider">atau jelajahi sebagai Demo per peran</div>
        <div class="demo-grid">
          ${roleKeys.map((k) => `<button class="demo-btn" data-demo="${k}"><span class="e">${ROLES[k].icon}</span>${ROLES[k].label}</button>`).join("")}
        </div>
      </div>
    </main>
  </div>`;

  enhanceIcons(app);

  // Role selection
  app.querySelectorAll("[data-role]").forEach((b) =>
    b.addEventListener("click", () => {
      loginRole = b.dataset.role;
      app.querySelectorAll(".role-pick").forEach((x) => x.classList.toggle("active", x === b));
    }));

  // Toggle login/register
  document.getElementById("toggleMode").addEventListener("click", (e) => {
    e.preventDefault();
    loginMode = loginMode === "login" ? "register" : "login";
    renderLogin();
  });

  // Demo buttons
  app.querySelectorAll("[data-demo]").forEach((b) =>
    b.addEventListener("click", () => {
      demoLogin(b.dataset.demo);
      goHome();
    }));

  // Submit
  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = document.getElementById("errMsg");
    err.classList.remove("show");
    const email = document.getElementById("fEmail").value.trim();
    const pass = document.getElementById("fPass").value;
    if (pass.length < 6) { err.textContent = "Kata sandi minimal 6 karakter."; err.classList.add("show"); return; }
    try {
      if (loginMode === "register") {
        await signUp({ name: document.getElementById("fName").value.trim(), email, password: pass, role: loginRole, school: document.getElementById("fSchool")?.value });
      } else {
        await signIn(email, pass, loginRole);
      }
      goHome();
    } catch (ex) {
      err.textContent = friendlyError(ex);
      err.classList.add("show");
    }
  });
}

function friendlyError(ex) {
  const c = (ex && ex.code) || "";
  if (c.includes("wrong-password") || c.includes("invalid-credential")) return "Email atau kata sandi salah.";
  if (c.includes("user-not-found")) return "Akun tidak ditemukan. Coba daftar dulu.";
  if (c.includes("email-already")) return "Email sudah terdaftar. Silakan masuk.";
  if (c.includes("invalid-email")) return "Format email tidak valid.";
  return "Terjadi kesalahan. Coba lagi atau gunakan Demo per peran.";
}

function goHome() {
  const u = getCurrentUser();
  location.hash = ROLES[u.role].home;
}

/* ---------- App shell ---------- */
function renderShell(user, path) {
  document.body.classList.add("app");
  const nav = NAV[user.role] || NAV.siswa;
  const role = ROLES[user.role];

  app.innerHTML = `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <a href="/" class="side-brand logo"><span class="logo-mark">N</span><span class="logo-text"><b>NovaSport</b><span>${role.label}</span></span></a>
      <nav id="sideNav">
        ${nav.map((n) => n.sec
          ? `<div class="side-section">${n.sec}</div>`
          : `<a class="nav-item" data-path="${n.p}" href="#${n.p}"><span class="ni-ic">${resolveIcon(n.i, 20)}</span>${n.l}${n.badge ? `<span class="badge ${n.badge === "NEW" || n.badge === "AI" ? "new" : ""}">${n.badge}</span>` : ""}</a>`).join("")}
      </nav>
      <div class="side-foot">
        <div class="side-upgrade">
          <h4>${user.demo ? "Mode Demo Aktif" : "NovaSport Pro"}</h4>
          <p>${user.demo ? "Jelajahi semua fitur tanpa batas." : "Buka analitik lanjutan & avatar 3D."}</p>
          <a href="/#pricing" class="btn btn-light btn-sm btn-block">${user.demo ? "Lihat Paket" : "Upgrade"}</a>
        </div>
        <a class="nav-item" id="logoutBtn" href="#"><span class="ni-ic">${icon("logout", { size: 20 })}</span>Keluar</a>
      </div>
    </aside>
    <div class="backdrop" id="backdrop"></div>

    <div class="main">
      <header class="topbar">
        <button class="menu-btn" id="menuBtn"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button>
        <div class="searchbar"><span class="si">${icon("search", { size: 18 })}</span><input placeholder="Cari siswa, modul, sesi..."></div>
        <div class="top-actions">
          <button class="icon-btn" title="Bahasa">${icon("globe", { size: 20 })}</button>
          <button class="icon-btn" id="notifBtn" title="Notifikasi">${icon("bell", { size: 20 })}<span class="dot"></span></button>
          <button class="icon-btn" title="Pengaturan">${icon("gear", { size: 20 })}</button>
          <a href="#/pengaturan" class="user-pill">
            <div class="avatar">${initials(user.name)}</div>
            <div class="un"><b>${user.name}</b><span>${role.label}</span></div>
          </a>
        </div>
      </header>
      <div class="content" id="content"></div>
    </div>
  </div>`;

  // Sidebar mobile
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("backdrop");
  const closeSide = () => { sidebar.classList.remove("open"); backdrop.classList.remove("show"); };
  document.getElementById("menuBtn").addEventListener("click", () => { sidebar.classList.add("open"); backdrop.classList.add("show"); });
  backdrop.addEventListener("click", closeSide);
  document.getElementById("sideNav").addEventListener("click", (e) => { if (e.target.closest(".nav-item")) closeSide(); });
  document.getElementById("logoutBtn").addEventListener("click", (e) => { e.preventDefault(); signOutUser(); location.hash = "/login"; });
  document.getElementById("notifBtn").addEventListener("click", () => toast("3 notifikasi baru — fitur demo.", ""));

  renderContent(user, path);
}

function renderContent(user, path) {
  if (cleanup) { cleanup(); cleanup = null; }
  const route = ROUTES[path] || ROUTES[ROLES[user.role].home];
  const content = document.getElementById("content");
  content.innerHTML = route.r(user);
  enhanceIcons(content);
  content.scrollTo?.(0, 0);
  window.scrollTo(0, 0);
  // Active nav highlight (sub-routes like /sim/* keep /simulator active)
  document.querySelectorAll(".nav-item[data-path]").forEach((a) => {
    const p = a.dataset.path;
    const on = p === path || (p === "/simulator" && path.startsWith("/sim/"));
    a.classList.toggle("active", on);
  });
  // Mount interactive behaviour
  if (route.m) cleanup = route.m(user) || null;
}

/* ---------- Router ---------- */
let shellRendered = false;
let shellRole = null;

function route() {
  const user = getCurrentUser();
  let path = location.hash.replace(/^#/, "") || "";

  if (!user) {
    shellRendered = false;
    renderLogin();
    return;
  }
  if (path === "/login" || path === "" || path === "/") {
    location.hash = ROLES[user.role].home;
    return;
  }
  // (Re)build shell when role changes or first entry.
  if (!shellRendered || shellRole !== user.role) {
    shellRendered = true;
    shellRole = user.role;
    renderShell(user, path);
  } else {
    renderContent(user, path);
  }
}

/* ---------- Boot ---------- */
(async function boot() {
  await initAuth();
  onAuthChange(() => {
    // If logged out, drop to login.
    if (!getCurrentUser()) { shellRendered = false; renderLogin(); }
  });
  window.addEventListener("hashchange", route);
  route();
})();
