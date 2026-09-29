// strokeScales.test.js
// Covers the two scales added for stroke patients: Brunnstrom Recovery
// Stages (staged separately per limb since arm/hand/leg often recover at
// different rates) and the Modified Rankin Scale (global disability, 0-6,
// widely used and non-copyrighted). Both live in SCALES and are used by the
// Outcome Measures screen.
import { describe, it, expect } from "vitest";
import { SCALES } from "../sharedClinicalData.js";

describe("Brunnstrom Recovery Stages scale", () => {
  it("sums arm, hand, and leg stages", () => {
    const v = { brunnstrom_arm: "4 — IV. Spasticity declining; some movement combinations outside basic synergy are mastered", brunnstrom_hand: "3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy", brunnstrom_leg: "5 — V. Spasticity continues to decline; more complex movement combinations independent of synergy" };
    expect(SCALES.brunnstrom.score(v)).toBe(12);
  });

  it("returns null unless all three segments are staged (partial data isn't a valid combined score)", () => {
    expect(SCALES.brunnstrom.score({ brunnstrom_arm: "3 — III. Spasticity peaks; voluntary control of movement synergies present, cannot move outside synergy" })).toBeNull();
  });

  it("interprets a low average as severe and a high average as near-full recovery", () => {
    expect(SCALES.brunnstrom.interpret(3).label).toContain("Severe");
    expect(SCALES.brunnstrom.interpret(18).label).toContain("Near-full recovery");
  });
});

describe("Modified Rankin Scale", () => {
  it("scores the selected grade directly", () => {
    expect(SCALES.rankin.score({ rankin_grade: "3 — Moderate disability; requires some help, but able to walk unassisted" })).toBe(3);
  });

  it("interprets grade 1 as no significant disability and grade 6 as death", () => {
    expect(SCALES.rankin.interpret(1).label).toBe("No significant disability");
    expect(SCALES.rankin.interpret(6).label).toBe("Death");
  });
});
