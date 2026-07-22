// cervicalVariableExtractor.test.js
// Unit tests for cervicalVariableExtractor.js's Pass 1 (deterministic
// extraction from structured cx_* fields) and its merge function. Mirrors
// lumbarVariableExtractor.test.js's structure and safety principles: a
// variable never touched on the form reads "unknown" (never silently
// "absent"), an explicit "No X" selection reads as a real "absent", and
// red-flag-category AI findings are never auto-merged into redFlags.*.state.
import { describe, it, expect } from "vitest";
import { extractCervicalVariablesStructured, mergeCervicalVariables } from "../cervicalVariableExtractor.js";

const SEP = "|||";

describe("extractCervicalVariablesStructured", () => {
  it("reads every field as unknown on a completely empty form", () => {
    const cv = extractCervicalVariablesStructured({});
    expect(cv.location.armHandPain).toBe("unknown");
    expect(cv.location.dermatomal.state).toBe("unknown");
    expect(cv.mechanism.type.state).toBe("unknown");
    expect(cv.aggravating.movements.state).toBe("unknown");
    expect(cv.redFlags.myelopathy.state).toBe("unknown");
    expect(cv.redFlags.redFlagScreen).toBe("incomplete");
  });

  it("treats an explicit 'No X' selection as absent, not unknown or present", () => {
    const data = {
      cx_radiation: "No radiation — local only",
      cx_rf_myelopathy: "No myelopathy signs",
      cx_rf_vbi: "No VBI signs",
      cx_rf_instability: "No instability signs",
      cx_rf_other: "No other red flags",
    };
    const cv = extractCervicalVariablesStructured(data);
    expect(cv.location.radiation.state).toBe("absent");
    expect(cv.redFlags.myelopathy.state).toBe("absent");
    expect(cv.redFlags.redFlagScreen).toBe("negative");
  });

  it("marks the red flag screen positive as soon as any single real flag is ticked, even if others are untouched", () => {
    const data = { cx_rf_vbi: "Dizziness with neck movement" };
    const cv = extractCervicalVariablesStructured(data);
    expect(cv.redFlags.vbi.state).toBe("present");
    expect(cv.redFlags.redFlagScreen).toBe("positive");
  });

  it("derives a radiculopathy-leaning variable set from a realistic C6 presentation", () => {
    const data = {
      cx_loc: ["Neck", "Right upper trapezius"].join(SEP),
      cx_radiation: ["Radiates into right arm/hand"].join(SEP),
      cx_dermatomal: ["C6 — thumb/index finger"].join(SEP),
      cx_arm_present: "Yes — unilateral (R)",
      cx_agg_mov: ["Extension — looking up", "Combined extension + rotation (right) — quadrant position"].join(SEP),
      cx_agg_other: ["Coughing / sneezing (dural / cord tension)"].join(SEP),
      cx_rel_mov: ["Arm overhead — relieves arm symptoms (shoulder abduction relief sign)"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    expect(cv.location.armHandPain).toBe(true);
    expect(cv.location.dermatomal.state).toBe("present");
    expect(cv.aggravating.extensionAggravates).toBe(true);
    expect(cv.aggravating.quadrantAggravates).toBe(true);
    expect(cv.aggravating.coughSneezeAggravates).toBe(true);
    expect(cv.relieving.armOverheadRelievesArmSymptoms).toBe(true);
  });

  it("correctly derives bilateral arm signs and does not conflate them with a simple 'present' unilateral finding", () => {
    const data = { cx_arm_present: "Yes — bilateral" };
    const cv = extractCervicalVariablesStructured(data);
    expect(cv.location.armHandPain).toBe("bilateral");
    expect(cv.location.bilateralArmSigns).toBe(true);
  });

  it("maps the Quebec WAD grade text to the correct numeric grade, treating N/A as null (not grade 0)", () => {
    const gradeII = extractCervicalVariablesStructured({ cx_moi_wad: "Grade II — decreased ROM + point tenderness" });
    expect(gradeII.mechanism.wadGradeNum).toBe(2);
    const notAnswered = extractCervicalVariablesStructured({});
    expect(notAnswered.mechanism.wadGradeNum).toBe(null);
  });

  it("recognizes a whiplash mechanism from the structured mechanism field", () => {
    const data = { cx_moi: ["Whiplash — motor vehicle collision (rear/front/side impact)"].join(SEP) };
    const cv = extractCervicalVariablesStructured(data);
    expect(cv.mechanism.whiplashMechanism).toBe(true);
  });

  it("only reports occipitalHeadache when the headache is explicitly located there", () => {
    const occipital = extractCervicalVariablesStructured({
      cx_ha_present: "Yes", cx_ha_location: ["Occipital / base of skull (cervicogenic)"].join(SEP),
    });
    expect(occipital.headache.occipitalHeadache).toBe(true);
    const notAsked = extractCervicalVariablesStructured({});
    expect(notAsked.headache.occipitalHeadache).toBe(false); // multicheckState default when nothing selected -> absent branch reads false here, not "unknown" string
  });

  it("exposes every free-text note field Pass 2 should read, none pre-interpreted here", () => {
    const cv = extractCervicalVariablesStructured({ cx_arm_notes: "numbness into the thumb" });
    expect(cv._notesForAiPass.cx_arm_notes).toBe("numbness into the thumb");
    expect(cv._notesForAiPass.cx_loc_notes).toBe("");
  });
});

describe("mergeCervicalVariables", () => {
  it("never lets an AI finding override a real Pass 1 answer (additive-only merge)", () => {
    const cv = extractCervicalVariablesStructured({ cx_arm_present: "No arm/hand symptoms" });
    const { merged, aiFilledFields } = mergeCervicalVariables(cv, [
      { variable: "armHandPain", value: "true", sourceQuote: "some numbness", confidence: 55 },
    ]);
    // Pass 1 already answered this field (false) -- must not be touched.
    expect(merged.location.armHandPain).toBe(false);
    expect(aiFilledFields).not.toContain("armHandPain");
  });

  it("fills a genuine Pass 1 gap from an AI finding", () => {
    const cv = extractCervicalVariablesStructured({}); // armHandPain untouched -> unknown
    const { merged, aiFilledFields } = mergeCervicalVariables(cv, [
      { variable: "armHandPain", value: "true", sourceQuote: "numbness into the hand", confidence: 70 },
    ]);
    expect(merged.location.armHandPain).toBe(true);
    expect(aiFilledFields).toContain("armHandPain");
  });

  it("routes red-flag-category findings to pendingRedFlagReview, never auto-merging into redFlags.*.state", () => {
    const cv = extractCervicalVariablesStructured({});
    const { merged, pendingRedFlagReview } = mergeCervicalVariables(cv, [
      { variable: "myelopathyConcern", value: "gait disturbance mentioned", sourceQuote: "unsteady on stairs", confidence: 50 },
    ]);
    expect(merged.redFlags.myelopathy.state).toBe("unknown"); // untouched by the AI finding
    expect(pendingRedFlagReview.length).toBe(1);
    expect(pendingRedFlagReview[0].variable).toBe("myelopathyConcern");
  });
});
