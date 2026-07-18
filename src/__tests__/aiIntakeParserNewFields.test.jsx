// Regression tests for the QA review findings on the Subjective AI
// parser (real transcript: 38M software engineer, 3-week mechanical
// LBP after lifting a suitcase, denies bladder/bowel/neuro symptoms,
// similar episode 2 years ago resolved with physio, no diabetes/HTN,
// no meds, limited by sitting/driving/childcare, goal = pain-free
// return to work and exercise).
//
// That review found real gaps: bladder/bowel screen, prior episodes,
// medical history, medications, functional limitations, and patient
// goals were all things the patient said but /api/parse had nowhere
// to put. Fixed by adding 7 fields to the extraction schema and
// mapping each one to a field the rest of the app already reads --
// never a brand new, unread one (pmh_notes, hx_episodes, hx_resolve,
// goal_main, {region}_fn_notes all pre-date this change).
//
// Bladder/bowel specifically follows the same rule as `flags` already
// does elsewhere in this file: the AI's own report is surfaced for a
// clinician to review, never auto-written into a red-flag verdict
// field (lx_rf_cauda, s_red5, nrf_*, rf_*) -- that stays a clinical
// judgement call either way, positive or a genuine denied negative.

import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";

const rahulLumbarResult = {
  chiefComplaint: "Mechanical low back pain, no red flags",
  age: 38, sex: "Male", occupation: "Software engineer",
  region: "Lumbar / SI", duration: "2–6 weeks (subacute)", onset: "Lifting injury",
  nrsNow: 3, nrsWorst: 8,
  symptomPattern: "Mechanical — clearly varies with movement/position/load",
  aggMovements: ["bending forward"], aggActivities: ["prolonged sitting", "lifting"],
  relMovements: ["lying down", "rest"],
  hasRadiation: false,
  neuroSymptoms: ["No neurological symptoms"],
  hasBladderBowelSymptoms: false,
  priorEpisodeCount: "2–3 episodes",
  priorEpisodeOutcome: "Physiotherapy helped",
  medicalHistory: "No diabetes or hypertension",
  medications: "None",
  functionalLimitations: ["Difficulty sitting at desk for long periods", "Difficulty driving", "Difficulty playing with children"],
  patientGoals: "Return to work and exercise without pain",
  flags: [],
};

describe("New Subjective fields from the QA review (bladder/bowel, history, meds, function, goals)", () => {
  test("medical history and medications combine into the existing pmh_notes field", () => {
    const { updates } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(updates.pmh_notes).toBe("No diabetes or hypertension. Medications: None");
  });

  test("prior episode fields map onto the existing hx_episodes / hx_resolve fields", () => {
    const { updates } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(updates.hx_episodes).toBe("2–3 episodes");
    expect(updates.hx_resolve).toBe("Physiotherapy helped");
  });

  test("patient goals map onto the existing goal_main field", () => {
    const { updates } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(updates.goal_main).toBe("Return to work and exercise without pain");
  });

  test("functional limitations write to the region-specific _fn_notes field", () => {
    const { updates } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(updates.lx_fn_notes).toContain("Difficulty sitting at desk for long periods");
    expect(updates.lx_fn_notes).toContain("Difficulty driving");
    expect(updates.lx_fn_notes).toContain("Difficulty playing with children");
  });

  test("functional limitations use the correct prefix for a different region (shoulder R)", () => {
    const { updates } = mapParseResultToUpdates(
      { ...rahulLumbarResult, region: "Shoulder", laterality: "Right", functionalLimitations: ["overhead reaching at work"] },
      {}
    );
    expect(updates.shr_fn_notes).toContain("overhead reaching at work");
    expect(updates.lx_fn_notes).toBeUndefined();
  });

  test("an explicit bladder/bowel denial is recorded as plain text, never as a red flag", () => {
    const { updates, redFlagsToReview } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(updates.lx_neuro_quality).toContain("No bladder/bowel symptoms");
    expect(redFlagsToReview).toEqual([]);
    // Never auto-writes any red-flag/clinician-verdict field
    expect(Object.keys(updates).some(k => k.startsWith("nrf_") || k.startsWith("rf_") || k.includes("_rf_") || k.startsWith("s_red"))).toBe(false);
  });

  test("a positive bladder/bowel report is surfaced for clinician review, still never auto-applied to a red-flag field", () => {
    const positive = { ...rahulLumbarResult, hasBladderBowelSymptoms: true };
    const { updates, redFlagsToReview } = mapParseResultToUpdates(positive, {});
    expect(redFlagsToReview).toContain("Patient reports bladder/bowel involvement — screen for cauda equina");
    expect(updates.lx_neuro_quality).toContain("Reports bladder/bowel involvement");
    expect(Object.keys(updates).some(k => k.startsWith("nrf_") || k.startsWith("rf_") || k.includes("_rf_") || k.startsWith("s_red"))).toBe(false);
  });

  test("bladder/bowel report with no identifiable region still reaches redFlagsToReview (safety net holds even without a region)", () => {
    const { updates, redFlagsToReview, region } = mapParseResultToUpdates(
      { age: 40, hasBladderBowelSymptoms: true, flags: [] }, {}
    );
    expect(region).toBeNull();
    expect(redFlagsToReview).toContain("Patient reports bladder/bowel involvement — screen for cauda equina");
    expect(Object.keys(updates).some(k => k.includes("neuro"))).toBe(false);
  });

  test("filled-field summary includes all 7 new fields when present", () => {
    const { filledLabels } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(filledLabels).toContain("Bladder/bowel screen");
    expect(filledLabels).toContain("Prior episodes");
    expect(filledLabels).toContain("Prior episode outcome");
    expect(filledLabels).toContain("Medical history");
    expect(filledLabels).toContain("Medications");
    expect(filledLabels).toContain("Functional limitations");
    expect(filledLabels).toContain("Patient goals");
  });

  test("missing-information checklist flags bladder/bowel screen and patient goals when truly absent", () => {
    const sparse = { age: 30, region: "Lumbar / SI", flags: [] };
    const { extractionMeta } = mapParseResultToUpdates(sparse, {});
    expect(extractionMeta.missingInfo).toContain("Bladder/bowel screen (red flag)");
    expect(extractionMeta.missingInfo).toContain("Patient's own goals");
  });

  test("a thorough narrative (the Rahul Sharma case) leaves bladder/bowel and goals off the missing-info list", () => {
    const { extractionMeta } = mapParseResultToUpdates(rahulLumbarResult, {});
    expect(extractionMeta.missingInfo).not.toContain("Bladder/bowel screen (red flag)");
    expect(extractionMeta.missingInfo).not.toContain("Patient's own goals");
  });
});
