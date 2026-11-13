/* ============================================================
   NovaSport — Firebase initialization (modular SDK via CDN)
   ------------------------------------------------------------
   1. Create a Firebase project at https://console.firebase.google.com
   2. Add a Web App, copy the config below.
   3. Enable Authentication → Email/Password (and Anonymous for demo).
   4. Create a Firestore database.
   5. Run:  firebase deploy
   ------------------------------------------------------------
   The app runs fully in DEMO MODE even without valid keys:
   if Firebase fails to init, auth.js falls back to local demo
   accounts so the product can be explored offline.
   ============================================================ */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔑 Live project keys (web API keys are safe to expose client-side).
export const firebaseConfig = {
  apiKey: "AIzaSyCjf6kchumyZLVtJaPgcLG2eRTb-FcW25I",
  authDomain: "nova-sport-id.firebaseapp.com",
  projectId: "nova-sport-id",
  storageBucket: "nova-sport-id.firebasestorage.app",
  messagingSenderId: "68379132607",
  appId: "1:68379132607:web:74b2bb5eb71c2813187c0a",
};

let app = null;
let auth = null;
let db = null;
let firebaseReady = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
  // Heuristic: treat the placeholder key as "not configured".
  firebaseReady = !firebaseConfig.apiKey.includes("DEMO-REPLACE");
} catch (err) {
  console.warn("[NovaSport] Firebase not initialized — running in demo mode.", err);
  firebaseReady = false;
}

export { app, auth, db, firebaseReady };
