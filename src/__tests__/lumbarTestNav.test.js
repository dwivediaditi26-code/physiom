import { describe, it, expect } from "vitest";
import { lumbarTestNav } from "../SubjectiveObjective.jsx";

// Regression tests for the Phase 0.5 lumbar-engine objective-test click
// wiring: only tests with a real, unambiguous implemented module get a nav
// target; everything else (imaging, palpation, outcome measures, etc.)
// must stay unmapped so the UI leaves it as a plain, non-clickable chip.
describe("lumbarTestNav -- L01-L11 objective test -> module mapping", () => {
  it("maps SLR variants to the special-tests SLR entry", () => {
    expect(lumbarTestNav("SLR (expect negative)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_slr_test" },
    });
    expect(lumbarTestNav("Bilateral SLR")).toMatchObject({
      nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_slr_test" },
    });
  });

  it("does NOT map Active SLR to the passive SLR test (clinically distinct, no real implementation)", () => {
    expect(lumbarTestNav("Active SLR")).toBeNull();
  });

  it("maps Slump test to the neural special-tests entry", () => {
    expect(lumbarTestNav("Slump test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_slump_test" },
    });
  });

  it("maps Quadrant Test / Kemp's Test to st_kemp", () => {
    expect(lumbarTestNav("Quadrant Test / Kemp's Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_kemp" },
    });
  });

  it("maps the stork test (L07 spondylolisthesis) to st_stork", () => {
    expect(lumbarTestNav("One-Leg Standing (Stork) Lumbar Extension Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "lumbar", highlightTest: "st_stork" },
    });
  });

  it("maps femoral nerve tension test to st_femoral_nerve_stretch", () => {
    expect(lumbarTestNav("Femoral nerve tension test (if upper lumbar)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_femoral_nerve_stretch" },
    });
  });

  it("maps the SIJ provocation cluster to the lumbar special-tests region without pinning one test", () => {
    expect(lumbarTestNav("SIJ provocation CLUSTER (not a single test): Compression, Distraction, Sacral Thrust, Gaenslen's, FABERE/Patrick, Gillet's")).toMatchObject({
      nav: "special", ctx: { specialRegion: "lumbar" },
    });
  });

  it("maps FABER (L10 cross-ref) to the hip special-tests entry, not the SIJ cluster", () => {
    expect(lumbarTestNav("FABER + posterior SIJ provocation (cross-ref L05)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "hip", highlightTest: "st_faber_test" },
    });
  });

  it("maps AROM and repeated-movement variants to the ROM module", () => {
    expect(lumbarTestNav("Lumbar AROM all planes")).toMatchObject({ nav: "rom" });
    expect(lumbarTestNav("Repeated movement assessment (McKenzie-style)")).toMatchObject({ nav: "rom" });
  });

  it("maps neurological screen variants to the neuro module", () => {
    expect(lumbarTestNav("Neurological screen (expect normal)")).toMatchObject({ nav: "neuro" });
    expect(lumbarTestNav("Bilateral neuro screen")).toMatchObject({ nav: "neuro" });
  });

  it("maps core/lumbopelvic motor control assessment to Core MMT", () => {
    expect(lumbarTestNav("Core/lumbopelvic motor control assessment")).toMatchObject({ nav: "mmt" });
    expect(lumbarTestNav("Core assessment (after irritability considered)")).toMatchObject({ nav: "mmt" });
  });

  it("maps functional screen/testing variants to fma", () => {
    expect(lumbarTestNav("Functional movement screen")).toMatchObject({ nav: "fma" });
    expect(lumbarTestNav("Functional testing (sit-to-stand, gait, squat)")).toMatchObject({ nav: "fma" });
  });

  it("leaves imaging/palpation/outcome-measure/unimplemented tests unmapped (honest gap, not a wrong pointer)", () => {
    expect(lumbarTestNav("Palpation (soft tissue + segmental)")).toBeNull();
    expect(lumbarTestNav("PA/central PA glides")).toBeNull();
    expect(lumbarTestNav("Passive physiological intervertebral movements")).toBeNull();
    expect(lumbarTestNav("X-ray if degenerative changes suspected")).toBeNull();
    expect(lumbarTestNav("ODI / NPRS / fear-avoidance screen")).toBeNull();
    expect(lumbarTestNav("Bicycle Test of van Gelderen")).toBeNull();
    expect(lumbarTestNav("Stoop Test")).toBeNull();
    expect(lumbarTestNav("Treadmill Test (1.2mph + preferred speed, up to 15min)")).toBeNull();
    expect(lumbarTestNav("Passive Lumbar Extension Test")).toBeNull();
    expect(lumbarTestNav("H and I Stability Tests")).toBeNull();
    expect(lumbarTestNav("Farfan Torsion Test")).toBeNull();
    expect(lumbarTestNav("Pheasant Test")).toBeNull();
    expect(lumbarTestNav("Meyerding grading once imaging confirms a slip")).toBeNull();
    expect(lumbarTestNav("Hamstring length")).toBeNull();
    expect(lumbarTestNav("Resisted isometric movements")).toBeNull();
    expect(lumbarTestNav("Crossed SLR")).toBeNull();
    expect(lumbarTestNav("Palpation for taut bands/trigger points reproducing referred pain (unverified against a real source)")).toBeNull();
    expect(lumbarTestNav("ESR/CRP, HLA-B27 referral")).toBeNull();
    expect(lumbarTestNav("Peripheral joint screen")).toBeNull();
  });
});
