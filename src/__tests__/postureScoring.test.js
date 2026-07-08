// postureScoring.test.js
// Unit tests for PostureEngine.jsx's pure clinical scoring/classification
// logic -- the part of the ~7,600-line Posture Analysis module that can be
// tested without a camera or real MediaPipe pose detection. These functions
// were previously not exported at all (only the top-level PostureAnalysisModule
// component was), so nothing outside the file could exercise them directly.
// This locks in the clinical thresholds (Magee, Kendall, Yip et al. 2008,
// Lee & Nussbaum 2013 -- cited in POSTURE_THRESHOLDS) against silent
// regression if someone later edits a number or flips a comparison direction.
import { describe, it, expect } from "vitest";
import {
  vec3Angle, dist2D, classifySeverity, POSTURE_THRESHOLDS,
  getLandmarkConfidence, checkLandmarkReliability, checkAnatomicalOrder,
} from "../PostureEngine.jsx";

describe("vec3Angle — angle at vertex b between rays to a and c", () => {
  it("returns 90 for a right angle", () => {
    expect(vec3Angle({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(90);
  });
  it("returns 180 for three collinear points with b in the middle", () => {
    expect(vec3Angle({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(180);
  });
  it("returns null when any point is missing", () => {
    expect(vec3Angle(null, { x: 0, y: 0 }, { x: 1, y: 0 })).toBeNull();
  });
});

describe("dist2D — Euclidean distance", () => {
  it("computes a 3-4-5 triangle correctly", () => {
    expect(dist2D({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
  it("returns null when either point is missing", () => {
    expect(dist2D(null, { x: 1, y: 1 })).toBeNull();
  });
});

describe("classifySeverity — real clinical thresholds from POSTURE_THRESHOLDS", () => {
  it("CVA angle (lower is worse, Yip et al. 2008): normal, mild, moderate, high", () => {
    const t = POSTURE_THRESHOLDS.cvaAngle; // { mild:55, moderate:49, severe:44 }
    expect(classifySeverity(60, t, true)).toBeNull();      // well above normal cutoff
    expect(classifySeverity(55, t, true)).toBe("mild");    // right at the mild boundary
    expect(classifySeverity(49, t, true)).toBe("moderate");
    expect(classifySeverity(40, t, true)).toBe("high");    // well below severe cutoff
  });

  it("shoulder angle (higher is worse, Magee p.597): normal, mild, moderate, high", () => {
    const t = POSTURE_THRESHOLDS.shoulderAngle; // { mild:3, moderate:5, severe:7 }
    expect(classifySeverity(2, t)).toBeNull();
    expect(classifySeverity(3, t)).toBe("mild");
    expect(classifySeverity(5, t)).toBe("moderate");
    expect(classifySeverity(8, t)).toBe("high");
  });
});

describe("getLandmarkConfidence — visibility-based confidence scoring", () => {
  it("returns high confidence when all relevant landmarks are clearly visible", () => {
    const lm = { 11: { visibility: 0.95 }, 12: { visibility: 0.9 } };
    expect(getLandmarkConfidence(lm, [11, 12])).toBeGreaterThanOrEqual(90);
  });
  it("penalises confidence when a landmark's visibility is very low", () => {
    const lm = { 11: { visibility: 0.95 }, 12: { visibility: 0.2 } };
    const conf = getLandmarkConfidence(lm, [11, 12]);
    const avgOnly = Math.round((95 + 20) / 2);
    expect(conf).toBeLessThan(avgOnly); // penalty must actually reduce the score
  });
});

describe("checkLandmarkReliability / checkAnatomicalOrder", () => {
  const goodLm = {
    11: { visibility: 0.9, y: 0.3 }, // shoulder
    23: { visibility: 0.9, y: 0.6 }, // hip (below shoulder -- correct, y grows downward)
    25: { visibility: 0.9, y: 0.8 }, // knee (below hip -- correct)
  };
  it("flags landmarks below the visibility threshold as unreliable", () => {
    const lowVisLm = { 11: { visibility: 0.1, y: 0.3 }, 23: { visibility: 0.9, y: 0.6 } };
    const result = checkLandmarkReliability(lowVisLm, [11, 23]);
    expect(result.reliable).toBe(false);
  });
  it("accepts anatomically plausible, well-visible landmarks", () => {
    const result = checkLandmarkReliability(goodLm, [11, 23, 25]);
    expect(result.reliable).toBe(true);
  });
  it("rejects an upside-down / implausible pose (shoulder below hip)", () => {
    const upsideDown = { 11: { y: 0.8 }, 23: { y: 0.3 } }; // shoulder y > hip y == shoulder appears lower
    expect(checkAnatomicalOrder(upsideDown, [11, 23])).toBe(false);
  });
  it("accepts a normal standing pose ordering", () => {
    expect(checkAnatomicalOrder(goodLm, [11, 23, 25])).toBe(true);
  });
});
