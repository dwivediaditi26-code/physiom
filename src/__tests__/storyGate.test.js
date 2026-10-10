// storyGate.test.js -- Aditi's rule (2026-10-10): rank conditions only when there is a story:
//   Chief complaint + (Onset OR Duration) + at least two ⭐ questions answered.
import { describe, it, expect } from "vitest";
import { storyGate, starAnswerCount, MIN_STAR_ANSWERS } from "../storyGate.js";

const CERVICAL = [{ id: "cervical", label: "Cervical" }];
const KNEE = [{ id: "knee", label: "Knee" }];
const ticks = (regionId, answers) => ({ regions: { [regionId]: answers } });

describe("storyGate", () => {
  it("needs two starred answers", () => {
    expect(MIN_STAR_ANSWERS).toBe(2);
  });

  it("nothing at all: all three things are missing", () => {
    const g = storyGate({}, CERVICAL);
    expect(g.ok).toBe(false);
    expect(g.missing).toEqual(["Chief complaint", "Onset or Duration", "2 more ⭐ answers in the region questions (0 of 2)"]);
  });

  it("one tick and no story is not enough (the bug Aditi found)", () => {
    const g = storyGate(ticks("cervical", { location: "Neck" }), CERVICAL);
    expect(g.ok).toBe(false);
    expect(g.missing).toContain("Chief complaint");
    expect(g.missing).toContain("Onset or Duration");
    expect(g.missing.join("|")).toMatch(/1 more ⭐ answer in the region questions \(1 of 2\)/);
  });

  it("Chief complaint + Onset + one starred answer: still one short", () => {
    const g = storyGate({ chiefComplaint: "Neck pain", onset: "Gradual", ...ticks("cervical", { location: "Neck" }) }, CERVICAL);
    expect(g.ok).toBe(false);
    expect(g.missing).toEqual(["1 more ⭐ answer in the region questions (1 of 2)"]);
  });

  it("Chief complaint + Onset + two starred answers: ranking allowed", () => {
    const g = storyGate({ chiefComplaint: "Neck pain", onset: "Gradual", ...ticks("cervical", { location: "Neck", radiation: "Radiates into right arm/hand" }) }, CERVICAL);
    expect(g.ok).toBe(true);
    expect(g.missing).toEqual([]);
  });

  it("Duration works instead of Onset", () => {
    const g = storyGate({ chiefComplaint: "Neck pain", duration: "3 weeks", ...ticks("cervical", { location: "Neck", radiation: "Radiates into right arm/hand" }) }, CERVICAL);
    expect(g.ok).toBe(true);
  });

  it("Onset or Duration without a Chief complaint is not a story", () => {
    const g = storyGate({ onset: "Sudden", duration: "2 days", ...ticks("cervical", { location: "Neck", radiation: "Radiates into right arm/hand" }) }, CERVICAL);
    expect(g.ok).toBe(false);
    expect(g.missing).toEqual(["Chief complaint"]);
  });

  it("blank spaces do not count as a Chief complaint", () => {
    expect(storyGate({ chiefComplaint: "   ", onset: "Sudden" }, CERVICAL).hasChief).toBe(false);
  });

  it("an empty multi-select does not count as answered, and two options in ONE question count once", () => {
    expect(starAnswerCount(ticks("cervical", { location: [] }), CERVICAL)).toBe(0);
    expect(starAnswerCount(ticks("cervical", { location: "Neck, Right upper trapezius" }), CERVICAL)).toBe(1);
  });

  it("a question without a star (Knee: Relieving factor) does not count", () => {
    expect(starAnswerCount(ticks("knee", { relieving: "Rest" }), KNEE)).toBe(0);
    expect(starAnswerCount(ticks("knee", { relieving: "Rest", mechanism: "Direct blow", givingWay: "No" }), KNEE)).toBe(2);
  });

  it("answers typed into another region do not count for this one", () => {
    expect(starAnswerCount(ticks("knee", { mechanism: "Direct blow", givingWay: "No" }), CERVICAL)).toBe(0);
  });
});
