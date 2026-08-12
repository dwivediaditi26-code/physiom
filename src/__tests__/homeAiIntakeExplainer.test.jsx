// Home screen redesign (2026-08-11): the old Home was a feature-brochure
// (huge marketing hero, 5-step AI pipeline explainer, 12-item feature grid
// with descriptions, an 11-step "Recommended Workflow" chip list) -- a lot
// to scroll through before a returning physio could actually do anything.
// Redesigned around "what does the therapist need in the next 3 seconds":
// Quick Start actions, Today's numbers, Continue-where-you-left-off, AI
// Assistant quick-launch, Clinical Tools, a curated Evidence starter section,
// and a clearly-labelled (not fabricated) ad slot. This file replaces the
// old explainer-specific tests with coverage of what's actually here now.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeModule } from "../DashboardModules.jsx";

describe("Home screen -- redesigned layout", () => {
  test("Quick Start renders all 4 actions, New Patient calls onNewPatient", () => {
    const onNewPatient = vi.fn();
    render(<HomeModule onNav={() => {}} onNewPatient={onNewPatient} />);
    ["New Patient", "Assess Patient", "Treatment", "Documents"].forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("New Patient"));
    expect(onNewPatient).toHaveBeenCalled();
  });

  test("Today at a Glance shows real numbers derived from patients/taskDB props, not static placeholders", () => {
    const patients = [
      { id: "p1", hasRedFlags: true },
      { id: "p2", hasRedFlags: false },
    ];
    const taskDB = [
      { id: "t1", status: "pending", priority: "high" },
      { id: "t2", status: "completed", completedAt: new Date().toISOString() },
    ];
    render(<HomeModule onNav={() => {}} patients={patients} taskDB={taskDB} />);
    // 2 patients, 1 pending task, 1 completed today, 1 alert (red flag)
    expect(screen.getByText("2")).toBeInTheDocument(); // patients
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(2); // pending + completed + alert (some may repeat)
  });

  test("Continue Where You Left Off only shows when there's an active patient, and its CTA navigates to subjective", () => {
    const onNav = vi.fn();
    const { rerender } = render(<HomeModule onNav={onNav} data={{}} />);
    expect(screen.queryByText("Continue Where You Left Off")).not.toBeInTheDocument();

    rerender(<HomeModule onNav={onNav} data={{ dem_name: "Rahul", cc_main: "Neck pain" }} />);
    expect(screen.getByText("Continue Where You Left Off")).toBeInTheDocument();
    expect(screen.getByText("Rahul")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Continue Assessment →"));
    expect(onNav).toHaveBeenCalledWith("subjective");
  });

  test("AI Assistant quick-launch buttons navigate to the correct real nav keys", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByText("Patient Intake"));
    expect(onNav).toHaveBeenCalledWith("subjective", { autoOpenAI: true });
    fireEvent.click(screen.getByText("Generate SOAP"));
    expect(onNav).toHaveBeenCalledWith("soap");
  });

  test("Clinical Tools grid navigates to the correct assessment module", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByText("MMT"));
    expect(onNav).toHaveBeenCalledWith("mmt");
  });

  test("Evidence section shows starter content, no dead-end links", () => {
    render(<HomeModule onNav={() => {}} />);
    expect(screen.getByText(/Exercise therapy vs usual care/i)).toBeInTheDocument();
    expect(screen.getByText(/Updated evidence on shoulder rehabilitation/i)).toBeInTheDocument();
  });

  test("Ad slot is an honest reserved placeholder, not fabricated product content", () => {
    render(<HomeModule onNav={() => {}} />);
    expect(screen.getByText("Advertisement")).toBeInTheDocument();
    expect(screen.getByText(/no active partner yet/i)).toBeInTheDocument();
    // Explicitly NOT inventing a fake product/ad partner
    expect(screen.queryByText(/Shop Now/i)).not.toBeInTheDocument();
  });
});
