/* NovaSport — small UI utilities (toast, etc.) */

let wrap;
export function toast(msg, kind = "") {
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.className = "toast-wrap";
    document.body.appendChild(wrap);
  }
  const el = document.createElement("div");
  el.className = "toast " + kind;
  el.innerHTML = `<span>${kind === "ok" ? "✓" : kind === "warn" ? "⚠" : "ℹ"}</span><span>${msg}</span>`;
  wrap.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .3s, transform .3s";
    el.style.opacity = "0";
    el.style.transform = "translateY(8px)";
    setTimeout(() => el.remove(), 300);
  }, 2600);
}
