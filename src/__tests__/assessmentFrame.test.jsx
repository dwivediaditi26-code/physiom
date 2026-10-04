import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AddAssessmentModal } from "../assessmentFrame.jsx";
import { formatPainSection } from "../orthoWizardHelpers.js";

// One "+ Add" popup for Ortho, Neuro and Cardio.
const GROUPS = [
  { key: "Motor", title: "MOTOR", items: [{ id: "m1", label: "Tone" }, { id: "m2", label: "Power" }] },
  { key: "Sensory", title: "SENSORY", items: [{ id: "s1", label: "Light touch" }] },
];

describe("AddAssessmentModal", () => {
  it("shows ticks for steps already added and passes the tapped item and its group", () => {
    const onToggle = vi.fn();
    render(<AddAssessmentModal title="Add" groups={GROUPS} isChecked={(id) => id === "m1"} onToggle={onToggle} onClose={() => {}} />);
    expect(screen.getByText("Tone").previousSibling.textContent).toBe("☑");
    expect(screen.getByText("Power").previousSibling.textContent).toBe("☐");
    fireEvent.click(screen.getByText("Light touch"));
    expect(onToggle).toHaveBeenCalledWith(GROUPS[1].items[0], GROUPS[1]);
  });

  it("search filters items; hideEmptyGroups drops groups with no match", () => {
    const { rerender } = render(<AddAssessmentModal title="Add" groups={GROUPS} isChecked={() => false} onToggle={() => {}} onClose={() => {}} />);
    fireEvent.change(document.querySelector(".ct-search"), { target: { value: "touch" } });
    expect(screen.queryByText("Tone")).toBeNull();
    expect(screen.getByText("MOTOR")).toBeTruthy();
    rerender(<AddAssessmentModal title="Add" groups={GROUPS} isChecked={() => false} onToggle={() => {}} onClose={() => {}} hideEmptyGroups />);
    expect(screen.queryByText("MOTOR")).toBeNull();
    expect(screen.getByText("Light touch")).toBeTruthy();
  });

  it("shows the item icon before the label (Ortho) and Done closes", () => {
    const onClose = vi.fn();
    render(<AddAssessmentModal title="Add" groups={[{ key: "a", title: "AVAILABLE", items: [{ id: "gait", label: "Gait", icon: "🚶" }] }]} isChecked={() => false} onToggle={() => {}} onClose={onClose} />);
    expect(screen.getByText("🚶 Gait")).toBeTruthy();
    fireEvent.click(screen.getByText("Done"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("formatPainSection", () => {
  it("uses readable labels and skips internal fields", () => {
    const rows = formatPainSection({ nrs_now: 6, __touched: true, aggravating: "Stairs" });
    expect(rows.some((r) => r.label === "nrs_now")).toBe(false);
    expect(rows.some((r) => r.label.startsWith("__"))).toBe(false);
    expect(rows.find((r) => r.value === "Stairs")).toBeTruthy();
    expect(rows).toHaveLength(2);
  });
});
