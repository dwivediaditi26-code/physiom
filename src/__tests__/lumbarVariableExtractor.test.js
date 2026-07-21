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
import { extractLumbarVariablesStructured } from "../lumbarVariableExtractor.js";

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
