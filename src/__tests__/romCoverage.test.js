// romCoverage.test.js
// Regression test for a gap found by cross-checking every real movement
// defined in ROM_DATA against the SOAP builder's ROM list: 16 of 56 real
// movements were missing ENTIRELY (not just mislabeled, unlike MMT) — MCP/
// PIP/DIP finger flexion, thumb opposition/abduction, 1st MTP flexion/
// extension, TMJ mouth opening/deviation/protrusion, wrist radial/ulnar
// deviation, and thoracic lateral flexion would never appear in the SOAP
// note or Live SOAP even if a clinician recorded them, since the old code
// only ever looked at a fixed list of ~40 expected movements. Fixed by
// deriving the full list from ROM_DATA (the same source ROMModule's own UI
// uses) instead of a hand-copied one.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { ROM_DATA } from "../sharedClinicalData.js";

describe("ROM movement coverage in the SOAP Objective section", () => {
  it("includes a previously-missing unilateral movement (TMJ mouth opening, measured in mm)", () => {
    const data = { rom_topen_arom: "30" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Mouth Opening");
    expect(soap.O).toContain("30mm");
  });

  it("includes a previously-missing bilateral movement (1st MTP flexion — relevant for turf toe/hallux rigidus)", () => {
    const data = { rom_1mtpp_L_arom: "40", rom_1mtpp_R_arom: "38" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("1st MTP Flexion");
  });

  it("includes a previously-missing qualitative movement with no numeric norm (Thumb Opposition)", () => {
    const data = { rom_thopp_L_arom: "Full" };
    const soap = buildRealtimeSOAP(data);
    expect(soap.O).toContain("Thumb Opposition");
    expect(soap.O).toContain("Full"); // shouldn't crash trying to compute a percentage against a null norm
  });

  it("covers every single real movement defined in ROM_DATA — none are silently dropped", () => {
    const allMovements = Object.entries(ROM_DATA).flatMap(([region, movements]) =>
      movements.map(m => ({ ...m, region }))
    );
    const failures = [];
    for (const m of allMovements) {
      const data = m.bilateral
        ? { [`${m.id}_L_arom`]: "10" }
        : { [`${m.id}_arom`]: "10" };
      const soap = buildRealtimeSOAP(data);
      if (!soap.O.includes(m.mv)) failures.push(`${m.id} (${m.region} ${m.mv}) missing from SOAP Objective section`);
    }
    expect(failures).toEqual([]);
  });
});

describe("Hand & Fingers ROM list", () => {
  const hand = ROM_DATA["Hand & Fingers"];
  const names = hand.map((m) => m.mv);
  it("has finger extension, thumb joint and whole-hand rows", () => {
    for (const mv of ["MCP Extension", "PIP Extension", "DIP Extension", "MCP Abduction / Adduction", "Thumb CMC Flexion", "Thumb CMC Extension", "Thumb Palmar Abduction", "Thumb Radial Abduction", "Thumb MCP Flexion", "Thumb IP Flexion", "Thumb IP Extension", "Thumb Opposition", "Fingertip-to-Palm Distance"]) {
      expect(names).toContain(mv);
    }
  });
  it("keeps the ids of the movements that already existed (photos are stored under the id)", () => {
    for (const id of ["rom_mcp", "rom_pip", "rom_dip", "rom_thopp", "rom_thabdm"]) expect(hand.map((m) => m.id)).toContain(id);
  });
  it("has unique ids and gives no made-up range where none was settled", () => {
    expect(new Set(hand.map((m) => m.id)).size).toBe(hand.length);
    for (const id of ["rom_mcpabd", "rom_dipext", "rom_thradabd"]) expect(hand.find((m) => m.id === id).normal).toBeNull();
  });
  it("every row has a goniometer/measurement description and a start position", () => {
    for (const m of hand) { expect(m.gonio, m.id).toBeTruthy(); expect(m.start, m.id).toBeTruthy(); }
  });
});
