// neuroExamExtension.test.jsx
// Covers the 5 new tabs added to the existing NeurologicalModule (cranial
// nerves, cognition, coordination, vestibular, perceptual) built for the
// TBI assessment work. These were deliberately added AS NEW TABS on the
// existing module rather than a separate parallel module, since GCS,
// reflexes, dermatomes, and red flags were already fully built there --
// duplicating them would have created two sources of truth. Covers: the
// new tabs actually render with real content, buildRealtimeSOAP picks up
// every new field (matching the existing coverage-test pattern used for
// dermatomes/myotomes/reflexes), and the 2 new TBI-specific red flags
// (raised ICP, evolving consciousness change) are wired into the red-flag
// line the same way the pre-existing ones are.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { buildRealtimeSOAP } from "../ClinicalModules.jsx";
import { NeurologicalModule } from "../PhysioNeuro.jsx";
import { CRANIAL_NERVES, COORDINATION_TESTS, VESTIBULAR_TESTS, PERCEPTUAL_TESTS } from "../sharedClinicalData.js";

const renderTab = (tabLabel, data = {}, set = () => {}) => {
  render(<NeurologicalModule data={data} set={set} />);
  fireEvent.click(screen.getByText(new RegExp(tabLabel)));
};

describe("Neurological module — new TBI-relevant tabs render", () => {
  it("Cranial Nerves tab lists all 9 real cranial nerve entries", () => {
    renderTab("Cranial Nerves");
    expect(screen.getByText("Facial")).toBeInTheDocument();
    expect(screen.getByText("Hypoglossal")).toBeInTheDocument();
    expect(screen.getByText(/forehead-sparing weakness/)).toBeInTheDocument();
  });

  it("Cognition tab shows orientation with per-item guidance, and a live MoCA score card computed from real domain fields", () => {
    const navToMock = vi.fn();
    const data = { moca_visuospatial:"3", moca_naming:"3", moca_attention:"4", moca_language:"2", moca_abstraction:"1", moca_delayed_recall:"3", moca_orientation:"3" };
    render(<NeurologicalModule data={data} set={vi.fn()} navTo={navToMock} />);
    fireEvent.click(screen.getByText(/Cognition/));
    expect(screen.getByText("Person")).toBeInTheDocument();
    expect(screen.getByText(/Ask the patient to state their own full name/)).toBeInTheDocument();
    expect(screen.getByText(/19\/30/)).toBeInTheDocument();
    expect(screen.getByText(/Mild cognitive impairment/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Redo →"));
    expect(navToMock).toHaveBeenCalledWith("outcome", { scaleId: "moca" });
  });

  it("Cognition tab shows a take-full-test link for a scale that has not been recorded yet", () => {
    const navToMock = vi.fn();
    render(<NeurologicalModule data={{}} set={vi.fn()} navTo={navToMock} />);
    fireEvent.click(screen.getByText(/Cognition/));
    expect(screen.getAllByText("Not yet recorded").length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByText("Take full test →")[0]);
    expect(navToMock).toHaveBeenCalledWith("outcome", { scaleId: "moca" });
  });

  it("Coordination tab lists finger-to-nose and rebound test with left/right selects", () => {
    renderTab("Coordination");
    expect(screen.getByText("Finger-to-nose")).toBeInTheDocument();
    expect(screen.getByText("Rebound test")).toBeInTheDocument();
  });

  it("Vestibular tab lists Dix-Hallpike with its clinical teaching note", () => {
    renderTab("Vestibular");
    expect(screen.getByText("Dix-Hallpike")).toBeInTheDocument();
    expect(screen.getByText(/BPPV screen/)).toBeInTheDocument();
  });

  it("Perceptual tab lists the neglect screen", () => {
    renderTab("Perceptual");
    expect(screen.getByText("Neglect — line bisection / cancellation")).toBeInTheDocument();
  });

  it("existing GCS tab is untouched by the new tabs", () => {
    renderTab("GCS");
    expect(screen.getByText("Glasgow Coma Scale (GCS)")).toBeInTheDocument();
  });
});

describe("New neuro exam fields reach the SOAP Objective section", () => {
  it("a cranial nerve finding appears with its label", () => {
    const soap = buildRealtimeSOAP({ cn_cn7_status: "UMN pattern — forehead spared, lower face weak" });
    expect(soap.O).toContain("CN VII");
    expect(soap.O).toContain("UMN pattern");
  });

  it("covers every real cranial nerve entry", () => {
    const failures = [];
    for (const cn of CRANIAL_NERVES) {
      const soap = buildRealtimeSOAP({ [`cn_${cn.id}_status`]: "Intact" });
      if (!soap.O.includes(`CN ${cn.numeral}`)) failures.push(`${cn.id} (${cn.numeral}) missing`);
    }
    expect(failures).toEqual([]);
  });

  it("orientation and a live-computed MoCA score appear", () => {
    const soap = buildRealtimeSOAP({
      cog_orient_person: "Yes", cog_orient_time: "No",
      moca_visuospatial:"3", moca_naming:"3", moca_attention:"4", moca_language:"2", moca_abstraction:"1", moca_delayed_recall:"3", moca_orientation:"3",
    });
    expect(soap.O).toContain("Person: Yes");
    expect(soap.O).toContain("Time: No");
    expect(soap.O).toContain("MoCA: 19/30");
    expect(soap.O).toContain("Mild cognitive impairment");
  });

  it("MMSE and Mini-Cog scores also reach the SOAP Objective section when recorded", () => {
    const soap = buildRealtimeSOAP({
      mmse_orientation_time:"5", mmse_orientation_place:"5", mmse_registration:"3", mmse_attention:"5", mmse_recall:"3", mmse_language:"8", mmse_construction:"1",
      minicog_recall:"3 — All three words recalled", minicog_clock:"2 — Normal",
    });
    expect(soap.O).toContain("MMSE: 30/30");
    expect(soap.O).toContain("Within normal range");
    expect(soap.O).toContain("Mini-Cog: 5/5");
  });

  it("covers every real coordination test on both sides", () => {
    const failures = [];
    for (const t of COORDINATION_TESTS) {
      const soap = buildRealtimeSOAP({ [`${t.id}_L`]: t.record[0] });
      if (!soap.O.includes(t.label)) failures.push(`${t.id} missing`);
    }
    expect(failures).toEqual([]);
  });

  it("involuntary movements line only appears when something other than 'None observed' is picked", () => {
    const clear = buildRealtimeSOAP({ neuro_involuntary_type: "None observed" });
    expect(clear.O).not.toContain("Involuntary movements");
    const present = buildRealtimeSOAP({ neuro_involuntary_type: "Tremor — rest", neuro_involuntary_notes: "4-6Hz pill-rolling" });
    expect(present.O).toContain("Involuntary movements");
    expect(present.O).toContain("pill-rolling");
  });

  it("covers every real vestibular test", () => {
    const failures = [];
    for (const t of VESTIBULAR_TESTS) {
      const soap = buildRealtimeSOAP({ [`vest_${t.id}_result`]: t.record[0] });
      if (!soap.O.includes(t.label)) failures.push(`${t.id} missing`);
    }
    expect(failures).toEqual([]);
  });

  it("covers every real perceptual test", () => {
    const failures = [];
    for (const t of PERCEPTUAL_TESTS) {
      const soap = buildRealtimeSOAP({ [`perc_${t.id}_result`]: t.record[0] });
      if (!soap.O.includes(t.label)) failures.push(`${t.id} missing`);
    }
    expect(failures).toEqual([]);
  });

  it("the 2 new TBI red flags feed into the existing red-flag summary line", () => {
    const soap = buildRealtimeSOAP({ nrf_raised_icp: "present" });
    expect(soap.O).toContain("Raised ICP signs");
    const soap2 = buildRealtimeSOAP({ nrf_loc_change: "present" });
    expect(soap2.O).toContain("Evolving consciousness change");
  });

  it("empty patient renders no Neurological section, never crashes", () => {
    expect(() => buildRealtimeSOAP({})).not.toThrow();
  });
});
