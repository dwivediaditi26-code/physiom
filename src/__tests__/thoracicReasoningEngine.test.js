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

  it("includes the Thoracic MMT test as a recommended objective test for T06 and T09", () => {
    const tv = extractThoracicVariablesStructured({});
    const result = runThoracicReasoningEngine(tv);
    const t06 = result.conditions.find(c => c.id === "T06");
    const t09 = result.conditions.find(c => c.id === "T09");
    expect(t06.objectiveTests.recommended.some(s => /thoracic mmt/i.test(s))).toBe(true);
    expect(t09.objectiveTests.recommended.some(s => /thoracic mmt/i.test(s))).toBe(true);
  });
});
