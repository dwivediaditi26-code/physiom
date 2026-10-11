// carePlanReviewSection.test.js -- 2026-10-11, Aditi: "Problem list ... exercise prescription, goal list ... not showing in
// the final review of the AI assessment". The Care Plan block used to print nothing unless the Problem List had an entry.
import { describe, it, expect } from "vitest";
import { formatCarePlanSection } from "../NeuroCarePlan.jsx";

const exercise = { id: "t1", exerciseId: "cx_chin_tuck", name: "Chin Tucks", category: "Strengthening", sets: 3, reps: 10, hold: 5, freq: "Daily", goalIds: [] };

describe("Care Plan in Final Review", () => {
  it("shows exercises added from the library even when there is no problem or goal", () => {
    const { groups } = formatCarePlanSection({ treatments: [exercise] });
    const treatment = groups.find((g) => g.heading === "Treatment");
    expect(treatment.rows).toEqual([{ label: "Chin Tucks", value: "3 × 10 • hold 5s • Daily" }]);
    // only the block that has something in it is printed
    expect(groups.map((g) => g.heading)).toEqual(["Treatment"]);
  });

  it("shows goals when there is no problem list", () => {
    const { groups } = formatCarePlanSection({ goals: [{ id: "g1", measure: "Neck pain NRS", term: "short", weeks: 4, baseline: "7", target: "3", problemId: "" }] });
    expect(groups.map((g) => g.heading)).toEqual(["Goals"]);
    expect(groups[0].rows).toEqual([{ label: "Neck pain NRS (STG, 4w)", value: "7 → 3" }]);
  });

  it("prints a full plan: problems, goals and treatment with its dose and the goal it serves", () => {
    const { groups } = formatCarePlanSection({
      problems: [{ id: "p1", name: "Neck pain", findings: [{ label: "NRS", value: "7" }] }],
      goals: [{ id: "g1", measure: "Neck pain NRS", term: "long", weeks: 8, baseline: "7", target: "2", problemId: "p1" }],
      treatments: [{ ...exercise, goalIds: ["g1"] }],
    });
    expect(groups.map((g) => g.heading)).toEqual(["Problem List", "Goals", "Treatment"]);
    expect(groups[0].rows).toEqual([{ label: "1. Neck pain", value: "NRS: 7" }]);
    expect(groups[1].rows).toEqual([{ label: "Neck pain NRS (LTG, 8w)", value: "7 → 2 — Neck pain" }]);
    expect(groups[2].rows).toEqual([{ label: "Chin Tucks", value: "3 × 10 • hold 5s • Daily — Goal: Neck pain NRS" }]);
  });

  it("prints nothing for an empty plan", () => {
    expect(formatCarePlanSection({})).toEqual({ groups: [] });
  });
});
