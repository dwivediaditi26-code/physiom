import { describe, it, expect } from "vitest";
import {
  MDC_ANGLE_DEG_CONTROLLED,
  angleMdcDeg,
  linearMdcCm,
  compareMeasurement,
  describeChange,
  capturesComparable,
  protocolQuality,
} from "../measurementError.js";

// The claim this guards against: reporting a session-to-session difference
// that is smaller than the measurement error as if it were improvement.
// Photogrammetric postural angles carry MDC 0.8-2.3 deg even under tripod,
// marker-based conditions; this app is handheld and markerless, so its floor
// is wider, never narrower.

describe("measurement error floor", () => {
  it("starts from the published upper-bound MDC under ideal conditions", () => {
    const { mdc, factors } = angleMdcDeg({});
    expect(mdc).toBe(MDC_ANGLE_DEG_CONTROLLED);
    expect(factors).toEqual([]);
  });

  it("only ever widens the floor as conditions get worse", () => {
    const ideal = angleMdcDeg({}).mdc;
    const uncal = angleMdcDeg({ uncalibrated: true }).mdc;
    const worst = angleMdcDeg({
      uncalibrated: true, unverifiedMarkers: true, unknownGeometry: true,
    }).mdc;
    expect(uncal).toBeGreaterThan(ideal);
    expect(worst).toBeGreaterThan(uncal);
    expect(linearMdcCm({ uncalibrated: true }).mdc).toBeGreaterThan(linearMdcCm({}).mdc);
  });

  it("names why the floor was widened, so the UI can explain itself", () => {
    const { factors } = angleMdcDeg({ uncalibrated: true, unknownGeometry: true });
    expect(factors).toContain("uncalibrated");
    expect(factors).toContain("unknownGeometry");
  });
});

describe("compareMeasurement", () => {
  it("refuses to call a sub-MDC difference a change", () => {
    // 1.5 deg is a real number and a meaningless one: inside the error floor.
    const cmp = compareMeasurement(50, 51.5, { unit: "deg" });
    expect(cmp.isReal).toBe(false);
    expect(cmp.direction).toBe("none");
    expect(describeChange(cmp)).toMatch(/no measurable change/);
  });

  it("reports a change that clears the floor", () => {
    const cmp = compareMeasurement(44, 50, { unit: "deg" });
    expect(cmp.isReal).toBe(true);
    expect(cmp.delta).toBe(6);
    expect(describeChange(cmp)).toBe("+6°");
  });

  it("knows which direction is better for the measure in question", () => {
    // CVA: higher is better (less forward head).
    expect(compareMeasurement(44, 52, { lowerIsBetter: false }).direction).toBe("better");
    // Shoulder tilt: lower is better.
    expect(compareMeasurement(2, 9, { lowerIsBetter: true }).direction).toBe("worse");
    expect(compareMeasurement(9, 2, { lowerIsBetter: true }).direction).toBe("better");
  });

  it("a change that clears the ideal floor may not clear a widened one", () => {
    const good = compareMeasurement(50, 53, { conditions: {} });
    const bad  = compareMeasurement(50, 53, {
      conditions: { uncalibrated: true, unverifiedMarkers: true, unknownGeometry: true },
    });
    expect(good.isReal).toBe(true);
    expect(bad.isReal).toBe(false);
  });

  it("returns null rather than guessing when a value is missing", () => {
    expect(compareMeasurement(null, 50)).toBeNull();
    expect(compareMeasurement(50, undefined)).toBeNull();
    expect(compareMeasurement(NaN, 50)).toBeNull();
  });
});

describe("capturesComparable", () => {
  const base = { view: "left", calibrated: true, patientHeightCm: 170, distanceCm: 150 };

  it("accepts two like-for-like captures", () => {
    expect(capturesComparable(base, { ...base }).comparable).toBe(true);
  });

  it("declines when the capture conditions were not recorded", () => {
    expect(capturesComparable(null, base).comparable).toBe(false);
    expect(capturesComparable(base, undefined).comparable).toBe(false);
  });

  it("declines across different views — they measure different things", () => {
    expect(capturesComparable(base, { ...base, view: "anterior" }).comparable).toBe(false);
  });

  it("declines when one session was calibrated and the other was not", () => {
    const r = capturesComparable(base, { ...base, calibrated: false });
    expect(r.comparable).toBe(false);
    expect(r.reason).toMatch(/calibrated/);
  });

  it("declines on a materially different camera distance", () => {
    expect(capturesComparable(base, { ...base, distanceCm: 250 }).comparable).toBe(false);
    // A small difference is tolerated rather than blocking the comparison.
    expect(capturesComparable(base, { ...base, distanceCm: 160 }).comparable).toBe(true);
  });
});

describe("protocolQuality", () => {
  it("caps confidence hardest when landmarks were never reviewed", () => {
    const q = protocolQuality({ calibrated: true, distanceCm: 150, protocolConfirmed: true, landmarksReviewed: false });
    expect(q.ceiling).toBe(60);
    expect(q.level).toBe("screening only");
    expect(q.reasons).toContain("landmarks not reviewed");
  });

  it("gives a full-confidence ceiling only when every condition is met", () => {
    const q = protocolQuality({ calibrated: true, distanceCm: 150, protocolConfirmed: true, landmarksReviewed: true });
    expect(q.ceiling).toBe(100);
    expect(q.reasons).toEqual([]);
  });

  it("treats an empty capture record as the worst case, not the best", () => {
    const q = protocolQuality({});
    expect(q.ceiling).toBeLessThanOrEqual(60);
    expect(q.reasons.length).toBeGreaterThan(2);
  });
});
