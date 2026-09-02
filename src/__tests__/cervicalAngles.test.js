import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const engine = readFileSync(resolve(process.cwd(), "src/PostureEngine.jsx"), "utf-8");
const sagittal = readFileSync(resolve(process.cwd(), "src/sagittalFindings.js"), "utf-8");

// These guard the P2 additions at source level, the same approach the existing
// report-escaping suite uses: the measures live deep inside measureLandmarks,
// which needs a full 33-landmark MediaPipe array and a calibration object to
// invoke, so the contract is pinned here rather than by reconstructing that.

describe("C7 manual landmark", () => {
  it("is offered as a sagittal manual point", () => {
    expect(engine).toMatch(/label:"C7",\s*extraKey:"c7"/);
  });

  it("uses extraKey, never a real MediaPipe slot", () => {
    // Reusing an mpIdx slot would let AI Auto silently populate C7 from an
    // unrelated real detection and produce a fabricated "true" CVA. The same
    // reasoning already applies to ASIS/PSIS and the tibial tuberosities.
    const c7Def = engine.match(/\{[^}]*label:"C7"[^}]*\}/)[0];
    expect(c7Def).toContain("extraKey");
    expect(c7Def).not.toContain("mpIdx");
  });

  it("draws the two lines the published cutoffs are defined on", () => {
    // ear->C7 (craniovertebral) and C7->acromion (forward shoulder)
    expect(engine).toMatch(/\[1,10\][^\n]*craniovertebral/i);
    expect(engine).toMatch(/\[10,2\][^\n]*forward shoulder/i);
  });
});

describe("CVA provenance", () => {
  it("records which landmark the reported CVA came from", () => {
    expect(engine).toMatch(/cvaSource\s*=\s*cvaTrueAngle\s*!==\s*null\s*\?\s*"c7"\s*:/);
    expect(engine).toMatch(/"acromion-proxy"/);
  });

  it("grades the finding on the C7 angle when one exists", () => {
    expect(engine).toMatch(/const cvaUsed\s*=\s*m\.cvaTrueAngle\s*\?\?\s*m\.cvaAngle/);
    // The severity banding must use the chosen angle, not the proxy.
    expect(engine).toMatch(/cvaUsed\s*<\s*POSTURE_THRESHOLDS\.cvaAngle\.severe/);
  });

  it("only claims a comparable measurement when C7 was actually placed", () => {
    expect(engine).toMatch(/const cvaIsProxy\s*=\s*m\.cvaSource\s*!==\s*"c7"/);
    // The proxy branch must tell the reader the cutoff is defined elsewhere.
    expect(engine).toMatch(/cvaIsProxy[\s\S]{0,400}Place C7 in Manual mode/);
  });

  it("exports the new cervical measures", () => {
    expect(engine).toMatch(/cvaAngle,\s*cvaTrueAngle,\s*cvaSource,\s*forwardShoulderAngle/);
    expect(engine).toMatch(/craAngle,\s*craDirection/);
  });
});

describe("cranial rotation angle", () => {
  it("is gated to lateral view, like CVA", () => {
    // In a frontal photo the eye-to-ear horizontal distance is face width,
    // not a head posture.
    expect(engine).toMatch(/if \(isLateralView && sagEyeVis && sagEarVis\)/);
  });

  it("reports a direction so extension and flexion are distinguishable", () => {
    expect(engine).toMatch(/craDirection[\s\S]{0,200}extended[\s\S]{0,40}flexed/);
  });

  it("is not graded against an invented cutoff", () => {
    // No photographic CRA cutoff is as well established as CVA's, so the
    // measure is reported as a magnitude and interpreted alongside CVA.
    expect(engine).toMatch(/no[\s\S]{0,20}photographic CRA cutoff is as well established/i);
  });
});

describe("flexicurve index and angle", () => {
  it("puts depth and chord into the same units before dividing", () => {
    // TCI divides a bodyDepth-normalised depth by a trunkHeight-normalised
    // chord, which is why its scale is the app's own and not the published one.
    expect(sagittal).toMatch(/const apexDepthPx\s*=/);
    expect(sagittal).toMatch(/const chordLengthPx\s*=/);
    expect(sagittal).toMatch(/apexDepthPx \/ chordLengthPx/);
  });

  it("computes the two-segment flexicurve angle", () => {
    expect(sagittal).toMatch(/Math\.atan\(apexDepthPx \/ b1\)\s*\+\s*Math\.atan\(apexDepthPx \/ b2\)/);
  });

  it("refuses to compute when the apex is not between the chord ends", () => {
    expect(sagittal).toMatch(/if \(b1 < 1 \|\| b2 < 1\) return null/);
  });

  it("does not claim the flexicurve method's validation", () => {
    // Same geometry, different acquisition: silhouette vs a ruler traced on
    // the back. The Cobb correlation and the sensitivity/specificity figures
    // belong to the instrument, not to this construction.
    expect(sagittal).toMatch(/does NOT inherit the flexicurve literature's validation/i);
    expect(sagittal).toMatch(/caveat:[^\n]*Silhouette-derived/);
    expect(sagittal).toMatch(/not a Cobb angle/i);
  });

  it("requires trunk height in pixels, which the contour engine now exports", () => {
    const contour = readFileSync(resolve(process.cwd(), "src/contourEngine.js"), "utf-8");
    expect(contour).toMatch(/trunkHPx:\s*trunkH/);
  });
});

describe("landmark substitutions are disclosed, not silent", () => {
  it("says pelvic obliquity is measured from hip joint centres in auto mode", () => {
    expect(engine).toMatch(/measured from hip joint centres, not the ASIS\/iliac crest line/);
  });

  it("drops that note when the pelvic landmarks were placed manually", () => {
    expect(engine).toMatch(/lm\?\.\[23\]\?\._verified && lm\?\.\[24\]\?\._verified/);
  });

  it("labels lumbarProxy as unvalidated where it surfaces to the user", () => {
    expect(engine).toMatch(/not a validated pelvic measure/);
    expect(engine).toMatch(/NO counterpart in any validated postural/i);
  });
});
