// Every answer in a Functional Movement screen question shows the explanation
// stored at the same position in `clues`. A clue list that is longer or shorter
// than the answer list shifts every explanation under the wrong answer (this
// once showed "Normal — proceed" under "Central lumbar pain" on a clearing
// test, and the wrong text on the headache red-flag screen).
import { describe, it, expect } from "vitest";
import { FUNCTIONAL_SCREEN_DATA } from "../RegionalFunctionalScreens.jsx";

describe("Functional Movement screens: answers and explanations line up", () => {
  const rows = [];
  for (const [region, entry] of Object.entries(FUNCTIONAL_SCREEN_DATA)) {
    for (const test of entry.tests || []) {
      for (const obs of test.observations || []) {
        rows.push({ where: `${region} / ${test.label} / ${obs.q}`, obs });
      }
    }
  }

  it("covers every question", () => {
    expect(rows.length).toBeGreaterThan(300);
  });

  it("has exactly one explanation per answer", () => {
    const bad = rows.filter(({ obs }) => obs.opts.length !== obs.clues.length).map((r) => r.where);
    expect(bad).toEqual([]);
  });

  it("gives clearing-test pain answers an explanation that says FMS = 0, not 'Normal'", () => {
    const clearing = rows.filter(({ obs }) => /^Clearing test/.test(obs.q));
    expect(clearing.length).toBeGreaterThan(0);
    for (const { where, obs } of clearing) {
      obs.opts.forEach((opt, i) => {
        if (opt.startsWith("✗")) expect(obs.clues[i], `${where}: ${opt}`).not.toMatch(/^Normal/);
      });
    }
  });
});
