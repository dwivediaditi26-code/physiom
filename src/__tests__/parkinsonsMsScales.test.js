// parkinsonsMsScales.test.js
// Covers the scales added for Parkinson's and MS patients (Outcome Measures):
// - Parkinson's: Hoehn and Yahr (public domain, built in full), an
//   original rigidity grading scale (explicitly NOT the same as MAS
//   spasticity -- rigidity is velocity-independent), and UPDRS as a 4-part
//   domain-summary since the MDS-UPDRS explicitly prohibits embedding its
//   actual item content in software without a paid licence.
// - MS: EDSS with its 8 real Kurtzke Functional System Scores plus a
//   directly-entered overall grade (deliberately NOT auto-derived from
//   the FSS, since the real conversion needs clinical judgement a simple
//   sum can't replicate).
import { describe, it, expect } from "vitest";
import { SCALES } from "../sharedClinicalData.js";

describe("Parkinson's-specific scales", () => {
  it("Hoehn and Yahr scores the selected stage directly", () => {
    expect(SCALES.hoehnyahr.score({ hoehnyahr_stage: "3 — Bilateral disease with mild to moderate postural instability, physically independent" })).toBe(3);
  });

  it("rigidity takes the worst (max) of the 3 segments tested", () => {
    const v = { pdrigidity_upper: "1 — Mild, only detectable with reinforcement (e.g. clenching the opposite fist)", pdrigidity_lower: "3 — Marked, but full range of motion still easily achieved" };
    expect(SCALES.pdrigidity.score(v)).toBe(3);
  });

  it("UPDRS sums the 4 official part totals without exposing any verbatim item content", () => {
    const v = { updrs_part1: "10", updrs_part2: "15", updrs_part3: "40", updrs_part4: "4" };
    expect(SCALES.updrs.score(v)).toBe(69);
    expect(SCALES.updrs.adminNote).toContain("cannot be embedded in software without a separate paid licence");
  });
});

describe("MS-specific scale (EDSS)", () => {
  it("overall EDSS is read directly from clinical judgement, not auto-derived from the FSS scores", () => {
    expect(SCALES.edss.score({ edss_pyramidal: "4 — Marked paraparesis or hemiparesis; moderate quadriparesis; or monoplegia", edss_overall: "6" })).toBe(6);
  });

  it("has all 8 real Kurtzke Functional Systems plus the overall grade field", () => {
    const ids = SCALES.edss.fields.map(f => f.id);
    expect(ids).toEqual(expect.arrayContaining(["edss_pyramidal","edss_cerebellar","edss_brainstem","edss_sensory","edss_bowelbladder","edss_visual","edss_cerebral","edss_other","edss_overall"]));
  });
});
