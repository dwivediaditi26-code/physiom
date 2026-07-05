// neuroCoverage.test.js
// Regression test for the most severe finding in this whole audit: the
// Neurological SOAP section was reading from field keys that don't match
// what NeurologicalModule (PhysioNeuro.jsx) actually writes, verified
// directly against its set() calls:
//   - Myotomes: real key is "myo_<slug>_left/right" (e.g. "myo_c5_left").
//     The SOAP code read bare "n_c5" — could NEVER match, so myotome
//     findings never appeared in the SOAP note or Live SOAP regardless of
//     what a clinician recorded.
//   - Reflexes: real key is "<REFLEXES id>_left/right" (e.g.
//     "n_ref_bicep_left"). The SOAP code read "n_biceps" (wrong prefix,
//     wrong spelling, no side suffix) — same complete miss.
//   - Neural tension: real keys need a "_left"/"_right" suffix
//     ("nt_slr_left"), which the SOAP code never added.
//   - Dermatomes: a hardcoded 15-level list was missing S3/S4-5 (real data
//     has 16 levels) and included a phantom "t2" that doesn't exist.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION } from "../PhysioNeuro.jsx";

describe("Neurological findings actually reach the SOAP Objective section", () => {
  it("myotomes: a real myo_<slug>_left key now appears (was a complete miss before)", () => {
    const data = { myo_c5_left: "3/5 weak" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Myotomes");
    expect(soap.O).toContain("3/5");
  });

  it("reflexes: a real <id>_left key now appears with its proper label (was a complete miss before)", () => {
    const data = { n_ref_bicep_left: "3+ Brisk" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Reflexes");
    expect(soap.O).toContain("Biceps");
  });

  it("neural tension: a real <id>_left key now appears (was missing the side suffix before)", () => {
    const data = { nt_slr_left: "Positive at 45 degrees" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Neural Tension");
    expect(soap.O).toContain("Straight Leg Raise");
  });

  it("dermatomes: S3 and S4-5 (previously missing from the hardcoded list) now appear", () => {
    const s3 = DERMATOMES.find(d => d.level === "S3");
    const soapS3 = buildRealtimeSOAP({ [`${s3.id}_left`]: "Reduced" });
    expect(soapS3.O).toContain("S3");

    const s45 = DERMATOMES.find(d => d.level === "S4/5");
    const soapS45 = buildRealtimeSOAP({ [`${s45.id}_left`]: "Absent" });
    expect(soapS45.O).toContain("S4/5");
  });

  it("covers every real dermatome, myotome, reflex, and neural tension test", () => {
    const failures = [];
    for (const d of DERMATOMES) {
      const soap = buildRealtimeSOAP({ [`${d.id}_left`]: "Reduced" });
      if (!soap.O.includes(d.level)) failures.push(`dermatome ${d.id} (${d.level}) missing`);
    }
    for (const m of MYOTOMES) {
      const slug = "myo_" + m.level.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
      const soap = buildRealtimeSOAP({ [`${slug}_left`]: "3/5 weak" });
      if (!soap.O.includes(m.level)) failures.push(`myotome ${slug} (${m.level}) missing`);
    }
    for (const r of REFLEXES) {
      const soap = buildRealtimeSOAP({ [`${r.id}_left`]: "Absent" });
      if (!soap.O.includes(r.label)) failures.push(`reflex ${r.id} (${r.label}) missing`);
    }
    for (const nt of NEURAL_TENSION) {
      const soap = buildRealtimeSOAP({ [`${nt.id}_left`]: "Positive" });
      if (!soap.O.includes(nt.label)) failures.push(`neural tension ${nt.id} (${nt.label}) missing`);
    }
    expect(failures).toEqual([]);
  });
});
