// shoulderPhase05Persistence.test.jsx
//
// Mirrors lumbarPhase05Persistence.test.jsx / cervicalPhase05Persistence.test.jsx,
// for the new Shoulder Phase 0/0.5 card wired up in this session. Shoulder's
// underlying reasoningEngine was already thoroughly QA'd separately (see
// reasoningEngine_shoulder.test.ts) -- this test file is purely about the UI
// wiring: does clicking "Review & Run Analysis" show the same Phase 0.5 card
// Lumbar/Cervical/Thoracic already show, does it survive a real unmount/
// remount navigation cycle, and does it correctly clear on region deselection.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

function realisticImpingementData(regionKey) {
  return {
    cx_selected_regions: JSON.stringify([regionKey]),
    cc_main: "Pain reaching overhead and lifting things above shoulder height",
    cc_onset: "Insidious, gradual onset",
    st_hawkins: "Positive",
    st_neer: "Positive",
    shl_arc: "60-120 abduction (subacromial / impingement pattern)",
  };
}

function makeStore(initial) {
  let store = { ...initial };
  const set = (patch) => { store = { ...store, ...patch }; };
  return { get: () => store, set };
}

describe("Phase 0/0.5 (Shoulder) -- reuses the existing reasoningEngine, wired into the same UI location as Lumbar/Cervical/Thoracic", () => {
  test("clicking Review & Run Analysis shows Phase 0 + Phase 0.5 cards with the correct top condition", () => {
    const { get, set } = makeStore(realisticImpingementData("Shoulder (L)"));
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    expect(screen.getByText(/Phase 0 — Extracted Clinical Variables/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 0.5 — Shoulder Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/SH01 — Subacromial pain syndrome \(impingement\)/)).toBeInTheDocument();
  });

  test("survives a real unmount/remount navigation cycle without re-clicking Review & Run Analysis", () => {
    const { get, set } = makeStore(realisticImpingementData("Shoulder (R)"));
    const { unmount } = render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Shoulder Condition Matches/)).toBeInTheDocument();

    unmount();
    cleanup();
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);

    expect(screen.getByText(/Phase 0.5 — Shoulder Condition Matches/)).toBeInTheDocument();
    expect(screen.getByText(/Phase 0 — Extracted Clinical Variables/)).toBeInTheDocument();
  });

  test("changing region selection clears the Shoulder Phase 0.5 card (no stale cross-region leftover)", () => {
    const { get } = makeStore(realisticImpingementData("Shoulder (L)"));
    const { unmount } = render(<SubjectiveModule data={get()} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(/Phase 0.5 — Shoulder Condition Matches/)).toBeInTheDocument();

    unmount();
    cleanup();
    const store2 = { ...get(), cx_selected_regions: JSON.stringify([]) };
    render(<SubjectiveModule data={store2} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    expect(screen.queryByText(/Phase 0.5 — Shoulder Condition Matches/)).not.toBeInTheDocument();
  });

  test("Shoulder and Cervical Phase 0/0.5 are independent -- selecting both shows both, neither clears the other", () => {
    const SEP = "|||";
    const shoulderData = realisticImpingementData("Shoulder (L)");
    delete shoulderData.cx_selected_regions;
    const cervicalData = {
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
    const combined = {
      ...shoulderData, ...cervicalData,
      cx_selected_regions: JSON.stringify(["Shoulder (L)", "Cervical (L)"]),
    };
    const { get, set } = makeStore(combined);
    render(<SubjectiveModule data={get()} set={set} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    // Two regions selected -> region-tab UI kicks in (pre-existing behaviour,
    // not specific to this change): only the active tab's region content
    // renders at once. Shoulder (L) is first-selected, so it's the default
    // active tab; switch to the Cervical (L) tab to confirm ITS card also
    // computed correctly and neither region cleared the other's state.
    expect(screen.getByText(/Phase 0.5 — Shoulder Condition Matches/)).toBeInTheDocument();
    // Region name appears both in the sticky region-chip header AND the
    // results-view region tab bar -- the tab bar one is the LAST match.
    const cervicalButtons = screen.getAllByRole("button", { name: /Cervical \(L\)/ });
    fireEvent.click(cervicalButtons[cervicalButtons.length - 1]);
    expect(screen.getByText(/Phase 0.5 — Cervical Condition Matches/)).toBeInTheDocument();
  });

  test("a suggested-test chip with a real nav target is clickable and calls onNav with the right target", () => {
    const { get, set } = makeStore(realisticImpingementData("Shoulder (L)"));
    let navCall = null;
    render(<SubjectiveModule data={get()} set={set} onNav={(...args) => { navCall = args; }} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Review & Run Analysis/));
    fireEvent.click(screen.getByText(/Run analysis/));

    const chip = screen.getAllByText(/Hawkins-Kennedy Test/)[0];
    fireEvent.click(chip);
    expect(navCall).not.toBeNull();
    expect(navCall[0]).toBe("special");
  });
});
