// Home screen (HomeModule in DashboardModules.jsx), as redesigned on
// 2026-08-25 (344819b): greeting card, four main tiles (Clinical /
// Assessment / AI Assessment / Posture Analysis), a preview card, and a
// Quick Access row. The preview card showed Evidence articles until
// 2026-10-02 (Aditi: "where evidences are shown in home, news should
// shown for now... when people actively put opportunity then it should
// put this") -- it shows News & Updates now; Evidence stays reachable via
// the Quick Access tile. Replaces the older homeAiIntakeExplainer tests,
// which covered the 2026-08-11 layout (Quick Start, Today at a Glance, ad
// slot) that no longer exists.
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const getCareerNews = vi.fn();
vi.mock("../physiofeed/data/db.js", () => ({ getCareerNews: (...a) => getCareerNews(...a) }));

import { HomeModule } from "../DashboardModules.jsx";

const NEWS_ITEMS = [
  { id: "n1", title: "Band 5 Rotational Physiotherapist — Royal Free London", source_name: "NHS Jobs", source_url: "https://www.jobs.nhs.uk/x", deadlineLabel: "Closes 6 Oct" },
  { id: "n2", title: "ELECTROCON 2026 — International Conference on Electrotherapy", source_name: "MIT MIP", source_url: "https://electrocon.mitmip.edu.in/", deadlineLabel: null },
  { id: "n3", title: "RRB Paramedical Recruitment 2026 (CEN 05/2026)", source_name: "Railway Recruitment Board (RRB)", source_url: "https://www.rrbapply.gov.in", deadlineLabel: "Closes 14 Oct" },
  { id: "n4", title: "An older fourth story", source_name: "World Health Organization", source_url: "https://who.int/x", deadlineLabel: null },
];

beforeEach(() => { getCareerNews.mockReset(); getCareerNews.mockResolvedValue([]); });

describe("Home screen", () => {
  test("the four main tiles go to the right places (Posture only for preview accounts)", () => {
    const onNav = vi.fn();
    const onStartAI = vi.fn();
    render(<HomeModule onNav={onNav} onStartAI={onStartAI} showPosture />);
    fireEvent.click(screen.getByTestId("home-tile-clinical"));
    expect(onNav).toHaveBeenLastCalledWith("clinical");
    fireEvent.click(screen.getByTestId("home-tile-assessment"));
    expect(onNav).toHaveBeenLastCalledWith("clinical", { clinicalSubTab: "assessment" });
    fireEvent.click(screen.getByTestId("home-tile-posture"));
    expect(onNav).toHaveBeenLastCalledWith("posture");
    fireEvent.click(screen.getByTestId("home-tile-ai"));
    expect(onStartAI).toHaveBeenCalledTimes(1);
  });

  test("Posture Analysis is not on Home for everyone else (not launched yet)", () => {
    render(<HomeModule onNav={() => {}} />);
    expect(screen.queryByTestId("home-tile-posture")).toBeNull();
    expect(screen.queryByText("Posture Analysis")).toBeNull();
    for (const key of ["clinical", "assessment", "ai"]) expect(screen.getByTestId(`home-tile-${key}`)).toBeTruthy();
  });

  test("AI Assessment falls back to the Ortho assessment's AI entry when no onStartAI is given", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByTestId("home-tile-ai"));
    expect(onNav).toHaveBeenCalledWith("ortho_new_assessment", { entryMode: "ai" });
  });

  test("someone with no name on file is welcomed, not greeted with a made-up name", () => {
    render(<HomeModule onNav={() => {}} currentUser={{ user_metadata: {} }} />);
    expect(screen.queryByText(/Aditi/)).toBeNull();
    expect(screen.getByText(/Welcome/)).toBeTruthy();
  });

  test("the Assessment tile does not promise specialties that are not available yet", () => {
    render(<HomeModule onNav={() => {}} />);
    expect(screen.queryByText(/Pedia/)).toBeNull();
    expect(screen.getByText(/Ortho, Neuro, Cardio/)).toBeTruthy();
  });

  test("Quick Access opens Evidence and Learn", () => {
    const onNav = vi.fn();
    render(<HomeModule onNav={onNav} />);
    fireEvent.click(screen.getByRole("button", { name: /^📚 Evidence Research and papers/ }));
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

  test("News preview shows the newest three real stories, marks the first NEW, and links straight to the source", async () => {
    getCareerNews.mockResolvedValue(NEWS_ITEMS);
    render(<HomeModule onNav={() => {}} />);
    expect(await screen.findByText(/Royal Free London/)).toBeInTheDocument();
    expect(screen.getByText(/ELECTROCON 2026/)).toBeInTheDocument();
    expect(screen.getByText(/RRB Paramedical Recruitment/)).toBeInTheDocument();
    expect(screen.queryByText(/An older fourth story/)).not.toBeInTheDocument();
    expect(screen.getAllByText("NEW")).toHaveLength(1);
    const link = screen.getByText(/RRB Paramedical Recruitment/).closest("a");
    expect(link).toHaveAttribute("href", "https://www.rrbapply.gov.in");
    expect(link).toHaveAttribute("target", "_blank");
  });

  test("with no news yet it says so instead of showing made-up stories", async () => {
    render(<HomeModule onNav={() => {}} />);
    await waitFor(() => expect(getCareerNews).toHaveBeenCalled());
    expect(screen.getByText(/Nothing here yet/)).toBeInTheDocument();
  });
});
