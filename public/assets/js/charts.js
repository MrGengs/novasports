/* ============================================================
   NovaSport — tiny dependency-free SVG chart helpers.
   Each returns an SVG string you can drop into innerHTML.
   ============================================================ */

const BRAND = "#3b65f2";
const TEAL = "#12c4a6";

function scale(vals, h, pad = 6) {
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  return vals.map((v) => h - pad - ((v - min) / span) * (h - pad * 2));
}

/** Smooth area+line chart. data: number[] */
export function areaChart(data, opts = {}) {
  const w = opts.w || 520, h = opts.h || 160, color = opts.color || BRAND;
  const ys = scale(data, h, 12);
  const step = w / (data.length - 1);
  const pts = ys.map((y, i) => [i * step, y]);
  const id = "g" + Math.random().toString(36).slice(2, 7);
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const area = d + ` L${w},${h} L0,${h} Z`;
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" width="100%" height="${h}">
    <defs><linearGradient id="${id}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="${color}" stop-opacity=".26"/>
      <stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${id})"/>
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
    ${pts.map((p, i) => i === pts.length - 1 ? `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#fff" stroke="${color}" stroke-width="2.6"/>` : "").join("")}
  </svg>`;
}

/** Sparkline (thin, no axes). */
export function sparkline(data, color = TEAL, w = 120, h = 38) {
  const ys = scale(data, h, 4);
  const step = w / (data.length - 1);
  const d = ys.map((y, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y.toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><path d="${d}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

/** Bar chart. data: {label, value}[] */
export function barChart(data, opts = {}) {
  const w = opts.w || 520, h = opts.h || 170, color = opts.color || BRAND;
  const max = Math.max(...data.map((d) => d.value)) || 1;
  const bw = (w / data.length) * 0.5;
  const gap = w / data.length;
  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}">
    ${data.map((d, i) => {
      const bh = (d.value / max) * (h - 30);
      const x = i * gap + (gap - bw) / 2;
      const y = h - 22 - bh;
      const c = opts.highlight === i ? color : (opts.muted || "#c9d6f7");
      return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="5" fill="${c}"/>
        <text x="${x + bw / 2}" y="${h - 6}" font-size="10" fill="#9099b8" text-anchor="middle">${d.label}</text>`;
    }).join("")}
  </svg>`;
}

/** Donut ring with center label. */
export function donut(percent, opts = {}) {
  const size = opts.size || 120, sw = opts.stroke || 12, color = opts.color || BRAND;
  const r = (size - sw) / 2, c = 2 * Math.PI * r, off = c * (1 - percent / 100);
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${opts.track || "#e7ebf5"}" stroke-width="${sw}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}"
      stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"
      transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="48%" font-size="${opts.fs || 22}" font-weight="800" fill="#0c1430" text-anchor="middle" dominant-baseline="middle">${opts.label ?? percent + "%"}</text>
    ${opts.sub ? `<text x="50%" y="64%" font-size="10" fill="#9099b8" text-anchor="middle">${opts.sub}</text>` : ""}
  </svg>`;
}

/** Multi-segment donut. segs: {value,color,label}[] */
export function donutMulti(segs, opts = {}) {
  const size = opts.size || 150, sw = opts.stroke || 16;
  const r = (size - sw) / 2, c = 2 * Math.PI * r;
  const total = segs.reduce((a, s) => a + s.value, 0) || 1;
  let acc = 0;
  const circles = segs.map((s) => {
    const frac = s.value / total;
    const dash = `${frac * c} ${c}`;
    const off = -acc * c;
    acc += frac;
    return `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
      stroke-dasharray="${dash}" stroke-dashoffset="${off}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
  }).join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#eef1f9" stroke-width="${sw}"/>
    ${circles}
    ${opts.center ? `<text x="50%" y="46%" font-size="20" font-weight="800" fill="#0c1430" text-anchor="middle">${opts.center}</text>
      <text x="50%" y="60%" font-size="10" fill="#9099b8" text-anchor="middle">${opts.centerSub || ""}</text>` : ""}
  </svg>`;
}

/** Archery target with arrow hits. hits: {x,y,score}[] in -1..1 coords */
export function archeryTarget(hits = [], size = 230) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 4;
  const rings = [
    { r: R, fill: "#ffffff", stroke: "#cdd6ea" },
    { r: R * 0.8, fill: "#0c1430", stroke: "#0c1430" },
    { r: R * 0.6, fill: "#2596e8", stroke: "#2596e8" },
    { r: R * 0.4, fill: "#e23b4e", stroke: "#e23b4e" },
    { r: R * 0.2, fill: "#f7b733", stroke: "#f59e0b" },
  ];
  return `<svg viewBox="0 0 ${size} ${size}" width="100%" height="100%" style="max-width:${size}px;margin:0 auto;display:block">
    ${rings.map((g) => `<circle cx="${cx}" cy="${cy}" r="${g.r}" fill="${g.fill}" stroke="${g.stroke}" stroke-width="1"/>`).join("")}
    <line x1="${cx}" y1="${cy - R}" x2="${cx}" y2="${cy + R}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
    <line x1="${cx - R}" y1="${cy}" x2="${cx + R}" y2="${cy}" stroke="rgba(255,255,255,.25)" stroke-width="1"/>
    ${hits.map((hit, i) => {
      const x = cx + hit.x * R * 0.92, y = cy + hit.y * R * 0.92;
      const last = i === hits.length - 1;
      return `<circle cx="${x}" cy="${y}" r="${last ? 6 : 4.5}" fill="${last ? "#7ff0d2" : "#ffffff"}" stroke="#0c1430" stroke-width="1.4"/>`;
    }).join("")}
  </svg>`;
}

/** Horizontal bar / gauge row helper (returns HTML, not SVG). */
export function gaugeRow(label, value, color = BRAND) {
  return `<div style="margin-bottom:14px">
    <div style="display:flex;justify-content:space-between;font-size:.8rem;margin-bottom:6px">
      <span style="color:var(--ink-600);font-weight:600">${label}</span>
      <b style="color:var(--ink-900)">${value}%</b>
    </div>
    <div class="progress"><i style="width:${value}%;background:${color}"></i></div>
  </div>`;
}
