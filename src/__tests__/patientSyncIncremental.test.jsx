// patientSyncIncremental.test.jsx
//
// A save used to re-send EVERY patient in one request. It now sends only the patients
// that changed since the cloud last confirmed them, a few per request, and one refused
// record can no longer block the rest. Supabase is mocked (never remove this): the real
// src/supabase.js falls back to the production project when no env vars are set.

import { describe, it, expect, vi, beforeEach } from "vitest";

const upsert = vi.hoisted(() => vi.fn(() => Promise.resolve({ error: null })));
let fetchPages = [];
vi.mock("../supabase.js", () => {
  const make = () => {
    const chain = {
      upsert,
      select: () => chain, eq: () => chain, is: () => chain, order: () => chain,
      range: () => chain,
      then: (resolve, reject) => Promise.resolve(fetchPages.shift() || { data: [], error: null }).then(resolve, reject),
    };
    return chain;
  };
  return { supabase: { from: vi.fn(make), auth: {} }, authHeader: vi.fn().mockResolvedValue({}) };
});

import { savePatientDB, isSyncDirty, flushPendingSync, fetchPatientsFromSupabase } from "../PatientDatabase.jsx";
import { fingerprintOf, stableStringify, planBatches, looksLikeNetworkError, _resetSyncMemory } from "../patientSyncState.js";

const T0 = "2026-10-06T00:00:00.000Z";
const patient = (id, extra = {}) => ({ id, name: `Patient ${id}`, data: { dem_name: `Patient ${id}`, note: "first" }, createdAt: T0, updatedAt: T0, ...extra });
const idsOf = (call) => call[0].map((r) => r.id);

let n = 0;
let uid;
beforeEach(() => {
  localStorage.clear();
  _resetSyncMemory();
  vi.clearAllMocks();
  upsert.mockImplementation(() => Promise.resolve({ error: null }));
  fetchPages = [];
  uid = `incr_user_${++n}`;
});

describe("a save sends only what changed", () => {
  it("the first save sends every patient; an identical second save sends nothing but still reports saved", async () => {
    const list = [patient("a"), patient("b"), patient("c")];
    await expect(savePatientDB(list, uid)).resolves.toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(idsOf(upsert.mock.calls[0])).toEqual(["a", "b", "c"]);

    upsert.mockClear();
    await expect(savePatientDB([...list], uid)).resolves.toBe(true);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("editing one patient sends just that patient", async () => {
    const list = [patient("a"), patient("b"), patient("c")];
    await savePatientDB(list, uid);
    upsert.mockClear();

    const edited = list.map((p) => (p.id === "b" ? { ...p, data: { ...p.data, note: "changed" }, updatedAt: "2026-10-06T01:00:00.000Z" } : p));
    await savePatientDB(edited, uid);

    expect(upsert).toHaveBeenCalledTimes(1);
    expect(idsOf(upsert.mock.calls[0])).toEqual(["b"]);
    expect(upsert.mock.calls[0][0][0].data.note).toBe("changed");
  });

  it("re-saving a patient whose content did not change (only the 'updated' time moved) sends nothing", async () => {
    const list = [patient("a")];
    await savePatientDB(list, uid);
    upsert.mockClear();
    await savePatientDB([{ ...list[0], updatedAt: "2026-10-06T05:00:00.000Z" }], uid);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("remembers what was sent across a reload of the page", async () => {
    await savePatientDB([patient("a"), patient("b")], uid);
    upsert.mockClear();
    _resetSyncMemory(); // a fresh page load: only localStorage is left
    await savePatientDB([patient("a"), patient("b")], uid);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("each user has their own record of what was sent", async () => {
    await savePatientDB([patient("a")], uid);
    upsert.mockClear();
    await savePatientDB([patient("a")], `${uid}_other`);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});

describe("many patients go up a few at a time", () => {
  it("never sends the whole list in one request", async () => {
    const list = Array.from({ length: 45 }, (_, i) => patient(`p${i}`));
    await savePatientDB(list, uid);
    expect(upsert.mock.calls.length).toBeGreaterThan(1);
    for (const call of upsert.mock.calls) expect(call[0].length).toBeLessThanOrEqual(10);
    const sent = upsert.mock.calls.flatMap(idsOf);
    expect(sent.sort()).toEqual(list.map((p) => p.id).sort());
  });

  it("keeps heavy patients (big attached files) in separate requests", () => {
    const big = (id) => ({ row: { id, data: { uploaded_docs: [{ dataUrl: "x".repeat(900_000) }] } } });
    const groups = planBatches([big("a"), big("b"), big("c")]);
    expect(groups.map((g) => g.length)).toEqual([1, 1, 1]);
  });

  it("a patient bigger than the limit still goes, on its own", () => {
    const huge = { row: { id: "huge", data: { f: "x".repeat(5_000_000) } } };
    expect(planBatches([huge]).map((g) => g.length)).toEqual([1]);
  });
});

describe("one refused patient does not block the others", () => {
  it("uploads the rest, reports the failure, and the next save re-sends only the refused one", async () => {
    const list = [patient("a"), patient("bad"), patient("c")];
    upsert.mockImplementation((rows) =>
      Promise.resolve(rows.some((r) => r.id === "bad")
        ? { error: { code: "42501", message: "new row violates row-level security policy" } }
        : { error: null }));

    await expect(savePatientDB(list, uid)).rejects.toBeTruthy();
    expect(isSyncDirty(uid)).toBe(true);

    // a and c did reach the cloud (they were retried one at a time after the group was refused)
    const accepted = upsert.mock.calls.filter((c) => !c[0].some((r) => r.id === "bad")).flatMap(idsOf);
    expect(accepted.sort()).toEqual(["a", "c"]);

    upsert.mockClear();
    upsert.mockImplementation(() => Promise.resolve({ error: null }));
    await expect(savePatientDB(list, uid)).resolves.toBe(true);
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(idsOf(upsert.mock.calls[0])).toEqual(["bad"]);
    expect(isSyncDirty(uid)).toBe(false);
  });

  it("when the phone is offline it stops straight away instead of retrying every patient", async () => {
    upsert.mockImplementation(() => Promise.resolve({ error: { code: "", message: "TypeError: Failed to fetch" } }));
    await expect(savePatientDB([patient("a"), patient("b"), patient("c")], uid)).rejects.toBeTruthy();
    expect(upsert).toHaveBeenCalledTimes(1); // one group, no per-patient retries
    expect(isSyncDirty(uid)).toBe(true);

    upsert.mockClear();
    upsert.mockImplementation(() => Promise.resolve({ error: null }));
    await flushPendingSync(uid); // what the 'back online' listener runs
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(isSyncDirty(uid)).toBe(false);
  });
});

describe("patients read back from the cloud are not sent again", () => {
  it("after reading the cloud copy, saving the same content uploads nothing -- even if the keys come back in another order", async () => {
    fetchPages = [{
      data: [{ id: "a", name: "Patient a", data: { note: "first", dem_name: "Patient a" }, has_red_flags: false, last_dx: "", created_at: T0, updated_at: T0 }],
      error: null,
    }];
    await fetchPatientsFromSupabase(uid, { pageSize: 8, retryDelays: [] });

    await expect(savePatientDB([patient("a")], uid)).resolves.toBe(true);
    expect(upsert).not.toHaveBeenCalled();
  });

  it("but a local edit made on top of the cloud copy is sent", async () => {
    fetchPages = [{
      data: [{ id: "a", name: "Patient a", data: { dem_name: "Patient a", note: "first" }, has_red_flags: false, last_dx: "", created_at: T0, updated_at: T0 }],
      error: null,
    }];
    await fetchPatientsFromSupabase(uid, { pageSize: 8, retryDelays: [] });
    await savePatientDB([patient("a", { data: { dem_name: "Patient a", note: "edited here" } })], uid);
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});

describe("saves run one at a time, in order", () => {
  it("an older save can never finish after a newer one", async () => {
    const order = [];
    let release;
    upsert.mockImplementationOnce((rows) => new Promise((resolve) => { release = () => { order.push(`first:${rows[0].data.note}`); resolve({ error: null }); }; }));
    upsert.mockImplementation((rows) => { order.push(`next:${rows[0].data.note}`); return Promise.resolve({ error: null }); });

    const first = savePatientDB([patient("a", { data: { note: "v1" } })], uid);
    const second = savePatientDB([patient("a", { data: { note: "v2" } })], uid);
    await new Promise((r) => setTimeout(r, 20));
    expect(order).toEqual([]); // the second save is waiting for the first
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["first:v1", "next:v2"]);
  });
});

describe("fingerprints", () => {
  it("are the same for the same content whatever order the keys are in", () => {
    expect(fingerprintOf({ name: "x", data: { a: 1, b: { c: 2, d: [1, 2] } } })).toBe(fingerprintOf({ name: "x", data: { b: { d: [1, 2], c: 2 }, a: 1 } }));
    expect(stableStringify({ b: 1, a: undefined, c: [undefined] })).toBe('{"b":1,"c":[null]}');
  });

  it("change when the content changes", () => {
    expect(fingerprintOf({ name: "x", data: { a: 1 } })).not.toBe(fingerprintOf({ name: "x", data: { a: 2 } }));
    expect(fingerprintOf({ name: "x", data: {} })).not.toBe(fingerprintOf({ name: "y", data: {} }));
    expect(fingerprintOf({ name: "x", data: {}, hasRedFlags: true })).not.toBe(fingerprintOf({ name: "x", data: {} }));
  });

  it("tells a dropped connection from a refusal", () => {
    expect(looksLikeNetworkError({ code: "", message: "TypeError: Failed to fetch" })).toBe(true);
    expect(looksLikeNetworkError({ code: "42501", message: "row-level security" })).toBe(false);
    expect(looksLikeNetworkError({ code: "57014", message: "statement timeout" })).toBe(false);
    expect(looksLikeNetworkError(null)).toBe(false);
  });
});
