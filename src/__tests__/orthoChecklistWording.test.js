// Same class of bug as the knee: the region checklists word their options for the clinician, the
// reasoning engine searches for its own phrases, and the two did not meet. Found with published cases
// (a febrile shoulder with infection ticked raised no alert; groin pain location and the wrist/hand
// location, mechanism and nerve-pattern options changed nothing).
import { describe, it, expect } from "vitest";
import { runHipDifferential } from "../orthoHipReasoning.js";
import { runShoulderDifferential } from "../orthoShoulderReasoning.js";
import { runElbowWristHandDifferential } from "../orthoElbowWristHandReasoning.js";

const sig = (r) => JSON.stringify({ rf: r.redFlag, c: (r.conditions || []).map((c) => [c.name, c.score ?? c.matchTier ?? c.band, (c.supportingMatched || []).length]) });
const mk = (region, fields, extra = {}) => ({ demographics: { age: "40", sex: "Male" }, subjective: { chiefComplaint: "pain", onset: "", regions: { [region]: fields } }, ...extra });

describe("Hip", () => {
  it("'Anterior groin' location counts as groin pain", () => {
    const base = runHipDifferential(mk("hip", {}));
    const groin = runHipDifferential(mk("hip", { location: "Anterior groin" }));
    expect(sig(groin)).not.toBe(sig(base));
    const fai = groin.conditions.find((c) => /Femoroacetabular/.test(c.name));
    expect(fai.score).toBeGreaterThan(0);
  });
  it("a positive FADIR in the app's own wording supports FAI", () => {
    const r = runHipDifferential(mk("hip", { location: "Anterior groin", locationPattern: "Groin-dominant" }, { specialTests: { hip: { st_fadir_test: "Positive — anterior groin pain (FAI / labral tear)" } } }));
    expect(r.conditions[0].name).toMatch(/Femoroacetabular/);
  });
});

describe("Shoulder red flags", () => {
  it("'Redness / warmth / swelling (possible infection)' raises the joint-emergency alert", () => {
    const r = runShoulderDifferential(mk("shoulder", { redFlags: "Redness / warmth / swelling (possible infection)" }));
    expect(r.redFlagOverride?.triggered).toBe(true);
  });
  it("no red flag ticked keeps it off", () => {
    expect(runShoulderDifferential(mk("shoulder", { redFlags: "None of the above" })).redFlagOverride?.triggered).toBeFalsy();
  });
});

describe("Elbow / wrist / hand options reach the engine", () => {
  const base = sig(runElbowWristHandDifferential(mk("elbowWristHand", {})));
  it.each([
    ["location", "Dorsal wrist"],
    ["location", "Volar (palm-side) wrist"],
    ["location", "Radial wrist / thumb side"],
    ["location", "Ulnar wrist"],
    ["mechanism", "Fall onto outstretched hand"],
    ["mechanism", "Racquet sport (lateral elbow)"],
    ["mechanism", "Repetitive thumb use (e.g. new parent lifting baby)"],
    ["aggravating", "Thumb movements"],
    ["neuro", "Numbness / tingling — night-dominant (carpal tunnel pattern)"],
    ["neuro", "Numbness / tingling — worse with elbow flexion (cubital tunnel pattern)"],
    ["radiation", "Numbness / tingling — thumb, index, middle finger (median nerve pattern)"],
  ])("%s: '%s' changes the result", (field, option) => {
    expect(sig(runElbowWristHandDifferential(mk("elbowWristHand", { [field]: option })))).not.toBe(base);
  });
});
