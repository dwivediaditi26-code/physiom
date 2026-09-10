// conditionObjectiveAssessment.test.jsx
// Standalone "AI Objective Assessment" page — condition-wise clone of the
// claude.ai artifact, generalized across Cervical/Hip/Knee/Ankle-Foot.
// Confirms: renders only when a supported region is picked, gates its
// content behind the same "🧠 Suggest probable objective assessment"
// button pattern used elsewhere in the app (SubjectiveObjective.jsx),
// resolves the right region's data, shows condition tabs, tapping a chip
// persists via setData, switching condition tabs swaps module content,
// red-flag banners surface for both the Cervical and evidence-model
// shapes, and the ROM grid only renders for the region it belongs to.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");

function Harness({ initialData, selectedRegions }) {
  const [data, setDataRaw] = React.useState(initialData);
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  return <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={selectedRegions} />;
}

function runAnalysis() {
  fireEvent.click(screen.getByRole("button", { name: /Suggest probable objective assessment/ }));
}

describe("ConditionObjectiveAssessment — Cervical", () => {
  it("shows a hint instead of the page when no supported region is selected", () => {
    render(<ConditionObjectiveAssessment data={{}} setData={vi.fn()} selectedRegions={[{ id: "thigh", label: "Thigh" }]} />);
    expect(screen.getByText(/Pick Cervical as a region in Subjective first/i)).toBeInTheDocument();
  });

  it("gates condition content behind the Suggest probable objective assessment button", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    expect(screen.getByRole("button", { name: /Suggest probable objective assessment/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^C01/ })).not.toBeInTheDocument();
    runAnalysis();
    expect(screen.getByRole("button", { name: /^C01/ })).toBeInTheDocument();
  });

  it("after running analysis, renders condition tabs, defaults to C01, and shows the Cervical ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^C01/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^C04 Cervicogenic Headache/ })).toBeInTheDocument();
    expect(screen.getByText("Cervical ROM")).toBeInTheDocument();
  });

  it("tapping an Observation chip persists and switching tabs swaps module content", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    runAnalysis();
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
    runAnalysis();
    expect(screen.getByText(/EMERGENCY — Myelopathy/i)).toBeInTheDocument();
  });

  it("shows the static, authored Findings/Interpretation from the JSON without any tapping (not derived from taps)", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    runAnalysis();
    expect(screen.getByText(/Resisted movements strong & painless/)).toBeInTheDocument();
    expect(screen.getByText(/Rules out a contractile lesion/)).toBeInTheDocument();
    // CPA now supports multiple muscles (array) — C01 has two.
    expect(screen.getByText(/Deep Neck Flexors \(DNF\)/)).toBeInTheDocument();
    expect(screen.getByText(/SCM \/ Scalenes/)).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Thoracic", () => {
  it("resolves the Thoracic region, shows real condition names, and the Thoracic ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "thoracic", label: "Thoracic" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^T01/ })).toBeInTheDocument();
    expect(screen.getByText("Thoracic ROM")).toBeInTheDocument();
    expect(screen.getByText("Localised paraspinal guarding")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Lumbar", () => {
  it("resolves from lumbar/sacrum/pelvis region ids and shows the Lumbar ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "sacrum", label: "Sacrum" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^L01/ })).toBeInTheDocument();
    expect(screen.getByText("Lumbar ROM")).toBeInTheDocument();
    expect(screen.getByText("Muscle guarding")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Shoulder", () => {
  it("resolves the Shoulder region, uses Key Exams (not Required/Recommended), and bridges the engine's SH0x id to the library's S0x content", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "shoulder", label: "Shoulder" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^S01/ })).toBeInTheDocument();
    expect(screen.getByText("Key Exams")).toBeInTheDocument();
    // Proves the SH0x -> S0x name-bridge actually resolved real content,
    // not a blank/default condition.
    expect(screen.getByText("Painful arc on elevation")).toBeInTheDocument();
    expect(screen.getByText("Shoulder ROM")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Hip", () => {
  it("resolves the Hip region, shows Key Exams (not Required/Recommended), and its own Hip ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "hip", label: "Hip" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^H01/ })).toBeInTheDocument();
    expect(screen.getByText("Key Exams")).toBeInTheDocument();
    expect(screen.queryByText("Cervical ROM")).not.toBeInTheDocument();
    expect(screen.getByText("Hip ROM")).toBeInTheDocument();
    expect(screen.getByText("External Rotation")).toBeInTheDocument();
    expect(screen.getAllByText("FADIR test").length).toBeGreaterThan(0);
  });

  it("kinetic-chain-not-applicable condition (adductor-related groin pain) shows the greyed note with no chips", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "hip", label: "Hip" }]} />);
    runAnalysis();
    fireEvent.click(screen.getByRole("button", { name: /H05/i }));
    expect(screen.getByText(/No hip KC test isolates pure adduction/)).toBeInTheDocument();
    expect(screen.queryByText("Chain Effect")).not.toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Knee", () => {
  it("resolves the Knee region from selectedRegions and shows the Knee ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "knee", label: "Knee" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^K01/ })).toBeInTheDocument();
    expect(screen.getAllByText("Lachman's test").length).toBeGreaterThan(0);
    expect(screen.getByText("Knee ROM")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Ankle/Foot", () => {
  it("resolves from either the ankle or the foot region id and shows the Ankle ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "foot", label: "Foot / Toes" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^AF01/ })).toBeInTheDocument();
    expect(screen.getByText("Ankle ROM")).toBeInTheDocument();
    expect(screen.getByText("Dorsiflexion")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Elbow/Wrist/Hand", () => {
  it("resolves from elbow/forearm/wrist/hand region ids, bridges the engine's EL/WR/HD ids to the library's E/W/H ids, and shows the combined ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "elbow", label: "Elbow" }]} />);
    runAnalysis();
    expect(screen.getByRole("button", { name: /^E01/ })).toBeInTheDocument();
    expect(screen.getByText("Key Exams")).toBeInTheDocument();
    expect(screen.getByText("Cozen's test")).toBeInTheDocument();
    expect(screen.getByText("Elbow / Wrist ROM")).toBeInTheDocument();
    expect(screen.getByText("Supination")).toBeInTheDocument();
  });

  it("shows the fracture safety caveat (naText) instead of a blank STTT for the suspected-scaphoid-fracture condition", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "wrist", label: "Wrist" }]} />);
    runAnalysis();
    fireEvent.click(screen.getByRole("button", { name: /^W07/ }));
    expect(screen.getByText(/Do NOT resisted-test.*scaphoid/)).toBeInTheDocument();
  });
});
