import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const engine = readFileSync(resolve(process.cwd(), "src/PostureEngine.jsx"), "utf-8");
const hybrid = readFileSync(resolve(process.cwd(), "src/HybridKendall.jsx"), "utf-8");

// Context: useVerifiedLandmarks was written but never connected to any UI.
// setVerified was never called, so `verified` was permanently {} — which also
// meant the old `isClinicianVerified = verifiedCount > 0` could never be true
// and the "Clinician Verified" badge could never appear.
//
// Worse, the hook referenced VERIFIED_LANDMARK_MAP, which was never defined
// anywhere. It only avoided a ReferenceError because both loop bodies that
// touch it are skipped when `verified` is empty. Wiring a correction button
// without defining the map would have thrown on the first corrected point.

describe("VERIFIED_LANDMARK_MAP", () => {
  it("exists — the hook dereferences it", () => {
    expect(engine).toMatch(/const VERIFIED_LANDMARK_MAP\s*=\s*\{/);
  });

  it("defines every landmark the correction panel offers", () => {
    const order = engine.match(/const VERIFIED_LANDMARK_ORDER\s*=\s*\[([\s\S]*?)\]/)[1];
    const keys = [...order.matchAll(/"(\w+)"/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    const mapBlock = engine.match(/const VERIFIED_LANDMARK_MAP\s*=\s*\{[\s\S]*?\n\};/)[0];
    for (const k of keys) {
      expect(mapBlock).toMatch(new RegExp(`\\b${k}:\\s*\\{`));
    }
  });

  it("gives every entry the fields the hook reads", () => {
    const mapBlock = engine.match(/const VERIFIED_LANDMARK_MAP\s*=\s*\{[\s\S]*?\n\};/)[0];
    const entries = mapBlock.split("\n").filter(l => /^\s+\w+:\s*\{/.test(l));
    expect(entries.length).toBe(10);
    for (const line of entries) {
      // mergeWithMediaPipe needs mpIdx; boostFindingConfidence needs priority
      // and affects; the panel needs label and desc.
      expect(line).toMatch(/mpIdx:\s*\d+/);
      expect(line).toMatch(/priority:\s*[123]/);
      expect(line).toMatch(/affects:\s*\[/);
      expect(line).toMatch(/label:/);
      expect(line).toMatch(/desc:/);
    }
  });

  it("uses camelCase in affects so both matching paths in the hook work", () => {
    // boostFindingConfidence matches affects against a metric key directly AND
    // against finding text after splitting camelCase into words. An all-lower
    // entry would only ever match one of the two.
    const mapBlock = engine.match(/const VERIFIED_LANDMARK_MAP\s*=\s*\{[\s\S]*?\n\};/)[0];
    const affects = [...mapBlock.matchAll(/affects:\s*\[([^\]]*)\]/g)]
      .flatMap(m => [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]));
    expect(affects.length).toBeGreaterThan(5);
    for (const a of affects) expect(a).toMatch(/^[a-z]+[A-Z]/);
  });

  it("maps each key to a distinct MediaPipe slot", () => {
    const mapBlock = engine.match(/const VERIFIED_LANDMARK_MAP\s*=\s*\{[\s\S]*?\n\};/)[0];
    const idxs = [...mapBlock.matchAll(/mpIdx:\s*(\d+)/g)].map(m => Number(m[1]));
    expect(new Set(idxs).size).toBe(idxs.length);
  });
});

describe("correction is wired to the UI", () => {
  it("setVerified is actually called now", () => {
    expect(engine).toMatch(/setVerified\(activeLandmark,\s*x,\s*y\)/);
  });

  it("re-runs the analysis so the numbers reflect the correction", () => {
    expect(engine).toMatch(/setVerified\(activeLandmark[\s\S]{0,700}processLandmarks\(corrected/);
  });

  it("offers a picker that sets the landmark being corrected", () => {
    expect(engine).toMatch(/setActiveLandmark\(isActive\?null:key\)/);
  });

  it("is scoped to frontal and posterior — lateral has its own editor", () => {
    // HybridKendall owns the sagittal chain and provides drag-to-correct.
    expect(engine).toMatch(/Correct AI landmarks \(frontal \/ posterior\)/);
    expect(hybrid).toMatch(/Re-adjust landmarks/);
    expect(hybrid).toMatch(/setLm\(prev => \(\{ \.\.\.prev, \[dragging\]/);
  });

  it("lets the clinician undo corrections", () => {
    expect(engine).toMatch(/Reset all corrections/);
    expect(engine).toMatch(/const resetVerified\s*=\s*useCallback/);
  });
});

describe("corrections do not leak between photos", () => {
  it("clears corrections when the photo or view changes", () => {
    // A correction is a coordinate on one specific image. Carrying it to the
    // next photo would silently move that photo's landmark to the old spot.
    const effect = engine.match(/useEffect\(\(\) => \{[\s\S]*?\}, \[uploadedImg, capturedImg, view\]\);/)[0];
    expect(effect).toMatch(/resetVerified\(\)/);
    expect(effect).toMatch(/setActiveLandmark\(null\)/);
    expect(effect).toMatch(/setLandmarksReviewed\(false\)/);
  });
});

describe("patient sex is settable again", () => {
  it("has an input after the report-modal form was removed", () => {
    // Removing that form left patientInfo.sex unsettable, so it was stuck on
    // its default while still driving the cervical reference range shown.
    expect(engine).toMatch(/setPatientInfo\(p=>\(\{\.\.\.p,sex:opt\}\)\)/);
  });

  it("still feeds the reference range and the sagittal component", () => {
    expect(engine).toMatch(/patientInfo\?\.sex==="Male"/);
    expect(engine).toMatch(/patientSex=\{patientInfo\?\.sex\|\|"Female"\}/);
  });
});
