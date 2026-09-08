// conditionObjectiveAssessment.test.jsx
// Standalone "AI Objective Assessment" page — condition-wise clone of the
// claude.ai artifact, generalized across Cervical/Hip/Knee/Ankle-Foot.
// Confirms: renders only when a supported region is picked, resolves the
// right region's data, shows condition tabs, tapping a chip persists via
// setData, switching condition tabs swaps module content, red-flag banners
// surface for both the Cervical and evidence-model shapes, and the ROM
// grid only renders for Cervical (Hip/Knee/Ankle-Foot have none).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");

function Harness({ initialData, selectedRegions }) {
  const [data, setDataRaw] = React.useState(initialData);
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  return <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={selectedRegions} />;
}

describe("ConditionObjectiveAssessment — Cervical", () => {
  it("shows a hint instead of the page when no supported region is selected", () => {
    render(<ConditionObjectiveAssessment data={{}} setData={vi.fn()} selectedRegions={[{ id: "shoulder", label: "Shoulder" }]} />);
    expect(screen.getByText(/Pick Cervical as a region in Subjective first/i)).toBeInTheDocument();
  });

  it("renders condition tabs, defaults to C01, and shows the Cervical ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    expect(screen.getByRole("button", { name: /^C01/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^C04 Cervicogenic Headache/ })).toBeInTheDocument();
    expect(screen.getByText("Cervical ROM")).toBeInTheDocument();
  });

  it("tapping an Observation chip persists and switching tabs swaps module content", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    const chip = screen.getByRole("button", { name: "Localised guarding" });
    fireEvent.click(chip);
    expect(chip).toHaveStyle({ color: "#6D28D9" });
    fireEvent.click(screen.getByRole("button", { name: /C04 Cervicogenic Headache/i }));
    expect(screen.getByText("Unilateral suboccipital tenderness")).toBeInTheDocument();
    expect(screen.queryByText("Localised guarding")).not.toBeInTheDocument();
  });

  it("surfaces the real red-flag override banner when Subjective data triggers it", () => {
    const data = { subjective: { regions: { cervical: { redFlagsMyelopathy: "Bilateral hand symptoms (grip clumsiness / numbness)" } } } };
    render(<Harness initialData={data} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    expect(screen.getByText(/EMERGENCY — Myelopathy/i)).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Hip", () => {
  it("resolves the Hip region, shows Key Exams (not Required/Recommended), and its own Hip ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "hip", label: "Hip" }]} />);
    expect(screen.getByRole("button", { name: /^HP01/ })).toBeInTheDocument();
    expect(screen.getByText("Key Exams")).toBeInTheDocument();
    expect(screen.queryByText("Cervical ROM")).not.toBeInTheDocument();
    expect(screen.getByText("Hip ROM")).toBeInTheDocument();
    expect(screen.getByText("External Rotation")).toBeInTheDocument();
    expect(screen.getAllByText("FADIR test").length).toBeGreaterThan(0);
  });

  it("kinetic-chain-not-applicable condition (adductor-related groin pain) shows the greyed note with no chips", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "hip", label: "Hip" }]} />);
    fireEvent.click(screen.getByRole("button", { name: /HP05/i }));
    expect(screen.getByText(/No hip kinetic-chain test in this app's library isolates pure adduction/)).toBeInTheDocument();
    expect(screen.queryByText("Chain Effect")).not.toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Knee", () => {
  it("resolves the Knee region from selectedRegions and shows the Knee ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "knee", label: "Knee" }]} />);
    expect(screen.getByRole("button", { name: /^KN01/ })).toBeInTheDocument();
    expect(screen.getAllByText("Lachman's test").length).toBeGreaterThan(0);
    expect(screen.getByText("Knee ROM")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Ankle/Foot", () => {
  it("resolves from either the ankle or the foot region id, combining AK/FT conditions, and shows the Ankle ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "foot", label: "Foot / Toes" }]} />);
    expect(screen.getByRole("button", { name: /^AK01/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^FT01/ })).toBeInTheDocument();
    expect(screen.getByText("Ankle ROM")).toBeInTheDocument();
    expect(screen.getByText("Dorsiflexion")).toBeInTheDocument();
  });
});
