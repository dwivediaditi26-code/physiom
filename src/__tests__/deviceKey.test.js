// The saved copy of the patients on this device must still open after the sign-in token
// changes (it changes about hourly). That is what made a returning student wait for every
// patient to download again on a weak connection. It is locked with a key that stays on the
// device (non-exportable), and is forgotten at sign-out.
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../supabase.js", () => ({ supabase: { from: vi.fn(), auth: {} } }));

import { setSessionKey, clearSessionKey, clearDeviceKey, setKeyStoreForTests, encryptJSON, decryptJSON } from "../localCrypto.js";
import {
  savePatientDBLocalOnly, loadPatientDB, hydrateLocalCache, clearPatientCache, forgetDeviceCopy,
} from "../PatientDatabase.jsx";

const UID = "user-1";
const LIST = [{ id: "p1", name: "Asha Rao", data: { dem_name: "Asha Rao" }, updatedAt: "2026-10-02T00:00:00Z" }];

// A stand-in for the browser's key storage.
function memoryStore() {
  const keys = new Map();
  return {
    keys,
    get: async (id) => keys.get(id),
    addIfAbsent: async (id, key) => { if (!keys.has(id)) keys.set(id, key); return keys.get(id); },
    remove: async (id) => { keys.delete(id); },
  };
}

let store;
async function reloadWith(token, uid = UID) {
  clearPatientCache();
  clearSessionKey();
  await setSessionKey(token, uid);
  await hydrateLocalCache(uid);
  return loadPatientDB(uid);
}

beforeEach(() => {
  store = memoryStore();
  setKeyStoreForTests(store);
  localStorage.clear();
  localStorage.setItem("pm_cleared_demo_v5", "1");
  localStorage.setItem("pm_seeded_v2026-06c", "1");
  clearPatientCache();
  clearSessionKey();
});

describe("the saved copy opens whatever the sign-in token is", () => {
  it("is readable after a reload with a different token (the slow-start case)", async () => {
    await setSessionKey("token-A", UID);
    await savePatientDBLocalOnly(LIST, UID);
    expect(await reloadWith("token-B")).toEqual(LIST);
    expect(await reloadWith("token-C")).toEqual(LIST);
  });

  it("uses a key the page cannot read out", async () => {
    await setSessionKey("token-A", UID);
    const key = store.keys.get(UID);
    expect(key.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("raw", key)).rejects.toBeTruthy();
  });

  it("each account has its own key: one account cannot open another's copy", async () => {
    await setSessionKey("token-A", UID);
    await savePatientDBLocalOnly(LIST, UID);
    const envelope = JSON.parse(localStorage.getItem("physio_patient_db_v1_" + UID));
    await setSessionKey("token-A", "user-2");
    expect(await decryptJSON(envelope)).toBeNull();
  });
});

describe("forgetting the copy", () => {
  it("removes the copy and its key, so it cannot be opened again", async () => {
    await setSessionKey("token-A", UID);
    await savePatientDBLocalOnly(LIST, UID);
    const kept = localStorage.getItem("physio_patient_db_v1_" + UID);
    expect(kept).toBeTruthy();
    await forgetDeviceCopy(UID);
    expect(localStorage.getItem("physio_patient_db_v1_" + UID)).toBeNull();
    expect(store.keys.has(UID)).toBe(false);
    // even if the old text were somehow still around, a new key cannot open it
    await setSessionKey("token-A", UID);
    expect(await decryptJSON(JSON.parse(kept))).toBeNull();
  });

  it("clearDeviceKey alone also makes the copy unreadable", async () => {
    await setSessionKey("token-A", UID);
    const envelope = await encryptJSON(LIST);
    await clearDeviceKey(UID);
    await setSessionKey("token-A", UID);
    expect(await decryptJSON(envelope)).toBeNull();
  });
});

describe("a copy locked the old way", () => {
  it("is opened once with the sign-in token, then locked again with the device key", async () => {
    await setSessionKey("token-A"); // the old behaviour: no account id, token-derived key
    await savePatientDBLocalOnly(LIST, UID);
    expect(await reloadWith("token-A")).toEqual(LIST); // same token: opens, and is re-locked
    expect(await reloadWith("token-Z")).toEqual(LIST); // a different token later: still opens
  });

  it("a copy locked with an older token that has since changed cannot be opened (it is refilled from the cloud)", async () => {
    await setSessionKey("token-A");
    await savePatientDBLocalOnly(LIST, UID);
    expect(await reloadWith("token-B")).toEqual([]);
  });
});

describe("when the browser gives no key storage", () => {
  it("falls back to the sign-in token, as before", async () => {
    setKeyStoreForTests({ get: async () => { throw new Error("no storage"); }, addIfAbsent: async () => { throw new Error("no storage"); }, remove: async () => {} });
    await setSessionKey("token-A", UID);
    await savePatientDBLocalOnly(LIST, UID);
    expect(await reloadWith("token-A")).toEqual(LIST);
    expect(await reloadWith("token-B")).toEqual([]);
  });

  it("does not hang if key storage never answers", async () => {
    setKeyStoreForTests({ get: () => new Promise(() => {}), addIfAbsent: () => new Promise(() => {}), remove: () => new Promise(() => {}) }, 30);
    await setSessionKey("token-A", UID); // gives up after 30 ms
    expect(await encryptJSON(LIST)).toBeTruthy(); // the token-derived key is in use
    await clearDeviceKey(UID); // does not hang either
  });
});
