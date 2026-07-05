// kendallGeometry.test.js
// Unit tests for the pure geometry/classification functions in HybridKendall.jsx.
// These take hand-calculated landmark coordinates (not real photos) so the
// expected angle/percentage can be verified with plain trigonometry, decoupled
// from ViTPose/MediaPipe detection accuracy.

import { describe, it, expect } from "vitest";
import {
  calcCVA, calcCVA_C7, calcKneeAngle, calcTCI, calcLCI, calcPelvicTilt,
  calcEarAcrDist, calcRoundedShoulder, plumbDeviation, bodyHeightNorm,
  classifyCVA, classifyPlumb, classifyTCI, classifyLCI, classifyKnee,
  THRESHOLDS,
} from "../HybridKendall.jsx";

describe("calcCVA — aspect-ratio safety", () => {
  // Regression test for the exact bug documented in HybridKendall.jsx's toPx()
  // comment: computing the angle directly from normalized x/y (without
  // converting to pixels first) silently distorts the angle whenever the
  // photo isn't square. A portrait phone photo (1080x1920) is the realistic
  // case. Landmarks below are chosen so that in PIXEL space, dx=100 dy=100
  // (a clean 45 degree angle) even though in normalized space dx != dy.
  const imgSize = { w: 1080, h: 1920 };
  const acromion = { x: 0.5, y: 0.5 };
  const ear = { x: 0.5 + 100 / 1080, y: 0.5 - 100 / 1920 };

  it("computes 45 degrees using pixel-space trig, not raw normalized coordinates", () => {
    const cva = calcCVA(ear, acromion, imgSize);
    expect(cva).toBeCloseTo(45, 1);
  });

  it("classifies the correct 45 degree CVA as Mild FHP", () => {
    // If the aspect-ratio bug were reintroduced, the raw-normalized-space
    // angle here would compute to ~29.4 degrees, which misclassifies as
    // "Marked FHP" instead of the true "Mild FHP" — this test would catch that.
    const cva = calcCVA(ear, acromion, imgSize);
    expect(classifyCVA(cva)).toBe("Mild FHP");
  });

  it("rejects physiologically implausible angles (<25 or >80 degrees) as null", () => {
    // dx == dy would give exactly 45; make dy tiny relative to dx -> near 0 deg
    const flatEar = { x: 0.5 + 500 / 1080, y: 0.5 - 1 / 1920 };
    expect(calcCVA(flatEar, acromion, imgSize)).toBeNull();
  });
});

describe("classifyCVA threshold boundaries", () => {
  it.each([
    [60, "Normal"],
    [55, "Normal"],
    [52, "Borderline"],
    [50, "Borderline"],
    [47, "Mild FHP"],
    [44, "Mild FHP"],
    [40, "Moderate FHP"],
    [38, "Moderate FHP"],
    [30, "Marked FHP"],
  ])("classifyCVA(%d) => %s", (angle, expected) => {
    expect(classifyCVA(angle)).toBe(expected);
  });
});

describe("calcKneeAngle", () => {
  const imgSize = { w: 1000, h: 1000 };
  const hip = { x: 0.5, y: 0.3 };
  const ankle = { x: 0.5, y: 0.7 };

  it("returns 180 for a perfectly straight hip-knee-ankle line", () => {
    const knee = { x: 0.5, y: 0.5 };
    expect(calcKneeAngle(hip, knee, ankle, imgSize)).toBeCloseTo(180, 0);
  });

  it("classifies a large ANTERIOR knee deviation as Knee Flexion in Stance", () => {
    const knee = { x: 0.55, y: 0.5 }; // anterior of the hip-ankle line (viewSign=1)
    const angle = calcKneeAngle(hip, knee, ankle, imgSize, 1);
    expect(angle).toBeLessThan(170);
    expect(classifyKnee(angle)).toBe("Knee Flexion in Stance");
  });

  // FIX VERIFICATION: Math.acos() alone can never exceed 180 degrees, so
  // magnitude by itself can't distinguish a knee bowing forward (flexion)
  // from one bowing backward (hyperextension/recurvatum) — both produce the
  // same magnitude. calcKneeAngle now determines which side of the straight
  // hip-ankle line the knee falls on (anterior vs posterior, adjusted for
  // viewSign) and represents a posterior deviation as a reflex angle above
  // 180, so classifyKnee's existing >185 recurvatum threshold is reachable.
  it("classifies a small POSTERIOR knee deviation as Genu Recurvatum", () => {
    const knee = { x: 0.49, y: 0.5 }; // posterior of the hip-ankle line (viewSign=1)
    const angle = calcKneeAngle(hip, knee, ankle, imgSize, 1);
    expect(angle).toBeGreaterThan(185);
    expect(classifyKnee(angle)).toBe("Genu Recurvatum");
  });

  it("still rejects an implausibly large posterior deviation as an outlier (angle > 200)", () => {
    // Same magnitude as the anterior flexion case above, but posterior —
    // a real photo showing the knee bowed this far back would be an
    // implausible landmark placement, not true recurvatum.
    const knee = { x: 0.45, y: 0.5 };
    const angle = calcKneeAngle(hip, knee, ankle, imgSize, 1);
    expect(angle).toBeNull();
  });

  it("flips the anterior/posterior interpretation when viewSign is -1 (patient facing the other way)", () => {
    const knee = { x: 0.49, y: 0.5 }; // posterior (recurvatum) when viewSign=1, tested above
    const angleFlipped = calcKneeAngle(hip, knee, ankle, imgSize, -1); // now reads as anterior
    expect(classifyKnee(angleFlipped)).toBe("Normal");
  });
});

describe("calcTCI / calcLCI — depth/chord formula", () => {
  const imgSize = { w: 1000, h: 2000 };

  it("computes the TCI percentage correctly from a vertical chord + horizontal apex offset", () => {
    // c7 and t12 form a vertical chord (dx=0), so depth reduces to the
    // apex's raw horizontal pixel offset from the chord's x position.
    // Actual pixel geometry: chordLen = 600px, depth = 60px -> tci = 10%.
    const c7 = { x: 0.5, y: 0.3 };
    const t12 = { x: 0.5, y: 0.6 };
    const apexT = { x: 0.5 + 60 / 1000, y: 0.45 }; // 60px horizontal offset
    const result = calcTCI(c7, t12, apexT, imgSize);
    expect(result.tci).toBeCloseTo(10, 1);
    expect(classifyTCI(result.tci)).toBe("Mild Increased Thoracic Curvature");
  });

  // FIX VERIFICATION: calcTCI/calcLCI used to return depth/chordLen display
  // fields via `Math.round(x*1000)/10` (net x*100 — 100x too large) instead
  // of the `Math.round(x*10)/10` (1-decimal) pattern used everywhere else in
  // this file. The tci/lci percentage itself was never affected (severity
  // classification was always correct); only the raw px values shown in
  // metrics/debug output were wrong. Now fixed to match true pixel geometry.
  it("returns depth/chordLen at their true pixel scale (not 100x inflated)", () => {
    const c7 = { x: 0.5, y: 0.3 };
    const t12 = { x: 0.5, y: 0.6 };
    const apexT = { x: 0.5 + 60 / 1000, y: 0.45 };
    const result = calcTCI(c7, t12, apexT, imgSize);
    expect(result.chordLen).toBeCloseTo(600, 0);
    expect(result.depth).toBeCloseTo(60, 0);
  });

  it("classifies a small apex offset as Normal thoracic curvature", () => {
    const c7 = { x: 0.5, y: 0.3 };
    const t12 = { x: 0.5, y: 0.6 };
    const apexT = { x: 0.5 + 20 / 1000, y: 0.45 }; // tci ~3.3%
    const result = calcTCI(c7, t12, apexT, imgSize);
    expect(classifyTCI(result.tci)).toBe("Normal Thoracic Curvature");
  });

  it("classifies a large apex offset as Severe thoracic curvature", () => {
    const c7 = { x: 0.5, y: 0.3 };
    const t12 = { x: 0.5, y: 0.6 };
    const apexT = { x: 0.5 + 150 / 1000, y: 0.45 }; // tci = 25%
    const result = calcTCI(c7, t12, apexT, imgSize);
    expect(classifyTCI(result.tci)).toBe("Severe Increased Thoracic Curvature");
  });

  it("computes LCI the same way from T12/S2/apexL", () => {
    const t12 = { x: 0.5, y: 0.3 };
    const s2 = { x: 0.5, y: 0.6 };
    const apexL = { x: 0.5 + 10 / 1000, y: 0.45 }; // depth 10px / chord 600px ~1.7% -> reduced
    const result = calcLCI(t12, s2, apexL, imgSize);
    expect(classifyLCI(result.lci)).toBe("Reduced Lumbar Curvature");
  });
});

describe("calcPelvicTilt", () => {
  const imgSize = { w: 1000, h: 1000 };

  it("flags anterior tilt when ASIS is lower (larger y) than PSIS", () => {
    const asis = { x: 0.48, y: 0.62 }; // lower in image = anterior per code comment
    const psis = { x: 0.52, y: 0.60 };
    const result = calcPelvicTilt(asis, psis, imgSize);
    expect(result.direction).toBe("Anterior");
    expect(result.angle).toBeGreaterThan(0);
  });

  it("flags posterior tilt when ASIS is higher (smaller y) than PSIS", () => {
    const asis = { x: 0.48, y: 0.58 };
    const psis = { x: 0.52, y: 0.60 };
    const result = calcPelvicTilt(asis, psis, imgSize);
    expect(result.direction).toBe("Posterior");
  });
});

describe("classifyPlumb boundaries (per-segment thresholds)", () => {
  it("uses the ear-segment thresholds (normal 2.5 / mild 4 / moderate 6 %BH)", () => {
    expect(classifyPlumb(1.0, "ear")).toBe("Normal");
    expect(classifyPlumb(3.0, "ear")).toBe("Mild");
    expect(classifyPlumb(5.0, "ear")).toBe("Moderate");
    expect(classifyPlumb(8.0, "ear")).toBe("Marked");
  });

  it("falls back to acromion thresholds for an unknown segment name", () => {
    expect(classifyPlumb(2.5, "unknown-segment")).toBe(classifyPlumb(2.5, "acromion"));
  });
});
