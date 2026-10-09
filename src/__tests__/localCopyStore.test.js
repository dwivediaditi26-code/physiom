// The saved copy of the patients on the phone must still be saved when documents are attached
// (localStorage holds only about 5 MB in total), and typing must not rewrite it on every keystroke.
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("../supabase.js", () => ({ supabase: { from: vi.fn(), auth: {} } }));

import { setSessionKey, clearSessionKey, setKeyStoreForTests } from "../localCrypto.js";
import { setCopyStoreForTests } from "../localCopyStore.js";
import {
  savePatientDBLocalOnly, savePatientDBLocalSoon, loadPatientDB, hydrateLocalCache, clearPatientCache,
  forgetDeviceCopy, setCopyWriteTimingForTests,
} from "../PatientDatabase.jsx";

const UID = "user-1";
const KEY = "physio_patient_db_v1_" + UID;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const list = (note = "x") => [{ id: "p1", name: "Asha Rao", data: { dem_name: "Asha Rao", note }, updatedAt: "2026-10-09T00:00:00Z" }];
// about 3 MB of text, like a few attached photos
const withDocuments = () => [{ id: "p1", name: "Asha Rao", data: { dem_name: "Asha Rao", uploaded_docs: [{ id: "d1", name: "scan.pdf", dataUrl: "data:application/pdf;base64," + "A".repeat(3 * 1024 * 1024) }] }, updatedAt: "2026-10-09T00:00:00Z" }];

function memoryCopyStore({ writeDelayMs = 0 } = {}) {
  const map = new Map();
  const store = {
    map, writes: [],
    read: async (id) => map.get(id),
    write: async (id, value) => { store.writes.push(id); if (writeDelayMs) await sleep(writeDelayMs); map.set(id, value); },
    remove: async (id) => { map.delete(id); },
  };
  return store;
}
const noDatabase = { read: async () => { throw new Error("no db"); }, write: async () => { throw new Error("no db"); }, remove: async () => { throw new Error("no db"); } };

// What a reload does: forget everything in memory, sign back in, read the copy on disk.
async function reload() {
  clearPatientCache();
  clearSessionKey();
  await setSessionKey("any-token", UID);
  await hydrateLocalCache(UID);
  return loadPatientDB(UID);
}

let store;
let quota;
beforeEach(() => {
  store = memoryCopyStore();
  setCopyStoreForTests(store);
  setKeyStoreForTests(null); // no browser key storage in the test: the token key is used
  setKeyStoreForTests({ get: async () => { throw new Error("none"); }, addIfAbsent: async () => { throw new Error("none"); }, remove: async () => {} }, 20);
  localStorage.clear();
  localStorage.setItem("pm_cleared_demo_v5", "1");
  localStorage.setItem("pm_seeded_v2026-06c", "1");
  clearPatientCache();
  clearSessionKey();
  setCopyWriteTimingForTests(30, 120);
  // localStorage that is "full" for anything over 1 MB, like a real one holding a few documents
  const realSet = localStorage.setItem.bind(localStorage);
  quota = vi.spyOn(localStorage, "setItem").mockImplementation((k, v) => {
    if (String(v).length > 1024 * 1024) { const e = new Error("full"); e.name = "QuotaExceededError"; throw e; }
    return realSet(k, v);
  });
});
afterEach(() => { quota.mockRestore(); setCopyWriteTimingForTests(); });

describe("documents no longer stop the saved copy from being kept", () => {
  it("a copy bigger than localStorage can hold is saved and opens again", async () => {
    await setSessionKey("any-token", UID);
    await savePatientDBLocalOnly(withDocuments(), UID);
    expect(store.map.has(UID)).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(await reload()).toEqual(withDocuments());
  });

  it("without a device database it falls back to localStorage, as before", async () => {
    setCopyStoreForTests(noDatabase);
    await setSessionKey("any-token", UID);
    await savePatientDBLocalOnly(list("small"), UID);
    expect(localStorage.getItem(KEY)).toBeTruthy();
    expect(await reload()).toEqual(list("small"));
  });
});

describe("a copy from the old place", () => {
  it("is opened and moved to the device database", async () => {
    setCopyStoreForTests(noDatabase);
    await setSessionKey("any-token", UID);
    await savePatientDBLocalOnly(list("old"), UID); // lands in localStorage
    expect(localStorage.getItem(KEY)).toBeTruthy();

    setCopyStoreForTests(store); // the browser now has a device database
    expect(await reload()).toEqual(list("old"));
    expect(store.map.has(UID)).toBe(true);
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(await reload()).toEqual(list("old")); // and it opens from the new place
  });
});

describe("forgetting the copy", () => {
  it("removes it from both places and cancels a write that was waiting", async () => {
    await setSessionKey("any-token", UID);
    await savePatientDBLocalOnly(list("kept"), UID);
    savePatientDBLocalSoon(list("typing"), UID); // a write is now waiting
    await forgetDeviceCopy(UID);
    await sleep(80);
    expect(store.map.has(UID)).toBe(false);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("typing does not rewrite the whole copy on every keystroke", () => {
  it("many quick changes become one write of the newest list, and memory is current at once", async () => {
    await setSessionKey("any-token", UID);
    for (let i = 1; i <= 25; i++) savePatientDBLocalSoon(list(`v${i}`), UID);
    expect(loadPatientDB(UID)).toEqual(list("v25")); // in memory immediately
    expect(store.writes.length).toBe(0);              // nothing written yet
    await sleep(150);
    expect(store.writes.length).toBe(1);
    expect(await reload()).toEqual(list("v25"));
  });

  it("long typing is still written now and then, not only at the end", async () => {
    await setSessionKey("any-token", UID);
    for (let i = 1; i <= 12; i++) { savePatientDBLocalSoon(list(`v${i}`), UID); await sleep(20); }
    expect(store.writes.length).toBeGreaterThanOrEqual(1); // within ~240 ms of constant typing, the 120 ms cap kicked in
    await sleep(120);
    expect(await reload()).toEqual(list("v12"));
  });

  it("closing or hiding the page writes what was waiting", async () => {
    setCopyWriteTimingForTests(5000, 5000);
    await setSessionKey("any-token", UID);
    savePatientDBLocalSoon(list("last words"), UID);
    expect(store.writes.length).toBe(0);
    window.dispatchEvent(new Event("pagehide"));
    await sleep(80);
    expect(store.writes.length).toBe(1);
    expect(await reload()).toEqual(list("last words"));
  });

  it("an older write that finishes late can never replace a newer one", async () => {
    store = memoryCopyStore({ writeDelayMs: 40 });
    setCopyStoreForTests(store);
    await setSessionKey("any-token", UID);
    const first = savePatientDBLocalOnly(list("older"), UID);
    const second = savePatientDBLocalOnly(list("newer"), UID);
    await Promise.all([first, second]);
    expect(await reload()).toEqual(list("newer"));
  });
});
