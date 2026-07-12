// Proves the radiation field-name fix (previously wrote positive
// radiation to {pfx}_rad_notes, a field nothing read) generalizes
// across every region, not just the lumbar/leg case it was first
// noticed in. The fix itself is one generic line of code
// (updates[pfx + "_radiation"] = ...) shared by all regions, but that's
// a claim, not proof -- this test actually runs it for cervical (arm
// radiation), shoulder, and knee and checks the real SOAP output for
// each.

import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";

describe("Radiation fix generalizes across regions, not just lumbar", () => {
  const cases = [
    {
      label: "Cervical -> arm radiation",
      result: {
        chiefComplaint: "Cervical radiculopathy with right arm radiation",
        age: 45, region: "Cervical spine", laterality: "Right",
        duration: "1–2 weeks (acute)", onset: "MVA / whiplash",
        painQuality: ["Sharp"], aggMovements: ["Turning head"], aggActivities: [],
        relMovements: [], hasRadiation: true, radiationSide: "Right",
        radiationArea: "Shooting pain down the right arm into the forearm",
        neuroSymptoms: ["Tingling"], flags: [],
      },
      expectedField: "cx_radiation",
      soapShouldContain: "arm",
    },
    {
      label: "Shoulder (R) -> radiation into upper arm",
      result: {
        chiefComplaint: "Rotator cuff related pain with referral",
        age: 50, region: "Shoulder", laterality: "Right",
        duration: "6 weeks–3 months", onset: "Gradual — insidious",
        painQuality: ["Aching"], aggMovements: ["Overhead reaching"], aggActivities: [],
        relMovements: [], hasRadiation: true, radiationSide: "Right",
        radiationArea: "Deep ache referring into the upper arm, not past the elbow",
        neuroSymptoms: [], flags: [],
      },
      expectedField: "shr_radiation",
      soapShouldContain: "upper arm",
    },
    {
      label: "Knee (L) -> radiation up into the thigh",
      result: {
        chiefComplaint: "Anterior knee pain with proximal referral",
        age: 28, region: "Knee", laterality: "Left",
        duration: "2–6 weeks (subacute)", onset: "Sport-related",
        painQuality: ["Sharp"], aggMovements: ["Squatting"], aggActivities: [],
        relMovements: [], hasRadiation: true, radiationSide: "Left",
        radiationArea: "Pain referring up into the anterior thigh",
        neuroSymptoms: [], flags: [],
      },
      expectedField: "knl_radiation",
      soapShouldContain: "thigh",
    },
  ];

  test.each(cases)("$label", ({ result, expectedField, soapShouldContain }) => {
    const { updates } = mapParseResultToUpdates(result, {});

    // Written to the real field name (not the old, unread "_rad_notes")
    expect(updates[expectedField]).toBeTruthy();
    expect(updates[expectedField]).toContain(soapShouldContain === "arm" ? "arm" : result.radiationArea.split(" ").slice(-2).join(" "));

    // And it actually reaches the real SOAP generator's output
    const soap = buildRealtimeSOAP(updates);
    expect(soap.S.toLowerCase()).toContain(soapShouldContain);
  });
});
