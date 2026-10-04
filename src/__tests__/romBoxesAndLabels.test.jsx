// romBoxesAndLabels.test.jsx
// Three points from the first-time walkthrough (2026-10-02/03):
//  - every ROM box showed 45 (the normal value), which looks like something a person entered;
//    the boxes now start empty with the normal value as a faint hint, and typing, the arrows
//    and "Normal -- document" all still work.
//  - step-bar labels were cut off ("Demograp...", "General Observatic...").
//  - Home tile descriptions were 9-11 px light grey.
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { RomMovementCard } = await import("../orthoRegionAssessments.jsx");
const { Stepper, stepBarLabel } = await import("../orthoFieldKit.jsx");
const { HomeModule } = await import("../DashboardModules.jsx");

describe("ROM boxes start empty with the normal value as a faint hint", () => {
  function Card({ initial = {}, onSet }) {
    const [val, setVal] = useState(initial);
    const m = { id: "flex", mv: "Flexion", normal: 45, unit: "°", bilateral: true, plane: "Sagittal" };
    return (
      <RomMovementCard m={m} val={val} norm="Sagittal · N=45°" onSetVal={(id, side, v) => { onSet?.(side, v); setVal((p) => ({ ...p, [side]: v })); }} onSetMeta={() => {}} region="cervical" />
    );
  }

  it("shows empty boxes whose placeholder is the normal value", () => {
    const { container } = render(<Card />);
    const boxes = container.querySelectorAll("input.stepper-input");
    expect(boxes).toHaveLength(2);
    boxes.forEach((b) => {
      expect(b.value).toBe("");
      expect(b.getAttribute("placeholder")).toBe("45");
    });
  });

  it("lets the person type a value straight in", () => {
    const onSet = vi.fn();
    const { container } = render(<Card onSet={onSet} />);
    const [left] = container.querySelectorAll("input.stepper-input");
    fireEvent.change(left, { target: { value: "38" } });
    expect(onSet).toHaveBeenCalledWith("left", "38");
    expect(left.value).toBe("38");
  });

  it("starts the arrows from the normal value when the box is empty", () => {
    const onSet = vi.fn();
    const { container } = render(<Card onSet={onSet} />);
    const [firstArrowBlock] = container.querySelectorAll(".stepper-arrows");
    fireEvent.click(within(firstArrowBlock).getByLabelText("Increase"));
    expect(onSet).toHaveBeenCalledWith("left", "46");
  });

  it("records the normal value for both sides with the Normal button", () => {
    const onSet = vi.fn();
    render(<Card onSet={onSet} />);
    fireEvent.click(screen.getByRole("button", { name: /Normal — document N=45/ }));
    expect(onSet).toHaveBeenCalledWith("left", 45);
    expect(onSet).toHaveBeenCalledWith("right", 45);
  });

  it("a plain Stepper still shows -- when it has no hint", () => {
    const { container } = render(<Stepper value="" onChange={() => {}} />);
    expect(container.querySelector("input").getAttribute("placeholder")).toBe("--");
  });
});

describe("step-bar labels", () => {
  it("shortens the labels that were being cut off, and leaves the rest alone", () => {
    expect(stepBarLabel("Demographics")).toBe("Patient");
    expect(stepBarLabel("General Observation")).toBe("Observe");
    expect(stepBarLabel("Red Flag Screen")).toBe("Red Flag Screen");
    expect(stepBarLabel("ROM")).toBe("ROM");
  });
});

describe("Home tile descriptions are readable", () => {
  it("are at least 11px and no longer the light grey", () => {
    render(<HomeModule onNav={() => {}} patients={[]} data={{}} taskDB={[]} currentUser={{ id: "u1", user_metadata: { full_name: "Meera" } }} />);
    const desc = screen.getByText("Patients and treatment");
    expect(parseFloat(desc.style.fontSize)).toBeGreaterThanOrEqual(11);
    expect(desc.style.color).not.toBe("rgb(154, 154, 162)");
  });
});
