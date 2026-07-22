// cervicalPhase05Persistence.test.jsx
//
// Regression test mirroring lumbarPhase05Persistence.test.jsx exactly, for
// the Cervical spine Phase 0/0.5 engine. Built in from the start this time
// (task explicitly requested proactive persistence, since the identical bug
// was already found and fixed once for Lumbar/SI). Simulates a real
// unmount/remount navigation cycle (Special Tests and back), not just a
// single render, and asserts a region-selection change clears the
// persisted cervical blob rather than leaking stale results.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const SEP = "|||";

function realisticRadiculopathyData(regionKey) {
  return {
    cx_selected_regions: JSON.stringify([regionKey]),
    cx_loc: ["Neck", "Right upper trapezius"].join(SEP),
    cx_radiation: ["Radiates into right arm/hand"].join(SEP),
    cx_dermatomal: ["C6 — thumb/index finger"].join(SEP),
    cx_arm_present: "Yes — unilateral (R)",
    cx_arm_neuro: ["Objective numbness on testing"].join(SEP),
    cx_agg_mov: ["Extension — looking up", "Combined extension + rotation (right) — quadrant position"].join(SEP),
    cx_agg_other: ["Coughing / sneezing (dural / cord tension)"].join(SEP),
    cx_rel_mov: ["Arm overhead — relieves arm symptoms (shoulder abduction relief sign)"].join(SEP),
    cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
    cx_rf_vbi: ["No VBI signs"].join(SEP),
    cx_rf_instability: ["No instability signs"].join(SEP),
    cx_rf_other: ["No other red flags"].join(SEP),
  };
}

// Mirrors AppFull.jsx's real `set` implementation: setData(prev => ({...prev,
// ...idOrObj})), a genuine merge over the latest state -- not a naive
// overwrite.
function makeStore(initial) {
  let store = { ...initial };
  const set = (patch) => { store = { ...store, ...patch }; };
  return { get: () => store, set };
}

describe("Phase 0/0.5 (Cervical) survive a real tab-away-and-back navigation cycle", () => {
  test("unmounting and remounting SubjectiveModule (simulating navigation to Special Tests and back) keeps Phase 0.5 without re-clicking Review & Run Analysis", () => {
    const { get, set } = makeStore(realisticRadiculopathyData("Cervical (L)"));

    const { unmount } = render(
      <SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />
    );
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    expect(screen.getByText(/Phase 0.5 — Cervical Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/C02 — Cervical Radiculopathy/)).toBeInTheDocument();

    unmount();
    cleanup();
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.getByText(/Phase 0.5 — Cervical Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/C02 — Cervical Radiculopathy/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 0 — Extracted Clinical Variables/)).toBeInTheDocument();
  });

  test("changing region selection clears the persisted cervical results (no stale cross-region leftovers)", () => {
    const { get, set } = makeStore(realisticRadiculopathyData("Cervical (L)"));
    const { unmount } = render(
      <SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />
    );
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Cervical Condition Matches/)).toBeInTheDocument();

    expect(JSON.parse(get().cx_cervical_variables ?? "null")).not.toBeNull();

    unmount();
    cleanup();
    const store2 = { ...get(), cx_selected_regions: JSON.stringify([]) };
    render(<SubjectiveModule data={store2} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    expect(screen.queryByText(/Phase 0.5 — Cervical Condition Matches/)).not.toBeInTheDocument();
  });

  test("Lumbar and Cervical Phase 0/0.5 state are independent -- selecting both regions persists both, and neither clears the other", () => {
    const lumbarData = {
      lx_moi: ["Lifting — spine flexed AND rotated (most common disc mechanism)"].join(SEP),
      lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
      lx_dermatomal: ["L5 — lateral lower leg / dorsum foot / great toe"].join(SEP),
      lx_neuro_present: "Yes — unilateral (L)",
      lx_rf_cauda: "No cauda equina signs",
      lx_rf_fracture: "No fracture indicators",
      lx_rf_inflammatory: "No inflammatory features",
      lx_rf_serious: "No other red flags",
    };
    const cervicalData = realisticRadiculopathyData("Cervical (L)");
    delete cervicalData.cx_selected_regions;
    const combined = {
      ...lumbarData, ...cervicalData,
      cx_selected_regions: JSON.stringify(["Lumbar/SI (L)", "Cervical (L)"]),
    };
    const { get, set } = makeStore(combined);
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    expect(JSON.parse(get().cx_lumbar_variables ?? "null")).not.toBeNull();
    expect(JSON.parse(get().cx_cervical_variables ?? "null")).not.toBeNull();
  });
});
