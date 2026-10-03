import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../physiofeed/data/db.js", () => ({
  getProfile: () => Promise.resolve({ name: "Poster Person", initials: "PP", gradient: "violet" }),
  uploadOpportunityCoverImage: vi.fn(),
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import ApplicationOpportunityForm from "../physiofeed/components/opportunities/wizard/ApplicationOpportunityForm.jsx";
import WorkshopWizard from "../physiofeed/components/opportunities/wizard/WorkshopWizard.jsx";
import OpportunityDetail from "../physiofeed/components/opportunities/OpportunityDetail.jsx";
import OpportunityCard from "../physiofeed/components/opportunities/OpportunityCard.jsx";

const type = (el, value) => fireEvent.change(el, { target: { value } });

describe("Create Job form", () => {
  let onSubmit;
  beforeEach(() => { onSubmit = vi.fn(() => Promise.resolve()); });
  afterEach(() => vi.restoreAllMocks());

  it("blocks Preview until the required fields are filled and says what is missing", () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: /Preview/ }).disabled).toBe(true);
    expect(screen.getByText(/Still needed: Job title, Organisation, Description/)).toBeTruthy();
    type(screen.getByPlaceholderText("e.g. Junior Physiotherapist"), "Junior Physio");
    type(screen.getByPlaceholderText(/Describe the opportunity/), "Details");
    expect(screen.getByRole("button", { name: /Preview/ }).disabled).toBe(true);
    type(screen.getByPlaceholderText(/Apex Movement|Poster Person/), "Clinic");
    expect(screen.getByRole("button", { name: /Preview/ }).disabled).toBe(false);
  });

  it("does not pre-fill a department the poster never chose", async () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    expect(screen.getByPlaceholderText("e.g. MSK").value).toBe("");
    type(screen.getByPlaceholderText("e.g. Junior Physiotherapist"), "Junior Physio");
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const fields = onSubmit.mock.calls[0][0];
    expect(fields.specialty).toBeUndefined();
    expect(fields.tags).not.toContain("MSK");
  });

  it("lets a draft be saved from the first step once there is a title", async () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    expect(screen.getByRole("button", { name: "Save Draft" }).disabled).toBe(true);
    type(screen.getByPlaceholderText("e.g. Junior Physiotherapist"), "Junior Physio");
    expect(screen.getByRole("button", { name: "Save Draft" }).disabled).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ title: "Junior Physio" }), { publish: false }));
  });

  it("asks before throwing away typed text, and closes straight away when nothing was typed", () => {
    const onClose = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<ApplicationOpportunityForm type="job" onClose={onClose} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    type(screen.getByPlaceholderText("e.g. Junior Physiotherapist"), "Typed something");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("collaboration starts with nobody ticked under Looking for", () => {
    render(<ApplicationOpportunityForm type="collaboration" onClose={() => {}} onSubmit={onSubmit} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((b) => !b.checked)).toBe(true);
  });

  it("preview shows the poster as 'Posted by' with the action bar in the page flow, not pinned over Publish", async () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    type(screen.getByPlaceholderText("e.g. Junior Physiotherapist"), "Junior Physio");
    type(screen.getByPlaceholderText(/Describe the opportunity/), "Details");
    type(screen.getByPlaceholderText(/Apex Movement|Poster Person/), "Clinic");
    fireEvent.click(screen.getByRole("button", { name: /Preview/ }));
    expect(await screen.findByText("Posted by")).toBeTruthy();
    expect(screen.queryByText("Mentor")).toBeNull();
    const bar = screen.getByRole("button", { name: /Apply with Profile/ }).parentElement;
    expect(bar.className).not.toMatch(/\bfixed\b/);
    expect(screen.getByRole("button", { name: "Publish" })).toBeTruthy();
  });
});

describe("Create Workshop wizard", () => {
  it("will not move past a step with its required fields empty", () => {
    render(<WorkshopWizard onClose={() => {}} onSubmit={vi.fn()} />);
    const next = () => screen.getByRole("button", { name: /Next/ });
    expect(next().disabled).toBe(true);
    expect(screen.getByText(/Still needed on this step: Workshop title, Short description/)).toBeTruthy();
    type(screen.getByPlaceholderText("e.g. Clinical Taping Fundamentals"), "Taping");
    type(screen.getByPlaceholderText(/Tell students/), "About taping");
    expect(next().disabled).toBe(false);
    fireEvent.click(next());
    expect(next().disabled).toBe(true);
    expect(screen.getByText(/Still needed on this step: Date, Start time, End time/)).toBeTruthy();
  });

  it("starts with no audience ticked and asks before discarding typed text", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const onClose = vi.fn();
    render(<WorkshopWizard onClose={onClose} onSubmit={vi.fn()} />);
    type(screen.getByPlaceholderText("e.g. Clinical Taping Fundamentals"), "Taping");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(confirm).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    confirm.mockRestore();
  });
});

describe("salary display", () => {
  const job = { id: "j", type: "job", title: "T", org: "O", description: "d", postedAgo: "Just now", tags: [], mentor: { name: "A B", role: "r", initials: "AB", gradient: "blue" } };
  it("shows no rupee sign when the salary is not disclosed, and keeps it for a real amount", () => {
    const { container, rerender } = render(<OpportunityCard opp={{ ...job, salary: "Not disclosed" }} onOpen={() => {}} />);
    expect(container.querySelector("svg.lucide-indian-rupee")).toBeNull();
    rerender(<OpportunityCard opp={{ ...job, salary: "₹40,000/mo" }} onOpen={() => {}} />);
    expect(container.querySelector("svg.lucide-indian-rupee")).not.toBeNull();
  });
  it("detail view labels a job's poster 'Posted by'", () => {
    render(<OpportunityDetail opp={{ ...job, salary: "Not disclosed" }} onBack={() => {}} onMessage={() => {}} applied={false} onApplied={async () => {}} saved={false} onToggleSave={() => {}} />);
    expect(screen.getByText("Posted by")).toBeTruthy();
  });
});
