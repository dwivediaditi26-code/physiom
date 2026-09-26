// conditionObjectiveAssessment.test.jsx
// Standalone "AI Objective Assessment" page — condition-wise, across every
// supported region. Confirms: renders only when a supported region is
// picked, shows its content straight away (the old "🧠 Suggest probable
// objective assessment" gate was removed in b57da03, 2026-09-13), resolves
// the right region's data, shows condition tabs, marking a finding card
// persists, switching condition tabs swaps content, red-flag banners
// surface, and the ROM grid only renders for the region it belongs to.
//
// Since 2026-09-11 the page shows one topic at a time (Pain / Observation /
// Palpation / ROM / MMT / Special tests / CPA / Kinetic chain / Functional /
// STTT / Outcome measures), picked from a row of tabs -- openTopic() taps
// one. The "Key Exams" / Required / Recommended block was taken off this
// page on 2026-09-12 (its data is kept for a future screen).
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const { default: ConditionObjectiveAssessment } = await import("../ConditionObjectiveAssessment.jsx");

// Tap one of the topic tabs (e.g. "ROM", "Special tests").
function openTopic(label) {
  const tab = [...document.querySelectorAll(".obj-subtopic-tab")].find((b) => b.textContent.startsWith(label));
  fireEvent.click(tab);
}

function Harness({ initialData, selectedRegions }) {
  const [data, setDataRaw] = React.useState(initialData);
  const setData = (updater) => setDataRaw((prev) => (typeof updater === "function" ? updater(prev) : { ...prev, ...updater }));
  return <ConditionObjectiveAssessment data={data} setData={setData} selectedRegions={selectedRegions} />;
}

describe("ConditionObjectiveAssessment — Cervical", () => {
  it("shows a hint instead of the page when no supported region is selected", () => {
    render(<ConditionObjectiveAssessment data={{}} setData={vi.fn()} selectedRegions={[{ id: "thigh", label: "Thigh" }]} />);
    expect(screen.getByText(/Pick Cervical as a region in Subjective first/i)).toBeInTheDocument();
  });

  it("shows condition content straight away -- no Suggest button to tap first", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    expect(screen.queryByRole("button", { name: /Suggest probable objective assessment/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^C01/ })).toBeInTheDocument();
  });

  it("renders condition tabs, defaults to C01, and shows the Cervical ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    expect(screen.getByRole("button", { name: /^C01/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^C04 Cervicogenic Headache/ })).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.getByText("Cervical ROM")).toBeInTheDocument();
  });

  it("marking an Observation finding persists and switching condition tabs swaps the content", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    openTopic("Observation");
    const card = screen.getByRole("button", { name: /Localised guarding/ });
    expect(within(card).getByText("Unmarked")).toBeInTheDocument();
    fireEvent.click(card);
    expect(within(screen.getByRole("button", { name: /Localised guarding/ })).getByText("Positive")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /C04 Cervicogenic Headache/i }));
    openTopic("Observation");
    expect(screen.queryByText("Localised guarding")).not.toBeInTheDocument();
  });

  it("surfaces the real red-flag override banner when Subjective data triggers it", () => {
    const data = { subjective: { regions: { cervical: { redFlagsMyelopathy: "Bilateral hand symptoms (grip clumsiness / numbness)" } } } };
    render(<Harness initialData={data} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    expect(screen.getByText(/EMERGENCY — Myelopathy/i)).toBeInTheDocument();
  });

  it("shows the authored CPA muscles for C01 without any tapping of findings", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "cervical", label: "Cervical" }]} />);
    openTopic("CPA / NKT");
    // CPA supports multiple muscles (array) — C01 has two.
    expect(screen.getByText(/Deep Neck Flexors \(DNF\)/)).toBeInTheDocument();
    expect(screen.getByText(/SCM \/ Scalenes/)).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Thoracic", () => {
  it("resolves the Thoracic region, shows real condition names, and the Thoracic ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "thoracic", label: "Thoracic" }]} />);
    expect(screen.getByRole("button", { name: /^T01/ })).toBeInTheDocument();
    openTopic("Observation");
    expect(screen.getByText("Localised paraspinal guarding")).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.getByText("Thoracic ROM")).toBeInTheDocument();
  });

  it("shows the static, authored STTT findings from the library where there is no resisted-test grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "thoracic", label: "Thoracic" }]} />);
    openTopic("STTT / Cyriax");
    expect(screen.getByText(/Resisted trunk rotation\/side-flexion — painless/)).toBeInTheDocument();
    expect(screen.getByText("Clinical Interpretation")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Lumbar", () => {
  it("resolves from lumbar/sacrum/pelvis region ids and shows the Lumbar ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "sacrum", label: "Sacrum" }]} />);
    expect(screen.getByRole("button", { name: /^L01/ })).toBeInTheDocument();
    openTopic("Observation");
    expect(screen.getByText("Muscle guarding")).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.getByText("Lumbar ROM")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Shoulder", () => {
  it("resolves the Shoulder region and bridges the engine's SH0x id to the library's S0x content", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "shoulder", label: "Shoulder" }]} />);
    expect(screen.getByRole("button", { name: /^S01/ })).toBeInTheDocument();
    // Proves the SH0x -> S0x name-bridge actually resolved real content,
    // not a blank/default condition.
    openTopic("Observation");
    expect(screen.getByText("Painful arc on elevation")).toBeInTheDocument();
    openTopic("Special tests");
    expect(screen.getByText("Hawkins-Kennedy Test")).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.getByText("Shoulder ROM")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Hip", () => {
  it("resolves the Hip region and shows its own Hip ROM grid and special tests", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "hip", label: "Hip" }]} />);
    expect(screen.getByRole("button", { name: /^H01/ })).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.queryByText("Cervical ROM")).not.toBeInTheDocument();
    expect(screen.getByText("Hip ROM")).toBeInTheDocument();
    expect(screen.getByText("External Rotation")).toBeInTheDocument();
    openTopic("Special tests");
    expect(screen.getAllByText("FADIR test").length).toBeGreaterThan(0);
  });

  it("kinetic-chain-not-applicable condition (adductor-related groin pain) shows the greyed note with no chips", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "hip", label: "Hip" }]} />);
    fireEvent.click(screen.getByRole("button", { name: /H05/i }));
    openTopic("Kinetic chain");
    // Collapsed by default when not applicable -- tap its header to open.
    fireEvent.click(screen.getAllByText("Kinetic Chain").at(-1));
    expect(screen.getByText(/No hip KC test isolates pure adduction/)).toBeInTheDocument();
    expect(screen.queryByText("Chain Effect")).not.toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Knee", () => {
  it("resolves the Knee region from selectedRegions and shows the Knee ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "knee", label: "Knee" }]} />);
    expect(screen.getByRole("button", { name: /^K01/ })).toBeInTheDocument();
    openTopic("Special tests");
    expect(screen.getAllByText("Lachman's test").length).toBeGreaterThan(0);
    openTopic("ROM");
    expect(screen.getByText("Knee ROM")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Ankle/Foot", () => {
  it("resolves from either the ankle or the foot region id and shows the Ankle ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "foot", label: "Foot / Toes" }]} />);
    expect(screen.getByRole("button", { name: /^AF01/ })).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.getByText("Ankle ROM")).toBeInTheDocument();
    expect(screen.getByText("Dorsiflexion")).toBeInTheDocument();
  });
});

describe("ConditionObjectiveAssessment — Elbow/Wrist/Hand", () => {
  it("resolves from elbow/forearm/wrist/hand region ids, bridges the engine's EL/WR/HD ids to the library's E/W/H ids, and shows the combined ROM grid", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "elbow", label: "Elbow" }]} />);
    expect(screen.getByRole("button", { name: /^E01/ })).toBeInTheDocument();
    openTopic("Special tests");
    expect(screen.getByText("Cozen's Test")).toBeInTheDocument();
    openTopic("ROM");
    expect(screen.getByText("Elbow / Wrist ROM")).toBeInTheDocument();
    expect(screen.getByText("Supination")).toBeInTheDocument();
  });

  it("shows the fracture safety caveat (naText) on STTT for the suspected-scaphoid-fracture condition", () => {
    render(<Harness initialData={{}} selectedRegions={[{ id: "wrist", label: "Wrist" }]} />);
    fireEvent.click(screen.getByRole("button", { name: /^W07/ }));
    openTopic("STTT / Cyriax");
    expect(screen.getByText(/Do NOT resisted-test.*scaphoid/)).toBeInTheDocument();
  });
});
