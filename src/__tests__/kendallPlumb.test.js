import { describe, it, expect } from "vitest";
import {
  KENDALL_PLUMB_ANTERIOR_CM,
  KENDALL_EXPECTED_OFFSET_CM,
  plumbPxPerCm,
  plumbOffsetPx,
  plumbOffsetNormX,
  deviationFromIdealCm,
} from "../kendallPlumb.js";

// The bug this guards against: the sagittal reference line used to be anchored
// ON the lateral malleolus. Kendall's plumb falls slightly ANTERIOR to it, so
// an ideally-aligned person measured ~2cm anterior at the ear and acromion --
// exactly the ">2cm anterior" cutoff the engine flagged as abnormal. Ideal
// posture scored as a finding.

describe("Kendall plumb reference", () => {
  it("places the line anterior to the malleolus, not on it", () => {
    expect(KENDALL_PLUMB_ANTERIOR_CM).toBeGreaterThan(0);
  });

  it("uses real calibration when available, and the 170cm frame assumption when not", () => {
    expect(plumbPxPerCm(8, 1000)).toBe(8);          // calibrated wins
    expect(plumbPxPerCm(null, 1700)).toBe(10);      // 1700px / 170cm
    expect(plumbPxPerCm(0, 1700)).toBe(10);         // 0 is not a usable calibration
    expect(plumbPxPerCm(null, null)).toBeNull();    // nothing to go on
  });

  it("offsets toward anterior, which flips with the direction the patient faces", () => {
    const facingRight = plumbOffsetPx(10, 1700, +1);
    const facingLeft  = plumbOffsetPx(10, 1700, -1);
    expect(facingRight).toBe(KENDALL_PLUMB_ANTERIOR_CM * 10);
    expect(facingLeft).toBe(-facingRight);
  });

  it("degrades to no offset rather than a wrong one when scale is unknown", () => {
    expect(plumbOffsetPx(null, null, 1)).toBe(0);
    expect(plumbOffsetNormX(null, null, 1)).toBe(0);
    expect(plumbOffsetNormX(null, 0, 1)).toBe(0);
  });

  it("round-trips: a landmark sitting on the corrected line reads as zero deviation", () => {
    // Mirrors the sagittal chain: plumbX = anchor + offsetNorm, and
    // devCm = (x - plumbX) * imgH / pxPerCm * viewSign.
    const imgH = 1700, pxPerCm = 10, anchorX = 0.5;
    for (const viewSign of [1, -1]) {
      const plumbX = anchorX + plumbOffsetNormX(pxPerCm, imgH, viewSign);
      const devCm = x => (x - plumbX) * imgH / pxPerCm * viewSign;

      expect(devCm(plumbX)).toBeCloseTo(0, 6);
      // The malleolus itself now sits the offset distance POSTERIOR of the line.
      expect(devCm(anchorX)).toBeCloseTo(-KENDALL_PLUMB_ANTERIOR_CM, 6);
    }
  });

  it("ideal alignment is not zero deviation at hip and knee", () => {
    // Kendall: the plumb passes slightly posterior to the hip joint centre and
    // slightly anterior to the knee joint axis. Scoring those against zero is
    // what made normal posture read as anterior pelvic shift and recurvatum.
    expect(KENDALL_EXPECTED_OFFSET_CM.hip).toBeGreaterThan(0);
    expect(KENDALL_EXPECTED_OFFSET_CM.knee).toBeLessThan(0);
    expect(KENDALL_EXPECTED_OFFSET_CM.ear).toBe(0);
    expect(KENDALL_EXPECTED_OFFSET_CM.shoulder).toBe(0);
  });

  it("measures deviation from ideal, not from the line", () => {
    // A hip sitting exactly where Kendall expects it is not a finding.
    expect(deviationFromIdealCm("hip", KENDALL_EXPECTED_OFFSET_CM.hip)).toBeCloseTo(0, 6);
    expect(deviationFromIdealCm("knee", KENDALL_EXPECTED_OFFSET_CM.knee)).toBeCloseTo(0, 6);
    // A hip 2cm anterior of the line is only 1.5cm anterior of ideal.
    expect(deviationFromIdealCm("hip", 2)).toBeCloseTo(1.5, 6);
    // Ear and shoulder are expected on the line, so they pass straight through.
    expect(deviationFromIdealCm("ear", 3)).toBe(3);
    expect(deviationFromIdealCm("shoulder", -1.2)).toBe(-1.2);
    expect(deviationFromIdealCm("hip", null)).toBeNull();
  });

  it("leaves segment-to-segment measures untouched — the reference cancels out", () => {
    // fhpDevCm = plumb.ear - plumb.shoulder, and CVA is an ear-to-acromion
    // angle. Both are differences, so moving the shared reference must not
    // change them. This is why the fix does not disturb FHP or CVA.
    const imgH = 1700, pxPerCm = 10, anchorX = 0.5;
    const earX = 0.56, shX = 0.54, viewSign = 1;

    const devFrom = plumbX => x => (x - plumbX) * imgH / pxPerCm * viewSign;
    const oldDev = devFrom(anchorX); // pre-fix: anchored on the malleolus
    const newDev = devFrom(anchorX + plumbOffsetNormX(pxPerCm, imgH, viewSign));

    expect(newDev(earX) - newDev(shX)).toBeCloseTo(oldDev(earX) - oldDev(shX), 6);
  });
});
