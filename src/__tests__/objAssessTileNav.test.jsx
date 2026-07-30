// The Phase 0.5 objective-assessment tiles (Fascia / Functional / Outcome …)
// must NOT hand onNav a null context. Previously btn.ctx was null, so
// navTo(key, null) set navContext=null and the target module (FasciaSection,
// FMASection, OutcomeMeasuresPro) crashed on navContext.<x> — the whole app
// showed "Something went wrong". This locks in that the tile passes {}.
import React from "react";
import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
const SEP = "|||";

test("clicking an objective-assessment tile never passes a null nav context", () => {
  const onNav = vi.fn();
  const data = {
    cx_selected_regions: JSON.stringify(["Hip/Groin (L)"]), cc_main: "left hip groin pain",
    hp_loc: ["Anterior hip / groin"].join(SEP), hp_moi: ["Insidious onset"].join(SEP),
    hp_agg_mov: ["Deep squat"].join(SEP), hp_rf: "No red flags",
  };
  render(<SubjectiveModule data={data} set={() => {}} onNav={onNav} onTabChange={() => {}} />);
  fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
  fireEvent.click(screen.getByText(/Run analysis/));
  // Click every "open module" nav button in the objective-assessment tiles.
  const opens = screen.getAllByText(/OPEN|→/i);
  opens.slice(0, 8).forEach((el) => fireEvent.click(el.closest("button") || el));
  expect(onNav).toHaveBeenCalled();
  for (const call of onNav.mock.calls) {
    // second arg (context) must never be null
    expect(call[1]).not.toBeNull();
  }
});
