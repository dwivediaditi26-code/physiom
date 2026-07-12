// Covers the extraction audit trail and missing-information checklist
// added per the user's zero-hallucination spec: every extraction should
// carry its own confidence/source-quote data and the verbatim original
// narrative, and should tell the clinician what wasn't captured, so
// nothing is silently assumed complete.
//
// Deliberately does NOT touch any existing field -- cc_main, dem_age,
// lx_radiation etc. all still store plain values exactly as before, so
// the SOAP generator, interpretation engine, and Patient Profile don't
// need to change at all. The audit trail is one new, separate field.

import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";

describe("Extraction audit trail (confidence, source quotes, verbatim narrative)", () => {
  test("confidence and source quotes pass through from the AI's own response, untouched", () => {
    const result = {
      chiefComplaint: "Left distal radius fracture, cast removed", age: 52, region: "Elbow/Wrist/Hand",
      laterality: "Left", duration: "6 weeks–3 months", flags: [],
      _confidence: { chiefComplaint: 95, age: 100, duration: 90 },
      _sourceQuotes: { chiefComplaint: "distal radius fracture...cast removed", age: "52 year old woman" },
    };
    const { extractionMeta } = mapParseResultToUpdates(result, {}, "52 year old woman, distal radius fracture...");
    expect(extractionMeta.confidence).toEqual({ chiefComplaint: 95, age: 100, duration: 90 });
    expect(extractionMeta.sourceQuotes.chiefComplaint).toContain("distal radius fracture");
    expect(extractionMeta.narrative).toBe("52 year old woman, distal radius fracture...");
  });

  test("missing confidence/source data from the AI doesn't crash -- defaults to empty objects", () => {
    const result = { age: 30, region: "Knee", flags: [] };
    const { extractionMeta } = mapParseResultToUpdates(result, {});
    expect(extractionMeta.confidence).toEqual({});
    expect(extractionMeta.sourceQuotes).toEqual({});
    expect(extractionMeta.narrative).toBe("");
  });

  test("missing-information checklist flags real, currently-empty categories", () => {
    const result = {
      age: 30, region: "Lumbar / SI", onset: "Gradual — insidious",
      // No pain scale, no occupation, no pattern, no radiation answer, no agg/rel/quality
      flags: [],
    };
    const { extractionMeta } = mapParseResultToUpdates(result, {});
    expect(extractionMeta.missingInfo).toContain("Pain scale (0-10)");
    expect(extractionMeta.missingInfo).toContain("Occupation");
    expect(extractionMeta.missingInfo).toContain("Radiation / referred symptoms");
    expect(extractionMeta.missingInfo).toContain("Aggravating factors");
  });

  test("a thorough narrative leaves little or nothing on the missing-information checklist", () => {
    const result = {
      age: 45, occupation: "Warehouse worker", region: "Lumbar / SI",
      nrsNow: 5, nrsWorst: 8, nrsBest: 3,
      symptomPattern: "Mechanical — clearly varies with movement/position/load",
      diurnalPattern: "Worse in the morning",
      painQuality: ["Aching"], aggMovements: ["Bending"], relMovements: ["Rest"],
      hasRadiation: false, flags: [],
    };
    const { extractionMeta } = mapParseResultToUpdates(result, {});
    expect(extractionMeta.missingInfo).not.toContain("Pain scale (0-10)");
    expect(extractionMeta.missingInfo).not.toContain("Occupation");
    expect(extractionMeta.missingInfo).not.toContain("Aggravating factors");
    expect(extractionMeta.missingInfo).not.toContain("Relieving factors");
  });

  test("existing 2-argument calls (no narrative passed) still work -- backward compatible", () => {
    const result = { age: 30, region: "Knee", flags: [] };
    // Old call signature, exactly as every existing caller/test uses it
    const { updates, region, filledLabels, redFlagsToReview } = mapParseResultToUpdates(result, {});
    expect(updates.dem_age).toBe("30");
    expect(region).toBe("Knee");
  });
});
