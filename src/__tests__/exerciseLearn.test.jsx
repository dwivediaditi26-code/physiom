// Exercise Learn: a student library built only from the app's own exercise data (EXERCISE_DB).
// It must show every exercise exactly once, never invent content, and say so when a section has
// no data (references).
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
import ExerciseStudy from "../physiofeed/learn/ExerciseStudy.jsx";
import { EXERCISE_DB } from "../sharedClinicalData.js";
import {
  EXERCISE_GROUPS, allExercises, regionList, searchExercises, filterExercises, evidenceTier,
} from "../physiofeed/learn/exerciseLearnData.js";

afterEach(cleanup);

describe("exercise data", () => {
  it("includes every exercise of EXERCISE_DB once, with unique ids", () => {
    const expected = Object.values(EXERCISE_DB).reduce((n, r) => n + Object.values(r.categories).reduce((m, l) => m + l.length, 0), 0);
    const all = allExercises();
    expect(all.length).toBe(expected);
    expect(new Set(all.map((e) => e.id)).size).toBe(expected);
  });
  it("puts every region in exactly one of the four shortcut groups", () => {
    const grouped = EXERCISE_GROUPS.flatMap((g) => g.regions);
    expect(new Set(grouped).size).toBe(grouped.length);
    expect([...grouped].sort()).toEqual(Object.keys(EXERCISE_DB).sort());
  });
  it("reads the level from the start of the evidence label", () => {
    expect(evidenceTier("Strongest — gold standard")).toBe("Strongest");
    expect(evidenceTier("Strong")).toBe("Strong");
    expect(evidenceTier("Moderate — timing is genuinely debated")).toBe("Moderate");
    expect(evidenceTier("Weak-Moderate — feasibility-level evidence only")).toBe("Weak");
    expect(evidenceTier("")).toBe("");
  });
  it("searches name, target and description, and filters by phase and level", () => {
    const all = allExercises();
    const knee = all.filter((e) => e.regionKey === "knee");
    expect(searchExercises(knee, "extension").length).toBeGreaterThan(0);
    expect(searchExercises(all, "zzzz-no-such").length).toBe(0);
    const p1 = filterExercises(knee, { phase: "Phase 1" });
    expect(p1.length).toBeGreaterThan(0);
    expect(p1.every((e) => e.phase === "Phase 1")).toBe(true);
    expect(filterExercises(all, { tier: "Strong" }).every((e) => e.tier === "Strong")).toBe(true);
  });
});

describe("Exercise Learn screens", () => {
  it("home shows search, the four groups and a card for every region", () => {
    render(<ExerciseStudy onBack={() => {}} />);
    expect(screen.getByText("Exercise Learn")).toBeTruthy();
    expect(screen.getByText("Learn • Practice • Apply")).toBeTruthy();
    expect(screen.getByLabelText(/Search exercises/i)).toBeTruthy();
    for (const g of EXERCISE_GROUPS) expect(screen.getByTestId(`exercise-group-${g.key}`)).toBeTruthy();
    for (const r of regionList()) expect(screen.getByTestId(`exercise-region-${r.key}`)).toBeTruthy();
  });

  it("opens a region list, filters by category, and opens an exercise's detail", () => {
    render(<ExerciseStudy onBack={() => {}} />);
    fireEvent.click(screen.getByTestId("exercise-region-knee"));
    const kneeCount = allExercises().filter((e) => e.regionKey === "knee").length;
    expect(screen.getByTestId("exercise-list-count").textContent).toBe(`${kneeCount} of ${kneeCount} exercises`);
    fireEvent.click(screen.getByRole("button", { name: "Hamstrings" }));
    const ham = allExercises().filter((e) => e.regionKey === "knee" && e.category === "Hamstrings").length;
    expect(screen.getByTestId("exercise-list-count").textContent).toBe(`${ham} of ${kneeCount} exercises`);

    const ex = allExercises().find((e) => e.regionKey === "knee" && e.category === "Hamstrings");
    fireEvent.click(screen.getByTestId(`exercise-card-${ex.id}`));
    expect(screen.getByRole("heading", { name: ex.name })).toBeTruthy();
    expect(screen.getByText("Dosage")).toBeTruthy();
    expect(screen.getByText(/not one dose for every patient/i)).toBeTruthy();
    // sections the library has no data for are not shown, and nothing is invented
    for (const missing of ["Precautions", "Common errors", "Regression", "Primary muscles"]) expect(screen.queryByText(missing)).toBeNull();
    expect(screen.getByTestId("exercise-no-refs").textContent).toBe("No evidence references added yet.");
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByTestId("exercise-list-count")).toBeTruthy();
  });

  it("searches across every region from the home page and says when nothing matches", () => {
    render(<ExerciseStudy onBack={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Search exercises/i), { target: { value: "extension" } });
    expect(Number(screen.getByTestId("exercise-search-count").textContent.split(" ")[0])).toBe(searchExercises(allExercises(), "extension").length);
    fireEvent.change(screen.getByLabelText(/Search exercises/i), { target: { value: "zzzz-no-such" } });
    expect(screen.getByTestId("exercise-empty")).toBeTruthy();
  });

  it("the Strongest-or-Strong collection lists only those levels", () => {
    render(<ExerciseStudy onBack={() => {}} />);
    fireEvent.click(screen.getByTestId("exercise-collection-evidence"));
    const want = allExercises().filter((e) => e.tier === "Strongest" || e.tier === "Strong").length;
    expect(screen.getByTestId("exercise-list-count").textContent).toBe(`${want} of ${want} exercises`);
  });

  it("back from the home page leaves Exercise Learn", () => {
    const onBack = vi.fn();
    render(<ExerciseStudy onBack={onBack} />);
    fireEvent.click(screen.getByLabelText("Back to Learn"));
    expect(onBack).toHaveBeenCalled();
  });
});
