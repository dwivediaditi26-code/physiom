// The mapper already had code to write symptomPattern/diurnalPattern/
// morningSymptoms/nightSymptoms to real fields ({pfx}_pattern,
// {pfx}_24hr, {pfx}_morning, {pfx}_night -- all confirmed read by the
// interpretation engine and Patient Profile), but /api/parse never
// actually asked the AI for them, so a therapist mentioning "worse in
// the mornings" or "comes and goes" had no guaranteed place to land.
// Closed that gap by adding these to the extraction schema. This test
// proves the destination fields were real all along and now actually
// receive data once the AI is asked for it.

import { describe, test, expect } from "vitest";
import { mapParseResultToUpdates } from "../aiIntakeParser.js";

describe("Symptom pattern and diurnal timing are captured once the AI is asked for them", () => {
  test("symptomPattern, diurnalPattern, morningSymptoms, nightSymptoms all map to real fields", () => {
    const result = {
      chiefComplaint: "Chronic mechanical low back pain",
      age: 45, region: "Lumbar / SI", laterality: null,
      duration: "1–2 years", onset: "Gradual — insidious",
      symptomPattern: "Mechanical — clearly varies with movement/position/load",
      diurnalPattern: "Worse first thing in the morning, eases through the day",
      morningSymptoms: ["Stiffness for 30 minutes on waking"],
      nightSymptoms: ["Wakes with pain when rolling over"],
      painQuality: ["Aching"], aggMovements: [], aggActivities: [],
      relMovements: [], hasRadiation: false, neuroSymptoms: [], flags: [],
    };
    const { updates } = mapParseResultToUpdates(result, {});

    expect(updates.lx_pattern).toBe("Mechanical — clearly varies with movement/position/load");
    expect(updates.lx_24hr).toBe("Worse first thing in the morning, eases through the day");
    expect(updates.lx_morning).toContain("Stiffness for 30 minutes on waking");
    expect(updates.lx_night).toContain("Wakes with pain when rolling over");
  });

  test("nothing mentioned means nothing written -- the AI is told not to guess", () => {
    const result = {
      age: 30, region: "Knee", laterality: "Left",
      symptomPattern: null, diurnalPattern: null,
      morningSymptoms: [], nightSymptoms: [],
      flags: [],
    };
    const { updates } = mapParseResultToUpdates(result, {});
    expect(updates.knl_pattern).toBeUndefined();
    expect(updates.knl_24hr).toBeUndefined();
    expect(updates.knl_morning).toBeUndefined();
    expect(updates.knl_night).toBeUndefined();
  });
});
