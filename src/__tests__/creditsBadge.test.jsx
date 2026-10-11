// creditsBadge.test.jsx -- "0 credits" + "Get credits" in the header bar of the AI Objective step
// (Aditi, 2026-10-10, from her reference design).
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

const fake = vi.hoisted(() => ({ snap: { state: "ready", balance: 0, unlimited: false, caseAnalyzed: null, freeLeft: null, refresh: () => {} } }));
vi.mock("../aiCredits.js", async () => ({ ...(await vi.importActual("../aiCredits.js")), useAiCredits: () => fake.snap }));

const { default: CreditsBadge } = await import("../CreditsBadge.jsx");
const { default: OrthoOutpatientAssessment } = await import("../OrthoOutpatientAssessment.jsx");
const set = (patch) => { fake.snap = { state: "ready", balance: 0, unlimited: false, caseAnalyzed: null, freeLeft: null, refresh: () => {}, ...patch }; };
beforeEach(() => set({}));

describe("CreditsBadge", () => {
  it("shows 0 credits in red and a Get credits button that opens the box", () => {
    render(<CreditsBadge requireAuth={() => true} />);
    expect(screen.getByTestId("credit-balance").textContent).toMatch(/0 credits/);
    expect(screen.getByTestId("credit-balance").className).toMatch(/empty/);
    fireEvent.click(screen.getByRole("button", { name: "Get credits" }));
    expect(screen.getByRole("dialog", { name: "Get credits" })).toBeInTheDocument();
    expect(screen.getByTestId("credits-sheet-balance").textContent).toBe("You have 0 credits");
  });

  it("says 1 credit, not 1 credits", () => {
    set({ balance: 1 });
    render(<CreditsBadge requireAuth={() => true} />);
    expect(screen.getByTestId("credit-balance").textContent).toMatch(/1 credit$/);
  });

  it("shows Unlimited for an admin and no Get credits button", () => {
    set({ unlimited: true });
    render(<CreditsBadge requireAuth={() => true} />);
    expect(screen.getByTestId("credit-balance").textContent).toMatch(/Unlimited/);
    expect(screen.queryByRole("button", { name: "Get credits" })).toBeNull();
  });

  it("says credits are unavailable when they cannot be read, and still offers Get credits", () => {
    set({ state: "error" });
    render(<CreditsBadge requireAuth={() => true} />);
    expect(screen.getByTestId("credit-balance").textContent).toMatch(/Credits unavailable/);
  });

  it("shows a guest 0 credits, and Get credits asks them to sign in instead of opening the box", () => {
    set({ state: "guest" });
    const requireAuth = vi.fn(() => false);
    render(<CreditsBadge requireAuth={requireAuth} />);
    expect(screen.getByTestId("credit-balance").textContent).toMatch(/0 credits/);
    fireEvent.click(screen.getByRole("button", { name: "Get credits" }));
    expect(requireAuth).toHaveBeenCalledWith("Get credits", expect.any(String));
    expect(screen.queryByRole("dialog", { name: "Get credits" })).toBeNull();
  });

  it("shows nothing where credits are not set up yet, or where a guest cannot be asked to sign in", () => {
    set({ state: "unconfigured" });
    const { container, unmount } = render(<CreditsBadge requireAuth={() => true} />);
    expect(container.textContent).toBe("");
    unmount();
    set({ state: "guest" });
    const second = render(<CreditsBadge />);
    expect(second.container.textContent).toBe("");
  });
});

describe("the Ortho wizard header", () => {
  const renderWizard = (props) => render(
    <OrthoOutpatientAssessment
      selectedRegions={[{ id: "cervical", side: "Right" }]}
      condition="general"
      entryMode="ai"
      initialData={{ demographics: { name: "Test Person", age: "30" } }}
      patientData={{}}
      requireAuth={() => true}
      onSave={vi.fn()}
      onExit={vi.fn()}
      onNav={() => {}}
      {...props}
    />
  );

  it("has the credits on the AI Objective step, next to the title", () => {
    const { container } = renderWizard({ initialStep: "objectiveAI" });
    const bar = container.querySelector(".topbar");
    expect(within(bar).getByTestId("credit-balance")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Get credits" })).toBeInTheDocument();
  });

  it("does not have them on the other steps", () => {
    const { container } = renderWizard({ initialStep: "subjective" });
    expect(within(container.querySelector(".topbar")).queryByTestId("credit-balance")).toBeNull();
  });
});
