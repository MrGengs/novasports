/* ============================================================
   NovaSport — demo dataset (powers every dashboard offline).
   In production these are replaced by Firestore reads.
   ============================================================ */

export const DEMO = {
  // ---- Shared metrics ----
  performanceTrend: [7.2, 7.6, 7.4, 7.9, 8.1, 8.0, 8.4, 8.3, 8.6, 8.4, 8.7, 8.4],
  accuracyTrend: [62, 65, 64, 70, 73, 71, 78, 80, 83, 81, 88, 86],
  weeks: ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12"],

  // ---- Siswa (athlete) ----
  siswa: {
    program: { name: "Anchor Konsisten", day: 42, total: 90, note: "Pertahankan ritme latihan harian. Capai target grouping di bawah 6 cm minggu ini untuk naik level." },
    kpis: [
      { label: "Kelas LMS Berjalan", value: "4", delta: "+1 minggu ini", dir: "up", icon: "📚", color: "#3b65f2" },
      { label: "Sesi Latihan Bulan Ini", value: "12", delta: "+3 hari lalu", dir: "up", icon: "🎯", color: "#12c4a6" },
      { label: "Rata-rata Performa", value: "8.4", suffix: "/10", delta: "+0.6 vs target", dir: "up", icon: "📈", color: "#f59e0b" },
      { label: "RATG Terdekat (MHO)", value: "-0.4", delta: "+2 dari Ayah", dir: "flat", icon: "🧬", color: "#7b62f7" },
    ],
    sessions: [
      { name: "Recurve 18m Indoor", date: "Hari ini · 14:00", score: "Terjadwal", state: "info" },
      { name: "Anchor Drill — 30 anak panah", date: "Kemarin", score: "137/150", state: "ok" },
      { name: "Stabilitas Tarikan", date: "2 hari lalu", score: "86%", state: "ok" },
      { name: "Recurve 30m Outdoor", date: "4 hari lalu", score: "121/150", state: "warn" },
    ],
    tasks: [
      { name: "Modul: Biomekanika Pelepasan", due: "Tenggat 2 hari", done: false },
      { name: "Kuis: Postur & Pernapasan", due: "Tenggat 5 hari", done: false },
      { name: "Refleksi Sesi 12", due: "Selesai", done: true },
    ],
    achievements: [
      { icon: "🏅", name: "Anchor Master", desc: "30 sesi konsisten" },
      { icon: "🔥", name: "Streak 14 Hari", desc: "Latihan tanpa putus" },
      { icon: "🎯", name: "Grouping < 6cm", desc: "Recurve 18m" },
    ],
  },

  // ---- Simulator ----
  simulator: {
    config: { distance: 18, type: "Recurve", round: "Latihan 30 anak panah", env: "Indoor" },
    live: { score: 137, max: 150, arrowsShot: 15, totalArrows: 30, end: 5, totalEnds: 10 },
    metrics: { duration: "14:32", shots: 15, avg: 9.1, grouping: 5.8, accuracy: 94 },
    ai: { stabilitasTarikan: 86, konsistensiAnchor: 73, kontrolNapas: 81, followThrough: 78 },
    hits: [
      { x: 0.05, y: -0.08, score: 10 }, { x: -0.12, y: 0.06, score: 9 }, { x: 0.18, y: 0.12, score: 9 },
      { x: -0.04, y: -0.14, score: 10 }, { x: 0.09, y: 0.2, score: 8 }, { x: -0.16, y: -0.05, score: 9 },
      { x: 0.02, y: 0.03, score: 10 }, { x: 0.22, y: -0.1, score: 8 }, { x: -0.08, y: 0.16, score: 9 },
      { x: 0.11, y: -0.18, score: 9 }, { x: -0.02, y: -0.02, score: 10 }, { x: 0.14, y: 0.08, score: 9 },
      { x: -0.19, y: 0.11, score: 8 }, { x: 0.06, y: -0.06, score: 10 }, { x: -0.01, y: 0.01, score: 10 },
    ],
  },

  // ---- Guru (coach) ----
  guru: {
    kpis: [
      { label: "Siswa Aktif Binaan", value: "48", delta: "+6 bulan ini", dir: "up", icon: "👥", color: "#3b65f2" },
      { label: "Sesi Perlu Perhatian", value: "7", delta: "-2 dari pekan lalu", dir: "down", icon: "⚠️", color: "#f59e0b" },
      { label: "Sesi Latihan Terjadwal", value: "4", delta: "16 pekan ini", dir: "flat", icon: "📅", color: "#12c4a6" },
      { label: "Tugas Dinilai", value: "8", delta: "-5 dari minggu lalu", dir: "down", icon: "📝", color: "#7b62f7" },
    ],
    classes: [
      { name: "SMP-7A · Panahan Lanjut", students: 14, progress: 78, next: "Sel 14:00" },
      { name: "SMP-8B · Panahan Dasar", students: 18, progress: 62, next: "Rab 15:30" },
      { name: "SMA-10A · Recurve Pro", students: 16, progress: 84, next: "Kam 16:00" },
    ],
    attention: [
      { name: "Raka Saputra", cls: "SMP-8B", perf: 7.2, gizi: "Perlu tindak lanjut", trend: [7.8, 7.5, 7.2, 7.1, 7.2] },
      { name: "Dewi Anjani", cls: "SMP-7A", perf: 6.8, gizi: "Baik", trend: [7.4, 7.1, 6.9, 6.8, 6.8] },
      { name: "Bagas Pratama", cls: "SMA-10A", perf: 7.5, gizi: "Pemantauan", trend: [8.0, 7.8, 7.6, 7.4, 7.5] },
    ],
    roster: [
      { name: "Aulia Putri R.", cls: "SMP-7B", perf: 8.4, acc: 86, status: "ok" },
      { name: "Fariz Putra R.", cls: "SMP-7B", perf: 8.1, acc: 82, status: "ok" },
      { name: "Raka Saputra", cls: "SMP-8B", perf: 7.2, acc: 71, status: "warn" },
      { name: "Dewi Anjani", cls: "SMP-7A", perf: 6.8, acc: 68, status: "danger" },
      { name: "Bagas Pratama", cls: "SMA-10A", perf: 7.5, acc: 74, status: "warn" },
      { name: "Intan Maharani", cls: "SMA-10A", perf: 9.0, acc: 91, status: "ok" },
    ],
  },

  // ---- Orang tua (parent) ----
  ortu: {
    children: [
      { name: "Aulia Putri R.", cls: "SMP Negeri 2 · Kelas 7B", attendance: 93, perf: 8.4, gizi: "Gizi Baik", rapor: "A-", consistency: 92 },
      { name: "Fariz Putra R.", cls: "SD Negeri 5 · Kelas 5A", attendance: 88, perf: 7.9, gizi: "Pemantauan", rapor: "B+", consistency: 84 },
    ],
    weekly: [
      { day: "Sen", sessions: 1, score: 8.2 }, { day: "Sel", sessions: 1, score: 8.5 },
      { day: "Rab", sessions: 0, score: 0 }, { day: "Kam", sessions: 1, score: 8.6 },
      { day: "Jum", sessions: 1, score: 8.4 }, { day: "Sab", sessions: 2, score: 8.8 }, { day: "Min", sessions: 0, score: 0 },
    ],
    reports: [
      { title: "Rapor Bulanan Mei 2026", note: "8 modul selesai · performa stabil", date: "1 Jun 2026" },
      { title: "Laporan Gizi — Triwulan", note: "Z-score membaik (-0.4)", date: "28 Mei 2026" },
      { title: "Catatan Pelatih", note: "Konsistensi anchor meningkat", date: "24 Mei 2026" },
    ],
  },

  // ---- Ahli gizi (nutritionist) ----
  gizi: {
    kpis: [
      { label: "Peserta Didik Dipantau", value: "248", delta: "12 perlu tindak lanjut", dir: "flat", icon: "🧒", color: "#0ea98e" },
      { label: "Gizi Baik", value: "184", suffix: "/248", delta: "+6 dari April", dir: "up", icon: "✅", color: "#16a34a" },
      { label: "Perlu Pemantauan", value: "42", suffix: "/248", delta: "-3 dari April", dir: "down", icon: "👀", color: "#f59e0b" },
      { label: "Berisiko (Stunting/TB-U)", value: "11", suffix: "/248", delta: "-1 dari bulan lalu", dir: "down", icon: "⚠️", color: "#e23b4e" },
    ],
    distribution: [
      { label: "Gizi Baik", value: 184, color: "#16a34a" },
      { label: "Perlu Pemantauan", value: 42, color: "#f59e0b" },
      { label: "Berisiko", value: 22, color: "#e23b4e" },
    ],
    zscoreTrend: [-0.9, -0.85, -0.7, -0.66, -0.6, -0.55, -0.5, -0.46],
    queue: [
      { name: "Raka Saputra", cls: "SMP-8B", flag: "TB/U rendah", z: -1.8, status: "danger" },
      { name: "Sinta Lestari", cls: "SD-5A", flag: "BB/U pemantauan", z: -1.1, status: "warn" },
      { name: "Yoga Pradana", cls: "SMP-7A", flag: "Asupan protein", z: -0.9, status: "warn" },
      { name: "Mira Cahya", cls: "SMA-10A", flag: "Gizi baik", z: 0.2, status: "ok" },
    ],
  },

  // ---- Admin sekolah ----
  sekolah: {
    kpis: [
      { label: "Siswa Aktif", value: "312", delta: "+18 semester ini", dir: "up", icon: "🎓", color: "#3b65f2" },
      { label: "Guru & Staf", value: "24", delta: "+2 bulan ini", dir: "up", icon: "👨‍🏫", color: "#12c4a6" },
      { label: "Kelas Terdaftar", value: "18", delta: "3 dalam draft", dir: "flat", icon: "🏫", color: "#7b62f7" },
      { label: "Paket Langganan", value: "Pro", delta: "Berlaku 30 Jun 2026", dir: "flat", icon: "💳", color: "#f59e0b" },
    ],
    billing: { plan: "NovaSport Pro", price: "Rp14,2 jt", per: "/bulan", detail: "Rp49.000/siswa × 290 aktif berlangganan", usagePct: 93, nextBill: "30 Jun 2026" },
    branches: [
      { name: "Panahan", students: 142, classes: 8 },
      { name: "Menembak", students: 96, classes: 6 },
      { name: "Sport Science", students: 74, classes: 4 },
    ],
    staff: [
      { name: "Pak Hendra Wijaya", role: "Pelatih Panahan", classes: 3, status: "ok" },
      { name: "Bu Maya Anggraini", role: "Guru Sport Science", classes: 2, status: "ok" },
      { name: "Dr. Putu Manarani", role: "Ahli Gizi", classes: 0, status: "ok" },
      { name: "Pak Surya Lesmana", role: "Pelatih Menembak", classes: 2, status: "warn" },
    ],
  },

  // ---- Admin pusat (platform) ----
  pusat: {
    kpis: [
      { label: "Pendapatan Bulan Berjalan", value: "Rp412 jt", delta: "+24% vs April", dir: "up", icon: "💰", color: "#16a34a" },
      { label: "Sekolah Mitra Aktif", value: "11", suffix: "/14", delta: "3 dalam onboarding", dir: "up", icon: "🏫", color: "#3b65f2" },
      { label: "Pengguna Aktif Bulanan", value: "3.420", delta: "+18% MoM", dir: "up", icon: "👥", color: "#12c4a6" },
      { label: "Retensi 30 Hari", value: "86%", delta: "+4 pts", dir: "up", icon: "🔁", color: "#7b62f7" },
    ],
    revenueTrend: [180, 210, 240, 268, 300, 332, 360, 380, 412],
    devices: [
      { id: "SAB-0142", school: "SKO Ragunan", status: "online", battery: 82, lastSync: "5 mnt lalu" },
      { id: "SAB-0143", school: "SMP Negeri 2", status: "online", battery: 64, lastSync: "12 mnt lalu" },
      { id: "SAB-0151", school: "Klub Panah Solo", status: "kalibrasi", battery: 40, lastSync: "1 jam lalu" },
      { id: "SAB-0160", school: "SMA Negeri 4", status: "offline", battery: 0, lastSync: "2 hari lalu" },
    ],
    schools: [
      { name: "SKO Ragunan", plan: "Enterprise", students: 312, mrr: "Rp15,2 jt", health: 96 },
      { name: "SMP Negeri 2", plan: "Pro", students: 168, mrr: "Rp8,2 jt", health: 88 },
      { name: "Klub Panah Solo", plan: "Pro", students: 54, mrr: "Rp5,3 jt", health: 74 },
      { name: "SMA Negeri 4", plan: "Starter", students: 90, mrr: "Rp2,2 jt", health: 61 },
    ],
  },

  // ---- Leaderboard (shared) ----
  leaderboard: [
    { rank: 1, name: "Intan Maharani", club: "SMA-10A", score: 1482, you: false },
    { rank: 2, name: "Aulia Putri R.", club: "SMP-7B", score: 1437, you: true },
    { rank: 3, name: "Bagas Pratama", club: "SMA-10A", score: 1390, you: false },
    { rank: 4, name: "Fariz Putra R.", club: "SMP-7B", score: 1355, you: false },
    { rank: 5, name: "Dewi Anjani", club: "SMP-7A", score: 1298, you: false },
  ],

  // ---- LMS modules / content ----
  modules: [
    { title: "Dasar Biomekanika Panahan", lessons: 8, progress: 100, level: "Dasar", icon: "🧬" },
    { title: "Teknik Anchor & Pelepasan", lessons: 6, progress: 70, level: "Menengah", icon: "🎯" },
    { title: "Pernapasan & Fokus Mental", lessons: 5, progress: 40, level: "Menengah", icon: "🧘" },
    { title: "Gizi untuk Atlet Presisi", lessons: 7, progress: 20, level: "Dasar", icon: "🥗" },
    { title: "Analisis Data Performa", lessons: 9, progress: 0, level: "Lanjut", icon: "📊" },
    { title: "Etika & Keselamatan Lapangan", lessons: 4, progress: 100, level: "Dasar", icon: "🛡️" },
  ],

  schedule: [
    { day: "Senin", items: [{ t: "14:00", n: "Recurve 18m Indoor", who: "Pak Hendra" }] },
    { day: "Selasa", items: [{ t: "15:30", n: "Anchor Drill", who: "Pak Hendra" }, { t: "17:00", n: "Modul Biomekanika", who: "Mandiri" }] },
    { day: "Rabu", items: [] },
    { day: "Kamis", items: [{ t: "16:00", n: "Recurve 30m Outdoor", who: "Pak Hendra" }] },
    { day: "Jumat", items: [{ t: "15:00", n: "Simulasi Kompetisi", who: "Klub" }] },
  ],
};

/** Helper: produce initials for an avatar. */
export function initials(name = "?") {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}
