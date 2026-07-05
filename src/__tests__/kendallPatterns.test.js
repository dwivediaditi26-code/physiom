// kendallPatterns.test.js
// Integration tests for buildKendallFindings() — the classic postural patterns
// (Kendall, "Muscles: Testing and Function with Posture and Pain") that the
// pattern classifier is meant to recognize:
//   - Near-Ideal Alignment
//   - Kyphotic-Lordotic (Kendall A / "kyphosis-lordosis")
//   - Kyphotic (increased thoracic curve alone)
//   - Lordotic (increased lumbar curve alone)
//   - Flat-back (Kendall B — both curves reduced)
//   - Mixed: increased thoracic kyphosis with flat lumbar
//
// Each test builds a `measurements` object directly (the same shape produced
// by HybridKendall's useMemo) rather than raw landmark coordinates, so this
// exercises the classification/severity logic specifically — geometry math
// is covered separately in kendallGeometry.test.js.

import { describe, it, expect } from "vitest";
import { buildKendallFindings, THRESHOLDS } from "../HybridKendall.jsx";

// Shared baseline: fully-measured, all segments normal. Individual tests
// override just the fields relevant to the pattern under test.
function baseMeasurements(overrides = {}) {
  return {
    bodyHeightNorm: 0.6,
    viewSign: 1,
    cva: 60,
    cvaSource: "C7 (Yip 2008 method)",
    earPlumb: 1.0,
    acrPlumb: 1.0,
    hipPlumb: 1.0,
    kneePlumb: 1.0,
    earAcr: 1.0,
    shoulder: { m1: 0.5, m2: 0.5, m3: 0.5, composite: 0.3, direction: "anterior" },
    knee: 180,
    tci: { tci: 5, depth: 30, chordLen: 600 },
    lci: { lci: 8, depth: 48, chordLen: 600 },
    pelvis: { angle: 12, isAnterior: true, direction: "Anterior" }, // matches female norm exactly
    ...overrides,
  };
}

function findPattern(findings) {
  return findings.find((f) => f.id === "kendall_pattern");
}

describe("Kendall postural pattern classification", () => {
  it("classifies a fully-normal measurement set as Near-Ideal Alignment", () => {
    const { findings } = buildKendallFindings(baseMeasurements(), "Female");
    const pattern = findPattern(findings);
    expect(pattern.label).toBe("Near-Ideal Alignment");
    expect(pattern.severity).toBe("Normal");
  });

  it("classifies increased thoracic + increased lumbar curve + FHP as Kyphotic-Lordotic (Kendall A)", () => {
    const m = baseMeasurements({
      cva: 40, // Moderate FHP
      earPlumb: 5,
      earAcr: 3,
      tci: { tci: 18, depth: 108, chordLen: 600 }, // >= mild(14) -> isKyph
      lci: { lci: 16, depth: 96, chordLen: 600 },  // >= mild(12) -> isLord
      pelvis: { angle: 25, isAnterior: true, direction: "Anterior" }, // deviation 13 from female norm 12
      shoulder: { m1: 1.5, m2: 1.0, m3: 1.0, composite: 1.5, direction: "anterior" },
    });
    const { findings } = buildKendallFindings(m, "Female");
    expect(findPattern(findings).label).toBe("Kyphotic-Lordotic (Kendall A)");
  });

  it("classifies increased thoracic curve alone as Kyphotic", () => {
    const m = baseMeasurements({
      tci: { tci: 18, depth: 108, chordLen: 600 }, // isKyph
      lci: { lci: 8, depth: 48, chordLen: 600 },   // normal, not lord, not flat
    });
    const { findings } = buildKendallFindings(m, "Female");
    expect(findPattern(findings).label).toBe("Kyphotic");
  });

  it("classifies increased lumbar curve alone as Lordotic", () => {
    const m = baseMeasurements({
      tci: { tci: 5, depth: 30, chordLen: 600 },   // normal, not kyph
      lci: { lci: 16, depth: 96, chordLen: 600 },  // isLord
    });
    const { findings } = buildKendallFindings(m, "Female");
    expect(findPattern(findings).label).toBe("Lordotic");
  });

  it("classifies both curves reduced as Flat-back (Kendall B)", () => {
    const m = baseMeasurements({
      tci: { tci: 5, depth: 30, chordLen: 600 },  // normal, not kyph
      lci: { lci: 2, depth: 12, chordLen: 600 },  // < reduced(3) -> isFlat
    });
    const { findings } = buildKendallFindings(m, "Female");
    expect(findPattern(findings).label).toBe("Flat-back (Kendall B)");
  });

  // Regression test for the exact ordering bug described in the source
  // comment above the pattern if/else chain: increased thoracic kyphosis
  // WITH a flattened lumbar curve must be reported as the distinct "mixed"
  // pattern, not silently absorbed into "Flat-back" just because isFlat
  // happens to be checked in the same pass.
  it("classifies increased thoracic kyphosis + flat lumbar as the distinct mixed pattern, not Flat-back", () => {
    const m = baseMeasurements({
      tci: { tci: 18, depth: 108, chordLen: 600 }, // isKyph
      lci: { lci: 2, depth: 12, chordLen: 600 },   // isFlat, not isLord
    });
    const { findings } = buildKendallFindings(m, "Female");
    expect(findPattern(findings).label).toBe(
      "Increased Thoracic Kyphosis with Flat Lumbar (mixed)"
    );
  });

  it("reports Pattern Classification Incomplete when a required segment is missing", () => {
    const m = baseMeasurements({ pelvis: null });
    const { findings } = buildKendallFindings(m, "Female");
    const incomplete = findings.find((f) => f.id === "pattern_incomplete");
    expect(incomplete).toBeTruthy();
    expect(incomplete.missing).toContain("pelvis");
    expect(findPattern(findings)).toBeUndefined();
  });

  it("marks forward head as 'Insufficient landmarks' when fewer than 2 of cva/earPlumb/earAcr are available", () => {
    const m = baseMeasurements({ cva: null, earPlumb: null }); // only earAcr present
    const { segmentStatus } = buildKendallFindings(m, "Female");
    expect(segmentStatus.forwardHead).toBe("Insufficient landmarks");
  });

  it("uses the male pelvic-tilt norm (7 deg) instead of the female norm (12 deg) when patientSex is Male", () => {
    // angle 20 vs male norm 7 -> deviation 13 -> Moderate (not Normal against
    // the female norm of 12, where deviation would only be 8 -> Mild) —
    // proves the gender-specific norm is actually being applied.
    const m = baseMeasurements({ pelvis: { angle: 20, isAnterior: true, direction: "Anterior" } });
    const { findings } = buildKendallFindings(m, "Male");
    const pelvisFinding = findings.find((f) => f.id === "pelvis");
    expect(pelvisFinding.severity).toBe("Moderate");
  });

  // FIX VERIFICATION: every other segment (forward head, shoulder, knee)
  // only pushes a finding when severity !== "Normal". Pelvic Tilt used to
  // have no such gate, so a perfectly normal pelvis still showed up as a
  // "Normal ... Pelvic Tilt" finding, inconsistent with every other segment.
  // Now gated the same way as the rest.
  it("does not push a Pelvic Tilt finding when severity is Normal (consistent with other segments)", () => {
    const { findings } = buildKendallFindings(baseMeasurements(), "Female"); // pelvis angle=12=female norm, Normal
    const pelvisFinding = findings.find((f) => f.id === "pelvis");
    expect(pelvisFinding).toBeUndefined();
  });

  it("still pushes a Pelvic Tilt finding when severity is not Normal", () => {
    const m = baseMeasurements({ pelvis: { angle: 25, isAnterior: true, direction: "Anterior" } }); // deviation 13 from female norm 12
    const { findings } = buildKendallFindings(m, "Female");
    const pelvisFinding = findings.find((f) => f.id === "pelvis");
    expect(pelvisFinding).toBeTruthy();
    expect(pelvisFinding.severity).toBe("Moderate");
  });
});
