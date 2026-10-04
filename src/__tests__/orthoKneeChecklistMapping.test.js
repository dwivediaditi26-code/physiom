// The Knee subjective checklist's option wording must reach the reasoning engine.
// Found with a published case report (bucket-handle meniscus tear with true
// mechanical locking scored 0 "insufficient data") and fixed in orthoKneeReasoning.js.
import { describe, it, expect } from "vitest";
import { runKneeDifferential } from "../orthoKneeReasoning.js";

const knee = (over = {}, tests = {}) => ({
  demographics: { age: "36", sex: "Male" },
  subjective: {
    chiefComplaint: "Right knee pain",
    onset: "2 months",
    regions: { knee: { location: "Medial joint line", mechanism: "Non-contact twisting", locking: "No", givingWay: "No", pattern: "Intermittent", redFlags: "None of the above", ...over } },
  },
  specialTests: { knee: { st_lachmans: "Negative", st_anterior_drawer: "Negative", ...tests } },
});
const find = (r, name) => r.conditions.find((c) => c.name === name);

describe("Knee checklist wording reaches the engine", () => {
  it("'Yes — true mechanical locking' counts as true locking for a meniscal tear", () => {
    const without = find(runKneeDifferential(knee({ locking: "No" })), "Meniscal tear");
    const withLock = find(runKneeDifferential(knee({ locking: "Yes — true mechanical locking" })), "Meniscal tear");
    expect(withLock.score).toBeGreaterThan(without.score);
    expect(withLock.matchTier).not.toBe("Insufficient data");
  });

  it("'Locked knee that won't straighten' raises the joint-emergency stop", () => {
    const r = runKneeDifferential(knee({ redFlags: "Locked knee that won't straighten" }));
    expect(r.redFlag.triggered).toBe(true);
    expect(r.redFlag.flags.map((f) => f.id)).toContain("joint_emergency");
  });

  it("'Hot red severely tender joint' raises the joint-emergency stop", () => {
    const r = runKneeDifferential(knee({ redFlags: "Hot red severely tender joint" }));
    expect(r.redFlag.triggered).toBe(true);
  });

  it("no red flags ticked keeps the stop off", () => {
    expect(runKneeDifferential(knee({ redFlags: "None of the above" })).redFlag.triggered).toBe(false);
  });

  it("aggravating movements (stairs down, movie sign) are no longer ignored", () => {
    const base = { location: "Around the kneecap", mechanism: "Insidious / overuse" };
    const a = find(runKneeDifferential(knee(base)), "Patellofemoral pain syndrome (PFPS)");
    const b = find(runKneeDifferential(knee({ ...base, aggravating: 'Stairs (down), Prolonged sitting ("movie sign")' })), "Patellofemoral pain syndrome (PFPS)");
    expect(b.score).toBeGreaterThan(a.score);
  });

  it("'Around the kneecap' counts as an anterior/patellar pain pattern", () => {
    const loc = find(runKneeDifferential(knee({ location: "Around the kneecap", mechanism: "Insidious / overuse" })), "Patellofemoral pain syndrome (PFPS)");
    const medial = find(runKneeDifferential(knee({ location: "Medial joint line", mechanism: "Insidious / overuse" })), "Patellofemoral pain syndrome (PFPS)");
    expect(loc.score).toBeGreaterThan(medial.score);
  });
});
