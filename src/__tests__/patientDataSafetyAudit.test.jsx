// patientDataSafetyAudit.test.jsx
//
// Targeted safety/correctness audit requested directly by the user for three
// workflows that touch real (or simulated) patient data: the AI intake
// parser's write-safety guarantees, and per-user patient-record isolation in
// PatientDatabase.jsx. Not a feature test — every case here exists because a
// violation would be a real data-safety or privacy bug, not a UI nit.
//
// IMPORTANT: src/supabase.js falls back to the real production Supabase
// project (dlauxdokkrqbvbormxte.supabase.co) whenever VITE_SUPABASE_URL isn't
// set — which it isn't in this test environment. savePatientDB() calls
// syncPatientsToSupabase() unconditionally, so without mocking `supabase`
// here, running this file would silently attempt real network writes against
// production. Mocked below for that reason — never remove this mock.

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase.js", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
  authHeader: vi.fn().mockResolvedValue({}),
}));

import { supabase } from "../supabase.js";
import { dbKey, draftKey, loadPatientDB, savePatientDB } from "../PatientDatabase.jsx";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe("Patient data isolation — per-user localStorage scoping", () => {
  it("dbKey/draftKey produce distinct keys per user, and a falsy userId doesn't collide with a real one", () => {
    expect(dbKey("user_a")).not.toBe(dbKey("user_b"));
    expect(dbKey("user_a")).toBe(dbKey("user_a"));
    // No userId (logged-out / anon) must not resolve to the same key as any
    // real userId string, including the literal string "anon" itself if a
    // real account were ever (accidentally) issued that id.
    expect(dbKey(undefined)).toBe(dbKey(null));
    expect(dbKey(undefined)).not.toBe(dbKey("real-account-id"));
    expect(draftKey("user_a")).not.toBe(draftKey("user_b"));
  });

  it("a patient saved under one user is invisible when loading a different user's DB", () => {
    const patientA = { id: "pt_1", name: "Alice Patient", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", hasRedFlags: false, lastDx: "", data: { dem_name: "Alice Patient", dem_dob: "1990-01-01" } };
    savePatientDB([patientA], "user_a");

    const userAView = loadPatientDB("user_a");
    const userBView = loadPatientDB("user_b");

    expect(userAView.some(p => p.id === "pt_1")).toBe(true);
    expect(userBView.some(p => p.id === "pt_1")).toBe(false);
    // user_b's own store must be genuinely empty (or demo-seeded), never a
    // fallback/merge of user_a's real data.
    expect(userBView.every(p => p.id !== "pt_1")).toBe(true);
  });

  it("savePatientDB tags every synced row with the userId that was active when the save was initiated, not whichever ran last", async () => {
    const patient = { id: "pt_2", name: "Bob Patient", data: {} };
    savePatientDB([patient], "user_a");
    savePatientDB([patient], "user_b");

    const upsertCalls = supabase.from.mock.results.map(r => r.value.upsert.mock.calls[0][0]);
    // Two separate savePatientDB calls -> two separate upsert payloads, each
    // tagged with the userId passed to THAT call.
    const taggedUserIds = upsertCalls.map(rows => rows[0].user_id);
    expect(taggedUserIds).toEqual(["user_a", "user_b"]);
  });

  it("logged-out (anon) data never gets swept into a real account's store just by loading it after login", () => {
    const anonDraft = { id: "pt_anon", name: "Draft Patient", data: {} };
    savePatientDB([anonDraft], undefined); // saved while logged out
    const afterLogin = loadPatientDB("user_a"); // same browser, now logged in
    expect(afterLogin.some(p => p.id === "pt_anon")).toBe(false);
  });
});

describe("AI intake parser — write-safety guarantees (mapParseResultToUpdates is pure, never auto-confirms clinical judgement)", () => {
  it("never writes to fixed-enum multicheck fields even if the AI result object contains those exact keys (hallucination-mismatch guard)", () => {
    const result = {
      age: 40,
      // Simulates a malformed/hallucinated AI response that includes keys
      // matching real enum fields directly -- the mapping function must
      // ignore these entirely; it only reads the specific named result.*
      // properties it knows about (medicalHistory, medications, etc.), never
      // passes the raw result object through.
      pmh_conditions: ["Diabetes", "Hypertension"],
      med_current: ["Metformin"],
      nrf_cauda: true,
      lx_rf_cauda: true,
      s_red5: true,
    };
    const { updates } = mapParseResultToUpdates(result, {});
    expect(updates.pmh_conditions).toBeUndefined();
    expect(updates.med_current).toBeUndefined();
    expect(updates.nrf_cauda).toBeUndefined();
    expect(updates.lx_rf_cauda).toBeUndefined();
    expect(updates.s_red5).toBeUndefined();
    expect(updates.dem_age).toBe("40");
  });

  it("bladder/bowel (cauda equina screen) never writes a red-flag verdict field, positive or negative -- informational text only", () => {
    const positive = mapParseResultToUpdates({ region: "Lumbar / SI", hasBladderBowelSymptoms: true }, {});
    const negative = mapParseResultToUpdates({ region: "Lumbar / SI", hasBladderBowelSymptoms: false }, {});
    for (const { updates, redFlagsToReview } of [positive, negative]) {
      expect(Object.keys(updates).some(k => /red|rf_|_rf|flag/i.test(k))).toBe(false);
    }
    // The positive case must surface for clinician review; the negative case
    // must NOT (nothing to screen).
    expect(positive.redFlagsToReview.some(f => /bladder|bowel|cauda/i.test(f))).toBe(true);
    expect(negative.redFlagsToReview.some(f => /bladder|bowel|cauda/i.test(f))).toBe(false);
  });

  it("result.flags (general red-flag phrases) always land in redFlagsToReview, never merged into any nrf_/rf_ field", () => {
    const { updates, redFlagsToReview } = mapParseResultToUpdates({
      flags: ["unexplained weight loss", "night pain unrelieved by rest"],
    }, {});
    expect(redFlagsToReview).toEqual(["unexplained weight loss", "night pain unrelieved by rest"]);
    expect(Object.keys(updates).some(k => k.startsWith("nrf_") || k.startsWith("rf_"))).toBe(false);
  });

  it("malformed/missing _confidence and _sourceQuotes never crash extraction and never fabricate values", () => {
    const noMeta = mapParseResultToUpdates({ age: 30 }, {});
    expect(noMeta.extractionMeta.confidence).toEqual({});
    expect(noMeta.extractionMeta.sourceQuotes).toEqual({});

    // AI returning the wrong TYPE for these (e.g. a string or array instead
    // of an object) must degrade to empty, not throw or pass the bad value
    // straight through for later code to choke on.
    const badTypes = mapParseResultToUpdates({ age: 30, _confidence: "high", _sourceQuotes: ["quote"] }, {});
    expect(badTypes.extractionMeta.confidence).toEqual({});
    expect(badTypes.extractionMeta.sourceQuotes).toEqual({});
  });

  it("is a pure function: the same input always produces the same output, and it never mutates the existingData argument passed in", () => {
    const existing = { dem_age: "99", cc_main: "old complaint" };
    const existingSnapshot = JSON.stringify(existing);
    const result = { age: 40, chiefComplaint: "new complaint" };

    const run1 = mapParseResultToUpdates(result, existing);
    const run2 = mapParseResultToUpdates(result, existing);

    expect(JSON.stringify(existing)).toBe(existingSnapshot); // untouched
    expect(run1.updates).toEqual(run2.updates); // deterministic
    // And it never reaches into existingData to silently keep/override
    // fields on its own -- callers own the merge decision.
    expect(run1.updates.dem_age).toBe("40");
  });
});
