// detectModules.test.js
// Regression test for the bug found by reading SOAPNoteModule's source: the
// module-detection helper used to check for specific example field names
// (e.g. "mmt_deltoid", "mmt_biceps") that don't match what MMTModule/etc.
// actually write ("mmt_<muscleId>_<side>", e.g. "mmt_deltM_L"). A clinician
// testing muscles NOT in that hardcoded example list would have this wrongly
// report the module as empty, which fed into the SOAP note's
// "No objective findings recorded yet" placeholder appearing even when real
// data existed.
import { describe, it, expect } from "vitest";
import { detectModulesV2 } from "../ClinicalModules.jsx";

describe("detectModulesV2 — regression: must detect real field names, not just examples", () => {
  it("detects MMT data for a muscle NOT in the old hardcoded example list", () => {
    // "mmt_deltM_L" (Deltoid Middle, Left) is a real field MMTModule writes,
    // but was never one of the old check's examples ("mmt_deltoid","mmt_biceps","mmt_wext").
    const data = { mmt_deltM_L: "4" };
    expect(detectModulesV2(data).mmt).toBe(true);
  });

  it("still returns false when there is genuinely no MMT data", () => {
    expect(detectModulesV2({}).mmt).toBe(false);
    expect(detectModulesV2({ dem_name: "Test Patient" }).mmt).toBe(false);
  });

  it("detects ROM data via prefix regardless of which specific movement was tested", () => {
    const data = { rom_wrist_flex_L_arom: "60" }; // not in the old explicit ROM example list
    expect(detectModulesV2(data).rom).toBe(true);
  });

  it("detects Outcome Measures data via the om_ prefix for any scale, not just the named ones", () => {
    const data = { om_history_barthel: "[]", "om_gcs_total": "13" };
    // om_history_barthel is an empty-array string ("[]") which the `has()`
    // helper explicitly treats as "not really filled" — use a real score field.
    expect(detectModulesV2({ om_gcs_total: "13" }).outcomes).toBe(true);
  });

  it("detects CPA/NKT data for any muscle tested, not just the old named examples", () => {
    const data = { nkt_serratus_ant: "Facilitated" }; // not in the old ["nkt_dnf","nkt_scm",...] list
    expect(detectModulesV2(data).cpa).toBe(true);
  });

  it("detects Kinetic Chain and Gait data via prefix", () => {
    expect(detectModulesV2({ kc_shoulder_gh_scaption: "Restricted" }).kinetic).toBe(true);
    expect(detectModulesV2({ gait_step_length: "Reduced" }).gait).toBe(true);
  });
});
