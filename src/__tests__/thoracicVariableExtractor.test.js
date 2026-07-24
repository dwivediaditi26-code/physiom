// thoracicVariableExtractor.test.js
// Unit tests for thoracicVariableExtractor.js's Pass 1 (deterministic
// extraction from structured tx_* fields) and its merge function. Mirrors
// lumbarVariableExtractor.test.js / cervicalVariableExtractor.test.js's
// structure and safety principles: a variable never touched on the form
// reads "unknown" (never silently "absent"), an explicit "No X" selection
// reads as a real "absent", and red-flag-category AI findings are never
// auto-merged into redFlags.*.
//
// KEY DIFFERENCE under test here vs. lumbar/cervical: Thoracic's red flag
// screen (tx_rf) is a SINGLE combined multicheck field sub-bucketed into
// 8 named categories (cardiac/respiratory/visceral/oncologic/infection/
// fracture/cordCompression/generalSerious), not four separate structured
// fields -- several tests below specifically exercise that sub-bucketing.
import { describe, it, expect } from "vitest";
import { extractThoracicVariablesStructured, mergeThoracicVariables } from "../thoracicVariableExtractor.js";

const SEP = "|||";

describe("extractThoracicVariablesStructured", () => {
  it("reads every field as unknown on a completely empty form", () => {
    const tv = extractThoracicVariablesStructured({});
    expect(tv.location.primaryLocation.state).toBe("unknown");
    expect(tv.aggravating.movements.state).toBe("unknown");
    expect(tv.aggravating.postures.state).toBe("unknown");
    expect(tv.relieving.treatments.state).toBe("unknown");
    expect(tv.symptomBehaviour.pattern.state).toBe("unknown");
    expect(tv.redFlags.screen.state).toBe("unknown");
    expect(tv.redFlags.redFlagScreen).toBe("incomplete");
  });

  it("treats an explicit 'No red flags' selection as absent/negative, not unknown or positive", () => {
    const tv = extractThoracicVariablesStructured({ tx_rf: ["No red flags"].join(SEP) });
    expect(tv.redFlags.screen.state).toBe("absent");
    expect(tv.redFlags.redFlagScreen).toBe("negative");
    expect(tv.redFlags.cardiac).toBe(false);
  });

  it("marks the red flag screen positive as soon as any single real flag is ticked, even if others are untouched", () => {
    const tv = extractThoracicVariablesStructured({
      tx_rf: ["Recent trauma — fracture risk"].join(SEP),
    });
    expect(tv.redFlags.fracture).toBe(true);
    expect(tv.redFlags.redFlagScreen).toBe("positive");
    expect(tv.redFlags.cardiac).toBe(false); // other categories stay false, not conflated
  });

  it("sub-buckets the single tx_rf field into the correct named category for cardiac, respiratory, and cord compression", () => {
    const cardiac = extractThoracicVariablesStructured({
      tx_rf: ["Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw"].join(SEP),
    });
    expect(cardiac.redFlags.cardiac).toBe(true);
    expect(cardiac.redFlags.respiratory).toBe(false);

    const resp = extractThoracicVariablesStructured({
      tx_rf: ["Respiratory symptoms — shortness of breath / haemoptysis"].join(SEP),
    });
    expect(resp.redFlags.respiratory).toBe(true);
    expect(resp.redFlags.cardiac).toBe(false);

    const cord = extractThoracicVariablesStructured({
      tx_rf: ["Bilateral leg weakness or sensory change (cord level)"].join(SEP),
    });
    expect(cord.redFlags.cordCompression).toBe(true);
  });

  it("derives a mechanical facet-leaning variable set from a realistic case", () => {
    const data = {
      tx_loc: ["Mid thoracic T5–T8"].join(SEP),
      tx_agg_mov: ["Rotation (most thoracic sensitive to)", "Extension"].join(SEP),
      tx_agg_post: ["Prolonged sitting"].join(SEP),
      tx_pattern: ["Mechanical — movement and posture related"].join(SEP),
      tx_rel: ["Manipulation — significant relief"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    expect(tv.aggravating.rotationAggravates).toBe(true);
    expect(tv.aggravating.extensionAggravates).toBe(true);
    expect(tv.aggravating.sustainedPostureAggravates).toBe(true);
    expect(tv.symptomBehaviour.mechanicalPattern).toBe(true);
    expect(tv.relieving.manipulationSignificantRelief).toBe(true);
  });

  it("derives costovertebral and interscapular location flags only from the matching real options", () => {
    const cv = extractThoracicVariablesStructured({ tx_loc: ["Costovertebral — lateral"].join(SEP) });
    expect(cv.location.costovertebralLocation).toBe(true);
    expect(cv.location.interscapularLocation).toBe(false);

    const isc = extractThoracicVariablesStructured({ tx_loc: ["Interscapular — central"].join(SEP) });
    expect(isc.location.interscapularLocation).toBe(true);
    expect(isc.location.costovertebralLocation).toBe(false);
  });

  it("flags cardiac-like radiation only from the exact urgent-flag option string", () => {
    const tv = extractThoracicVariablesStructured({
      tx_radiation: ["Cardiac-like radiation — left chest / arm (urgent flag)"].join(SEP),
    });
    expect(tv.location.cardiacLikeRadiation).toBe(true);
  });

  it("recognizes post-viral costochondritis mechanism from the structured mechanism field", () => {
    const tv = extractThoracicVariablesStructured({
      tx_moi: ["Viral illness — post-viral costochondritis"].join(SEP),
    });
    expect(tv.mechanism.postViralCostochondritis).toBe(true);
  });

  it("exposes every free-text note field Pass 2 should read, none pre-interpreted here", () => {
    const tv = extractThoracicVariablesStructured({ tx_agg_notes: "worse with deep breath in" });
    expect(tv._notesForAiPass.tx_agg_notes).toBe("worse with deep breath in");
    expect(tv._notesForAiPass.tx_loc_notes).toBe("");
  });
});

describe("mergeThoracicVariables", () => {
  it("never lets an AI finding override a real Pass 1 answer (additive-only merge)", () => {
    const tv = extractThoracicVariablesStructured({ tx_agg_mov: ["Extension"].join(SEP) });
    const { merged, aiFilledFields } = mergeThoracicVariables(tv, [
      { variable: "rotationAggravates", value: "true", sourceQuote: "worse turning", confidence: 55 },
    ]);
    // Pass 1 already answered the movements group (false for rotation) -- must not be touched.
    expect(merged.aggravating.rotationAggravates).toBe(false);
    expect(aiFilledFields).not.toContain("rotationAggravates");
  });

  it("fills a genuine Pass 1 gap from an AI finding", () => {
    const tv = extractThoracicVariablesStructured({}); // movements untouched -> unknown
    const { merged, aiFilledFields } = mergeThoracicVariables(tv, [
      { variable: "rotationAggravates", value: "true", sourceQuote: "worse turning to look over shoulder", confidence: 70 },
    ]);
    expect(merged.aggravating.rotationAggravates).toBe(true);
    expect(aiFilledFields).toContain("rotationAggravates");
  });

  it("routes all 7 red-flag-category findings to pendingRedFlagReview, never auto-merging into redFlags.*", () => {
    const tv = extractThoracicVariablesStructured({});
    const { merged, pendingRedFlagReview } = mergeThoracicVariables(tv, [
      { variable: "cardiacConcern", value: "chest tightness mentioned", sourceQuote: "tightness in chest", confidence: 50 },
      { variable: "cordCompressionConcern", value: "leg weakness mentioned", sourceQuote: "legs feel weak", confidence: 45 },
    ]);
    expect(merged.redFlags.cardiac).toBe(false); // untouched by the AI finding
    expect(merged.redFlags.cordCompression).toBe(false);
    expect(pendingRedFlagReview.length).toBe(2);
    expect(pendingRedFlagReview.map(f => f.variable)).toEqual(
      expect.arrayContaining(["cardiacConcern", "cordCompressionConcern"])
    );
  });

  it("ignores an unrecognized variable name silently rather than corrupting state", () => {
    const tv = extractThoracicVariablesStructured({});
    const { merged, aiFilledFields } = mergeThoracicVariables(tv, [
      { variable: "notARealField", value: "true", sourceQuote: "??", confidence: 40 },
    ]);
    expect(aiFilledFields).toEqual([]);
    expect(merged).toBeTruthy();
  });
});
