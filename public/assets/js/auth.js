/* ============================================================
   NovaSport — Auth layer
   Wraps Firebase Auth + a local DEMO fallback (role-based).
   ============================================================ */

import { auth, db, firebaseReady } from "./firebase-config.js";

// Lazy-imported Firebase fns (only when firebaseReady)
let fb = null;
async function loadFb() {
  if (fb) return fb;
  const a = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js");
  const f = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  fb = { ...a, ...f };
  return fb;
}

export const ROLES = {
  siswa: { label: "Siswa / Atlet", home: "/dashboard", color: "#3b65f2", icon: "🎓" },
  guru: { label: "Guru / Pelatih", home: "/guru", color: "#12c4a6", icon: "📋" },
  orang_tua: { label: "Orang Tua", home: "/ortu", color: "#f59e0b", icon: "👪" },
  ahli_gizi: { label: "Ahli Gizi", home: "/gizi", color: "#0ea98e", icon: "🥗" },
  admin_sekolah: { label: "Admin Sekolah", home: "/sekolah", color: "#7b62f7", icon: "🏫" },
  admin_pusat: { label: "Admin Pusat", home: "/pusat", color: "#2549d8", icon: "🌐" },
};

// Demo profiles used in offline / demo mode.
const DEMO_USERS = {
  siswa: { uid: "demo-siswa", name: "Aulia Putri Ramadhani", email: "aulia@novasport.id", role: "siswa", school: "SMP Negeri 2", grade: "Kelas 8B" },
  guru: { uid: "demo-guru", name: "Pak Hendra Wijaya", email: "hendra@novasport.id", role: "guru", school: "SMP Negeri 2" },
  orang_tua: { uid: "demo-ortu", name: "Ibu Siti Nurhaliza", email: "siti@novasport.id", role: "orang_tua", child: "Aulia Putri R." },
  ahli_gizi: { uid: "demo-gizi", name: "Dr. Putu Manarani", email: "putu@novasport.id", role: "ahli_gizi", school: "Sekolah Ragunan" },
  admin_sekolah: { uid: "demo-sekolah", name: "Bapak Rizal Effendi", email: "rizal@novasport.id", role: "admin_sekolah", school: "SKO Ragunan" },
  admin_pusat: { uid: "demo-pusat", name: "Tim Operasi NovaSport", email: "ops@novasport.id", role: "admin_pusat" },
};

const LS_KEY = "novasport.session";
const listeners = new Set();
let current = null;

function emit() { listeners.forEach((cb) => cb(current)); }

export function onAuthChange(cb) {
  listeners.add(cb);
  cb(current);
  return () => listeners.delete(cb);
}

export function getCurrentUser() { return current; }

function persistDemo(user) {
  localStorage.setItem(LS_KEY, JSON.stringify(user));
}

function restoreDemo() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Demo / offline login by role. */
export function demoLogin(role) {
  const user = { ...DEMO_USERS[role], demo: true };
  current = user;
  persistDemo(user);
  emit();
  return user;
}

/** Email/password sign-in (Firebase) with demo fallback. */
export async function signIn(email, password, roleHint) {
  if (firebaseReady) {
    const f = await loadFb();
    const cred = await f.signInWithEmailAndPassword(auth, email, password);
    const profile = await fetchProfile(cred.user.uid);
    current = profile || { uid: cred.user.uid, email, role: roleHint || "siswa", name: email.split("@")[0] };
    emit();
    return current;
  }
  // Demo: accept anything, route by roleHint.
  return demoLogin(roleHint || "siswa");
}

/** Register a new account (Firebase) + create profile doc. */
export async function signUp({ name, email, password, role, school }) {
  if (firebaseReady) {
    const f = await loadFb();
    const cred = await f.createUserWithEmailAndPassword(auth, email, password);
    const profile = { uid: cred.user.uid, name, email, role, school: school || null, createdAt: f.serverTimestamp() };
    await f.setDoc(f.doc(db, "users", cred.user.uid), profile);
    current = profile;
    emit();
    return current;
  }
  return demoLogin(role || "siswa");
}

export async function signOutUser() {
  localStorage.removeItem(LS_KEY);
  current = null;
  if (firebaseReady) {
    const f = await loadFb();
    await f.signOut(auth);
  }
  emit();
}

async function fetchProfile(uid) {
  try {
    const f = await loadFb();
    const snap = await f.getDoc(f.doc(db, "users", uid));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

/** Boot: restore session. */
export async function initAuth() {
  if (firebaseReady) {
    const f = await loadFb();
    return new Promise((resolve) => {
      f.onAuthStateChanged(auth, async (u) => {
        if (u) {
          current = (await fetchProfile(u.uid)) || { uid: u.uid, email: u.email, role: "siswa", name: u.email };
        } else {
          current = restoreDemo(); // demo session may still exist
        }
        emit();
        resolve(current);
      });
    });
  }
  current = restoreDemo();
  emit();
  return current;
}
