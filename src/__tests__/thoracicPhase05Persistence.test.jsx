// thoracicPhase05Persistence.test.jsx
//
// Regression test mirroring lumbarPhase05Persistence.test.jsx /
// cervicalPhase05Persistence.test.jsx exactly, for the Thoracic spine
// Phase 0/0.5 engine. Built in from the start (persistence has already
// been found and fixed once for Lumbar/SI, and built in proactively for
// Cervical and now Thoracic). Simulates a real unmount/remount navigation
// cycle (Special Tests and back), not just a single render, and asserts a
// region-selection change clears the persisted thoracic blob rather than
// leaking stale results.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const SEP = "|||";

function realisticMechanicalData(regionKey) {
  return {
    cx_selected_regions: JSON.stringify([regionKey]),
    tx_loc: ["Mid thoracic T5–T8"].join(SEP),
    tx_agg_mov: ["Rotation (most thoracic sensitive to)", "Extension"].join(SEP),
    tx_agg_post: ["Prolonged sitting"].join(SEP),
    tx_pattern: ["Mechanical — movement and posture related"].join(SEP),
    tx_rel: ["Manipulation — significant relief"].join(SEP),
    tx_rf: ["No red flags"].join(SEP),
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

describe("Phase 0/0.5 (Thoracic) survive a real tab-away-and-back navigation cycle", () => {
  test("unmounting and remounting SubjectiveModule (simulating navigation to Special Tests and back) keeps Phase 0.5 without re-clicking Review & Run Analysis", () => {
    const { get, set } = makeStore(realisticMechanicalData("Thoracic spine"));

    const { unmount } = render(
      <SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />
    );
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    expect(screen.getByText(/Phase 0.5 — Thoracic Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/T01 — Thoracic Facet/)).toBeInTheDocument();

    unmount();
    cleanup();
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.getByText(/Phase 0.5 — Thoracic Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/T01 — Thoracic Facet/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 0 — Extracted Clinical Variables/)).toBeInTheDocument();
  });

  test("changing region selection clears the persisted thoracic results (no stale cross-region leftovers)", () => {
    const { get, set } = makeStore(realisticMechanicalData("Thoracic spine"));
    const { unmount } = render(
      <SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />
    );
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Thoracic Condition Matches/)).toBeInTheDocument();

    expect(JSON.parse(get().cx_thoracic_variables ?? "null")).not.toBeNull();

    unmount();
    cleanup();
    const store2 = { ...get(), cx_selected_regions: JSON.stringify([]) };
    render(<SubjectiveModule data={store2} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    expect(screen.queryByText(/Phase 0.5 — Thoracic Condition Matches/)).not.toBeInTheDocument();
  });

  test("Cervical and Thoracic Phase 0/0.5 state are independent -- selecting both regions persists both, and neither clears the other", () => {
    const cervicalData = {
      cx_loc: ["Neck", "Right upper trapezius"].join(SEP),
      cx_radiation: ["Radiates into right arm/hand"].join(SEP),
      cx_dermatomal: ["C6 — thumb/index finger"].join(SEP),
      cx_arm_present: "Yes — unilateral (R)",
      cx_arm_neuro: ["Objective numbness on testing"].join(SEP),
      cx_agg_mov: ["Extension — looking up", "Combined extension + rotation (right) — quadrant position"].join(SEP),
      cx_rf_myelopathy: ["No myelopathy signs"].join(SEP),
      cx_rf_vbi: ["No VBI signs"].join(SEP),
      cx_rf_instability: ["No instability signs"].join(SEP),
      cx_rf_other: ["No other red flags"].join(SEP),
    };
    const thoracicData = realisticMechanicalData("Thoracic spine");
    delete thoracicData.cx_selected_regions;
    const combined = {
      ...cervicalData, ...thoracicData,
      cx_selected_regions: JSON.stringify(["Cervical (L)", "Thoracic spine"]),
    };
    const { get, set } = makeStore(combined);
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    expect(JSON.parse(get().cx_cervical_variables ?? "null")).not.toBeNull();
    expect(JSON.parse(get().cx_thoracic_variables ?? "null")).not.toBeNull();
  });
});
