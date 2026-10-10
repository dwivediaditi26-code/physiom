// chiefComplaintChips.test.jsx -- Knee: what the clinician types in Chief complaint / Onset / Duration is understood, and tapping a
// "We understood" chip ticks the answer in the Knee checklist (the answers the AI Objective Assessment ranks from).
// Aditi (2026-10-10): the ranking must not ignore the story. Only Knee has been checked on how a clinician writes ("the patient", "they").
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");

// the first test loads the Knee matcher (a lazy chunk), which can take a few seconds on a busy machine
vi.setConfig({ testTimeout: 30000 });

const KNEE = [{ id: "knee", label: "Knee" }];

function Harness({ regions }) {
  const [data, setData] = useState({});
  return (
    <>
      <SubjectiveSection data={data} setData={setData} selectedRegions={regions} setSelectedRegions={() => {}} regionLabelOf={(r) => r.label} requireAuth={() => true} />
      <pre data-testid="knee-state">{JSON.stringify(data.subjective?.regions?.knee || {})}</pre>
    </>
  );
}
const chiefBox = () => screen.getByPlaceholderText("In the patient's own words...");
const type = (el, v) => fireEvent.change(el, { target: { value: v } });
const chipTexts = () => screen.getAllByRole("button").filter((b) => b.className.includes("understood-chip")).map((b) => b.textContent);

describe("Knee: chips under Chief complaint / Onset / Duration", () => {
  it("a clinician-voice story offers the matching answers, and tapping one ticks it in the Knee checklist", async () => {
    render(<Harness regions={KNEE} />);
    expect(screen.queryByTestId("chief-complaint-chips")).toBeNull();
    type(chiefBox(), "They twisted on a planted foot and the knee gave way. It swelled up straight away.");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Non-contact twisting/), { timeout: 15000 });
    const texts = chipTexts().join("|");
    expect(texts).toMatch(/Immediate marked swelling/);
    fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent.includes("Non-contact twisting")));
    expect(screen.getByTestId("knee-state").textContent).toMatch(/Non-contact twisting/);
    // a tapped chip disappears at once
    expect(chipTexts().join("|")).not.toMatch(/Non-contact twisting/);
  });

  it("Hinglish and Hindi are understood too", async () => {
    render(<Harness regions={KNEE} />);
    type(chiefBox(), "Khelte waqt ghutna mud gaya aur turant sujan aa gayi.");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Non-contact twisting/), { timeout: 15000 });
    type(chiefBox(), "खेलते समय घुटना मुड़ गया और तुरंत सूजन आ गई।");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Immediate marked swelling/), { timeout: 15000 });
  });

  it("the Duration box is read as part of the story", async () => {
    render(<Harness regions={KNEE} />);
    type(screen.getByPlaceholderText("e.g. 3 weeks"), "Pain started after the patient increased weekly mileage");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Insidious \/ overuse/), { timeout: 15000 });
  });

  it("stays quiet for a sentence that says nothing the Knee checklist asks", async () => {
    render(<Harness regions={KNEE} />);
    type(chiefBox(), "Referred by the GP for physiotherapy.");
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByTestId("understood-chips")).toBeNull();
  });

  it("Hip works the same way", async () => {
    render(<Harness regions={[{ id: "hip", label: "Hip" }]} />);
    type(chiefBox(), "Deep anterior hip pain on sitting for long periods, worse getting out of the car.");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Getting out of a car/), { timeout: 15000 });
    expect(chipTexts().join("|")).toMatch(/Prolonged sitting/);
  });

  it("Ankle / Foot works the same way", async () => {
    render(<Harness regions={[{ id: "ankle", label: "Ankle" }]} />);
    type(chiefBox(), "The patient rolled the ankle inwards on uneven ground, heel pain on the first steps in the morning.");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Inversion sprain/), { timeout: 15000 });
    expect(chipTexts().join("|")).toMatch(/First steps in the morning/);
  });

  it("with several regions picked, only the regions that understood something get a heading", async () => {
    render(<Harness regions={[{ id: "hip", label: "Hip" }, { id: "knee", label: "Knee" }, { id: "ankle", label: "Ankle" }]} />);
    type(chiefBox(), "Deep anterior hip pain on sitting for long periods. They also rolled the ankle inwards, outer ankle swollen.");
    await waitFor(() => expect(chipTexts().join("|")).toMatch(/Inversion sprain/), { timeout: 15000 });
    const titles = [...document.querySelectorAll(".understood-title")].map((t) => t.textContent);
    expect(titles.some((t) => /^Hip — We understood/.test(t))).toBe(true);
    expect(titles.some((t) => /^Ankle — We understood/.test(t))).toBe(true);
    expect(titles.some((t) => /^Knee/.test(t))).toBe(false); // Knee understood nothing: no empty heading
    expect([...document.querySelectorAll(".understood-title")].every((t) => /We understood/.test(t.textContent))).toBe(true);
  });

  it("other regions do not show these chips yet", async () => {
    render(<Harness regions={[{ id: "shoulder", label: "Shoulder" }]} />);
    type(chiefBox(), "They twisted on a planted foot and the knee gave way.");
    await new Promise((r) => setTimeout(r, 700));
    expect(screen.queryByTestId("chief-complaint-chips")).toBeNull();
  });
});
