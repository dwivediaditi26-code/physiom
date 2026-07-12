// Verifies the AI Patient Intake explainer section on the Home screen --
// added so students opening the app see, at a glance, the full 5-stage
// pipeline (speak/type -> AI extracts -> review -> auto-fill -> analysis)
// before they ever touch the AI Assistant chat, plus a concrete worked
// example rather than an abstract feature blurb.

import { describe, test, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { HomeModule } from "../DashboardModules.jsx";

describe("Home screen -- AI Patient Intake explainer", () => {
  test("renders all 5 pipeline steps in order with clear labels", () => {
    render(<HomeModule onNav={() => {}} />);
    const steps = ["Speak or type", "AI extracts", "You review", "Auto-fills tabs", "Review & Analysis"];
    steps.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  test("shows a concrete worked example, not just abstract steps", () => {
    render(<HomeModule onNav={() => {}} />);
    expect(screen.getByText(/greater tuberosity fracture/i)).toBeInTheDocument();
    expect(screen.getByText(/Region: Shoulder \(R\)/)).toBeInTheDocument();
  });

  test("CTA button navigates to the real AI Assistant nav key", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByText(/Try AI Assistant/i));
    expect(onNav).toHaveBeenCalledWith("ai_assistant");
  });

  test("section doesn't break the rest of Home -- features grid still renders", () => {
    render(<HomeModule onNav={() => {}} />);
    expect(screen.getByText("Subjective Assessment")).toBeInTheDocument();
    expect(screen.getByText("Recommended Assessment Workflow", { exact: false })).toBeInTheDocument();
  });
});
