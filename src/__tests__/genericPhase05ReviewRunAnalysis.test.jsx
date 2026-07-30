// Regression: the generic Phase 0.5 block guard + runGenericPhase05 call must
// resolve the laterality-suffixed selection label (e.g. "Hip/Groin (L)") to its
// family key ("Hip / Groin") — otherwise hip / ankle-foot / elbow-wrist-hand
// silently never render their condition matches after Review & Run Analysis.
import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SubjectiveModule } from "../SubjectiveObjective.jsx";
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
const SEP = "|||";

const CASES = [
  { key: "Hip/Groin (L)", cc: "left hip groin pain", fields: { hp_loc:["Anterior hip / groin"], hp_moi:["Insidious onset"], hp_agg_mov:["Deep squat"], hp_rf:"No red flags" }, heading: /condition matches/i },
  { key: "Ankle/Foot (L)", cc: "left ankle sprain", fields: { af_loc:["Lateral ankle"], af_moi:["Inversion sprain"], af_agg_mov:["Weight-bearing"], af_rf:"No red flags" }, heading: /condition matches/i },
  { key: "Elbow (L)", cc: "left elbow lateral pain", fields: { ew_loc:["Lateral elbow"], ew_moi:["Repetitive overuse"], ew_agg_mov:["Gripping"], ew_rf:"No red flags" }, heading: /condition matches/i },
];

describe("Generic Phase 0.5 renders for laterality-suffixed families", () => {
  test.each(CASES)("$key renders its Phase 0.5 block without crashing", ({ key, cc, fields, heading }) => {
    const data = { cx_selected_regions: JSON.stringify([key]), cc_main: cc };
    for (const [k, v] of Object.entries(fields)) data[k] = Array.isArray(v) ? v.join(SEP) : v;
    render(<SubjectiveModule data={data} set={() => {}} onNav={() => {}} onTabChange={() => {}} />);
    fireEvent.click(screen.getByText(/Suggest probable objective assessment/));
    fireEvent.click(screen.getByText(/Run analysis/));
    expect(screen.getByText(heading)).toBeInTheDocument();
  });
});
