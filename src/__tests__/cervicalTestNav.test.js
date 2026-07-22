import { describe, it, expect } from "vitest";
import { cervicalTestNav } from "../SubjectiveObjective.jsx";

// Regression tests for the Phase 0.5 cervical-engine objective-test click
// wiring -- mirrors lumbarTestNav.test.js's structure and intent: only
// tests with a real, unambiguous implemented module get a nav target;
// everything else (imaging, palpation, outcome measures, Tinel's, etc.)
// must stay unmapped so the UI leaves it as a plain, non-clickable chip.
describe("cervicalTestNav -- C01-C11 objective test -> module mapping", () => {
  it("maps Spurling's Test to the cervical special-tests entry", () => {
    expect(cervicalTestNav("Spurling's Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_spurling" },
    });
  });

  it("maps Cervical Distraction Test to st_distraction", () => {
    expect(cervicalTestNav("Cervical Distraction Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_distraction" },
    });
  });

  it("maps Sharp-Purser Test to st_sharp_purser", () => {
    expect(cervicalTestNav("Sharp-Purser Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_sharp_purser" },
    });
  });

  it("maps Alar Ligament Test to st_alar", () => {
    expect(cervicalTestNav("Alar Ligament Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_alar" },
    });
  });

  it("maps the VBI / 3-Part Test to st_vbi", () => {
    expect(cervicalTestNav("VBI / 3-Part Test before any manipulation is considered")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_vbi" },
    });
  });

  it("maps the Flexion-Rotation Test to st_flex_rot", () => {
    expect(cervicalTestNav("Flexion-Rotation Test (FRT)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_flex_rot" },
    });
  });

  it("maps Jackson's Compression Test to st_jackson", () => {
    expect(cervicalTestNav("Jackson's Compression Test")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_jackson" },
    });
  });

  it("maps Cervical Rotation Lateral Flexion (CRLF) to st_cervical_rotation_lt", () => {
    expect(cervicalTestNav("Cervical Rotation Lateral Flexion (CRLF)")).toMatchObject({
      nav: "special", ctx: { specialRegion: "cervical", highlightTest: "st_cervical_rotation_lt" },
    });
  });

  it("maps ULTT1/2/3 variants to the neural special-tests entries, distinguishing each", () => {
    expect(cervicalTestNav("ULTT1 — Median Nerve")).toMatchObject({
      nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_ultt1" },
    });
    expect(cervicalTestNav("ULTT2 — Radial Nerve")).toMatchObject({
      nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_ultt2" },
    });
    expect(cervicalTestNav("ULTT3 — Ulnar Nerve")).toMatchObject({
      nav: "special", ctx: { specialRegion: "neural", highlightTest: "st_ultt3" },
    });
  });

  it("maps Tinel's Sign at Wrist and Tinel's Sign at Elbow to the real elbow_wrist special-tests entries", () => {
    expect(cervicalTestNav("Tinel's Sign at Wrist")).toMatchObject({
      nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_tinel_wrist" },
    });
    expect(cervicalTestNav("Tinel's Sign at Elbow")).toMatchObject({
      nav: "special", ctx: { specialRegion: "elbow_wrist", highlightTest: "st_tinel_elbow" },
    });
  });

  it("maps neurological screen variants to the neuro module", () => {
    expect(cervicalTestNav("Neurological screen (myotomes, dermatomes, reflexes)")).toMatchObject({ nav: "neuro" });
    expect(cervicalTestNav("Bilateral neurological screen")).toMatchObject({ nav: "neuro" });
  });

  it("maps postural assessment to the posture module", () => {
    expect(cervicalTestNav("Postural assessment (forward head posture)")).toMatchObject({
      nav: "posture", ctx: { region: "Cervical" },
    });
  });

  it("maps gait assessment to the gait module", () => {
    expect(cervicalTestNav("Gait assessment (screen for myelopathic gait before proceeding)")).toMatchObject({ nav: "gait" });
  });

  it("maps every Cervical AROM variant to the ROM module", () => {
    expect(cervicalTestNav("Cervical AROM all planes")).toMatchObject({ nav: "rom" });
    expect(cervicalTestNav("Cervical AROM (extension likely limited/provocative)")).toMatchObject({ nav: "rom" });
    expect(cervicalTestNav("Cervical AROM (pain on stretch directions)")).toMatchObject({ nav: "rom" });
  });

  it("leaves imaging/palpation/outcome-measure/unimplemented tests unmapped (honest gap, not a wrong pointer)", () => {
    expect(cervicalTestNav("Observation (posture, head position, muscle guarding)")).toBeNull();
    expect(cervicalTestNav("Palpation (soft tissue + segmental)")).toBeNull();
    expect(cervicalTestNav("PA central + unilateral vertebral pressures")).toBeNull();
    expect(cervicalTestNav("Cervical x-ray (degenerative changes)")).toBeNull();
    expect(cervicalTestNav("MRI if red flags or progressive signs")).toBeNull();
    expect(cervicalTestNav("Resisted isometric movements")).toBeNull();
    expect(cervicalTestNav("Outcome measure (Neck Disability Index)")).toBeNull();
    expect(cervicalTestNav("Palpation for taut bands/trigger points reproducing referred pain (unverified against a real source)")).toBeNull();
  });
});
