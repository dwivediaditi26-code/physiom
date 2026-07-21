// lumbarReasoningEngine.test.js
// Unit tests for the Layer 3 reasoning engine, run against realistic
// cases through the real Pass 1 extractor (not hand-built lv objects) so
// this also catches any mismatch between the two modules' shapes.
import { describe, it, expect } from "vitest";
import { extractLumbarVariablesStructured } from "../lumbarVariableExtractor.js";
import { runLumbarReasoningEngine } from "../lumbarReasoningEngine.js";

const SEP = "|||";

describe("runLumbarReasoningEngine", () => {
  it("ranks L02 (radiculopathy) at or near the top for a textbook radiculopathy case", () => {
    const data = {
      lx_moi: ["Lifting — spine flexed AND rotated (most common disc mechanism)"].join(SEP),
      lx_agg_mov: ["Forward bending (flexion)"].join(SEP),
      lx_agg_post: ["Sitting >30 minutes"].join(SEP),
      lx_agg_act: ["Coughing (discogenic indicator — intradiscal pressure)"].join(SEP),
      lx_rel_mov: ["Extension — McKenzie press-up / cobra"].join(SEP),
      lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
      lx_dermatomal: ["L5 — lateral lower leg / dorsum foot / great toe"].join(SEP),
      lx_neuro_present: "Yes — unilateral (L)",
      lx_rf_cauda: "No cauda equina signs",
      lx_rf_fracture: "No fracture indicators",
      lx_rf_inflammatory: "No inflammatory features",
      lx_rf_serious: "No other red flags",
    };
    const lv = extractLumbarVariablesStructured(data);
    const result = runLumbarReasoningEngine(lv);

    expect(result.redFlagOverride.triggered).toBe(false);
    const top = result.conditions[0];
    expect(top.id).toBe("L02");
    expect(top.matchTier).toBe("Strong match");
  });

  it("ranks L01 (non-specific) as a plausible leading match for a plain mechanical case with a negative red flag screen", () => {
    const data = {
      lx_agg_post: ["Sitting >30 minutes"].join(SEP),
      lx_rel_mov: ["Walking"].join(SEP),
      lx_below_knee: "No leg pain — back pain only",
      lx_dermatomal: ["Not dermatomal"].join(SEP),
      lx_neuro_present: "No leg neurological symptoms",
      lx_rf_cauda: "No cauda equina signs",
      lx_rf_fracture: "No fracture indicators",
      lx_rf_inflammatory: "No inflammatory features",
      lx_rf_serious: "No other red flags",
    };
    const lv = extractLumbarVariablesStructured(data);
    const result = runLumbarReasoningEngine(lv);

    expect(result.redFlagOverride.triggered).toBe(false);
    // L01/L03/L05/L08 all legitimately share "no leg symptoms" support in
    // this sparse fixture -- assert L02/L04 (which need leg/neuro
    // findings this fixture explicitly denies) are correctly NOT leading.
    const top = result.conditions[0];
    expect(["L01", "L03", "L05", "L08"]).toContain(top.id);
  });

  it("triggers a hard emergency override for cauda equina indicators, regardless of other findings", () => {
    const data = {
      lx_rf_cauda: "Saddle area anaesthesia — perineum / inner thighs",
    };
    const lv = extractLumbarVariablesStructured(data);
    const result = runLumbarReasoningEngine(lv);

    expect(result.redFlagOverride.triggered).toBe(true);
    expect(result.redFlagOverride.urgency).toBe("EMERGENCY");
  });

  it("reports an incomplete screen rather than treating it as negative when red flags were never asked", () => {
    const lv = extractLumbarVariablesStructured({});
    const result = runLumbarReasoningEngine(lv);

    expect(result.redFlagOverride.triggered).toBe(false);
    expect(result.redFlagOverride.urgency).toBe("SCREEN_INCOMPLETE");
  });

  it("every condition reports unknownCount so callers can distinguish low-confidence matches from genuinely negative ones", () => {
    const lv = extractLumbarVariablesStructured({});
    const result = runLumbarReasoningEngine(lv);
    result.conditions.forEach((c) => {
      expect(typeof c.unknownCount).toBe("number");
      expect(c.matchTier).toBe("Insufficient data");
    });
  });

  it("flags L09 as low confidence in its own output, not silently mixed in with the grounded conditions", () => {
    const lv = extractLumbarVariablesStructured({});
    const result = runLumbarReasoningEngine(lv);
    const l09 = result.conditions.find((c) => c.id === "L09");
    expect(l09.lowConfidence).toBe(true);
    expect(l09.note).toMatch(/UNVERIFIED/);
  });
});

describe("runLumbarReasoningEngine -- L01/L07 differentiation fixes (real-case regression)", () => {
  // Real test case: extension aggravates + flexion relieves alone made
  // L07 (spondylolisthesis) rank equal to L03 (facet) with "2 supporting"
  // each, because both conditions shared only two low-specificity
  // mechanical-pattern checks. Facet should outrank spondylolisthesis
  // whenever there's no actual athlete/repetitive-extension/young-age
  // evidence for spondylolisthesis specifically.
  it("does not let L07 out-rank L03 on shared low-specificity checks alone (no athlete history, no young age)", () => {
    const data = {
      dem_age: "52",
      lx_agg_mov: ["Backward bending (extension)"].join("|||"),
      lx_rel_mov: [].join("|||"),
      lx_below_knee: "Back pain only — no leg symptoms (facet/muscular pattern)",
    };
    const lv = extractLumbarVariablesStructured(data);
    const result = runLumbarReasoningEngine(lv);
    const l03 = result.conditions.find((c) => c.id === "L03");
    const l07 = result.conditions.find((c) => c.id === "L07");
    // L07's new checks (athlete history, young age) should both read
    // false/unknown-but-not-supporting for a 52-year-old with no athletic
    // history mentioned, so it must not out-rank L03.
    expect(l03.supportingMatched.length).toBeGreaterThanOrEqual(l07.supportingMatched.length);
  });

  it("a young athlete with a repetitive-extension history now supports L07 beyond the old generic mechanical checks", () => {
    const data = {
      dem_age: "17",
      lx_agg_mov: ["Backward bending (extension)"].join("|||"),
      lx_below_knee: "Back pain only — no leg symptoms (facet/muscular pattern)",
    };
    const lv = extractLumbarVariablesStructured(data);
    // Simulate the AI note pass finding the athlete history the
    // structured checkboxes have no field for at all.
    lv.mechanism.repetitiveExtensionAthleteHistory = true;
    const result = runLumbarReasoningEngine(lv);
    const l07 = result.conditions.find((c) => c.id === "L07");
    expect(l07.supportingMatched).toContain("Repetitive-extension athlete history");
    expect(l07.supportingMatched).toContain("Young age (<25) -- typical spondylolysis/-listhesis age range");
  });

  it("'First episode' does not count as supporting evidence for L01's recurrence check (previously a bug)", () => {
    const data = { hx_episodes: "First episode" };
    const lv = extractLumbarVariablesStructured(data);
    const result = runLumbarReasoningEngine(lv);
    const l01 = result.conditions.find((c) => c.id === "L01");
    expect(l01.supportingMatched).not.toContain("Previous similar episodes");
  });

  it("a real recurrence value (2-3 episodes) does count as supporting evidence for L01", () => {
    const data = { hx_episodes: "2–3 episodes" };
    const lv = extractLumbarVariablesStructured(data);
    const result = runLumbarReasoningEngine(lv);
    const l01 = result.conditions.find((c) => c.id === "L01");
    expect(l01.supportingMatched).toContain("Previous similar episodes");
  });
});

