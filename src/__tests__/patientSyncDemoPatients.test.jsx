// patientSyncDemoPatients.test.jsx
//
// Regression test for a real bug found by the browser tests (e2e/
// cross-device.spec.ts, 2026-09-29): every new account starts with the same
// two demo patients (fixed ids), and every cloud save sent them together with
// the real patients in ONE request. The database lets only one account own a
// given id, so for every account after the first the whole request was
// rejected and real patients never reached the cloud.
//
// The demo patients must never be part of a cloud save; real patients must.
//
// Supabase is mocked (never remove this): the real src/supabase.js falls back
// to the production project when no env vars are set.

import { describe, it, expect, vi, beforeEach } from "vitest";

const upsert = vi.hoisted(() => vi.fn(() => Promise.resolve({ error: null })));
vi.mock("../supabase.js", () => ({
  supabase: { from: vi.fn(() => ({ upsert })) },
  authHeader: vi.fn().mockResolvedValue({}),
}));

import { loadPatientDB, savePatientDB } from "../PatientDatabase.jsx";

const realPatient = (id, name) => ({
  id, name, data: { dem_name: name }, createdAt: "2026-09-29T00:00:00.000Z", updatedAt: "2026-09-29T00:00:00.000Z",
});

// loadPatientDB keeps a per-user in-memory cache, so every test uses its own
// user id to start from a genuinely new account.
let userCounter = 0;
const newUserId = () => `user_${++userCounter}`;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("cloud save leaves the demo patients out", () => {
  it("a new account starts with the two demo patients", () => {
    const seeded = loadPatientDB(newUserId());
    expect(seeded.map((p) => p.name).sort()).toEqual(["Arjun Kapoor", "Priya Sharma"]);
  });

  it("saving a real patient alongside the demo patients uploads only the real one", async () => {
    const uid = newUserId();
    const seeded = loadPatientDB(uid);
    const real = realPatient("real_1", "Real Patient");

    await savePatientDB([real, ...seeded], uid);

    expect(upsert).toHaveBeenCalledTimes(1);
    const rows = upsert.mock.calls[0][0];
    expect(rows.map((r) => r.id)).toEqual(["real_1"]);
    expect(rows[0].user_id).toBe(uid);
  });

  it("saving only the demo patients uploads nothing and still succeeds", async () => {
    const uid = newUserId();
    const seeded = loadPatientDB(uid);
    await expect(savePatientDB(seeded, uid)).resolves.toBeUndefined();
    expect(upsert).not.toHaveBeenCalled();
  });

  it("a second account's real patient is sent even though it also holds the demo patients", async () => {
    // The exact situation of the bug: both accounts hold the same demo ids.
    const first = loadPatientDB(newUserId());
    localStorage.clear();
    const secondId = newUserId();
    const second = loadPatientDB(secondId);
    expect(first.map((p) => p.id)).toEqual(second.map((p) => p.id));

    await savePatientDB([realPatient("real_2", "Second Account Patient"), ...second], secondId);

    const rows = upsert.mock.calls[0][0];
    expect(rows.map((r) => r.id)).toEqual(["real_2"]);
  });

  it("without a signed-in user nothing is uploaded", async () => {
    await savePatientDB([realPatient("real_3", "Guest Patient")], undefined);
    expect(upsert).not.toHaveBeenCalled();
  });
});
