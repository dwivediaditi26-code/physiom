// aiIntakeParser.test.jsx
// Covers mapParseResultToUpdates (aiIntakeParser.js): the field mapping
// that turns an /api/parse result into the older Subjective screen's
// field ids (SubjectiveObjective.jsx's dictation feature uses it). It also
// surfaces the AI's `flags` array of red-flag phrases as a prompt to
// screen, appended to the visible neuro_clinician_notes field -- never
// auto-marked positive/negative.
//
// (The AI chat's own "Fill patient record" path that also used this was
// hidden from students on 2026-07-30 and removed on 2026-09-25.)
import { describe, it, expect } from "vitest";
import { mapParseResultToUpdates, REGION_PREFIX_MAP } from "../aiIntakeParser.js";

// The user's own real dictation example, as /api/parse would plausibly
// structure it from "25 year old, post-op stiffness and limited ROM
// right shoulder, 2 months back had greater tuberosity fracture, post-op
// stiffness and pain due to RTA".
const shoulderRTAResult = {
  age: 25, sex: "Male", occupation: null,
  region: "Shoulder", laterality: "Right",
  duration: "6 weeks–3 months", onset: "Post-surgical",
  nrsNow: 5, nrsWorst: 7, nrsBest: 2,
  painQuality: ["Aching", "Tightness"],
  aggMovements: ["overhead reaching", "external rotation"],
  aggActivities: [],
  relMovements: ["rest"],
  hasRadiation: false,
  neuroSymptoms: [],
  flags: ["post-surgical — screen for infection signs", "screen for DVT given recent surgery"],
};

describe("mapParseResultToUpdates — the shared extraction logic", () => {
  it("maps demographics, chief complaint, and region-prefixed fields correctly for the shoulder RTA example", () => {
    const { updates, region } = mapParseResultToUpdates(shoulderRTAResult, {});
    expect(updates.dem_age).toBe("25");
    expect(updates.dem_sex).toBe("Male");
    expect(updates.cc_duration).toBe("6 weeks–3 months");
    expect(updates.cc_onset).toBe("Post-surgical");
    expect(updates.cc_vas_now).toBe("5");
    expect(region).toBe("Shoulder (R)");
    expect(REGION_PREFIX_MAP[region]).toBe("shr");
    expect(updates.shr_agg_notes).toContain("overhead reaching");
    expect(updates.shr_rel_notes).toContain("rest");
  });

  it("surfaces red flags for review without ever auto-marking them positive or negative", () => {
    const { redFlagsToReview, updates } = mapParseResultToUpdates(shoulderRTAResult, {});
    expect(redFlagsToReview).toEqual(["post-surgical — screen for infection signs", "screen for DVT given recent surgery"]);
    // The mapping function itself never touches any nrf_/red-flag field directly
    expect(Object.keys(updates).some(k => k.startsWith("nrf_"))).toBe(false);
  });

  it("produces a human-readable filled-field summary", () => {
    const { filledLabels } = mapParseResultToUpdates(shoulderRTAResult, {});
    expect(filledLabels).toContain("Age");
    expect(filledLabels).toContain("Duration");
    expect(filledLabels).toContain("Aggravating factors");
    expect(filledLabels).toContain("Region: Shoulder (R)");
  });

  it("returns no region/prefix when the AI could not classify one", () => {
    const { updates, region } = mapParseResultToUpdates({ age: 40 }, {});
    expect(region).toBeNull();
    expect(updates.dem_age).toBe("40");
  });

  it("left-side shoulder and knee laterality map to the correct distinct prefixes", () => {
    expect(mapParseResultToUpdates({ region: "Shoulder", laterality: "Left" }, {}).region).toBe("Shoulder (L)");
    expect(mapParseResultToUpdates({ region: "Knee", laterality: "Left" }, {}).region).toBe("Knee (L)");
  });

  it("bilateral / unspecified-side Knee & Shoulder still resolve a prefix so region fields are NOT dropped (regression)", () => {
    // Bilateral knee: previously region stayed 'Knee', REGION_PREFIX_MAP['Knee']
    // was undefined, pfx=null, and every region-specific field was silently lost.
    const biKnee = mapParseResultToUpdates({
      region: "Knee", laterality: "Bilateral",
      aggMovements: ["Climbing stairs"], aggActivities: ["Prolonged standing"],
      symptomPattern: "Mechanical",
    }, {});
    expect(biKnee.region).toBe("Knee (R)");
    expect(REGION_PREFIX_MAP[biKnee.region]).toBe("knr");
    expect(biKnee.updates.knr_agg_notes).toBeTruthy();      // region data now lands
    expect(biKnee.updates.knr_agg_notes).toContain("stairs");
    // Unspecified side defaults to a resolvable prefix too
    expect(mapParseResultToUpdates({ region: "Knee" }, {}).region).toBe("Knee (R)");
    expect(mapParseResultToUpdates({ region: "Shoulder", laterality: "Both" }, {}).region).toBe("Shoulder (R)");
  });
});
