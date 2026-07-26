// subjectiveTiering.test.js — adaptive/tiered Subjective form logic.
import { describe, it, expect } from "vitest";
import { classifyField, coreProgress, SUBJ_TIER, SUBJ_NOTES, NEW_NOTE_IDS } from "../subjectiveTiering.js";
import { REG_MOD_S } from "../sharedClinicalData.js";
import { runReasoningFromData } from "../reasoningEngine/index";

const SEP = "|||";
const cxSections = () => Object.values(REG_MOD_S["Cervical spine"].sections);
const allCxFields = () => cxSections().flatMap((s) => s.fields);

describe("field tiering", () => {
  it("marks agreed cervical core fields as core + always visible", () => {
    for (const id of SUBJ_TIER.cx.core) {
      const { visible, tier } = classifyField({ id }, {});
      expect(tier, id).toBe("core");
      expect(visible, id).toBe(true);
    }
  });
  it("routes non-core, non-gated cervical fields to the deep tier", () => {
    expect(classifyField({ id: "cx_agg_act" }, {}).tier).toBe("deep");
    expect(classifyField({ id: "cx_trajectory" }, {}).tier).toBe("deep");
  });
});

describe("conditional gating (the reported bug)", () => {
  it("HIDES the Arm & Hand block when cx_arm_present is No / unanswered", () => {
    expect(classifyField({ id: "cx_arm_quality" }, {}).visible).toBe(false);
    expect(classifyField({ id: "cx_arm_quality" }, { cx_arm_present: "No arm or hand symptoms" }).visible).toBe(false);
  });
  it("SHOWS the Arm & Hand block when cx_arm_present is Yes", () => {
    const y = classifyField({ id: "cx_arm_fingers" }, { cx_arm_present: "Yes — unilateral (R)" });
    expect(y.visible).toBe(true);
    expect(y.tier).toBe("conditional");
  });
  it("gates the Headache block on cx_ha_present", () => {
    expect(classifyField({ id: "cx_ha_triggers" }, {}).visible).toBe(false);
    expect(classifyField({ id: "cx_ha_triggers" }, { cx_ha_present: "Yes — secondary to neck pain" }).visible).toBe(true);
  });
  it("reveals WAD / dermatomal only on trauma / radiation", () => {
    expect(classifyField({ id: "cx_moi_wad" }, { cx_moi: "No clear mechanism — insidious onset" }).visible).toBe(false);
    expect(classifyField({ id: "cx_moi_wad" }, { cx_moi: "Whiplash — rear-end MVA" }).visible).toBe(true);
    expect(classifyField({ id: "cx_dermatomal" }, { cx_radiation: "No radiation — local only" }).visible).toBe(false);
    expect(classifyField({ id: "cx_dermatomal" }, { cx_radiation: "Down arm to elbow (R)" }).visible).toBe(true);
  });
  it("keeps the gate QUESTION itself always visible", () => {
    expect(classifyField({ id: "cx_arm_present" }, {}).visible).toBe(true);
    expect(classifyField({ id: "cx_ha_present" }, {}).visible).toBe(true);
  });
});

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
  it("injects new grouped notes into every region module", () => {
    for (const p of Object.keys(SUBJ_NOTES))
      for (const nf of SUBJ_NOTES[p]) expect(NEW_NOTE_IDS.has(nf.id)).toBe(true);
    const ids = allCxFields().map((f) => f.id);
    expect(ids).toContain("cx_notes_history");
    expect(ids).toContain("cx_notes_aggrel");
    expect(ids).toContain("cx_notes_safety");
  });
  it("new grouped notes always visible; legacy notes only when non-empty", () => {
    expect(classifyField({ id: "cx_notes_history", type: "textarea" }, {}).visible).toBe(true);
    expect(classifyField({ id: "cx_loc_notes", type: "textarea" }, {}).visible).toBe(false);
    expect(classifyField({ id: "cx_loc_notes", type: "textarea" }, { cx_loc_notes: "old note" }).visible).toBe(true);
  });
});

describe("core progress", () => {
  it("counts only the mandatory core minimum", () => {
    const data = { cx_loc: ["Anterior neck"], cx_moi: ["Sleeping position"] };
    const { total, filled } = coreProgress(cxSections(), data);
    expect(total).toBe(SUBJ_TIER.cx.core.length);
    expect(filled).toBe(2);
  });
});
