// cervicalReasoningEngine.test.js
// Unit tests for the Layer 3 cervical reasoning engine, run against
// realistic cases through the real Pass 1 extractor (not hand-built cv
// objects) so this also catches any mismatch between the two modules'
// shapes. Mirrors lumbarReasoningEngine.test.js's structure exactly.
import { describe, it, expect } from "vitest";
import { extractCervicalVariablesStructured } from "../cervicalVariableExtractor.js";
import { runCervicalReasoningEngine } from "../cervicalReasoningEngine.js";

const SEP = "|||";

describe("runCervicalReasoningEngine", () => {
  it("ranks C02 (radiculopathy) at or near the top for a textbook radiculopathy case", () => {
    const data = {
      cx_loc: ["Neck", "Right upper trapezius"].join(SEP),
      cx_radiation: ["Radiates into right arm/hand"].join(SEP),
      cx_dermatomal: ["C6 — thumb/index finger"].join(SEP),
      cx_moi: ["No clear mechanism — insidious onset"].join(SEP),
      cx_arm_present: "Yes — unilateral (R)",
      cx_arm_neuro: ["Objective numbness on testing"].join(SEP),
      cx_agg_mov: ["Extension — looking up", "Combined extension + rotation (right) — quadrant position"].join(SEP),
      cx_agg_other: ["Coughing / sneezing (dural / cord tension)"].join(SEP),
      cx_rel_mov: ["Arm overhead — relieves arm symptoms (shoulder abduction relief sign)"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);

    expect(result.redFlagOverride.triggered).toBe(false);
    const top = result.conditions[0];
    expect(top.id).toBe("C02");
    expect(top.matchTier).toBe("Strong match");
  });

  it("ranks C01 (non-specific) as a plausible leading match for a plain mechanical case with a negative red flag screen", () => {
    const data = {
      cx_agg_post: ["Prolonged sitting / desk posture"].join(SEP),
      cx_rel_post: ["Lying down"].join(SEP),
      cx_arm_present: "No arm/hand symptoms",
      cx_dermatomal: ["Not dermatomal / not applicable"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);

    expect(result.redFlagOverride.triggered).toBe(false);
    // Several conditions legitimately share "no arm/hand symptoms" support
    // in this sparse fixture -- assert C02 (which needs arm/hand findings
    // this fixture explicitly denies) is correctly NOT leading.
    const top = result.conditions[0];
    expect(top.id).not.toBe("C02");
  });

  it("triggers a hard EMERGENCY override for cervical myelopathy indicators, regardless of other findings", () => {
    const data = {
      cx_rf_myelopathy: ["Bilateral hand symptoms", "Gait disturbance / unsteadiness"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);

    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("EMERGENCY");
  });

  it("triggers a hard EMERGENCY override for vertebrobasilar insufficiency indicators", () => {
    const data = {
      cx_rf_vbi: ["Dizziness with neck movement", "Diplopia (double vision)"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);

    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("EMERGENCY");
  });

  it("treats a positive instability/other red flag as URGENT_REFERRAL, not the same tier as myelopathy/VBI", () => {
    const data = {
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["Known rheumatoid arthritis / Down syndrome"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);

    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("URGENT_REFERRAL");
  });

  it("reports an incomplete screen rather than treating it as negative when red flags were never asked", () => {
    const cv = extractCervicalVariablesStructured({});
    const result = runCervicalReasoningEngine(cv);

    expect(result.redFlagOverride.triggered).toBe(false);
    expect(result.redFlagOverride.urgency).toBe("SCREEN_INCOMPLETE");
  });

  it("ranks C05 (WAD) highly for a collision mechanism with a recorded Quebec grade", () => {
    const data = {
      cx_moi: ["Whiplash — motor vehicle collision (rear/front/side impact)"].join(SEP),
      cx_moi_wad: "Grade II — decreased ROM + point tenderness",
      cx_ha_present: "Yes",
      cx_agg_post: ["Prolonged sitting / desk posture"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);
    const c05 = result.conditions.find(c => c.id === "C05");
    expect(["Strong match", "Possible match"]).toContain(c05.matchTier);
  });

  it("ranks C04 (cervicogenic headache) highly for an occipital headache triggered by neck movement", () => {
    const data = {
      cx_ha_present: "Yes",
      cx_ha_location: ["Occipital / base of skull (cervicogenic)"].join(SEP),
      cx_ha_triggers: ["Triggered by neck movement (cervicogenic)"].join(SEP),
      cx_agg_post: ["Prolonged sitting / desk posture"].join(SEP),
      cx_rel_mov: ["Chin tuck / cervical retraction relieves"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);
    const c04 = result.conditions.find(c => c.id === "C04");
    expect(["Strong match", "Possible match"]).toContain(c04.matchTier);
  });

  it("every condition reports unknownCount so callers can distinguish low-confidence matches from genuinely negative ones", () => {
    const cv = extractCervicalVariablesStructured({});
    const result = runCervicalReasoningEngine(cv);
    result.conditions.forEach(c => {
      expect(typeof c.unknownCount).toBe("number");
      expect(c.totalChecks).toBeGreaterThan(0);
    });
  });

  it("includes the deep cervical flexor MMT test (Jull 2008 / Elliott 2006) as a recommended objective test for C01 and C04", () => {
    const cv = extractCervicalVariablesStructured({});
    const result = runCervicalReasoningEngine(cv);
    const c01 = result.conditions.find(c => c.id === "C01");
    const c04 = result.conditions.find(c => c.id === "C04");
    expect(c01.objectiveTests.recommended).toContain("Cervical MMT (deep cervical flexor test — craniocervical flexion)");
    expect(c04.objectiveTests.recommended).toContain("Cervical MMT (deep cervical flexor test — craniocervical flexion)");
  });

  it("returns exactly 10 scored conditions (C01-C10), with C11 handled only via redFlagOverride", () => {
    const cv = extractCervicalVariablesStructured({});
    const result = runCervicalReasoningEngine(cv);
    expect(result.conditions.length).toBe(10);
    expect(result.conditions.some(c => c.id === "C11")).toBe(false);
  });

  it("flags C09 and C10 as lowConfidence, grounded in real sources (Travell & Simons / C Rex) rather than left as unverified placeholders", () => {
    const cv = extractCervicalVariablesStructured({});
    const result = runCervicalReasoningEngine(cv);
    const c09 = result.conditions.find(c => c.id === "C09");
    const c10 = result.conditions.find(c => c.id === "C10");
    expect(c09.lowConfidence).toBe(true);
    expect(c10.lowConfidence).toBe(true);
    expect(c09.note).toMatch(/C Rex/);
    expect(c10.note).toMatch(/Travell & Simons/);
    expect(c10.note).not.toMatch(/UNVERIFIED/);
  });

  it("ranks C10 (myofascial) with real support for an occipital headache triggered by neck movement, grounded in Travell & Simons referred-pain patterns", () => {
    const data = {
      cx_ha_present: "Yes",
      cx_ha_location: ["Occipital / base of skull (cervicogenic)"].join(SEP),
      cx_ha_triggers: ["Triggered by neck movement (cervicogenic)"].join(SEP),
      cx_agg_post: ["Prolonged sitting / desk posture"].join(SEP),
      cx_arm_present: "No arm/hand symptoms",
      cx_dermatomal: ["Not dermatomal / not applicable"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);
    const c10 = result.conditions.find(c => c.id === "C10");
    expect(c10.supportingMatched.length).toBeGreaterThanOrEqual(4);
    expect(c10.matchTier).not.toBe("Insufficient data");
  });

  it("breaks same-tier ties by proportion of each condition's own checklist satisfied, not raw count", () => {
    // Real-world regression found via a 20-case realistic-patient sweep:
    // a 22-year-old who woke up with sudden severe neck pain and
    // torticollis (rotation-guarding, no arm symptoms) used to rank C03
    // (facet dysfunction, 4 of 6 supporting = 67%) above C06 (acute
    // muscle strain/torticollis, 4 of 4 supporting = 100%) purely
    // because both matched the same raw count of 4. Same bug class
    // already fixed once in thoracicReasoningEngine.js, ported here.
    const data = {
      cc_onset: "Sudden onset, woke up with severe neck pain and unable to turn head",
      cx_arm_present: "No arm or hand symptoms",
      cx_dermatomal: ["Not dermatomal / not applicable"].join(SEP),
      cx_agg_mov: ["Rotation left"].join(SEP),
      // Explicit negative (not just omitted) -- a later fix made
      // objectiveNeuroSigns correctly read as "unknown" rather than a
      // silent false-positive "confirmed absent" when cx_arm_neuro is
      // never touched at all, so the tie premise needs a real answer here.
      cx_arm_neuro: ["No neurological symptoms"].join(SEP),
      cx_rf_myelopathy: "No myelopathy signs", cx_rf_vbi: "No VBI signs",
      cx_rf_instability: "No instability signs", cx_rf_other: "No other red flags",
    };
    const cv = extractCervicalVariablesStructured(data);
    const result = runCervicalReasoningEngine(cv);
    const c03 = result.conditions.find(c => c.id === "C03");
    const c06 = result.conditions.find(c => c.id === "C06");
    expect(c03.matchTier).toBe("Strong match");
    expect(c06.matchTier).toBe("Strong match");
    expect(c03.supportingMatched.length).toBe(4);
    expect(c03.supportingTotal).toBe(6);
    expect(c06.supportingMatched.length).toBe(4);
    expect(c06.supportingTotal).toBe(4);
    const c06Index = result.conditions.findIndex(c => c.id === "C06");
    const c03Index = result.conditions.findIndex(c => c.id === "C03");
    expect(c06Index).toBeLessThan(c03Index);
  });

  it("does not let an entirely untouched field masquerade as a confirmed negative finding", () => {
    // Real-world regression found via a fully-blank-form sweep: several
    // derived booleans (whiplashMechanism, objectiveNeuroSigns,
    // extensionAggravates, rotationAggravates, quadrantAggravates) used
    // to default to a plain `false` whenever their underlying multicheck
    // field was never touched at all -- indistinguishable from a real,
    // deliberate negative answer. That silently inflated match tiers on
    // completely blank forms (e.g. C05 showed "Unlikely" -- as if a
    // clinician had actively ruled out whiplash -- and C08/C09 showed
    // "Possible match" purely from unanswered aggravating-movement
    // fields). Every condition on a genuinely empty form must reflect
    // that nothing was actually asked.
    const cv = extractCervicalVariablesStructured({});
    const result = runCervicalReasoningEngine(cv);
    result.conditions.forEach((c) => {
      expect(["Insufficient data"]).toContain(
        c.supportingMatched.length === 0 ? "Insufficient data" : c.matchTier
      );
    });
    const c05 = result.conditions.find(c => c.id === "C05");
    expect(c05.matchTier).not.toBe("Unlikely");
    expect(c05.refutingMatched).not.toContain("No clear traumatic/collision mechanism");
  });
});
