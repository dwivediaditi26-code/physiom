// Regression test for a real gap the user found: a narrative clearly
// describing bilateral neurogenic claudication ("legs ache and go heavy
// after walking more than five minutes, better sitting or leaning on a
// trolley") produced Subjective fields and a SOAP note that never
// mentioned the legs at all -- "heaviness" only landed in generic pain
// quality for the lumbar region, with no field capturing that it's
// actually happening in the LEGS, which matters clinically (changes the
// differential, and leg involvement matters for red flag screening).
//
// Root cause: the AI's extraction schema only asked for hasRadiation /
// radiationArea in the context of classic shooting/sciatica-style pain,
// and neuroSymptoms had no option for a claudication (walking-induced
// leg heaviness/weakness) pattern at all -- so there was nowhere for
// the AI to correctly place this information even though the mapper
// (aiIntakeParser.js) already has working code to receive it (writes
// hasRadiation -> lx_rad_notes, neuroSymptoms -> lx_neuro_quality).
//
// Fixed by broadening the /api/parse prompt, not the mapper -- the
// mapping code was already correct, it just never received the data.
// This test proves the case now flows through end to end.

import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";

describe("Leg/claudication involvement is captured for spinal complaints", () => {
  test("hasRadiation + radiationArea describing claudication maps to the real lumbar leg-symptom field", () => {
    const result = {
      chiefComplaint: "Bilateral neurogenic claudication, gradual onset over a year",
      age: 70, sex: "Male", region: "Lumbar / SI", laterality: "Bilateral",
      duration: "1–2 years", onset: "Gradual — insidious",
      painQuality: ["Aching", "Heaviness"],
      aggMovements: ["Walking more than five minutes"], aggActivities: [],
      relMovements: ["Sitting down", "Leaning on a shopping trolley"],
      hasRadiation: true, radiationSide: "Bilateral",
      radiationArea: "Bilateral leg heaviness and aching after walking >5 min, relieved by sitting or leaning forward",
      neuroSymptoms: ["Heaviness/weakness in legs after walking (claudication pattern)"],
      flags: [],
    };
    const { updates } = mapParseResultToUpdates(result, {});

    // The specific leg pattern lands in the real radiation field --
    // buildRealtimeSOAP and the interpretation engine both read
    // {prefix}_radiation (confirmed via _allRad's field scan), not a
    // separate "_rad_notes" field, which was the actual bug found while
    // writing this test: the mapper wrote the right DATA to the wrong
    // FIELD NAME, so it never reached the SOAP note or the differential
    // engine despite appearing correct in the console's field summary.
    expect(updates.lx_radiation).toContain("leg heaviness");
    // And the claudication descriptor lands in the real lumbar neuro-quality field
    expect(updates.lx_neuro_quality).toContain("claudication");
  });

  test("end to end: the real SOAP generator now mentions leg involvement, not just generic aching", () => {
    const result = {
      chiefComplaint: "Bilateral neurogenic claudication, gradual onset over a year",
      age: 70, sex: "Male", region: "Lumbar / SI", laterality: "Bilateral",
      duration: "1–2 years", onset: "Gradual — insidious",
      painQuality: ["Aching", "Heaviness"],
      aggMovements: ["Walking more than five minutes"], aggActivities: [],
      relMovements: ["Sitting down", "Leaning on a shopping trolley"],
      hasRadiation: true, radiationSide: "Bilateral",
      radiationArea: "Bilateral leg heaviness and aching after walking >5 min, relieved by sitting or leaning forward",
      neuroSymptoms: ["Heaviness/weakness in legs after walking (claudication pattern)"],
      flags: [],
    };
    const { updates } = mapParseResultToUpdates(result, {});
    const soap = buildRealtimeSOAP(updates);

    // This is the exact regression: before the fix, S never mentioned
    // the legs at all -- just "Symptoms: Aching, Heaviness."
    expect(soap.S.toLowerCase()).toContain("leg");
  });
});
