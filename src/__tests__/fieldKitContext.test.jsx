import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FieldKitContext, TextField, SelectField, ScaleField, SectionIntro, StepNav, LRGrid, NumberField, useSectionData } from "../orthoFieldKit.jsx";

// One field kit for Ortho, Neuro and Cardio. Ortho uses the defaults; Neuro and
// Cardio set their own look through FieldKitContext (see orthoFieldKit.jsx).
const withKit = (kit, ui) => render(<FieldKitContext.Provider value={kit}>{ui}</FieldKitContext.Provider>);
const LONG = ["a1", "a2", "a3", "a4", "a5", "a6", "b7", "b8"];

describe("shared field kit — defaults (Ortho)", () => {
  it("shows the plain how-to button and the 'Select ⌄' list button", () => {
    render(<SelectField label="Onset" options={LONG} value="" onChange={() => {}} howTo="Ask when it started" />);
    expect(screen.getByText("Select ⌄")).toBeTruthy();
    expect(document.querySelector(".info-btn")).not.toBeNull();
  });
  it("has no search box in long lists", () => {
    render(<SelectField label="Onset" options={LONG} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Select ⌄"));
    expect(document.querySelector(".popover-search")).toBeNull();
  });
  it("uses the title row section header and wrapped step icons", () => {
    render(<SectionIntro title="Pain" info="How to" />);
    expect(document.querySelector(".section-intro-title-row")).not.toBeNull();
    render(<StepNav steps={[{ id: "a", label: "Pain", icon: "P" }]} currentIndex={0} visited={new Set()} onJump={() => {}} onAddClick={() => {}} />);
    expect(document.querySelector(".step-circle-icon")).not.toBeNull();
    expect(screen.getByTitle("Add assessment")).toBeTruthy();
  });
  it("ScaleField steps by 1", () => {
    render(<ScaleField label="Pain" value="" onChange={() => {}} />);
    expect(document.querySelector('input[type="range"]').getAttribute("step")).toBe("1");
  });
});

describe("shared field kit — Neuro / Cardio settings", () => {
  it("renderInfo shows the module's own info card for `info`, renderHowTo its how-to button", () => {
    withKit({ renderInfo: (d) => <span>card:{d.title}</span>, renderHowTo: (t) => <span>howto:{t}</span> }, (
      <>
        <TextField label="Tone" value="" onChange={() => {}} info={{ title: "MAS" }} />
        <TextField label="Gait" value="" onChange={() => {}} howTo="Watch them walk" />
      </>
    ));
    expect(screen.getByText("card:MAS")).toBeTruthy();
    expect(screen.getByText("howto:Watch them walk")).toBeTruthy();
  });
  it("compactSelect + searchSelects give the ▾ button and a search box that filters", () => {
    withKit({ compactSelect: true, searchSelects: true }, <SelectField label="Onset" options={LONG} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByLabelText("Choose from list"));
    const search = document.querySelector(".popover-search");
    expect(search).not.toBeNull();
    fireEvent.change(search, { target: { value: "b" } });
    expect(screen.queryByText("a1")).toBeNull();
    expect(screen.getByText("b7")).toBeTruthy();
  });
  it("short lists get no search box even when search is on", () => {
    withKit({ searchSelects: true }, <SelectField label="Side" options={["Left", "Right"]} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByText("Select ⌄"));
    expect(document.querySelector(".popover-search")).toBeNull();
  });
  it("scaleStep sets the slider step (Cardio's half points)", () => {
    withKit({ scaleStep: 0.5 }, <ScaleField label="Borg" value="" onChange={() => {}} />);
    expect(document.querySelector('input[type="range"]').getAttribute("step")).toBe("0.5");
  });
  it("classicLayout uses the plain section title and unwrapped step icons", () => {
    withKit({ classicLayout: true, addStepLabel: "Add a neuro assessment" }, (
      <>
        <SectionIntro title="Sensory" />
        <StepNav steps={[{ id: "a", label: "Sensory", icon: "S" }]} currentIndex={0} visited={new Set()} onJump={() => {}} onAddClick={() => {}} />
      </>
    ));
    expect(document.querySelector(".section-intro-title").textContent).toBe("Sensory");
    expect(document.querySelector(".section-intro-title-row")).toBeNull();
    expect(document.querySelector(".step-circle-icon")).toBeNull();
    expect(screen.getByTitle("Add a neuro assessment")).toBeTruthy();
  });
  it("LRGrid shows the module's info card after the row name", () => {
    withKit({ renderInfo: (d) => <span>card:{d.title}</span> }, (
      <LRGrid label="DTR" rows={["Biceps"]} options={["2+"]} value={{}} onChange={() => {}} rowInfo={{ Biceps: { title: "Biceps reflex" } }} />
    ));
    expect(screen.getByText("card:Biceps reflex")).toBeTruthy();
  });
  it("NumberField without a label renders no empty label row", () => {
    render(<NumberField value="" onChange={() => {}} unit="bpm" />);
    expect(document.querySelector(".vital-label-row")).toBeNull();
  });
});

describe("useSectionData", () => {
  it("setMany merges several fields in one update", () => {
    let state = { vitals: { hr: "70" } };
    const setData = (fn) => { state = fn(state); };
    function Probe() {
      const [, , setMany] = useSectionData(state, setData, "vitals");
      return <button onClick={() => setMany({ bp: "120/80", rr: "16" })}>go</button>;
    }
    render(<Probe />);
    fireEvent.click(screen.getByText("go"));
    expect(state.vitals).toEqual({ hr: "70", bp: "120/80", rr: "16" });
  });
});
