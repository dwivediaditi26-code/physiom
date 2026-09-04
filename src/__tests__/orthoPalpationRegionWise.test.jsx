// 2026-09-03, Aditi: "palpation condition wise, which shows tenderness,
// spasm etc in region-specific muscles ... and CPA, kinetic chain,
// functional screen, STTT, fascia like the old 0.5 phase does".
//
// Palpation is now region-wise and structure-by-structure (built off the
// same ANATOMICAL_HOTSPOTS the body map uses), narrowed by the suspected
// condition's own palpation targets; CPA/Kinetic Chain/FMA/STTT render the
// real Phase 0.5-backed sections in the AI Objective step; Fascia exists at
// all for the first time.
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import {
  palpationZonesForRegions,
  palpationFocusZoneIds,
  palpationStructureRows,
  palpStructureKey,
  isPalpationFinding,
} from "../orthoPalpationData.js";
import { PalpationSection } from "../orthoPalpationSection.jsx";
import { FasciaSection, formatFasciaSection } from "../orthoAdvancedTools.jsx";
import OrthoSuggestObjectiveStep from "../OrthoSuggestObjectiveStep.jsx";

function Harness({ Component, initial = {}, ...props }) {
  const [data, setData] = useState(initial);
  return <Component data={data} setData={setData} {...props} />;
}

describe("palpationZonesForRegions", () => {
  it("resolves a region onto its own anatomical zones and their structures", () => {
    const zones = palpationZonesForRegions([{ id: "knee", side: "Right" }]);
    expect(zones.length).toBeGreaterThan(0);
    const patella = zones.find((z) => z.id === "patella_r");
    expect(patella).toBeTruthy();
    // Real structures, not a generic four-field form.
    expect(patella.structures.join(" ").toLowerCase()).toMatch(/patell/);
  });

  it("leads with the case's own side and still offers the other side for comparison", () => {
    const zones = palpationZonesForRegions([{ id: "shoulder", side: "Left" }]);
    expect(zones[0].side).toBe("Left");
    expect(zones.some((z) => z.side === "Right")).toBe(true);
  });

  it("lists a zone shared by two picked regions only once", () => {
    const zones = palpationZonesForRegions([{ id: "lumbar", side: "" }, { id: "hip", side: "Right" }]);
    const ids = zones.map((z) => z.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("si_joint_r");
  });

  it("returns nothing for a region with no mapped zones rather than inventing one", () => {
    expect(palpationZonesForRegions([{ id: "wholeBody", side: "" }])).toEqual([]);
  });
});

describe("condition-wise narrowing", () => {
  it("picks out the zones a condition's own palpation targets name", () => {
    const zones = palpationZonesForRegions([{ id: "knee", side: "Right" }]);
    const focus = palpationFocusZoneIds(["Joint line palpation", "McMurray test"], zones);
    expect(focus.length).toBeGreaterThan(0);
    expect(focus.length).toBeLessThan(zones.length);
  });

  it("narrows to nothing (i.e. shows everything) when a condition names no palpation test", () => {
    const zones = palpationZonesForRegions([{ id: "knee", side: "Right" }]);
    expect(palpationFocusZoneIds(["Lachman's test", "MRI"], zones)).toEqual([]);
  });
});

describe("palpation findings", () => {
  it("counts tenderness, abnormal texture, and abnormal temperature as findings — but not a normal one", () => {
    expect(isPalpationFinding({ tenderness: "2+" })).toBe(true);
    expect(isPalpationFinding({ texture: ["Spasm"] })).toBe(true);
    expect(isPalpationFinding({ temp: "Hot" })).toBe(true);
    expect(isPalpationFinding({ tenderness: "0", texture: ["Normal / soft"], temp: "Normal" })).toBe(false);
    expect(isPalpationFinding({})).toBe(false);
  });

  it("reads back on Review as one row per structure, naming its zone", () => {
    const rows = palpationStructureRows({
      [palpStructureKey("patella_r", "Patellar tendon")]: { tenderness: "2+", texture: ["Thickened / fibrosed"], notes: "inferior pole" },
      [palpStructureKey("patella_r", "Quadriceps tendon")]: {},
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].label).toMatch(/Patella/i);
    expect(rows[0].value).toMatch(/Tenderness 2\+/);
    expect(rows[0].value).toMatch(/Thickened/);
  });
});

describe("PalpationSection", () => {
  const selectedRegions = [{ id: "knee", side: "Right" }];

  it("lists the region's structures with tenderness / texture / temperature, not just four global fields", () => {
    render(<Harness Component={PalpationSection} selectedRegions={selectedRegions} />);
    const structure = screen.getAllByText(/Patellar tendon|Patella —|Quadriceps tendon/i)[0];
    fireEvent.click(structure);
    expect(screen.getByText("Tenderness")).toBeTruthy();
    expect(screen.getByText("Tissue texture")).toBeTruthy();
    expect(screen.getAllByText("Spasm").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Trigger point").length).toBeGreaterThan(0);
  });

  it("records a graded structure into data.palpation.structures", () => {
    let captured = null;
    function Capture() {
      const [data, setData] = useState({});
      captured = data;
      return <PalpationSection data={data} setData={setData} selectedRegions={selectedRegions} />;
    }
    render(<Capture />);
    fireEvent.click(screen.getAllByText(/Patellar tendon|Quadriceps tendon/i)[0]);
    fireEvent.click(screen.getByText("2+ — moderate"));
    expect(Object.values(captured.palpation.structures)[0].tenderness).toBe("2+");
  });

  it("keeps the body map and the whole-region findings available, just no longer as the whole screen", () => {
    render(<Harness Component={PalpationSection} selectedRegions={selectedRegions} />);
    expect(screen.getByText(/Body Map/)).toBeTruthy();
    expect(screen.getByText(/General findings/)).toBeTruthy();
  });

  it("narrows to the condition's zones when given a focus, keeping everything else one condition-switch away", () => {
    const zones = palpationZonesForRegions(selectedRegions);
    const focus = palpationFocusZoneIds(["Joint line palpation"], zones);
    const { container } = render(
      <Harness Component={PalpationSection} selectedRegions={selectedRegions} focusZoneIds={focus} conditionLabel="Meniscal tear" />
    );
    const tabs = container.querySelectorAll(".region-tab");
    expect(tabs.length).toBe(focus.length);
    expect(screen.getByText(/Meniscal tear/)).toBeTruthy();
  });
});

describe("Fascia — new in Ortho, from the Phase 0.5 data", () => {
  it("renders the real fascia tests with their own colour-coded options and shows the chosen option's meaning", () => {
    render(<Harness Component={FasciaSection} />);
    expect(screen.getByText(/Skin Rolling Test/)).toBeTruthy();
    const option = screen.getByText("Free — no restriction anywhere");
    fireEvent.click(option);
    // The option's own clinical meaning from the data, not a bare chip.
    expect(screen.getByText(/Fascial glide normal/)).toBeTruthy();
  });

  it("summarises for Review", () => {
    expect(formatFasciaSection({ screening: { fa_skin_roll: "Free — no restriction anywhere" } })).toEqual([
      { label: "Global Screening — Skin Rolling Test (Kibler Fold)", value: "Free — no restriction anywhere" },
    ]);
  });
});

describe("Suggested Objective renders the Phase 0.5 modules, not its own one-liners", () => {
  function renderStep(activeIds) {
    return render(
      <Harness
        Component={OrthoSuggestObjectiveStep}
        selectedRegions={[{ id: "knee", side: "Right" }]}
        condition="softTissue"
        activeIds={new Set(activeIds)}
        onToggle={vi.fn()}
        library={[]}
        onJump={vi.fn()}
      />
    );
  }

  it("renders CPA, Kinetic Chain, Functional Movement, STTT and Fascia as their real sections", () => {
    renderStep(["cpa", "kineticChain", "fma", "sttt", "fascia"]);
    expect(screen.getByText(/CPA — Compensation Pattern Analysis/)).toBeTruthy();
    expect(screen.getByText("Kinetic Chain")).toBeTruthy();
    expect(screen.getByText("Functional Movement Screen")).toBeTruthy();
    expect(screen.getByText(/STTT — Selective Tissue Tension/)).toBeTruthy();
    expect(screen.getByText("Fascia")).toBeTruthy();
  });

  it("shows region-wise palpation inline, with the region's own structures", () => {
    const { container } = renderStep([]);
    expect(screen.getByText("Palpation")).toBeTruthy();
    const tabs = [...container.querySelectorAll(".region-tab")].map((t) => t.textContent);
    expect(tabs.some((t) => /Patella|Knee/i.test(t))).toBe(true);
  });
});
