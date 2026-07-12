// Regression test for a real gap found while reviewing live results:
// the user described a wrist with "distal radius fracture on the left
// wrist six weeks ago, cast removed last week" -- clearly a fracture,
// post-immobilization case -- but the generated SOAP Subjective text
// read only "Patient presents. Symptoms: Aching. Duration: 6 weeks-3
// months. Onset: Sudden - traumatic." -- no mention of "fracture" or
// "cast" anywhere.
//
// Root cause: mapParseResultToUpdates wrote onset/duration/pain quality
// etc., but never touched cc_main -- the actual free-text "Chief
// complaint" field (see AppModules.jsx's intake form, labeled "Chief
// complaint *"). That's the exact field buildRealtimeSOAP's opening
// line reads (`${name} presents with: "${cc}"`) and the one the
// interpretation engine scans for red-flag keywords. None of the
// AI's other structured fields (a categorical onset, a duration
// bracket, pain-quality tags) carry a specific diagnosis like
// "distal radius fracture" -- only a genuine one-line summary does,
// and nothing was ever asking the AI for one.
//
// Fixed by adding chiefComplaint to /api/parse's extraction schema and
// mapping it straight to cc_main. This test proves the fix closes the
// loop end to end: narrative in, chiefComplaint out, cc_main set, and
// the real SOAP generator (the same function Live SOAP and SOAP Notes
// both call) actually includes it in the generated text.

import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";

describe("chiefComplaint -> cc_main -> SOAP text (fracture detail no longer silently dropped)", () => {
  test("mapParseResultToUpdates writes chiefComplaint to cc_main", () => {
    const result = {
      chiefComplaint: "Left distal radius fracture, cast removed, 6 weeks post-injury",
      age: 52, sex: "Female", region: "Elbow/Wrist/Hand", laterality: "Left",
      duration: "6 weeks–3 months", onset: "Sudden — traumatic",
      painQuality: ["Aching"], aggMovements: ["gripping"], aggActivities: [],
      relMovements: [], hasRadiation: false, neuroSymptoms: [], flags: [],
    };
    const { updates, filledLabels } = mapParseResultToUpdates(result, {});
    expect(updates.cc_main).toBe("Left distal radius fracture, cast removed, 6 weeks post-injury");
    expect(filledLabels).toContain("Chief complaint");
  });

  test("a case with no chiefComplaint (AI returned null) doesn't write a bogus cc_main", () => {
    const result = { chiefComplaint: null, age: 30, region: "Knee", laterality: "Left", flags: [] };
    const { updates } = mapParseResultToUpdates(result, {});
    expect(updates.cc_main).toBeUndefined();
  });

  test("end to end: the real SOAP generator includes the fracture detail once cc_main is set", () => {
    const result = {
      chiefComplaint: "Left distal radius fracture, cast removed, 6 weeks post-injury",
      age: 52, sex: "Female", region: "Elbow/Wrist/Hand", laterality: "Left",
      duration: "6 weeks–3 months", onset: "Sudden — traumatic",
      painQuality: ["Aching"], aggMovements: ["gripping"], aggActivities: [],
      relMovements: [], hasRadiation: false, neuroSymptoms: [], flags: [],
    };
    const { updates } = mapParseResultToUpdates(result, {});
    const soap = buildRealtimeSOAP(updates);

    // This is the exact regression: before the fix, S never mentioned
    // the fracture at all -- just the generic onset/duration template.
    expect(soap.S).toContain("distal radius fracture");
    expect(soap.S).toContain("cast removed");
  });
});
