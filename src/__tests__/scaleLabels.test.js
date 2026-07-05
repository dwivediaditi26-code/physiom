// scaleLabels.test.js
// Regression test: 10 of 26 real outcome scales were missing from
// SCALE_LABELS, including every Stroke/TBI scale added last session (NIHSS,
// Fugl-Meyer, GOAT, Rancho, Barthel, Modified Ashworth). Lower severity than
// MMT/ROM/Special Tests — the SOAP builder already scans every
// om_history_<scaleId> regardless of this map, and scaleId.toUpperCase() as
// a fallback happened to already read fine for most (NIHSS, GOAT, RANCHO,
// MAS, FMA, TUG, DGI, FAC are legitimate abbreviations) — but "MWT10" read
// worse than the real "10MWT". Fixed by deriving from SCALES directly.
import { describe, it, expect } from "vitest";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { SCALES } from "../OutcomeMeasuresPro.jsx";

function withHistory(scaleId, score) {
  return { [`om_history_${scaleId}`]: JSON.stringify([{ score, date: "2026-07-05" }]) };
}

describe("Outcome scale labels in the SOAP Objective section", () => {
  it("uses the real scale label for a previously-missing Stroke/TBI scale (NIHSS)", () => {
    const soap = buildRealtimeSOAP(withHistory("nihss", 4));
    expect(soap.O).toContain("NIHSS");
  });

  it("uses the nicer real label '10MWT' instead of the raw fallback 'MWT10'", () => {
    const soap = buildRealtimeSOAP(withHistory("mwt10", 12));
    expect(soap.O).toContain("10MWT");
    expect(soap.O).not.toContain("MWT10");
  });

  it("covers every real scale defined in SCALES with a real label, not the raw scaleId fallback", () => {
    // Not requiring an exact match to SCALES' own (sometimes bare-acronym,
    // e.g. "BBS") label — a hand-curated fuller name ("Berg Balance") that
    // already existed for a scale intentionally still wins. What actually
    // matters: no scale should render as its own raw uppercased id, which is
    // what happens when a scale has no entry in either the derived or
    // hand-curated portion of SCALE_LABELS at all.
    const failures = [];
    for (const s of Object.values(SCALES)) {
      const soap = buildRealtimeSOAP(withHistory(s.id, 10));
      const rawFallback = s.id.toUpperCase();
      const line = soap.O.split("\n").find(l => l.includes(`: 10`)) || "";
      const labelUsed = line.split(":")[0].trim();
      if (labelUsed === rawFallback && rawFallback !== s.label) {
        failures.push(`${s.id} -> fell back to raw id "${rawFallback}" instead of a real label`);
      }
    }
    expect(failures).toEqual([]);
  });
});
