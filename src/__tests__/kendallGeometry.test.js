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

  it("returns 180 for a perfectly straight hip-knee-ankle line", () => {
    const hip = { x: 0.5, y: 0.3 };
    const knee = { x: 0.5, y: 0.5 };
    const ankle = { x: 0.5, y: 0.7 };
    expect(calcKneeAngle(hip, knee, ankle, imgSize)).toBeCloseTo(180, 0);
  });

  it("detects flexed knee (<170 deg) when knee is displaced off the hip-ankle line", () => {
    const hip = { x: 0.5, y: 0.3 };
    const knee = { x: 0.55, y: 0.5 };
    const ankle = { x: 0.5, y: 0.7 };
    const angle = calcKneeAngle(hip, knee, ankle, imgSize);
    expect(angle).toBeLessThan(170);
    expect(classifyKnee(angle)).toBe("Knee Flexion in Stance");
  });

  // IMPORTANT FINDING (not a fix — flagging for review):
  // calcKneeAngle derives its result from Math.acos(), whose range is
  // mathematically limited to [0, 180] degrees. THRESHOLDS.knee.recurvatum
  // is 185 and classifyKnee() only returns "Genu Recurvatum" when
  // angle > 185 — a value calcKneeAngle can never produce. The `angle > 200`
  // outlier-rejection check has the same problem. In practice this means
  // Genu Recurvatum can never be auto-detected from calcKneeAngle's output,
  // regardless of how far back the knee actually bows in the photo.
  it("documents that calcKneeAngle's output can never exceed 180 degrees (Math.acos range)", () => {
    // Mirror-image displacement of the same magnitude as the flexion case
    // above, tried in both horizontal directions — neither can cross 180.
    const hip = { x: 0.5, y: 0.3 };
    const ankle = { x: 0.5, y: 0.7 };
    const kneeLeft = { x: 0.45, y: 0.5 };
    const kneeRight = { x: 0.55, y: 0.5 };
    const angleLeft = calcKneeAngle(hip, kneeLeft, ankle, imgSize);
    const angleRight = calcKneeAngle(hip, kneeRight, ankle, imgSize);
    expect(angleLeft).toBeLessThanOrEqual(180);
    expect(angleRight).toBeLessThanOrEqual(180);
    // Therefore classifyKnee can never return "Genu Recurvatum" via this path:
    expect(classifyKnee(angleLeft)).not.toBe("Genu Recurvatum");
    expect(classifyKnee(angleRight)).not.toBe("Genu Recurvatum");
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

  // FINDING (not a fix — flagging for review): the tci percentage above is
  // correct, but the `depth`/`chordLen` fields calcTCI returns for display
  // (e.g. in a debug panel or the finding's `metrics`) use
  // `Math.round(x*1000)/10`, which is x*100 rounded — not the 1-decimal
  // pixel value the surrounding code (calcCVA, calcKneeAngle, calcPelvicTilt)
  // returns via `Math.round(x*10)/10`. So a real chord of 600px is reported
  // as 60000, and a real depth of 60px is reported as 6000 — 100x inflated.
  // calcLCI has the identical pattern (same likely copy-paste origin). This
  // doesn't affect any severity/pattern classification (those only use the
  // correctly-computed `tci`/`lci` ratio), but any UI or debug output
  // surfacing `depth`/`chordLen` directly would show wrong numbers.
  it("documents that calcTCI's returned depth/chordLen fields are 100x inflated from the true pixel values", () => {
    const c7 = { x: 0.5, y: 0.3 };
    const t12 = { x: 0.5, y: 0.6 };
    const apexT = { x: 0.5 + 60 / 1000, y: 0.45 };
    const result = calcTCI(c7, t12, apexT, imgSize);
    // True pixel values: chordLen=600, depth=60. Actual returned values:
    expect(result.chordLen).toBeCloseTo(60000, 0);
    expect(result.depth).toBeCloseTo(6000, 0);
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
