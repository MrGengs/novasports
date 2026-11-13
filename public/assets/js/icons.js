/* ============================================================
   NovaSport — Animated SVG icon library (line-art + SMIL).
   Replaces emoji chrome with consistent animated icons.
   Usage:  icon("home")  ·  icon("target", {size:22})
           resolveIcon("🏹", 24)   // emoji -> animated icon
   ============================================================ */

const S = (inner, { size = 22, vb = 24, cls = "" } = {}) =>
  `<svg class="nsi ${cls}" width="${size}" height="${size}" viewBox="0 0 ${vb} ${vb}" fill="none"
     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
     aria-hidden="true">${inner}</svg>`;

// Each icon is a function(opts) -> svg string. Animations via SMIL.
const I = {
  home: (o) => S(`<g><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/>
    <path d="M10 19.5v-5h4v5"><animate attributeName="opacity" values=".4;1;.4" dur="2.6s" repeatCount="indefinite"/></path></g>`, o),

  // ---- generic, with a small looping accent ----
  game: (o) => S(`<rect x="2.5" y="7" width="19" height="11" rx="4"/>
    <path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1"/><circle cx="18.5" cy="14" r="1">
      <animate attributeName="opacity" values="1;.3;1" dur="1.4s" repeatCount="indefinite"/></circle>
    <circle cx="16" cy="11.5" r="1"><animate attributeName="opacity" values=".3;1;.3" dur="1.4s" repeatCount="indefinite"/></circle>`, o),

  book: (o) => S(`<path d="M4 4.5h10a3 3 0 0 1 3 3V20a2.5 2.5 0 0 0-2.5-2.5H4z"/>
    <path d="M20 4.5h-2a3 3 0 0 0-3 3"><animate attributeName="opacity" values=".4;1;.4" dur="2.4s" repeatCount="indefinite"/></path>`, o),

  clock: (o) => S(`<circle cx="12" cy="12" r="8.5"/>
    <g><line x1="12" y1="12" x2="12" y2="7.5"/>
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="6s" repeatCount="indefinite"/></g>
    <g><line x1="12" y1="12" x2="15.5" y2="12"/>
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="2.2s" repeatCount="indefinite"/></g>`, o),

  chart: (o) => S(`<path d="M4 20h16"/>
    <rect x="5.5" y="12" width="3" height="6" rx="1"><animate attributeName="height" values="6;11;6" dur="2.2s" repeatCount="indefinite"/><animate attributeName="y" values="12;7;12" dur="2.2s" repeatCount="indefinite"/></rect>
    <rect x="10.5" y="9" width="3" height="9" rx="1"><animate attributeName="height" values="9;5;9" dur="2.2s" begin="-.7s" repeatCount="indefinite"/><animate attributeName="y" values="9;13;9" dur="2.2s" begin="-.7s" repeatCount="indefinite"/></rect>
    <rect x="15.5" y="6" width="3" height="12" rx="1"><animate attributeName="height" values="12;8;12" dur="2.2s" begin="-1.4s" repeatCount="indefinite"/><animate attributeName="y" values="6;10;6" dur="2.2s" begin="-1.4s" repeatCount="indefinite"/></rect>`, o),

  trend: (o) => S(`<polyline points="3,16 9,10 13,13 21,5"><animate attributeName="stroke-dasharray" values="0 40;40 0" dur="2s" repeatCount="indefinite"/></polyline>
    <polyline points="16,5 21,5 21,10"/>`, o),

  heart: (o) => S(`<g transform-origin="12 12"><path d="M12 20s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.4-7 10-7 10z"/>
    <animateTransform attributeName="transform" type="scale" values="1;1.14;1;1.08;1" dur="1.3s" repeatCount="indefinite" additive="sum"/>
    </g>`, o),

  leaf: (o) => S(`<g><path d="M5 19c0-8 6-13 14-13 0 8-6 13-14 13z"/><path d="M5 19C9 13 12 11 16 9.5"/>
    <animateTransform attributeName="transform" type="rotate" values="-4 12 19;4 12 19;-4 12 19" dur="3.2s" repeatCount="indefinite"/></g>`, o),

  wifi: (o) => S(`<path d="M2.5 9a14 14 0 0 1 19 0"><animate attributeName="opacity" values=".3;1;.3" dur="1.8s" repeatCount="indefinite"/></path>
    <path d="M5.5 12.2a9.5 9.5 0 0 1 13 0"><animate attributeName="opacity" values=".3;1;.3" dur="1.8s" begin="-.3s" repeatCount="indefinite"/></path>
    <path d="M8.5 15.4a5 5 0 0 1 7 0"><animate attributeName="opacity" values=".3;1;.3" dur="1.8s" begin="-.6s" repeatCount="indefinite"/></path>
    <circle cx="12" cy="18.5" r="1.1" fill="currentColor" stroke="none"/>`, o),

  calendar: (o) => S(`<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M3.5 9h17M8 3v4M16 3v4"/>
    <circle cx="8.5" cy="13.5" r="1.2" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.6s" repeatCount="indefinite"/></circle>
    <circle cx="12" cy="13.5" r="1.2" fill="currentColor" stroke="none"><animate attributeName="opacity" values=".2;1;.2" dur="1.6s" begin="-.5s" repeatCount="indefinite"/></circle>`, o),

  trophy: (o) => S(`<path d="M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M7 6H4.5a3 3 0 0 0 3 3M17 6h2.5a3 3 0 0 1-3 3"/>
    <path d="M12 13v3M9 20h6M10 20l.5-4h3l.5 4"/>
    <line x1="9.5" y1="6.5" x2="14.5" y2="9.5" stroke-width="1.4" opacity="0"><animate attributeName="opacity" values="0;.9;0" dur="2.4s" repeatCount="indefinite"/></line>`, o),

  user: (o) => S(`<circle cx="12" cy="8" r="3.6"/><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"/>
    <animate attributeName="opacity" values=".82;1;.82" dur="3s" repeatCount="indefinite"/>`, o),

  cap: (o) => S(`<path d="M12 4 22 9l-10 5L2 9z"/><path d="M6 11v4c0 1.6 2.7 3 6 3s6-1.4 6-3v-4"/>
    <line x1="22" y1="9" x2="22" y2="14"/><circle cx="22" cy="15" r="1" fill="currentColor" stroke="none"><animate attributeName="cy" values="15;16.5;15" dur="2s" repeatCount="indefinite"/></circle>`, o),

  target: (o) => S(`<circle cx="12" cy="12" r="9"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="14s" repeatCount="indefinite"/></circle>
    <circle cx="12" cy="12" r="5.5"/>
    <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"><animate attributeName="r" values="2;2.7;2" dur="1.4s" repeatCount="indefinite"/></circle>`, o),

  run: (o) => S(`<circle cx="15" cy="5" r="1.8"/><path d="M14 9l-3 2 1 4-2 4M14 9l3 1 2 3M9 12l-3-1M12 15l3 1"/>
    <g opacity="0"><path d="M3 8h3M2 12h3M3 16h3" stroke-width="1.4"/>
      <animate attributeName="opacity" values="0;.8;0" dur="1s" repeatCount="indefinite"/></g>`, o),

  suit: (o) => S(`<rect x="8" y="3" width="8" height="6" rx="2"/><path d="M12 9v5M9 14h6l1 6H8z"/>
    <circle cx="10.5" cy="5.5" r="1" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle>
    <circle cx="13.5" cy="5.5" r="1" fill="currentColor" stroke="none"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" repeatCount="indefinite"/></circle>`, o),

  clipboard: (o) => S(`<rect x="5" y="4.5" width="14" height="16" rx="3"/><rect x="9" y="2.8" width="6" height="3.4" rx="1.4"/>
    <path d="M8.5 11h7M8.5 14.5h5"><animate attributeName="opacity" values=".4;1;.4" dur="2.2s" repeatCount="indefinite"/></path>`, o),

  people: (o) => S(`<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"/>
    <circle cx="17" cy="8" r="2.4" opacity=".75"><animate attributeName="opacity" values=".4;.9;.4" dur="2.6s" repeatCount="indefinite"/></circle>
    <path d="M15 14.2c2.6.2 5 1.9 5 4.8" opacity=".75"/>`, o),

  doc: (o) => S(`<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>
    <path d="M9 12h6M9 15.5h6M9 8.5h2"><animate attributeName="opacity" values=".4;1;.4" dur="2.2s" repeatCount="indefinite"/></path>`, o),

  list: (o) => S(`<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1.4" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" repeatCount="indefinite"/></circle>
    <circle cx="4" cy="12" r="1.4" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" begin="-.4s" repeatCount="indefinite"/></circle>
    <circle cx="4" cy="18" r="1.4" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.3;1" dur="1.6s" begin="-.8s" repeatCount="indefinite"/></circle>`, o),

  money: (o) => S(`<g><ellipse cx="12" cy="12" rx="8.5" ry="8.5"/><path d="M12 7.5v9M9.5 9.5c0-1.2 1.1-2 2.5-2s2.5.8 2.5 2-1.1 1.8-2.5 1.8-2.5.8-2.5 2 1.1 2 2.5 2 2.5-.8 2.5-2"/>
    <animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;0.18 1;1 1" dur="3.4s" repeatCount="indefinite"/></g>`, o),

  card: (o) => S(`<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M2.5 9.5h19"/>
    <path d="M6 14h4" stroke-width="2.4"><animate attributeName="opacity" values="1;.3;1" dur="1.8s" repeatCount="indefinite"/></path>`, o),

  school: (o) => S(`<path d="M12 3 21 8v2H3V8zM5 10v9M19 10v9M3 19h18"/><path d="M9 19v-4h6v4"/>
    <circle cx="12" cy="7" r="1" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite"/></circle>`, o),

  globe: (o) => S(`<circle cx="12" cy="12" r="9"/><g><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="16s" repeatCount="indefinite"/></g>`, o),

  child: (o) => S(`<circle cx="12" cy="7.5" r="3"/><path d="M7 20c0-3.3 2.2-5.5 5-5.5s5 2.2 5 5.5"/>
    <animateTransform attributeName="transform" type="translate" values="0 0;0 -1;0 0" dur="2.4s" repeatCount="indefinite"/>`, o),

  pulse: (o) => S(`<path d="M3 12h4l2-5 3 10 2-5h7"><animate attributeName="stroke-dasharray" values="0 40;40 0" dur="1.6s" repeatCount="indefinite"/></path>`, o),

  bell: (o) => S(`<g><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 19a2 2 0 0 0 4 0"/>
    <animateTransform attributeName="transform" type="rotate" values="-8 12 5;8 12 5;-8 12 5" dur="2.6s" repeatCount="indefinite"/></g>`, o),

  search: (o) => S(`<g><circle cx="11" cy="11" r="6.5"/><line x1="16" y1="16" x2="20.5" y2="20.5"/>
    <animateTransform attributeName="transform" type="translate" values="0 0;1 1;0 0" dur="2.4s" repeatCount="indefinite"/></g>`, o),

  logout: (o) => S(`<path d="M14 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8"/>
    <g><path d="M12 12h9M17 8l4 4-4 4"/><animateTransform attributeName="transform" type="translate" values="0 0;2 0;0 0" dur="1.6s" repeatCount="indefinite"/></g>`, o),

  gear: (o) => S(`<g><circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.5 5.5l-2 2M7.5 16.5l-2 2M18.5 18.5l-2-2M7.5 7.5l-2-2"/>
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="9s" repeatCount="indefinite"/></g>`, o),

  spark: (o) => S(`<g><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>
    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="180 12 12" dur="6s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values=".6;1;.6" dur="1.8s" repeatCount="indefinite"/></g>`, o),

  chat: (o) => S(`<path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 20 16.5H9l-4.5 3.5V16.5A1.5 1.5 0 0 1 3 15V7a1.5 1.5 0 0 1 1-1.5z"/>
    <circle cx="9" cy="11" r="1" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" repeatCount="indefinite"/></circle>
    <circle cx="12.5" cy="11" r="1" fill="currentColor" stroke="none"><animate attributeName="opacity" values=".2;1;.2" dur="1.2s" begin="-.4s" repeatCount="indefinite"/></circle>
    <circle cx="16" cy="11" r="1" fill="currentColor" stroke="none"><animate attributeName="opacity" values="1;.2;1" dur="1.2s" begin="-.8s" repeatCount="indefinite"/></circle>`, o),

  flame: (o) => S(`<g><path d="M12 3c1 3-2 4-2 7a2 2 0 0 0 4 0c0-1 0-1 0-1 1 1 2 2.5 2 4a4 4 0 0 1-8 0c0-4 4-6 4-10z"/>
    <animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1.05 .94;1 1" dur="1.1s" repeatCount="indefinite"/></g>`, o),

  shield: (o) => S(`<path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z"/><path d="M9 12l2 2 4-4"><animate attributeName="opacity" values=".3;1;.3" dur="2s" repeatCount="indefinite"/></path>`, o),
};

export function icon(name, opts = {}) {
  const fn = I[name];
  return fn ? fn(opts) : "";
}

const EMOJI = {
  "🏠": "home", "📚": "book", "📘": "book", "📖": "book", "🎮": "game", "🧠": "spark", "🤖": "spark",
  "🕑": "clock", "🕒": "clock", "📊": "chart", "📈": "trend", "💚": "heart", "❤️": "heart", "❤": "heart",
  "🥗": "leaf", "🥦": "leaf", "📡": "wifi", "📅": "calendar", "🏆": "trophy", "👤": "user", "🎓": "cap",
  "🎯": "target", "🏹": "target", "🔫": "target", "🏃": "run", "🦾": "suit", "🗂️": "list", "📋": "clipboard",
  "👥": "people", "👨‍🏫": "people", "📝": "doc", "📄": "doc", "💰": "money", "💳": "card", "🏫": "school",
  "🌐": "globe", "🧒": "child", "🩺": "pulse", "🔔": "bell", "🔍": "search", "↩": "logout", "⚙": "gear",
  "⚙️": "gear", "⚡": "spark", "💬": "chat", "🔥": "flame", "🛡️": "shield", "✅": "shield", "💡": "spark",
};

/** Resolve an emoji to its animated icon, or return the emoji unchanged. */
export function resolveIcon(emoji, size = 22) {
  const name = EMOJI[emoji];
  return name ? icon(name, { size }) : `<span style="font-size:${size * 0.9}px;line-height:1">${emoji}</span>`;
}

/**
 * Scan a DOM subtree and swap emoji-only icon tiles (.stat-ic, .ic) for
 * animated SVG icons. Lets every view stay emoji-authored while rendering
 * a consistent animated icon set. Skips tiles that already hold an SVG.
 */
export function enhanceIcons(root = document) {
  const tiles = root.querySelectorAll(".stat-ic, .seg .ic, .feat .ic, .tech-card .ic, .auth-points .ic");
  tiles.forEach((el) => {
    if (el.querySelector("svg")) return; // already an icon
    const txt = (el.textContent || "").trim();
    const name = EMOJI[txt];
    if (!name) return;
    // size from box width (fallback 24), capped for tidy line-art
    const w = el.getBoundingClientRect().width || 44;
    const size = Math.max(18, Math.min(28, Math.round(w * 0.52)));
    el.innerHTML = icon(name, { size });
  });
}
