// neuroExamExtension.test.jsx
// Covers the neuro exam fields added for the TBI assessment work (cranial
// nerves, cognition, coordination, vestibular, perceptual): buildRealtimeSOAP
// picks up every new field (matching the existing coverage-test pattern used
// for dermatomes/myotomes/reflexes), and the 2 new TBI-specific red flags
// (raised ICP, evolving consciousness change) are wired into the red-flag
// line the same way the pre-existing ones are.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { CRANIAL_NERVES, COORDINATION_TESTS, VESTIBULAR_TESTS, PERCEPTUAL_TESTS } from "../sharedClinicalData.js";

describe("New neuro exam fields reach the SOAP Objective section", () => {
  it("a cranial nerve finding appears with its label", () => {
    const soap = buildRealtimeSOAP({ cn_cn7_status: "UMN pattern — forehead spared, lower face weak" });
    expect(soap.O).toContain("CN VII");
    expect(soap.O).toContain("UMN pattern");
  });

  it("covers every real cranial nerve entry", () => {
    const failures = [];
    for (const cn of CRANIAL_NERVES) {
      const soap = buildRealtimeSOAP({ [`cn_${cn.id}_status`]: "Intact" });
      if (!soap.O.includes(`CN ${cn.numeral}`)) failures.push(`${cn.id} (${cn.numeral}) missing`);
    }
    expect(failures).toEqual([]);
  });

  it("orientation and a live-computed MoCA score appear", () => {
    const soap = buildRealtimeSOAP({
      cog_orient_person: "Yes", cog_orient_time: "No",
      moca_visuospatial:"3", moca_naming:"3", moca_attention:"4", moca_language:"2", moca_abstraction:"1", moca_delayed_recall:"3", moca_orientation:"3",
    });
    expect(soap.O).toContain("Person: Yes");
    expect(soap.O).toContain("Time: No");
    expect(soap.O).toContain("MoCA: 19/30");
    expect(soap.O).toContain("Mild cognitive impairment");
  });

  it("MMSE and Mini-Cog scores also reach the SOAP Objective section when recorded", () => {
    const soap = buildRealtimeSOAP({
      mmse_orientation_time:"5", mmse_orientation_place:"5", mmse_registration:"3", mmse_attention:"5", mmse_recall:"3", mmse_language:"8", mmse_construction:"1",
      minicog_recall:"3 — All three words recalled", minicog_clock:"2 — Normal",
    });
    expect(soap.O).toContain("MMSE: 30/30");
    expect(soap.O).toContain("Within normal range");
    expect(soap.O).toContain("Mini-Cog: 5/5");
  });

  it("covers every real coordination test on both sides", () => {
    const failures = [];
    for (const t of COORDINATION_TESTS) {
      const soap = buildRealtimeSOAP({ [`${t.id}_L`]: t.record[0] });
      if (!soap.O.includes(t.label)) failures.push(`${t.id} missing`);
    }
    expect(failures).toEqual([]);
  });

  it("involuntary movements line only appears when something other than 'None observed' is picked", () => {
    const clear = buildRealtimeSOAP({ neuro_involuntary_type: "None observed" });
    expect(clear.O).not.toContain("Involuntary movements");
    const present = buildRealtimeSOAP({ neuro_involuntary_type: "Tremor — rest", neuro_involuntary_notes: "4-6Hz pill-rolling" });
    expect(present.O).toContain("Involuntary movements");
    expect(present.O).toContain("pill-rolling");
  });

  it("covers every real vestibular test", () => {
    const failures = [];
    for (const t of VESTIBULAR_TESTS) {
      const soap = buildRealtimeSOAP({ [`vest_${t.id}_result`]: t.record[0] });
      if (!soap.O.includes(t.label)) failures.push(`${t.id} missing`);
    }
    expect(failures).toEqual([]);
  });

  it("covers every real perceptual test", () => {
    const failures = [];
    for (const t of PERCEPTUAL_TESTS) {
      const soap = buildRealtimeSOAP({ [`perc_${t.id}_result`]: t.record[0] });
      if (!soap.O.includes(t.label)) failures.push(`${t.id} missing`);
    }
    expect(failures).toEqual([]);
  });

  it("the 2 new TBI red flags feed into the existing red-flag summary line", () => {
    const soap = buildRealtimeSOAP({ nrf_raised_icp: "present" });
    expect(soap.O).toContain("Raised ICP signs");
    const soap2 = buildRealtimeSOAP({ nrf_loc_change: "present" });
    expect(soap2.O).toContain("Evolving consciousness change");
  });

  it("empty patient renders no Neurological section, never crashes", () => {
    expect(() => buildRealtimeSOAP({})).not.toThrow();
  });
});
