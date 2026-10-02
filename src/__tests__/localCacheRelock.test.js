import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../supabase.js", () => ({ supabase: { from: vi.fn(), auth: {} } }));

import { setSessionKey, clearSessionKey } from "../localCrypto.js";
import {
  savePatientDBLocalOnly, loadPatientDB, hydrateLocalCache, clearPatientCache, relockLocalCache,
} from "../PatientDatabase.jsx";

const UID = "user-1";
const LIST = [{ id: "p1", name: "Asha Rao", data: { dem_name: "Asha Rao" }, updatedAt: "2026-10-02T00:00:00Z" }];

// What a reload does: forget everything in memory, sign back in with whatever
// token is stored now, and read the copy that is on disk.
async function reloadWith(token) {
  clearPatientCache();
  clearSessionKey();
  await setSessionKey(token);
  await hydrateLocalCache(UID);
  return loadPatientDB(UID);
}

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pm_cleared_demo_v5", "1");
  localStorage.setItem("pm_seeded_v2026-06c", "1");
  clearPatientCache();
  clearSessionKey();
});

describe("the on-device copy of the patients across a sign-in token change", () => {
  it("can be opened after a reload when the token is unchanged", async () => {
    await setSessionKey("token-A");
    await savePatientDBLocalOnly(LIST, UID);
    expect(await reloadWith("token-A")).toEqual(LIST);
  });

  it("is NOT readable after the token changed, if nothing re-locked it (the old behaviour)", async () => {
    await setSessionKey("token-A");
    await savePatientDBLocalOnly(LIST, UID);
    expect(await reloadWith("token-B")).toEqual([]);
  });

  it("IS readable after the token changed once the open list has been locked again", async () => {
    await setSessionKey("token-A");
    await savePatientDBLocalOnly(LIST, UID);
    // the app is open when the token rotates: new key, then re-lock
    await setSessionKey("token-B");
    await relockLocalCache(UID);
    expect(await reloadWith("token-B")).toEqual(LIST);
  });

  it("does nothing when there is nothing open or no key", async () => {
    await relockLocalCache(UID); // no list, no key
    await setSessionKey("token-A");
    await relockLocalCache(UID); // key, but nothing loaded
    expect(localStorage.getItem("physio_patient_db_v1_" + UID)).toBeNull();
  });
});
