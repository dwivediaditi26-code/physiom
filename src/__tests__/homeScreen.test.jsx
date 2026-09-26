// Home screen (HomeModule in DashboardModules.jsx), as redesigned on
// 2026-08-25 (344819b): greeting card, four main tiles (Clinical /
// Assessment / AI Assessment / Posture Analysis), a preview of the newest
// Evidence articles, and a Quick Access row. Replaces the older
// homeAiIntakeExplainer tests, which covered the 2026-08-11 layout
// (Quick Start, Today at a Glance, ad slot) that no longer exists.
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const getEvidence = vi.fn();
vi.mock("../physiofeed/data/db.js", () => ({ getEvidence: (...a) => getEvidence(...a) }));

import { HomeModule } from "../DashboardModules.jsx";

const ARTICLES = [
  { id: "a1", title: "Exercise therapy for knee OA", journal: "BJSM", year: 2025, category: "MSK" },
  { id: "a2", title: "Early mobilisation after stroke", journal: "Stroke", year: 2024 },
  { id: "a3", title: "Rotator cuff tendinopathy guideline", journal: "JOSPT", year: 2025 },
  { id: "a4", title: "An older fourth article", journal: "PTJ", year: 2020 },
];

beforeEach(() => { getEvidence.mockReset(); getEvidence.mockResolvedValue([]); });

describe("Home screen", () => {
  test("the four main tiles go to the right places", () => {
    const onNav = vi.fn();
    const onStartAI = vi.fn();
    render(<HomeModule onNav={onNav} onStartAI={onStartAI} />);
    fireEvent.click(screen.getByTestId("home-tile-clinical"));
    expect(onNav).toHaveBeenLastCalledWith("clinical");
    fireEvent.click(screen.getByTestId("home-tile-assessment"));
    expect(onNav).toHaveBeenLastCalledWith("clinical", { clinicalSubTab: "assessment" });
    fireEvent.click(screen.getByTestId("home-tile-posture"));
    expect(onNav).toHaveBeenLastCalledWith("posture");
    fireEvent.click(screen.getByTestId("home-tile-ai"));
    expect(onStartAI).toHaveBeenCalledTimes(1);
  });

  test("AI Assessment falls back to the Ortho assessment's AI entry when no onStartAI is given", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByTestId("home-tile-ai"));
    expect(onNav).toHaveBeenCalledWith("ortho_new_assessment", { entryMode: "ai" });
  });

  test("Quick Access opens Evidence and Learn", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByRole("button", { name: /^📚 Evidence Latest research/ }));
    expect(onNav).toHaveBeenLastCalledWith("physiofeed", { pfTab: "evidence" });
    fireEvent.click(screen.getByRole("button", { name: /Learn/ }));
    expect(onNav).toHaveBeenLastCalledWith("learn");
  });

  test("greeting uses the signed-in therapist's first name, without doubling 'Dr.'", () => {
    render(<HomeModule onNav={() => {}} currentUser={{ user_metadata: { full_name: "Dr. Chandan Nagar" } }} />);
    expect(screen.getByText(/^Dr\. Chandan/)).toBeInTheDocument();
    expect(screen.queryByText(/Dr\. Dr\./)).not.toBeInTheDocument();
    expect(screen.queryByText(/Aditi/)).not.toBeInTheDocument();
  });

  test("Evidence preview shows the newest three real articles, marks the first NEW, and opens the one tapped", async () => {
    getEvidence.mockResolvedValue(ARTICLES);
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    expect(await screen.findByText("Exercise therapy for knee OA")).toBeInTheDocument();
    expect(screen.getByText("Early mobilisation after stroke")).toBeInTheDocument();
    expect(screen.getByText("Rotator cuff tendinopathy guideline")).toBeInTheDocument();
    expect(screen.queryByText("An older fourth article")).not.toBeInTheDocument();
    expect(screen.getAllByText("NEW")).toHaveLength(1);
    fireEvent.click(screen.getByText("Rotator cuff tendinopathy guideline"));
    expect(onNav).toHaveBeenLastCalledWith("physiofeed", { pfTab: "evidence", pfArticleId: "a3" });
  });

  test("with no evidence yet it says so instead of showing made-up articles", async () => {
    render(<HomeModule onNav={() => {}} />);
    await waitFor(() => expect(getEvidence).toHaveBeenCalled());
    expect(screen.getByText(/No evidence added yet/)).toBeInTheDocument();
  });
});
