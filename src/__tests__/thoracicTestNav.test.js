import { describe, it, expect } from "vitest";
import { thoracicTestNav } from "../SubjectiveObjective.jsx";

// Regression tests for the Phase 0.5 thoracic-engine objective-test click
// wiring -- mirrors lumbarTestNav.test.js / cervicalTestNav.test.js's
// structure and intent: only tests with a real, unambiguous implemented
// module get a nav target; everything else (imaging, palpation, outcome
// measures, Adson's/Costoclavicular/Roos/EAST/Cyriax Release, First
// Thoracic Nerve Root Stretch, Passive Scapular Approximation, Evjenth-
// Gloeck breath-hold, etc.) must stay unmapped so the UI leaves it as a
// plain, non-clickable chip -- confirmed via grep that none of these have
// a dedicated module anywhere in this app.
describe("thoracicTestNav -- T01-T11 objective test -> module mapping", () => {
  it("maps Slump Test (with the T02 Butler trunk-rotation variant text) to the neural special-tests entry", () => {
    expect(thoracicTestNav("Slump Test (add trunk rotation for intercostal nerve stress per Butler)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_slump_test" },
    });
  });

  it("maps Cervical Rotation Lateral Flexion (CRLF) to st_cervical_rotation_lt", () => {
    expect(thoracicTestNav("Cervical Rotation Lateral Flexion (CRLF)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_cervical_rotation_lt" },
    });
  });

  it("maps Rib Springing to the thoracic functional/rib-mobility screen", () => {
    expect(thoracicTestNav("Rib Springing")).toMatchObject({
      nav: "fma", ctx: { fsRegion: "thoracic" },
    });
    expect(thoracicTestNav("Rib Springing (differentiate from rib dysfunction)")).toMatchObject({
      nav: "fma", ctx: { fsRegion: "thoracic" },
    });
  });

  it("maps Functional movement screen to the same thoracic functional screen", () => {
    expect(thoracicTestNav("Functional movement screen")).toMatchObject({
      nav: "fma", ctx: { fsRegion: "thoracic" },
    });
  });

  it("maps postural assessment variants to the posture module", () => {
    expect(thoracicTestNav("Postural assessment (forward head, upper crossed syndrome)")).toMatchObject({
      nav: "posture", ctx: { region: "Thoracic" },
    });
  });

  it("maps every Thoracic AROM variant to the ROM module", () => {
    expect(thoracicTestNav("Thoracic AROM all planes (note capsular pattern: side flexion + rotation limited more than extension)")).toMatchObject({ nav: "rom" });
    expect(thoracicTestNav("Thoracic AROM")).toMatchObject({ nav: "rom" });
    expect(thoracicTestNav("Thoracic AROM (assess flexibility of the kyphotic curve)")).toMatchObject({ nav: "rom" });
    expect(thoracicTestNav("Thoracic AROM (expect global/multi-plane restriction, not a single-plane pattern)")).toMatchObject({ nav: "rom" });
  });

  it("maps every Thoracic MMT variant to the MMT module", () => {
    expect(thoracicTestNav("Thoracic MMT (lower trapezius, rhomboids, serratus anterior)")).toMatchObject({ nav: "mmt" });
    expect(thoracicTestNav("Thoracic MMT (assess associated weakness/inhibition — lower trapezius, serratus anterior, rhomboids)")).toMatchObject({ nav: "mmt" });
  });

  it("leaves imaging/palpation/outcome-measure/unimplemented tests unmapped (honest gap, not a wrong pointer)", () => {
    expect(thoracicTestNav("Observation (posture, kyphosis)")).toBeNull();
    expect(thoracicTestNav("Neurological screen (expect normal)")).toBeNull();
    expect(thoracicTestNav("PA central + unilateral vertebral pressures")).toBeNull();
    expect(thoracicTestNav("First Thoracic Nerve Root Stretch")).toBeNull();
    expect(thoracicTestNav("Passive Scapular Approximation")).toBeNull();
    expect(thoracicTestNav("Evjenth and Gloeck breath-hold differentiation test (flex to pain, exhale, re-check range)")).toBeNull();
    expect(thoracicTestNav("Costovertebral expansion measurement (tape at 4th intercostal space; normal 3-7.5cm)")).toBeNull();
    expect(thoracicTestNav("Adson's Test")).toBeNull();
    expect(thoracicTestNav("Costoclavicular (Military Brace) Test")).toBeNull();
    expect(thoracicTestNav("Roos Test / Elevated Arm Stress Test (EAST)")).toBeNull();
    expect(thoracicTestNav("Cyriax Release Test")).toBeNull();
    expect(thoracicTestNav("Radiographic imaging (≥5° anterior wedging of ≥3 consecutive vertebrae, Schmorl's nodes — Magee p.601)")).toBeNull();
    expect(thoracicTestNav("Scoliometer measurement (>5° = refer)")).toBeNull();
    expect(thoracicTestNav("Palpation (costochondral junction tenderness reproduction)")).toBeNull();
    expect(thoracicTestNav("Resisted isometric trunk movements (expect non-provocative — helps rule out a contractile/radicular source)")).toBeNull();
    expect(thoracicTestNav("Forestier's bowstring sign (ipsilateral paraspinal tightening on side flexion)")).toBeNull();
  });
});
