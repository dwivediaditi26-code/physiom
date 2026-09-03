// 2026-09-03, Aditi: the AI-assisted route's Objective step "has made their
// own info cards -- I want it same as it is normally presented ... ROM should
// be shown the same as it is in the normal outpatient ortho assessment", and
// "MMT after filling, it is showing gray color".
//
// The Suggested Objective step now renders the SAME components the standalone
// ROM/MMT/Special Tests pages render (RomMovementCard, GradeSelect, the
// InfoButton "how to perform" sheet, and the real PalpationSection), rather
// than its own lookalikes. This pins that: if someone re-forks those cards,
// these queries stop matching.
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import OrthoSuggestObjectiveStep from "../OrthoSuggestObjectiveStep.jsx";
import { RomSection, MmtSection } from "../orthoRegionAssessments.jsx";

const selectedRegions = [{ id: "shoulder", side: "Right" }];

function Harness({ Component, ...props }) {
  const [data, setData] = useState({});
  return <Component data={data} setData={setData} selectedRegions={selectedRegions} {...props} />;
}

function renderSuggestStep() {
  return render(
    <Harness
      Component={OrthoSuggestObjectiveStep}
      condition="general"
      activeIds={new Set(["rom", "mmt", "palpation", "suggest"])}
      onToggle={vi.fn()}
      library={[]}
      onJump={vi.fn()}
    />
  );
}

describe("Suggested Objective renders the standalone ROM/MMT presentation", () => {
  it("uses the standalone ROM movement row -- goniometer steppers and the ROM table header", () => {
    const { container } = renderSuggestStep();
    // .rom-card / .rom-table-head / .rom-row are the standalone ROM page's own
    // markup; the old bespoke item card used .obj-item-lr number inputs.
    expect(container.querySelector(".rom-card .rom-table-head")).toBeTruthy();
    expect(container.querySelectorAll(".rom-row").length).toBeGreaterThan(0);
    expect(container.querySelector(".obj-item-lr")).toBeNull();
  });

  it("uses the standalone MMT card -- the MMT scale bar and the colour-coded grade select", () => {
    const { container } = renderSuggestStep();
    expect(screen.getAllByText("MMT SCALE").length).toBeGreaterThan(0);
    const grades = container.querySelectorAll(".movement-card .grade-select");
    expect(grades.length).toBeGreaterThan(0);

    // A filled-in grade colours its own select (gradeColor), instead of
    // staying the flat grey box of the old inline card.
    const first = grades[0];
    expect(first.getAttribute("style") || "").toBe("");
    fireEvent.change(first, { target: { value: "4-" } });
    const after = container.querySelectorAll(".movement-card .grade-select")[0];
    expect(after.getAttribute("style")).toMatch(/color/);
  });

  it("opens the same rich (i) sheet the standalone pages use, with its Perform / Reference / Interpret tabs", () => {
    const { container } = renderSuggestStep();
    const infoBtn = container.querySelector(".movement-card .info-btn");
    expect(infoBtn).toBeTruthy();
    fireEvent.click(infoBtn);
    const sheet = document.querySelector(".sheet-panel");
    expect(sheet).toBeTruthy();
    expect(within(sheet).getAllByText(/Perform/i).length).toBeGreaterThan(0);
    expect(within(sheet).getAllByText(/Interpret/i).length).toBeGreaterThan(0);
  });

  it("renders the real Palpation section (region-wise structures + body map), not a 4-field lookalike", () => {
    renderSuggestStep();
    expect(screen.getByText("Palpation")).toBeTruthy();
    // Region-wise structures, the body map, and the whole-region fields --
    // the bespoke "Palpation findings" inline card is gone.
    expect(screen.getByText(/Body Map/)).toBeTruthy();
    expect(screen.getByText(/General findings/)).toBeTruthy();
    expect(screen.queryByText("Palpation findings")).toBeNull();
  });

  it("renders the same ROM/MMT markup the standalone pages do", () => {
    const { container: suggest } = renderSuggestStep();
    const { container: rom } = render(<Harness Component={RomSection} />);
    const { container: mmt } = render(<Harness Component={MmtSection} />);
    ["rom-card", "rom-row", "rom-row-grid"].forEach((cls) => {
      expect(!!suggest.querySelector(`.${cls}`)).toBe(!!rom.querySelector(`.${cls}`));
    });
    ["movement-card", "movement-lr", "grade-select"].forEach((cls) => {
      expect(!!suggest.querySelector(`.${cls}`)).toBe(!!mmt.querySelector(`.${cls}`));
    });
  });
});
