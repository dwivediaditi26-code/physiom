// thoracicReasoningEngine.test.js
// Unit tests for the Layer 3 thoracic reasoning engine, run against
// realistic cases through the real Pass 1 extractor (not hand-built tv
// objects) so this also catches any mismatch between the two modules'
// shapes. Mirrors lumbarReasoningEngine.test.js / cervicalReasoningEngine.test.js's
// structure. T11 is NOT scored like T01-T10 -- it's a hard override, and
// unlike lumbar's L11/cervical's C11 (one standout EMERGENCY category
// each), Thoracic's T11 treats cardiac, respiratory, AND cord compression
// ALL as EMERGENCY (Magee Table 8-1 lists MI/PE/pneumothorax side-by-side).
import { describe, it, expect } from "vitest";
import { extractThoracicVariablesStructured } from "../thoracicVariableExtractor.js";
import { runThoracicReasoningEngine } from "../thoracicReasoningEngine.js";

const SEP = "|||";

describe("runThoracicReasoningEngine", () => {
  it("ranks T01 (facet/mechanical) at or near the top for a textbook mechanical case", () => {
    const data = {
      tx_loc: ["Mid thoracic T5–T8"].join(SEP),
      tx_agg_mov: ["Rotation (most thoracic sensitive to)", "Extension"].join(SEP),
      tx_agg_post: ["Prolonged sitting"].join(SEP),
      tx_pattern: ["Mechanical — movement and posture related"].join(SEP),
      tx_rel: ["Manipulation — significant relief"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    const result = runThoracicReasoningEngine(tv);

    expect(result.redFlagOverride.triggered).toBe(false);
    const top = result.conditions[0];
    expect(top.id).toBe("T01");
    expect(top.matchTier).toBe("Strong match");
  });

  it("ranks T03 (rib/costovertebral dysfunction) at or near the top for a breathing/cough-aggravated, traumatic-onset case", () => {
    const data = {
      tx_loc: ["Costovertebral — lateral"].join(SEP),
      tx_agg_mov: ["Deep breathing in", "Coughing"].join(SEP),
      tx_moi: ["Fall / direct trauma"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    const result = runThoracicReasoningEngine(tv);

    expect(result.redFlagOverride.triggered).toBe(false);
    const top = result.conditions[0];
    expect(top.id).toBe("T03");
    expect(top.matchTier).toBe("Strong match");
  });

  it("ranks T09 (myofascial) with strong support for interscapular/bilateral-paraspinal pain aggravated by sustained posture", () => {
    const data = {
      tx_loc: ["Interscapular — central", "Bilateral paraspinal"].join(SEP),
      tx_agg_post: ["Prolonged sitting", "Computer work sustained"].join(SEP),
      tx_pattern: ["Mechanical — movement and posture related"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    const result = runThoracicReasoningEngine(tv);
    const t09 = result.conditions.find(c => c.id === "T09");
    expect(t09.matchTier).toBe("Strong match");
  });

  it("triggers a hard EMERGENCY override for cardiac red flag indicators, regardless of other findings", () => {
    const tv = extractThoracicVariablesStructured({
      tx_rf: ["Cardiac symptoms with pain — chest tightness / radiation to left arm / jaw"].join(SEP),
    });
    const result = runThoracicReasoningEngine(tv);
    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("EMERGENCY");
  });

  it("triggers a hard EMERGENCY override for respiratory red flag indicators", () => {
    const tv = extractThoracicVariablesStructured({
      tx_rf: ["Respiratory symptoms — shortness of breath / haemoptysis"].join(SEP),
    });
    const result = runThoracicReasoningEngine(tv);
    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("EMERGENCY");
  });

  it("triggers a hard EMERGENCY override for cord compression indicators (not merely URGENT_REFERRAL)", () => {
    const tv = extractThoracicVariablesStructured({
      tx_rf: ["Bilateral leg weakness or sensory change (cord level)"].join(SEP),
    });
    const result = runThoracicReasoningEngine(tv);
    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("EMERGENCY");
  });

  it("treats a positive screen outside cardiac/respiratory/cord-compression as URGENT_REFERRAL, not EMERGENCY", () => {
    const tv = extractThoracicVariablesStructured({
      tx_rf: ["Cancer history — any — thoracic metastases risk"].join(SEP),
    });
    const result = runThoracicReasoningEngine(tv);
    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("URGENT_REFERRAL");
  });

  it("reports an incomplete screen rather than treating it as negative when red flags were never asked", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    expect(result.redFlagOverride.triggered).toBe(false);
    expect(result.redFlagOverride.urgency).toBe("SCREEN_INCOMPLETE");
  });

  it("reports SCREEN_NEGATIVE (not triggered, not incomplete) when the screen was completed and is clean", () => {
    const tv = extractThoracicVariablesStructured({ tx_rf: ["No red flags"].join(SEP) });
    const result = runThoracicReasoningEngine(tv);
    expect(result.redFlagOverride.triggered).toBe(false);
    expect(result.redFlagOverride.urgency).toBe("SCREEN_NEGATIVE");
  });

  it("differentiates T08 (costochondritis) from a cardiac source via the explicit cardiac-red-flag refuting check", () => {
    const clean = extractThoracicVariablesStructured({
      tx_moi: ["Viral illness — post-viral costochondritis"].join(SEP),
      tx_agg_mov: ["Deep breathing in", "Coughing"].join(SEP),
      tx_loc: ["Anterior chest wall"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    });
    const resultClean = runThoracicReasoningEngine(clean);
    const t08Clean = resultClean.conditions.find(c => c.id === "T08");
    expect(["Strong match", "Possible match"]).toContain(t08Clean.matchTier);
  });

  it("every condition reports unknownCount so callers can distinguish low-confidence matches from genuinely negative ones", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    result.conditions.forEach(c => {
      expect(typeof c.unknownCount).toBe("number");
      expect(c.totalChecks).toBeGreaterThan(0);
    });
  });

  it("returns exactly 10 scored conditions (T01-T10), with T11 handled only via redFlagOverride", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    expect(result.conditions.length).toBe(10);
    expect(result.conditions.some(c => c.id === "T11")).toBe(false);
  });

  it("flags T04, T05, and T07 as lowConfidence, honestly noting thin data coverage rather than hiding it", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    const t04 = result.conditions.find(c => c.id === "T04");
    const t05 = result.conditions.find(c => c.id === "T05");
    const t07 = result.conditions.find(c => c.id === "T07");
    expect(t04.lowConfidence).toBe(true);
    expect(t05.lowConfidence).toBe(true);
    expect(t07.lowConfidence).toBe(true);
    expect(t04.note).toBeTruthy();
    expect(t05.note).toMatch(/radiographic/i);
    expect(t07.note).toBeTruthy();
  });

  it("grounds T09 (myofascial) in Magee's own Table 8-8 from the start -- never an UNVERIFIED placeholder, unlike L09/C10's original state", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    const t09 = result.conditions.find(c => c.id === "T09");
    expect(t09.note).toMatch(/Table 8-8/);
    expect(t09.note).not.toMatch(/UNVERIFIED/);
  });

  it("hard-excludes T05 (Scheuermann's) and T07 (idiopathic scoliosis) for a confirmed non-adolescent age, even with otherwise-generic supporting findings present", () => {
    // Real-world regression: a 45-year-old with a plain insidious,
    // non-traumatic mechanical presentation used to score T05 as
    // 'Strong match' purely on "insidious onset + no trauma" -- both
    // true for huge swaths of ordinary adult mechanical back pain --
    // because a confirmed out-of-range age only failed to add support
    // rather than actively ruling the condition out.
    const data = {
      dem_age: "45",
      tx_moi: ["Insidious — postural / sustained"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    const result = runThoracicReasoningEngine(tv);
    const t05 = result.conditions.find(c => c.id === "T05");
    const t07 = result.conditions.find(c => c.id === "T07");
    expect(t05.matchTier).toBe("Unlikely");
    expect(t07.matchTier).toBe("Unlikely");
    expect(t05.refutingMatched.some(r => /outside the 13-16/i.test(r))).toBe(true);
  });

  it("does NOT hard-exclude T05 for a genuine adolescent (age confirmed inside 13-16)", () => {
    const data = {
      dem_age: "14",
      tx_moi: ["Insidious — postural / sustained"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    const result = runThoracicReasoningEngine(tv);
    const t05 = result.conditions.find(c => c.id === "T05");
    expect(t05.matchTier).not.toBe("Unlikely");
  });

  it("does not penalize T05/T07 any more than before when age was never captured at all", () => {
    const tv = extractThoracicVariablesStructured({
      tx_moi: ["Insidious — postural / sustained"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    });
    const result = runThoracicReasoningEngine(tv);
    const t05 = result.conditions.find(c => c.id === "T05");
    // hardExclude must stay inert (not treat "unknown" as "confirmed
    // outside range") -- same behavior as before this fix.
    expect(t05.matchTier).toBe("Strong match");
  });

  it("breaks same-tier ties by proportion of each condition's own checklist satisfied, not raw count", () => {
    // Real-world regression: a 13-year-old flagged for scoliosis screening
    // with bilateral paraspinal ache used to rank T05 (Scheuermann's,
    // 2 of 3 supporting checks = 67%) above T07 (idiopathic scoliosis,
    // 2 of 2 supporting checks = 100%) purely because both hit the same
    // raw count of 2 -- the sort's old tiebreak compared counts, not
    // proportions. T07 should lead here: its own checklist is fully
    // satisfied, T05's is only partly satisfied.
    const data = {
      dem_age: "13", dem_sex: "Female",
      tx_loc: ["Bilateral paraspinal"].join(SEP),
      tx_rf: ["No red flags"].join(SEP),
    };
    const tv = extractThoracicVariablesStructured(data);
    const result = runThoracicReasoningEngine(tv);
    const t05 = result.conditions.find(c => c.id === "T05");
    const t07 = result.conditions.find(c => c.id === "T07");
    expect(t05.matchTier).toBe("Strong match");
    expect(t07.matchTier).toBe("Strong match");
    expect(t05.supportingMatched.length).toBe(2);
    expect(t05.supportingTotal).toBe(3);
    expect(t07.supportingMatched.length).toBe(2);
    expect(t07.supportingTotal).toBe(2);
    // T07 (100%) must rank above T05 (67%) despite the tied raw count.
    const t07Index = result.conditions.findIndex(c => c.id === "T07");
    const t05Index = result.conditions.findIndex(c => c.id === "T05");
    expect(t07Index).toBeLessThan(t05Index);
  });

  it("includes the Thoracic MMT test as a recommended objective test for T06 and T09", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    const t06 = result.conditions.find(c => c.id === "T06");
    const t09 = result.conditions.find(c => c.id === "T09");
    expect(t06.objectiveTests.recommended.some(s => /thoracic mmt/i.test(s))).toBe(true);
    expect(t09.objectiveTests.recommended.some(s => /thoracic mmt/i.test(s))).toBe(true);
  });
});
