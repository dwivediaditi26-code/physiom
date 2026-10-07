// patientSyncState.js -- what the cloud already has, so a save sends only what changed.
//
// Before this, every save re-sent the WHOLE patient list in one request. That
// gets slower with every patient and every attached file, and a single refused
// or oversized record made the entire request fail. It also let a stale copy on
// one phone overwrite a newer edit made on another phone, because even
// untouched patients were sent again.
//
// Now each patient gets a short "fingerprint" of the fields we upload (name, data,
// red-flag mark, last diagnosis). A save sends only the patients whose fingerprint
// is not the one we last confirmed in the cloud. The confirmed fingerprints are
// remembered per signed-in user in localStorage (tiny: one short text per patient).
// Nothing here talks to the network; PatientDatabase.jsx does the upload.

// JSON with object keys in a fixed order, so the same content always gives the same
// text. (A row read back from the database lists its keys in a different order than
// the one we built locally; plain JSON.stringify would call those two "different".)
export function stableStringify(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map((v) => stableStringify(v === undefined ? null : v)).join(",") + "]";
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(value[k])).join(",") + "}";
}

// cyrb53: a fast 53-bit text hash (collisions are not a realistic worry at this size).
export function hashString(str) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// The fields a save uploads, with the same defaults the upload uses. Timestamps are
// left out on purpose: re-saving an untouched patient only moves updatedAt, which is
// not a change worth uploading.
export function fingerprintOf(p) {
  return hashString(stableStringify({
    name: p?.name || "Unknown",
    data: p?.data || {},
    hasRedFlags: Boolean(p?.hasRedFlags),
    lastDx: p?.lastDx || "",
  }));
}

// The same fingerprint for a row as it comes back from the database.
export function fingerprintOfRow(r) {
  return fingerprintOf({ name: r?.name, data: r?.data, hasRedFlags: r?.has_red_flags, lastDx: r?.last_dx });
}

/* ---------------- confirmed fingerprints, remembered per user ---------------- */

const stateKey = (userId) => `physio_sync_state_v1_${userId || "anon"}`;
const memory = new Map();

function load(userId) {
  if (memory.has(userId)) return memory.get(userId);
  let map = {};
  try {
    const raw = localStorage.getItem(stateKey(userId));
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) map = parsed;
  } catch { /* unreadable: start empty, which only means "send everything once" */ }
  memory.set(userId, map);
  return map;
}

function persist(userId) {
  try { localStorage.setItem(stateKey(userId), JSON.stringify(memory.get(userId) || {})); } catch { /* memory copy still works */ }
}

export function syncedPrint(userId, patientId) {
  return load(userId)[patientId];
}

export function recordSynced(userId, entries) {
  const map = load(userId);
  for (const [id, print] of entries) map[id] = print;
  persist(userId);
}

// What the cloud just told us it holds (called after a read): those records need no upload
// until they are edited here.
export function recordCloudRows(userId, rows) {
  if (!userId || !Array.isArray(rows) || rows.length === 0) return;
  recordSynced(userId, rows.filter((r) => r && r.id).map((r) => [r.id, fingerprintOfRow(r)]));
}

export function forgetSynced(userId) {
  memory.delete(userId);
  try { localStorage.removeItem(stateKey(userId)); } catch { /* ignore */ }
}

// Test helper: drop the in-memory copy so the next read comes from localStorage.
export function _resetSyncMemory() {
  memory.clear();
}

/* ---------------- splitting an upload into small requests ---------------- */

// rows: [{ id, data, ... }]. Groups of at most `maxRows` patients and about `maxChars` of text,
// so one request never carries the whole list (or several big attachments) at once. A single
// patient bigger than the limit still goes, alone.
export function planBatches(items, { maxRows = 10, maxChars = 1_500_000 } = {}) {
  const batches = [];
  let current = [];
  let size = 0;
  for (const item of items) {
    const itemSize = JSON.stringify(item.row?.data ?? {}).length + 300;
    if (current.length > 0 && (current.length >= maxRows || size + itemSize > maxChars)) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(item);
    size += itemSize;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

// "The phone could not reach the server" (as opposed to the server refusing a record). supabase-js
// reports a failed fetch as an error with an empty code; a refusal carries a database code.
export function looksLikeNetworkError(error) {
  if (!error) return false;
  if (typeof TypeError !== "undefined" && error instanceof TypeError) return true;
  const code = error.code === undefined || error.code === null ? "" : String(error.code);
  return code === "" && /fetch|network|load failed|timed? ?out|abort|offline/i.test(String(error.message || ""));
}
