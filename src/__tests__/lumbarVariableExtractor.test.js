// lumbarVariableExtractor.test.js
// Unit tests for lumbarVariableExtractor.js's Pass 1 (deterministic
// extraction from structured lx_* fields). Locks in the core safety
// principle from the Lumbar Reasoning Engine design: a variable that was
// never touched on the form must read as "unknown", never silently
// collapse into "absent" -- unknown should lower confidence downstream,
// not count as evidence against a hypothesis. Also locks in that an
// explicit "No X" selection (a real, deliberate negative finding) reads
// as "absent", distinct from both "unknown" and "present".
import { describe, it, expect } from "vitest";
import { extractLumbarVariablesStructured, mergeLumbarVariables } from "../lumbarVariableExtractor.js";

const SEP = "|||";

describe("extractLumbarVariablesStructured", () => {
  it("reads every field as unknown on a completely empty form", () => {
    const lv = extractLumbarVariablesStructured({});
    expect(lv.location.belowKneePain).toBe("unknown");
    expect(lv.location.radiation.state).toBe("unknown");
    expect(lv.mechanism.acuteLiftingMechanism).toBe("unknown");
    expect(lv.aggravating.movements.state).toBe("unknown");
    expect(lv.neurological.hasLegNeuro).toBe("unknown");
    expect(lv.redFlags.cauda.state).toBe("unknown");
    expect(lv.redFlags.redFlagScreen).toBe("incomplete");
  });

  it("treats an explicit 'No X' selection as absent, not unknown or present", () => {
    const data = {
      lx_radiation: "No radiation — local only",
      lx_rf_cauda: "No cauda equina signs",
      lx_rf_fracture: "No fracture indicators",
      lx_rf_inflammatory: "No inflammatory features",
      lx_rf_serious: "No other red flags",
    };
    const lv = extractLumbarVariablesStructured(data);
    expect(lv.location.radiation.state).toBe("absent");
    expect(lv.redFlags.cauda.state).toBe("absent");
    expect(lv.redFlags.redFlagScreen).toBe("negative");
  });

  it("marks the red flag screen positive as soon as any single real flag is ticked, even if others are untouched", () => {
    const data = { lx_rf_cauda: "Saddle area anaesthesia — perineum / inner thighs" };
    const lv = extractLumbarVariablesStructured(data);
    expect(lv.redFlags.cauda.state).toBe("present");
    expect(lv.redFlags.redFlagScreen).toBe("positive");
  });

  it("derives a discogenic-leaning variable set from a realistic acute lifting presentation", () => {
    const data = {
      lx_moi: ["Lifting — spine flexed AND rotated (most common disc mechanism)"].join(SEP),
      lx_agg_mov: ["Forward bending (flexion)"].join(SEP),
      lx_agg_post: ["Sitting >30 minutes"].join(SEP),
      lx_agg_act: ["Coughing (discogenic indicator — intradiscal pressure)"].join(SEP),
      lx_rel_mov: ["Extension — McKenzie press-up / cobra"].join(SEP),
      lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
      lx_dermatomal: ["L5 — lateral lower leg / dorsum foot / great toe"].join(SEP),
    };
    const lv = extractLumbarVariablesStructured(data);
    expect(lv.mechanism.acuteLiftingMechanism).toBe(true);
    expect(lv.aggravating.flexionAggravates).toBe(true);
    expect(lv.aggravating.sittingAggravates).toBe(true);
    expect(lv.aggravating.coughSneezeAggravates).toBe(true);
    expect(lv.relieving.extensionRelieves).toBe(true);
    expect(lv.location.belowKneePain).toBe(true);
    expect(lv.location.dermatomal.state).toBe("present");
  });

  it("flags bilateral below-knee pain distinctly rather than collapsing it into a plain true/false", () => {
    const data = { lx_below_knee: "Leg pain — bilateral (cauda equina / stenosis flag)" };
    const lv = extractLumbarVariablesStructured(data);
    expect(lv.location.belowKneePain).toBe("bilateral");
  });

  it("collects free-text note fields separately for the AI supplement pass, without interpreting them", () => {
    const data = { lx_agg_notes: "Worse picking up my toddler, better lying flat" };
    const lv = extractLumbarVariablesStructured(data);
    expect(lv._notesForAiPass.lx_agg_notes).toBe("Worse picking up my toddler, better lying flat");
    // Pass 1 must not have tried to interpret this itself into a structured variable
    expect(lv.aggravating.activities.state).toBe("unknown");
  });
});

describe("mergeLumbarVariables", () => {
  it("fills a field that Pass 1 left unknown with the AI note-pass finding", () => {
    const lv = extractLumbarVariablesStructured({}); // everything unknown
    const { merged, aiFilledFields } = mergeLumbarVariables(lv, [
      { variable: "hasLegNeuro", value: "true", sourceQuote: "numbness down the leg", confidence: 90 },
    ]);
    expect(merged.neurological.hasLegNeuro).toBe(true);
    expect(aiFilledFields).toContain("hasLegNeuro");
  });

  it("never overrides a real Pass 1 answer, even when the AI finding disagrees", () => {
    const data = { lx_agg_mov: ["Forward bending (flexion)"].join("|||") }; // flexionAggravates = true via checkbox
    const lv = extractLumbarVariablesStructured(data);
    const { merged, aiFilledFields } = mergeLumbarVariables(lv, [
      { variable: "flexionAggravates", value: "false", sourceQuote: "flexion doesn't bother them", confidence: 80 },
    ]);
    expect(merged.aggravating.flexionAggravates).toBe(true); // Pass 1 checkbox still wins
    expect(aiFilledFields).not.toContain("flexionAggravates");
  });

  it("fills a boolean field whose 'unknown' lives on a PARENT container, not the derived value itself", () => {
    // Regression: flexionAggravates/sittingAggravates/etc. are plain
    // `.includes()` booleans in Pass 1 that default to `false` (not the
    // string "unknown") when nothing was selected -- their real
    // "was this ever asked" signal lives on the parent field's .state
    // (e.g. lv.aggravating.movements.state / .postures.state). A naive
    // isFillable() check against the derived boolean itself would never
    // detect these as fillable and would silently never merge them.
    const lv = extractLumbarVariablesStructured({}); // nothing touched
    expect(lv.aggravating.sittingAggravates).toBe(false); // false, NOT "unknown" -- the trap
    const { merged, aiFilledFields } = mergeLumbarVariables(lv, [
      { variable: "sittingAggravates", value: "true", sourceQuote: "worse sitting", confidence: 85 },
    ]);
    expect(merged.aggravating.sittingAggravates).toBe(true);
    expect(aiFilledFields).toContain("sittingAggravates");
  });

  it("never auto-merges red-flag-category findings -- routes them to pendingRedFlagReview instead", () => {
    const lv = extractLumbarVariablesStructured({});
    const { merged, pendingRedFlagReview, aiFilledFields } = mergeLumbarVariables(lv, [
      { variable: "caudaEquinaConcern", value: "true", sourceQuote: "some bladder change mentioned", confidence: 55 },
    ]);
    expect(merged.redFlags.cauda.state).toBe("unknown"); // untouched -- never silently written
    expect(pendingRedFlagReview.length).toBe(1);
    expect(aiFilledFields).not.toContain("caudaEquinaConcern");
  });

  it("does not mutate the input lv object", () => {
    const lv = extractLumbarVariablesStructured({});
    const before = JSON.stringify(lv);
    mergeLumbarVariables(lv, [{ variable: "hasLegNeuro", value: "true", sourceQuote: "x", confidence: 90 }]);
    expect(JSON.stringify(lv)).toBe(before);
  });

  it("ignores findings for unrecognized or display-only variables (e.g. otherRelevantFinding)", () => {
    const lv = extractLumbarVariablesStructured({});
    const { aiFilledFields } = mergeLumbarVariables(lv, [
      { variable: "otherRelevantFinding", value: "patient mentions a hobby of running", sourceQuote: "x", confidence: 50 },
    ]);
    expect(aiFilledFields.length).toBe(0);
  });
});

