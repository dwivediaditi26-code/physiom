// localCrypto.js — encrypts patient PHI before it touches localStorage.
//
// Why: LegalPages.jsx's Privacy Policy claims encryption at rest, but the
// local browser cache (PatientDatabase.jsx) previously wrote full patient
// records -- name, DOB, clinical notes -- as plain JSON. This closes that
// gap for the *patients* cache specifically (see PatientDatabase.jsx).
//
// The key is a random AES key made once per signed-in account on this device and
// kept in the browser's own key storage (IndexedDB) as a NON-EXPORTABLE key: the
// page's code can use it to lock and unlock, but cannot read its bytes out. It is
// deleted when the person signs out or deletes their account, which makes the
// saved copy unreadable (see forgetDeviceCopy in PatientDatabase.jsx).
//
// It used to be derived from the sign-in token. That token is replaced about once an
// hour, so a student who came back later could not open their own saved copy and had
// to wait for every patient to download again -- the slow part of starting the app on
// a weak connection (2026-10-08). The token-derived key is still used (a) to open a
// copy locked the old way, once, and (b) as the fallback when the browser will not
// give us key storage (some private windows), so this is never worse than before.
//
// What this protects: someone who only gets hold of the stored files (a lost or
// stolen device, a shared computer). What it does not: anyone who can run the app on
// the device while the person is signed in -- no client-side scheme can. The Privacy
// Policy wording should describe exactly this, not more.

let _key = null;       // the key in use
let _oldKey = null;    // token-derived key, only to open a copy locked the old way
let _openedWithOld = false;

async function deriveKey(accessToken) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(accessToken));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// ── The device's key storage ─────────────────────────────────────────────────
// get(id) -> key | undefined; addIfAbsent(id, key) -> the key that is stored (ours,
// or the one another tab stored first); remove(id). Swappable so tests need no browser
// database.
const DB_NAME = "pm_device_keys";
const STORE = "keys";

function openKeyDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("key storage blocked"));
  });
}
function request(db, mode, run) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    let result;
    const req = run(tx.objectStore(STORE));
    req.onsuccess = () => { result = req.result; };
    req.onerror = (e) => { e.preventDefault?.(); reject(req.error); };
    tx.oncomplete = () => resolve(result);
    tx.onabort = () => reject(tx.error);
  });
}
const browserKeyStore = {
  async get(id) {
    const db = await openKeyDb();
    try { return await request(db, "readonly", (s) => s.get(id)); } finally { db.close(); }
  },
  async addIfAbsent(id, key) {
    const db = await openKeyDb();
    try {
      try { await request(db, "readwrite", (s) => s.add(key, id)); return key; }
      catch { return (await request(db, "readonly", (s) => s.get(id))) || key; } // another tab got there first
    } finally { db.close(); }
  },
  async remove(id) {
    const db = await openKeyDb();
    try { await request(db, "readwrite", (s) => s.delete(id)); } finally { db.close(); }
  },
};
let keyStore = browserKeyStore;
let keyStorageWaitMs = 4000; // how long to wait for the browser's key storage before giving up on it
export function setKeyStoreForTests(store, waitMs = 4000) { keyStore = store || browserKeyStore; keyStorageWaitMs = waitMs; }

const withTimeout = (promise, ms) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error("key storage timed out")), ms)),
]);

async function deviceKeyFor(userId) {
  const existing = await keyStore.get(userId);
  if (existing) return existing;
  // extractable = false: the page can use the key but never read its bytes out
  const fresh = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return (await keyStore.addIfAbsent(userId, fresh)) || fresh;
}

// accessToken: the current sign-in token. userId: whose copy this is. With a userId the
// device key is used; without one (or if the browser will not give us key storage) the
// token-derived key is used, exactly as before.
export async function setSessionKey(accessToken, userId) {
  _openedWithOld = false;
  if (!accessToken && !userId) { _key = null; _oldKey = null; return; }
  _oldKey = null;
  if (accessToken) {
    try { _oldKey = await deriveKey(accessToken); }
    catch (e) { console.error("[localCrypto] key derivation failed:", e); }
  }
  if (userId) {
    try { _key = await withTimeout(deviceKeyFor(userId), keyStorageWaitMs); return; }
    catch (e) { console.warn("[localCrypto] no device key storage, using the sign-in token instead:", e?.message || e); }
  }
  _key = _oldKey;
}

// Makes this device forget the account's key: the saved copy can no longer be opened.
export async function clearDeviceKey(userId) {
  _key = null; _oldKey = null;
  if (!userId) return;
  try { await withTimeout(keyStore.remove(userId), keyStorageWaitMs); } catch { /* nothing stored, or no storage: nothing to forget */ }
}

export function clearSessionKey() { _key = null; _oldKey = null; }
export function hasSessionKey() { return !!_key; }
// True when the copy just opened was locked the old way (with the sign-in token), so the
// caller should lock it again with the current key.
export function openedWithOldKey() { return _openedWithOld; }

function bufToBase64(buf) {
  // In slices: one character at a time is slow for the several MB a few documents add up to.
  const bytes = new Uint8Array(buf);
  const parts = [];
  for (let i = 0; i < bytes.length; i += 0x8000) parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)));
  return btoa(parts.join(""));
}
function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// Returns an envelope object ({__enc:1, iv, ct}) ready to JSON.stringify and
// store, or null if there's no session key (caller should fall back to
// storing plaintext -- e.g. Guest Mode, which has no session at all).
export async function encryptJSON(value) {
  if (!_key) return null;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const data = enc.encode(JSON.stringify(value));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, _key, data);
  return { __enc: 1, iv: bufToBase64(iv), ct: bufToBase64(ct) };
}

// Returns the decrypted value, or null on any failure (no key yet, wrong
// key, corrupt/tampered envelope) -- callers must treat null as "not
// available right now", not as "empty", so they don't overwrite real data.
export async function decryptJSON(envelope) {
  _openedWithOld = false;
  if (!_key || !envelope || !envelope.__enc) return null;
  const open = async (key) => {
    const iv = base64ToBuf(envelope.iv);
    const ct = base64ToBuf(envelope.ct);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct)));
  };
  try {
    return await open(_key);
  } catch (e) {
    if (_oldKey && _oldKey !== _key) {
      try { const value = await open(_oldKey); _openedWithOld = true; return value; } catch { /* fall through */ }
    }
    console.error("[localCrypto] decrypt failed:", e);
    return null;
  }
}

export function isEncryptedEnvelope(parsed) {
  return !!(parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.__enc === 1);
}
