// Round-3 QA review, real transcript (46-year-old shop owner, left
// shoulder pain 3-6 months, noticed after a lot of lifting while
// shifting houses, tried a cortisone injection with ~2 weeks of
// temporary relief, worried about losing customers if unable to work).
// The parser now correctly returns null/[] for the two things it
// previously hallucinated (a pain quality, a prior episode) and
// correctly separates "treatment tried this episode" from "a separate
// prior episode" -- this test locks in the mapper side of that fix:
// three new fields (patientConcern, onsetContext, priorTreatmentTried)
// land on real fields the rest of the app already reads, and the
// corrected null/[] values from the two previously-hallucinated fields
// produce no spurious data (no hx_episodes/hx_resolve/cc_quality set).
import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";

const correctedShoulderResult = {
  chiefComplaint: "Left shoulder pain, gradual onset",
  age: 46, sex: "Female", occupation: "Shop owner",
  region: "Shoulder (L)", laterality: "Left",
  duration: "3–6 months (chronic)",
  // Corrected: patient hedged ("maybe that's got something to do with
  // it") rather than confidently naming a lifting injury, and explicitly
  // denied a fall -- onset now stays a safe, non-specific bucket and the
  // hedged detail moves to onsetContext instead of being force-fit.
  onset: "Gradual — insidious",
  onsetContext: "Denies any fall; noticed the pain around the time of a house move that involved a lot of lifting, but is unsure if that's actually the cause",
  nrsNow: 4, nrsWorst: 7,
  // Corrected: patient never used a quality word at all.
  painQuality: [],
  nightSymptoms: ["Wakes with pain when lying on the left side"],
  hasRadiation: true, radiationSide: "Left", radiationArea: "Down the outer upper arm",
  // Corrected: explicit denial recorded, not left as [].
  neuroSymptoms: ["No neurological symptoms"],
  hasBladderBowelSymptoms: null,
  // Corrected: no separate prior episode was ever described -- both null.
  priorEpisodeCount: null,
  priorEpisodeOutcome: null,
  // New: treatment tried during the CURRENT episode goes here instead.
  priorTreatmentTried: "Cortisone injection about a month ago — gave roughly 2 weeks of relief before the pain returned",
  medicalHistory: "Type 2 diabetes, controlled",
  medications: "Metformin",
  aggMovements: ["reaching overhead"], aggActivities: ["lifting stock at the shop"],
  relMovements: ["resting the arm"],
  functionalLimitations: ["Difficulty lifting stock", "Difficulty serving customers overhead shelves"],
  patientGoals: "Return to running the shop without pain",
  // New: patient's stated fear, distinct from their goal above.
  patientConcern: "Worried about losing customers if unable to work",
  flags: [],
};

describe("aiIntakeParser maps the 3 new round-3 fields onto real, already-read app fields", () => {
  test("patientConcern maps to goal_concern (distinct from goal_main)", () => {
    const { updates } = mapParseResultToUpdates(correctedShoulderResult);
    expect(updates.goal_concern).toBe("Worried about losing customers if unable to work");
    expect(updates.goal_main).toBe("Return to running the shop without pain");
    expect(updates.goal_concern).not.toBe(updates.goal_main);
  });

  test("onsetContext maps to the region-prefixed mechanism notes field", () => {
    const { updates } = mapParseResultToUpdates(correctedShoulderResult);
    expect(updates.shl_moi_notes).toContain("Denies any fall");
    expect(updates.shl_moi_notes).toContain("house move");
  });

  test("priorTreatmentTried maps to hx_notes, separate from hx_episodes/hx_resolve", () => {
    const { updates } = mapParseResultToUpdates(correctedShoulderResult);
    expect(updates.hx_notes).toContain("Cortisone injection");
    expect(updates.hx_notes).toContain("2 weeks of relief");
  });

  test("no prior-episode fields are invented when the parse result correctly reports null", () => {
    const { updates } = mapParseResultToUpdates(correctedShoulderResult);
    expect(updates.hx_episodes).toBeUndefined();
    expect(updates.hx_resolve).toBeUndefined();
  });

  test("no pain quality is invented when the parse result correctly reports []", () => {
    const { updates } = mapParseResultToUpdates(correctedShoulderResult);
    expect(updates.cc_quality).toBeUndefined();
  });

  test("explicit neuro denial still writes the region neuro field (no regression)", () => {
    const { updates } = mapParseResultToUpdates(correctedShoulderResult);
    expect(updates.shl_neuro).toBe("No neurological symptoms");
  });

  test("filled-field labels and missing-info reflect the 3 new fields", () => {
    const { filledLabels, extractionMeta } = mapParseResultToUpdates(correctedShoulderResult);
    expect(filledLabels).toContain("Patient's main concern/fear");
    expect(filledLabels).toContain("Mechanism detail (uncertain)");
    expect(filledLabels).toContain("Prior treatment tried (current episode)");
    expect(extractionMeta.missingInfo).not.toContain("Patient's main concern/fear");
  });

  test("missingInfo flags a missing concern when the parser genuinely found none", () => {
    const noConcern = { ...correctedShoulderResult, patientConcern: null };
    const { extractionMeta } = mapParseResultToUpdates(noConcern);
    expect(extractionMeta.missingInfo).toContain("Patient's main concern/fear");
  });
});
