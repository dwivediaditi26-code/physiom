// The scale library behind Outcome Measures (guided form, blank PDF, score history), checked scale by scale.
// Found while testing neuro cases: the Berg Balance Scale, DGI and FAC returned NaN, a rising NIHSS was shown
// as "Improved", and a recorded scale result never reached the neuro summary or the PDF report.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, waitFor, cleanup } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { SCALES } = await import("../sharedClinicalData.js");
const { generateBlankPDF, lowerIsBetter } = await import("../OutcomeMeasuresPro.jsx");
const { outcomeSummaryRows, default: NeurologicalAssessment } = await import("../NeurologicalAssessment.jsx");
const { default: PdfReportsModal } = await import("../PdfReportsModal.jsx");

const lead = (o) => parseFloat(String(o).split(" — ")[0]);
// Answers exactly as the guided form stores them: the whole option text.
const answers = (sc, pick) => Object.fromEntries(sc.fields.filter((f) => f.options.length).map((f) => {
  const ranked = f.options.map((o) => ({ o, n: lead(o) }));
  return [f.id, ranked.reduce((a, b) => (pick(b.n, a.n) ? b : a)).o];
}));
// PSFS is scored from the activity ratings the form copies into psfs_score1..3, so it is checked separately.
const numericScales = Object.values(SCALES).filter((s) => s.id !== "psfs" && s.fields.length && s.fields.every((f) => f.options.length && f.options.every((o) => Number.isFinite(lead(o)))));

describe("every scale scores from the guided form's own answers", () => {
  it.each(numericScales.map((s) => [s.id, s]))("%s gives a real number at both extremes", (_id, sc) => {
    for (const pick of [(a, b) => a > b, (a, b) => a < b]) {
      const score = sc.score(answers(sc, pick));
      expect(Number.isFinite(score), `${sc.id} -> ${score}`).toBe(true);
    }
  });
  it("Berg, DGI and FAC no longer return NaN", () => {
    expect(SCALES.bbs.score(answers(SCALES.bbs, (a, b) => a > b))).toBe(56);
    expect(SCALES.dgi.score(answers(SCALES.dgi, (a, b) => a > b))).toBe(24);
    expect(SCALES.fac.score(answers(SCALES.fac, (a, b) => a > b))).toBe(5);
    expect(SCALES.bbs.score(answers(SCALES.bbs, (a, b) => a < b))).toBe(0);
  });
});

describe("scales added after the neuro case review", () => {
  it("Hughes GBS grade", () => {
    expect(SCALES.hughes.score({ hughes_grade: "3 — Able to walk 10 m across an open space with help (stick, frame or one person)" })).toBe(3);
    expect(SCALES.hughes.interpret(3).label).toMatch(/help to walk/i);
    expect(SCALES.hughes.interpret(5).label).toMatch(/ventilation/i);
  });
  it("GOSE has the eight categories", () => {
    expect(SCALES.gose.fields[0].options).toHaveLength(8);
    expect(SCALES.gose.score({ gose_category: "4 — Upper severe disability: needs help for some daily activities but can be left alone for up to 8 hours" })).toBe(4);
    expect(SCALES.gose.interpret(4).label).toBe("Severe disability");
  });
  it("FSS is the mean of nine items and 4 or more means fatigue", () => {
    const all = (n) => Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`fss_${i + 1}`, String(n)]));
    expect(SCALES.fss.fields).toHaveLength(9);
    expect(SCALES.fss.score(all(4))).toBe(4);
    expect(SCALES.fss.interpret(4).label).toMatch(/Significant/);
    expect(SCALES.fss.interpret(3.9).label).toMatch(/Below/);
    expect(SCALES.fss.score({ fss_1: "7" })).toBeNull();
  });
  it("Motricity Index: three items plus one, 100 when normal", () => {
    const arm = (a, b, c) => ({ mi_arm_pinch: `${a} — x`, mi_arm_elbow: `${b} — x`, mi_arm_shoulder: `${c} — x` });
    expect(SCALES.mi_arm.score(arm(33, 33, 33))).toBe(100);
    expect(SCALES.mi_arm.score(arm(0, 0, 0))).toBe(1);
    expect(SCALES.mi_arm.score(arm(25, 19, 14))).toBe(59);
    expect(SCALES.mi_leg.score({ mi_leg_ankle: "33 — x", mi_leg_knee: "33 — x", mi_leg_hip: "33 — x" })).toBe(100);
  });
});

describe("direction of change", () => {
  it.each([["nihss", true], ["rankin", true], ["hughes", true], ["fss", true], ["odi", true], ["tug", true], ["edss", true], ["bbs", false], ["barthel", false], ["fma", false], ["faam", false], ["mwt10", false], ["gose", false], ["moca", false]])("%s lower-is-better = %s", (id, expected) => {
    expect(lowerIsBetter(SCALES[id])).toBe(expected);
  });
});

describe("blank PDF form", () => {
  it.each(Object.keys(SCALES))("%s prints every question and option", (id) => {
    let html = "";
    window.open = vi.fn(() => ({ document: { write(h) { html = h; }, close() {} }, print() {} }));
    generateBlankPDF(id, "Test Patient");
    expect(html).toContain(SCALES[id].full.replace(/&/g, "&"));
    SCALES[id].fields.forEach((f) => {
      expect(html).toContain(f.label);
      f.options.forEach((o) => expect(html).toContain(o));
      if (!f.options.length) expect(html).toMatch(/Result: _+/);
    });
    expect(html).not.toMatch(/\[object Object\]|undefined|NaN/);
    expect(html).not.toMatch(/MCID = null/);
  });
});

describe("recorded scale results reach the summary and the PDF", () => {
  const neuro = {
    meta: { setting: "inpatient", condition: "stroke" },
    om_history_nihss: JSON.stringify([{ score: 14, date: "2026-10-04T10:00:00Z" }]),
    om_summary_nihss: "NIHSS: 14/42 — Moderate stroke (2026-10-04)",
    om_summary_bbs: "BBS: 31/56 — High fall risk (2026-10-04) · 2 assessments",
  };
  it("outcomeSummaryRows reads the saved lines, and falls back to history for older saves", () => {
    expect(outcomeSummaryRows(neuro)).toEqual([
      { label: "NIHSS", value: "14/42 — Moderate stroke (2026-10-04)" },
      { label: "BBS", value: "31/56 — High fall risk (2026-10-04) · 2 assessments" },
    ]);
    const old = outcomeSummaryRows({ om_history_barthel: JSON.stringify([{ score: 55, date: "2026-09-01T00:00:00Z" }]) });
    expect(old).toEqual([{ label: "BARTHEL", value: "55 (2026-09-01)" }]);
  });
  it("the neuro summary lists them", () => {
    render(<NeurologicalAssessment patientData={{ neuro }} navContext={{ wizardStep: "summary" }} />);
    const text = document.body.textContent;
    expect(text).toMatch(/NIHSS/);
    expect(text).toMatch(/14\/42/);
    expect(text).toMatch(/31\/56/);
    cleanup();
  });
  it("the assessment PDF has an Outcome measures section", async () => {
    let captured = "";
    window.open = vi.fn(() => ({ document: { open() {}, write(h) { captured = h; }, close() {} }, print() {} }));
    window.alert = vi.fn();
    render(<PdfReportsModal data={{ dem_name: "Probe", neuro }} dx={{ dx: [] }} onClose={() => {}} />);
    await waitFor(() => { if (!captured) throw new Error("not yet"); }, { timeout: 5000 });
    expect(captured).toContain("Outcome measures");
    expect(captured).toContain("14/42");
    expect(captured).toContain("31/56");
    expect(captured).not.toContain("om_summary");
    cleanup();
  });
});
