/* NovaSport — game panahan 3D (sudut pandang pemanah).
   Kamera = arah busur (yaw/pitch dari IMU), pin sight di tengah layar = titik bidik.
   Koordinat tembakan sama dengan papan skor: x,y ∈ [-1,1] relatif jari-jari face (y positif = ke bawah). */
import * as THREE from "../../vendor/three/three.module.min.js";

const EYE = 1.5;                       // tinggi mata & pusat target (m)
const RINGS = ["#f4f4f0", "#f4f4f0", "#1d1d22", "#1d1d22", "#2f8ee8", "#2f8ee8", "#e5372f", "#e5372f", "#f7c51e", "#f7c51e"];
const LANES = [-8, -4, 0, 4, 8];
const DEG = Math.PI / 180;

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
const faceTex = () => canvasTex(1024, 1024, (g, S) => {
  const R = S / 2;
  RINGS.forEach((col, i) => {
    g.beginPath(); g.arc(R, R, R * (1 - i / 10) - 1, 0, Math.PI * 2); g.fillStyle = col; g.fill();
    g.lineWidth = 2.5; g.strokeStyle = i === 2 || i === 3 ? "#d9d9d9" : "#222"; g.stroke();
  });
  g.beginPath(); g.arc(R, R, R * 0.05, 0, Math.PI * 2); g.lineWidth = 2; g.strokeStyle = "#333"; g.stroke();
  g.fillStyle = "#222"; g.fillRect(R - 7, R - 1, 14, 2); g.fillRect(R - 1, R - 7, 2, 14);
});
const strawTex = () => canvasTex(256, 256, (g, S) => {
  g.fillStyle = "#c9a35c"; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * S, y = Math.random() * S, a = (Math.random() - 0.5) * 0.9, l = 6 + Math.random() * 16;
    g.strokeStyle = Math.random() < 0.5 ? "rgba(120,86,30,.45)" : "rgba(240,214,150,.5)"; g.lineWidth = 1 + Math.random();
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
  }
});
const grassTex = () => canvasTex(256, 256, (g, S) => {
  g.fillStyle = "#5e9e3f"; g.fillRect(0, 0, S / 2, S); g.fillStyle = "#69ab48"; g.fillRect(S / 2, 0, S / 2, S);
  for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? "40,80,20" : "170,210,120"},.18)`; g.fillRect(Math.random() * S, Math.random() * S, 2, 2); }
}, [40, 60]);
const skyTex = () => canvasTex(4, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, "#4f97f0"); gr.addColorStop(0.55, "#a9d2ff"); gr.addColorStop(1, "#e4f1ff");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});

export class ArcheryGame {
  /** @param {HTMLElement} host  elemen pembungkus; canvas ditambahkan sebagai lapisan paling bawah */
  constructor(host) {
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    this.renderer.autoClear = false;
    const cv = this.renderer.domElement;
    Object.assign(cv.style, { position: "absolute", inset: "0", width: "100%", height: "100%", borderRadius: "inherit", display: "block" });
    host.prepend(cv);

    this.aim = null; this.cur = { yaw: 0, pitch: 0 }; this.kick = 0; this.draw = 0; this.ready = 1;
    this.flying = []; this.stuck = []; this.onImpact = null; this.dist = 18; this.faceR = 1;
    this._buildWorld(); this._buildBow();
    this.setDistance(18, 3.2);

    this._ro = new ResizeObserver(() => this._resize()); this._ro.observe(host); this._resize();
    this._t = performance.now();
    const loop = (t) => { this._raf = requestAnimationFrame(loop); this._frame(Math.min(0.05, (t - this._t) / 1000), t / 1000); this._t = t; };
    this._raf = requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------------ dunia
  _buildWorld() {
    const s = (this.scene = new THREE.Scene());
    s.background = skyTex();
    s.fog = new THREE.Fog(0xdcecff, 70, 320);
    s.add(new THREE.HemisphereLight(0xe6f2ff, 0x4f7d34, 1.25));
    const sun = new THREE.DirectionalLight(0xfff1d8, 1.7); sun.position.set(-30, 60, 25); s.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 900), new THREE.MeshLambertMaterial({ map: grassTex() }));
    ground.rotation.x = -Math.PI / 2; ground.position.z = -300; s.add(ground);

    const white = new THREE.MeshBasicMaterial({ color: 0xf5f7f2 });
    const strip = (z, w, d) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), white); m.rotation.x = -Math.PI / 2; m.position.set(0, 0.012, z); s.add(m); };
    strip(-1, 34, 0.1);                                           // garis tembak
    [10, 18, 30, 50, 70, 90].forEach((d) => strip(-d, 34, 0.06));  // garis jarak
    [-10, -6, -2, 2, 6, 10].forEach((x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 95), white); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.011, -48.5); s.add(m); });   // batas lane

    // pagar tanaman, pohon, bukit
    const hedge = new THREE.MeshLambertMaterial({ color: 0x2f6b2c });
    [-17, 17].forEach((x) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 260), hedge); m.position.set(x, 1.3, -120); s.add(m); });
    const trunkG = new THREE.CylinderGeometry(0.22, 0.32, 3, 6), leafG = new THREE.IcosahedronGeometry(2.6, 0);
    const trunkM = new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), leafM = [0x2e7d32, 0x3f8f3a, 0x285f2a].map((c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 90; i++) {
      const side = i % 2 ? 1 : -1, x = side * (21 + rnd() * 45), z = 15 - rnd() * 280, k = 0.8 + rnd() * 0.9;
      const tr = new THREE.Mesh(trunkG, trunkM); tr.position.set(x, 1.5 * k, z); tr.scale.setScalar(k); s.add(tr);
      const lf = new THREE.Mesh(leafG, leafM[i % 3]); lf.position.set(x, 4.2 * k, z); lf.scale.set(k, k * 1.25, k); s.add(lf);
    }
    const hillM = new THREE.MeshLambertMaterial({ color: 0x6f9d63, flatShading: true });
    [[-120, -420, 90], [40, -460, 120], [190, -400, 80]].forEach(([x, z, r]) => { const h = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 8), hillM); h.scale.y = 0.35; h.position.set(x, -8, z); s.add(h); });

    // target: boss jerami + face, satu per lane (lane tengah = milik pemain)
    const face = faceTex(), straw = new THREE.MeshLambertMaterial({ map: strawTex() });
    const faceM = new THREE.MeshBasicMaterial({ map: face }), legM = new THREE.MeshLambertMaterial({ color: 0x5b4126 });
    const bossG = new THREE.BoxGeometry(2.3, 2.3, 0.45), faceG = new THREE.CircleGeometry(1, 96), legG = new THREE.BoxGeometry(0.09, 1.9, 0.09);
    this.targets = LANES.map((x) => {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(bossG, straw));
      const f = new THREE.Mesh(faceG, faceM); f.position.z = 0.24; g.add(f);
      [-0.8, 0.8].forEach((lx) => { const l = new THREE.Mesh(legG, legM); l.position.set(lx, -1.25, -0.45); l.rotation.x = -0.35; g.add(l); });
      g.userData.x = x; s.add(g); return g;
    });
    this.main = this.targets[2];
    this.hitRoot = new THREE.Group(); this.main.add(this.hitRoot);   // panah yang menancap ikut target
    const net = new THREE.Mesh(new THREE.PlaneGeometry(36, 5), new THREE.MeshLambertMaterial({ color: 0x23402a, transparent: true, opacity: 0.85 }));
    net.position.y = 2.5; s.add(net); this.net = net;

    // geometri panah (ujung di z=0, menghadap +z → dipakai dengan lookAt)
    const shaft = new THREE.CylinderGeometry(0.011, 0.011, 0.78, 8); shaft.rotateX(Math.PI / 2); shaft.translate(0, 0, -0.39);
    const tip = new THREE.ConeGeometry(0.02, 0.06, 8); tip.rotateX(Math.PI / 2); tip.translate(0, 0, -0.01);
    const vane = new THREE.PlaneGeometry(0.05, 0.13); vane.rotateX(Math.PI / 2); vane.translate(0.035, 0, -0.68);
    this.arrowParts = {
      shaft, tip, vane,
      shaftM: new THREE.MeshLambertMaterial({ color: 0x1f2a44 }), tipM: new THREE.MeshLambertMaterial({ color: 0xb8c0cc }),
      vaneM: [0xff3b6b, 0x2f7bff, 0xffd23f].map((c) => new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })),
    };
    this.cam = new THREE.PerspectiveCamera(20, 1, 0.3, 900);
    this.cam.rotation.order = "YXZ"; this.cam.position.set(0, EYE, 0);
  }

  _arrow(vanes = true) {
    const a = this.arrowParts, g = new THREE.Group();
    g.add(new THREE.Mesh(a.shaft, a.shaftM), new THREE.Mesh(a.tip, a.tipM));
    for (let i = 0; vanes && i < 3; i++) { const v = new THREE.Mesh(a.vane, a.vaneM[i ? 1 + (i % 2) : 0]); v.rotation.z = (i * 2 * Math.PI) / 3; g.add(v); }
    return g;
  }

  // ------------------------------------------------------------------ busur (lapisan depan, kamera sendiri)
  _buildBow() {
    const s = (this.bowScene = new THREE.Scene());
    s.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4));
    const d = new THREE.DirectionalLight(0xffffff, 1.2); d.position.set(1, 2, 2); s.add(d);
    this.bowCam = new THREE.PerspectiveCamera(55, 1, 0.01, 10);
    const bow = (this.bow = new THREE.Group()); bow.position.set(-0.24, -0.02, -0.97); s.add(bow);
    const metal = new THREE.MeshStandardMaterial({ color: 0x2b3448, metalness: 0.6, roughness: 0.35 });
    const accent = new THREE.MeshStandardMaterial({ color: 0x2f7bff, metalness: 0.3, roughness: 0.4 });
    const riser = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.05), metal); bow.add(riser);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.07), new THREE.MeshStandardMaterial({ color: 0x151a24, roughness: 0.9 })); grip.position.set(0, -0.06, 0.02); bow.add(grip);
    this.limbs = [1, -1].map((sg) => {
      const m = new THREE.Mesh(new THREE.BufferGeometry(), accent); bow.add(m); return { sg, m };
    });
    // sight: batang ke depan-kanan + ring dan pin tepat di garis bidik (x=0,y=0 kamera)
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.283), metal); bar.position.set(-0.12, -0.03, -1.045); bar.rotation.y = Math.atan2(0.24, -0.15); s.add(bar);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.028, 0.004, 8, 40), metal); ring.position.set(0, 0.0, -1.12); s.add(ring);
    const pin = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 12, 8), new THREE.MeshBasicMaterial({ color: 0x39ff9a })); pin.position.set(0, 0, -1.12); s.add(pin);
    const pinPost = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.028), metal); pinPost.position.set(0, -0.016, -1.12); s.add(pinPost);
    this.sightBits = [ring, pin, pinPost];
    this.string = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0xf2f2f2 }));
    s.add(this.string);
    this.nocked = this._arrow(false); s.add(this.nocked);   // bulu panah terlalu dekat kamera → disembunyikan
  }

  _poseBow(draw) {
    const flex = draw * 0.07;
    const tipW = (sg) => new THREE.Vector3(-0.24, -0.02 + sg * (0.74 - flex * 0.4), -0.75 + flex);
    this.limbs.forEach(({ sg, m }) => {
      const pts = [[0, 0.21, 0], [0, 0.42, -0.07 + flex * 0.3], [0, 0.63, -0.04 + flex * 0.8], [0, 0.76 - flex * 0.4, 0.22 + flex]]
        .map(([x, y, z]) => new THREE.Vector3(x, sg * y, z));
      m.geometry.dispose(); m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.013, 6);
    });
    const nock = new THREE.Vector3(-0.24 + 0.18 * draw, -0.02 - 0.09 * draw, -0.75 + 0.62 * draw);
    this.string.geometry.setFromPoints([tipW(1), nock, tipW(-1)]);
    const rest = new THREE.Vector3(-0.225, 0.0, -0.99);
    const dir = rest.clone().sub(nock).normalize();
    this.nocked.position.copy(nock.clone().add(dir.multiplyScalar(0.8)));
    this.nocked.lookAt(nock.clone().add(rest.clone().sub(nock).normalize().multiplyScalar(2)));
    this.nocked.visible = this.ready >= 1;
  }

  // ------------------------------------------------------------------ API
  /** jarak (m) dan aimSpan (derajat: sudut dari pusat ke tepi face) — zoom mengikuti jarak */
  setDistance(dist, spanDeg) {
    this.dist = dist; this.span = spanDeg;
    this.faceR = dist * Math.tan(spanDeg * DEG);
    this.targets.forEach((g) => { g.position.set(g.userData.x, EYE, -dist); g.scale.setScalar(this.faceR); });
    this.net.position.z = -dist - 7;
    this.cam.fov = Math.max(9, Math.min(40, spanDeg * 6)); this.cam.updateProjectionMatrix();
    this.clear();
  }
  setAim(aim) { this.aim = aim; }
  setDraw(d) { this.draw = Math.max(0, Math.min(1, d || 0)); }
  clear() { this.flying.forEach((f) => this.scene.remove(f.obj)); this.flying = []; this.hitRoot.clear(); }

  /** lepaskan panah ke titik kena (hit.x/y sama dengan papan skor) */
  shoot(hit, speed) {
    const obj = this._arrow(); obj.scale.setScalar(1.6); this.scene.add(obj);
    this.cam.updateMatrixWorld();
    const start = new THREE.Vector3(-0.05, -0.15, -2).applyMatrix4(this.cam.matrixWorld);
    obj.visible = false;   // baru tampak setelah menjauh (dekat kamera + zoom → bulu panah memenuhi layar)
    const R = this.faceR;
    const end = new THREE.Vector3(this.main.position.x + hit.x * R, EYE - hit.y * R, -this.dist + 0.24 * R);
    const T = Math.max(0.35, Math.min(1.6, this.dist / (speed || 45)));
    this.flying.push({ obj, start, end, T, t: 0, H: (9.81 * T * T) / 8, hit, miss: Math.hypot(hit.x, hit.y) > 1.12 });
    this.ready = 0; this.kick = 1;
  }

  _pos(f, u) { return f.start.clone().lerp(f.end, u).add(new THREE.Vector3(0, 4 * f.H * u * (1 - u), 0)); }

  _frame(dt, time) {
    // bidikan: sensor → halus; tanpa sensor → goyangan napas kecil
    const tgt = this.aim || { yaw: Math.sin(time * 0.7) * this.span * 0.12, pitch: Math.sin(time * 0.53 + 1) * this.span * 0.1 };
    const k = this.aim ? 0.45 : 0.08;
    this.cur.yaw += (tgt.yaw - this.cur.yaw) * k; this.cur.pitch += (tgt.pitch - this.cur.pitch) * k;
    this.kick = Math.max(0, this.kick - dt * 3.5);
    this.cam.rotation.set((this.cur.pitch + this.kick * this.span * 0.35) * DEG, -this.cur.yaw * DEG, 0);
    this.ready = Math.min(1, this.ready + dt * 1.6);
    this._poseBow(this.ready < 1 ? 0 : this.draw);
    this.bow.rotation.z = -this.kick * 0.05;

    for (let i = this.flying.length - 1; i >= 0; i--) {
      const f = this.flying[i]; f.t += dt;
      const u = Math.min(1, f.t / f.T), p = this._pos(f, u), q = this._pos(f, Math.min(1, u + 0.01) + (u >= 1 ? 0.01 : 0));
      f.obj.position.copy(p); f.obj.visible = u >= 1 || p.distanceTo(f.start) > 3 + this.dist * 0.22; f.obj.lookAt(u >= 1 ? p.clone().add(p.clone().sub(this._pos(f, 0.99))) : q);
      if (u >= 1) {
        this.flying.splice(i, 1);
        if (f.miss) { f.obj.position.add(new THREE.Vector3(0, 0, -6.5 - 0.24 * this.faceR)); }   // lolos ke jaring
        else {      // pindah ke hitRoot (koordinat lokal target) dan tancapkan 6 cm
          this.scene.remove(f.obj); this.main.worldToLocal(f.obj.position); f.obj.scale.setScalar(1.6 / this.faceR);
          f.obj.position.z -= 0.06 / this.faceR; this.hitRoot.add(f.obj); this.main.userData.shake = 1;
        }
        this.onImpact?.(f.hit);
      }
    }
    const sh = this.main.userData.shake || 0;
    if (sh > 0) { this.main.userData.shake = Math.max(0, sh - dt * 4); this.main.rotation.y = Math.sin(time * 60) * sh * 0.012; }
    const r = this.renderer; r.clear(); r.render(this.scene, this.cam); r.clearDepth(); r.render(this.bowScene, this.bowCam);
  }

  _resize() {
    const w = this.host.clientWidth, h = this.host.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.cam.aspect = this.bowCam.aspect = w / h; this.cam.updateProjectionMatrix(); this.bowCam.updateProjectionMatrix();
  }

  dispose() {
    cancelAnimationFrame(this._raf); this._ro.disconnect();
    this.renderer.dispose(); this.renderer.domElement.remove();
  }
}
