// localCrypto.js — encrypts patient PHI before it touches localStorage.
//
// Why: LegalPages.jsx's Privacy Policy claims encryption at rest, but the
// local browser cache (PatientDatabase.jsx) previously wrote full patient
// records -- name, DOB, clinical notes -- as plain JSON. This closes that
// gap for the *patients* cache specifically (see PatientDatabase.jsx).
//
// The key is derived from the live Supabase session's access token and held
// only in memory (this module-level variable) -- never written to disk
// itself. This protects against someone with the raw browser profile/disk
// but no active login (a stolen laptop, a shared computer, malware reading
// files at rest). It does NOT protect against someone already running JS as
// the logged-in user -- no client-side scheme can. The Privacy Policy wording
// should describe exactly this, not more.

let _key = null;

async function deriveKey(accessToken) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(accessToken));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function setSessionKey(accessToken) {
  if (!accessToken) { _key = null; return; }
  try { _key = await deriveKey(accessToken); }
  catch (e) { console.error("[localCrypto] key derivation failed:", e); _key = null; }
}

export function clearSessionKey() { _key = null; }
export function hasSessionKey() { return !!_key; }

function bufToBase64(buf) {
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
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
  if (!_key || !envelope || !envelope.__enc) return null;
  try {
    const iv = base64ToBuf(envelope.iv);
    const ct = base64ToBuf(envelope.ct);
    const data = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, _key, ct);
    return JSON.parse(new TextDecoder().decode(data));
  } catch (e) {
    console.error("[localCrypto] decrypt failed:", e);
    return null;
  }
}

export function isEncryptedEnvelope(parsed) {
  return !!(parsed && typeof parsed === "object" && !Array.isArray(parsed) && parsed.__enc === 1);
}
