// lumbarPhase05Persistence.test.jsx
//
// Regression test for a real bug report: clicking a Phase 0.5 objective-test
// button (e.g. SLR, Slump test) navigates away to the Special Tests module,
// which unmounts SubjectiveModule (each tab in AppFull.jsx only renders its
// active module). Navigating back remounts it fresh. `insight` (the older
// Phase 1 engine) already survives this because runInterpretation() persists
// it into `data.cx_insight` and the component rehydrates from that on mount.
// lumbarVariables/lumbarReasoning (Phase 0 / Phase 0.5, the new L01-L11
// engine) were NEVER persisted this way -- they lived in local useState only,
// so the exact same unmount/remount cycle reset them to null, forcing the
// clinician to re-click "Review & Run Analysis" every time they came back
// from a test module. This test simulates that real navigation cycle
// end-to-end (unmount + remount with the parent's persisted `data`, not just
// a single render) rather than only checking the fix in isolation.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const SEP = "|||";

function realisticRadiculopathyData(regionKey) {
  return {
    cx_selected_regions: JSON.stringify([regionKey]),
    lx_moi: ["Lifting — spine flexed AND rotated (most common disc mechanism)"].join(SEP),
    lx_agg_mov: ["Forward bending (flexion)"].join(SEP),
    lx_agg_post: ["Sitting >30 minutes"].join(SEP),
    lx_agg_act: ["Coughing (discogenic indicator — intradiscal pressure)"].join(SEP),
    lx_rel_mov: ["Extension — McKenzie press-up / cobra"].join(SEP),
    lx_rel_post: ["Walking slowly"].join(SEP),
    lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
    lx_dermatomal: ["L5 — lateral lower leg / dorsum foot / great toe"].join(SEP),
    lx_neuro_present: "Yes — unilateral (L)",
    lx_rf_cauda: "No cauda equina signs",
    lx_rf_fracture: "No fracture indicators",
    lx_rf_inflammatory: "No inflammatory features",
    lx_rf_serious: "No other red flags",
  };
}

// Mirrors AppFull.jsx's real `set` implementation: setData(prev => ({...prev,
// ...idOrObj})), a genuine merge over the latest state -- not a naive
// overwrite. A fake `set` that just replaced the whole object would hide
// exactly the staleness bug this fix has to avoid re-introducing.
function makeStore(initial) {
  let store = { ...initial };
  const set = (patch) => { store = { ...store, ...patch }; };
  return { get: () => store, set };
}

describe("Phase 0/0.5 survive a real tab-away-and-back navigation cycle", () => {
  test("unmounting and remounting SubjectiveModule (simulating navigation to Special Tests and back) keeps Phase 0.5 without re-clicking Review & Run Analysis", () => {
    const { get, set } = makeStore(realisticRadiculopathyData("Lumbar/SI (L)"));

    const { unmount } = render(
      <SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />
    );
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    expect(screen.getByText(/Phase 0.5 — Lumbar Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/L02 — Lumbar Disc Herniation \/ Radiculopathy/)).toBeInTheDocument();

    // Simulate navigating away to the Special Tests module (unmounts this
    // component entirely, same as AppFull.jsx's conditional tab rendering)
    // and back again (remounts with whatever the parent persisted via set()).
    unmount();
    cleanup();
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);

    // Must show up immediately on remount -- no button click here.
    expect(screen.getByText(/Phase 0.5 — Lumbar Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/L02 — Lumbar Disc Herniation \/ Radiculopathy/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 0 — Extracted Clinical Variables/)).toBeInTheDocument();
  });

  test("changing region selection clears the persisted lumbar results (no stale cross-region leftovers)", () => {
    const { get, set } = makeStore(realisticRadiculopathyData("Lumbar/SI (L)"));
    const { unmount } = render(
      <SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />
    );
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Lumbar Condition Matches/)).toBeInTheDocument();

    expect(JSON.parse(get().cx_lumbar_variables ?? "null")).not.toBeNull();

    unmount();
    cleanup();
    // Fresh mount with no region selected -- persisted lumbar data must not
    // leak into a session that never ran analysis on this render.
    const store2 = { ...get(), cx_selected_regions: JSON.stringify([]) };
    render(<SubjectiveModule data={store2} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    expect(screen.queryByText(/Phase 0.5 — Lumbar Condition Matches/)).not.toBeInTheDocument();
  });
});
