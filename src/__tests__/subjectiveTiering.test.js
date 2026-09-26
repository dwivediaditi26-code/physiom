// subjectiveTiering.test.js -- what's left of the old Subjective form's
// field logic after that form was removed (2026-09-25): the grouped notes
// injected into REG_MOD_S (still read by the PDF reports and runEngineV6),
// and filled region fields still reaching the differential engine. The
// form's show/hide tiering (classifyField/coreProgress) went with the form.
import { describe, it, expect } from "vitest";
import { REG_MOD_S } from "../sharedClinicalData.js";
import { runReasoningFromData } from "../reasoningEngine/index";

const SEP = "|||";
const cxSections = () => Object.values(REG_MOD_S["Cervical spine"].sections);
const allCxFields = () => cxSections().flatMap((s) => s.fields);

describe("data preservation (#5)", () => {
  it("a filled conditional field still reaches the differential engine", () => {
    const data = {
      cx_loc: ["Lower cervical (C6-T1)"].join(SEP),
      cx_radiation: ["Down arm to elbow (L)", "To hand / fingers (L)"].join(SEP),
      cx_dermatomal: ["C6 — thumb / index finger / radial forearm"].join(SEP),
      cx_moi: ["No clear mechanism — insidious onset"].join(SEP),
      cx_arm_present: "Yes — unilateral (L)",
      cx_arm_neuro: ["Objective numbness in specific area"].join(SEP),
      cx_agg_mov: ["Extension — looking up", "Combined extension + rotation left (quadrant)"].join(SEP),
      cx_agg_other: ["Coughing / sneezing (dural / cord tension)"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
    };
    const res = runReasoningFromData(data, "cervical");
    expect(res).toBeTruthy();
    expect(Array.isArray(res.differentials)).toBe(true);
    expect(res.differentials.length).toBeGreaterThan(0);
  });
});

describe("consolidated notes migration", () => {
  it("injects the grouped notes into the region modules", () => {
    const ids = allCxFields().map((f) => f.id);
    expect(ids).toContain("cx_notes_history");
    expect(ids).toContain("cx_notes_aggrel");
    expect(ids).toContain("cx_notes_safety");
  });
});
