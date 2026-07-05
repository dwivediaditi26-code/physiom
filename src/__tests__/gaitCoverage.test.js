// gaitCoverage.test.js
// Regression test: the Gait SOAP section only checked flat field names
// ("gait_trendelenburg", "gait_cadence", "gait_deviations", "gait_obs") that
// GaitModule never actually writes. Verified directly against GaitModule's
// real data() calls: abnormal gait patterns are "<ABNORMAL_GAITS id>" (e.g.
// "ag_trend") + "<id>_note", phase deviations are "<GAIT_PHASES id>_dev",
// and gait scale scores are "<GAIT_SCALES id>". Only "gait_pattern" actually
// overlapped. This meant Trendelenburg sign, phase-specific deviations, and
// every gait/balance scale score (FAC, DGI, FGA, Berg, Tinetti, Wisconsin)
// never reached the SOAP note or Live SOAP regardless of what was recorded.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";

describe("Gait findings actually reach the SOAP Objective section", () => {
  it("shows Trendelenburg (an abnormal gait pattern) which was previously invisible", () => {
    const data = { ag_trend: "Present", ag_trend_note: "Right side, moderate" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Gait");
    expect(soap.O).toContain("Trendelenburg");
    expect(soap.O).toContain("Right side, moderate");
  });

  it("shows a phase-specific deviation (e.g. Mid Stance) which was previously invisible", () => {
    const data = { g_ms_dev: "Trendelenburg sign" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Mid Stance");
  });

  it("shows a gait/balance scale score (e.g. Berg Balance) which was previously invisible", () => {
    const data = { g_berg: "38" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Berg");
    expect(soap.O).toContain("38");
  });

  it("still shows gait_pattern, the one field that already worked before", () => {
    const soap = buildRealtimeSOAP({ gait_pattern: "Antalgic" });
    expect(soap.O).toContain("Antalgic");
  });
});
