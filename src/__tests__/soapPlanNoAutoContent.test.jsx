import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";

describe("buildRealtimeSOAP Plan only prints what the clinician entered", () => {
  it("does not add library posture exercises for ticked defects", () => {
    const soap = buildRealtimeSOAP({ dem_name: "T", posture_defect_forward_head: true });
    expect(soap.P).not.toContain("Postural Correction Exercises");
  });

  it("prints no 'undefined' when an exercise has missing dosage", () => {
    const soap = buildRealtimeSOAP({
      hep_programme: [{ name: "Bridge" }],
      tx_exercise_prescription: [{ name: "Clamshell", sets: "3" }],
    });
    expect(soap.P).not.toContain("undefined");
    expect(soap.P).toContain("Bridge");
    expect(soap.P).toContain("Clamshell — 3 sets");
  });
});
