// The Ortho region adapters must hand the patient's age/sex (from the
// Demographics step, data.demographics) to the reasoning engines. Before,
// Lumbar/Cervical/Thoracic hard-coded them to null and the limb adapters read
// age from the wrong place (data.subjective.age), so the engines' age/sex
// rules never fired in the app.
import { describe, it, expect } from "vitest";
import { demographicsForEngine } from "../reasoningHelpers.js";
import { extractLumbarVariables, runLumbarDifferential } from "../orthoLumbarReasoning.js";
import { extractCervicalVariables } from "../orthoCervicalReasoning.js";
import { extractThoracicVariables } from "../orthoThoracicReasoning.js";
import { runKneeDifferential } from "../orthoKneeReasoning.js";
import { runHipDifferential } from "../orthoHipReasoning.js";
import { runAnkleFootDifferential } from "../orthoAnkleFootReasoning.js";
import { runElbowWristHandDifferential } from "../orthoElbowWristHandReasoning.js";

describe("demographicsForEngine", () => {
  it("keeps what was filled in and turns blanks into null", () => {
    expect(demographicsForEngine({ age: "34", sex: "Female", occupation: " Teacher " }))
      .toEqual({ age: "34", sex: "Female", occupation: "Teacher" });
    expect(demographicsForEngine({ age: "", sex: undefined })).toEqual({ age: null, sex: null, occupation: null });
    expect(demographicsForEngine(undefined)).toEqual({ age: null, sex: null, occupation: null });
  });
});

describe("Lumbar / Cervical / Thoracic adapters", () => {
  const demographics = { age: "17", sex: "Male", occupation: "Student" };

  it("pass the Demographics step on to the engine's variables", () => {
    expect(extractLumbarVariables({}, {}, demographics).demographics).toEqual(demographics);
    expect(extractCervicalVariables({}, {}, demographics).demographics).toEqual(demographics);
    expect(extractThoracicVariables({}, {}, demographics).demographics).toEqual(demographics);
  });

  it("still work with no Demographics step (age and sex stay unknown)", () => {
    const none = { age: null, sex: null, occupation: null };
    expect(extractLumbarVariables({}, {}).demographics).toEqual(none);
    expect(extractCervicalVariables({}, {}).demographics).toEqual(none);
    expect(extractThoracicVariables({}, {}).demographics).toEqual(none);
  });

  it("a young age now counts for lumbar spondylolysis (L07) when run through runLumbarDifferential", () => {
    const regionData = {
      mechanismType: "Sport / repetitive extension",
      aggMovements: "Extension (arching back)",
    };
    const young = runLumbarDifferential(regionData, {}, { age: "17" });
    const unknown = runLumbarDifferential(regionData, {}, {});
    const label = "Young age (<25) -- typical spondylolysis/-listhesis age range";
    const l07Young = young.conditions.find((c) => c.id === "L07");
    const l07Unknown = unknown.conditions.find((c) => c.id === "L07");
    expect(l07Young.supportingMatched).toContain(label);
    expect(l07Unknown.supportingMatched).not.toContain(label);
  });
});

describe("limb adapters read age from the Demographics step", () => {
  // The engines list "age 50+" as a degenerative risk factor for these regions
  // (Knee, Hip, Ankle/Foot, Elbow/Wrist/Hand). The Shoulder engine
  // (shoulderPhase05.js) does not use age, so its adapter is unchanged.
  const AGE_FINDING = "History: age 50+ (degenerative risk factor)";
  const mentions = (result) => result.conditions.some((c) => (c.supportingMatched || []).includes(AGE_FINDING));

  it("Knee: age 62 from data.demographics is picked up, no age is not", () => {
    const base = { subjective: { chiefComplaint: "knee pain for months", regions: { knee: {} } } };
    expect(mentions(runKneeDifferential({ ...base, demographics: { age: "62" } }))).toBe(true);
    expect(mentions(runKneeDifferential({ ...base, demographics: {} }))).toBe(false);
  });

  it("Hip: age 62 from data.demographics is picked up, no age is not", () => {
    const base = { subjective: { chiefComplaint: "hip pain for months", regions: { hip: {} } } };
    expect(mentions(runHipDifferential({ ...base, demographics: { age: "62" } }))).toBe(true);
    expect(mentions(runHipDifferential({ ...base, demographics: {} }))).toBe(false);
  });

  it("Ankle/Foot: age 62 from data.demographics is picked up, no age is not", () => {
    const base = { subjective: { chiefComplaint: "ankle pain for months", regions: { ankleFoot: {} } } };
    expect(mentions(runAnkleFootDifferential({ ...base, demographics: { age: "62" } }))).toBe(true);
    expect(mentions(runAnkleFootDifferential({ ...base, demographics: {} }))).toBe(false);
  });

  it("Elbow/Wrist/Hand: age 62 from data.demographics is picked up, no age is not", () => {
    const base = { subjective: { chiefComplaint: "wrist pain for months", regions: { elbowWristHand: {} } } };
    expect(mentions(runElbowWristHandDifferential({ ...base, demographics: { age: "62" } }))).toBe(true);
    expect(mentions(runElbowWristHandDifferential({ ...base, demographics: {} }))).toBe(false);
  });
});
