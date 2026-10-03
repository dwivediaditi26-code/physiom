import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let profilePromise = null;
vi.mock("../physiofeed/data/db.js", () => ({
  getProfile: () => profilePromise || Promise.resolve({ name: "Poster Person", initials: "PP", gradient: "violet" }),
  uploadOpportunityCoverImage: vi.fn(),
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import ApplicationOpportunityForm from "../physiofeed/components/opportunities/wizard/ApplicationOpportunityForm.jsx";
import WorkshopWizard from "../physiofeed/components/opportunities/wizard/WorkshopWizard.jsx";
import OpportunityDetail from "../physiofeed/components/opportunities/OpportunityDetail.jsx";
import OpportunityCard from "../physiofeed/components/opportunities/OpportunityCard.jsx";

const type = (el, value) => fireEvent.change(el, { target: { value } });
const profileLoaded = () => waitFor(() => expect(screen.queryByText("Loading your profile…")).toBeNull());

describe("Create Job form", () => {
  let onSubmit;
  beforeEach(() => { profilePromise = null; onSubmit = vi.fn(() => Promise.resolve()); });
  afterEach(() => vi.restoreAllMocks());

  it("blocks Preview until the required fields are filled and says what is missing", async () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    await profileLoaded();
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
    await profileLoaded();
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
    await profileLoaded();
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

  it("cannot be published or saved as a draft before the poster's profile has loaded", async () => {
    let resolveProfile;
    profilePromise = new Promise((res) => { resolveProfile = res; });
    render(<ApplicationOpportunityForm type="collaboration" onClose={() => {}} onSubmit={onSubmit} />);
    type(screen.getByPlaceholderText("e.g. Physiotherapy Research Collaboration"), "Co-author wanted");
    expect(screen.getByText("Loading your profile…")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save Draft" }).disabled).toBe(true);
    expect(screen.getByRole("button", { name: /Preview/ }).disabled).toBe(true);
    resolveProfile({ name: "Dr. Aditi", initials: "DA", gradient: "violet" });
    await profileLoaded();
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].org).toBe("Dr. Aditi");
    expect(onSubmit.mock.calls[0][0].mentor.name).toBe("Dr. Aditi");
  });

  it("writes salary and stipend with thousands separators", async () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    await profileLoaded();
    type(screen.getByPlaceholderText("e.g. Junior Physiotherapist"), "Junior Physio");
    type(screen.getByPlaceholderText(/Apex Movement|Poster Person/), "Clinic");
    type(screen.getByPlaceholderText(/Describe the opportunity/), "Details");
    fireEvent.click(screen.getByRole("button", { name: "Range" }));
    const [min, max] = screen.getAllByRole("textbox").filter((i) => i.inputMode === "numeric");
    type(min, "20000"); type(max, "30000");
    fireEvent.click(screen.getByRole("button", { name: /Preview/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Publish" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].salary).toBe("₹20,000 – ₹30,000/mo");
  });

  it("collaboration starts with nobody ticked under Looking for", () => {
    render(<ApplicationOpportunityForm type="collaboration" onClose={() => {}} onSubmit={onSubmit} />);
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes.length).toBeGreaterThan(0);
    expect(boxes.every((b) => !b.checked)).toBe(true);
  });

  it("preview shows the poster as 'Posted by' with the action bar in the page flow, not pinned over Publish", async () => {
    render(<ApplicationOpportunityForm type="job" onClose={() => {}} onSubmit={onSubmit} />);
    await profileLoaded();
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
  beforeEach(() => { profilePromise = null; });

  it("will not accept an end time before the start time", () => {
    render(<WorkshopWizard onClose={() => {}} onSubmit={vi.fn()} />);
    type(screen.getByPlaceholderText("e.g. Clinical Taping Fundamentals"), "Taping");
    type(screen.getByPlaceholderText(/Tell students/), "About taping");
    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    const date = document.querySelector("input[type=date]");
    type(date, "2026-11-20");
    const [start, end] = document.querySelectorAll("input[type=time]");
    type(start, "10:00"); type(end, "09:00");
    expect(screen.getByRole("button", { name: /Next/ }).disabled).toBe(true);
    expect(screen.getByText(/End time must be after the start time/)).toBeTruthy();
    type(end, "12:00");
    expect(screen.getByRole("button", { name: /Next/ }).disabled).toBe(false);
  });

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

describe("poster's own listing", () => {
  const mine = { id: "m", type: "job", title: "T", org: "O", description: "d", postedAgo: "Just now", tags: [], postedByMe: true, salary: "Not disclosed", mentor: { name: "A B", role: "r", initials: "AB", gradient: "blue" } };
  it("shows 'This is your listing' instead of Message / Apply", () => {
    render(<OpportunityDetail opp={mine} onBack={() => {}} onMessage={() => {}} applied={false} onApplied={async () => {}} saved={false} onToggleSave={() => {}} />);
    expect(screen.getByText("This is your listing")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Apply with Profile/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /^Message/ })).toBeNull();
  });
  it("still shows Message / Apply on someone else's listing", () => {
    render(<OpportunityDetail opp={{ ...mine, postedByMe: false }} onBack={() => {}} onMessage={() => {}} applied={false} onApplied={async () => {}} saved={false} onToggleSave={() => {}} />);
    expect(screen.getByRole("button", { name: /Apply with Profile/ })).toBeTruthy();
  });
});

describe("workshop date display", () => {
  it("shows an ISO event date as '20 November 2026' on the card, and leaves older text dates alone", () => {
    const w = { id: "w", type: "workshop", title: "W", org: "O", description: "d", postedAgo: "Just now", tags: [], mode: "Online", fee: "Free" };
    const { rerender } = render(<OpportunityCard opp={{ ...w, date: "2026-11-20" }} onOpen={() => {}} />);
    expect(screen.getByText("20 November 2026")).toBeTruthy();
    rerender(<OpportunityCard opp={{ ...w, date: "18 October 2026" }} onOpen={() => {}} />);
    expect(screen.getByText("18 October 2026")).toBeTruthy();
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

describe("workshop detail shows what the organiser entered", () => {
  it("shows platform, seat limit, audience and experience level on the detail page", async () => {
    const { default: WorkshopDetail } = await import("../physiofeed/components/opportunities/WorkshopDetail.jsx");
    const w = {
      id: "w", type: "workshop", title: "Taping", org: "O", description: "d", postedAgo: "Just now", tags: [], mode: "Online",
      fee: "Free", date: "2026-11-20", time: "10:00 – 12:00", platform: "Zoom", maxParticipants: 30,
      audience: "Physiotherapists", experienceLevel: "Beginner",
      instructor: { name: "Dr A", role: "PT", initials: "DA", gradient: "blue" },
    };
    render(<WorkshopDetail opp={w} onBack={() => {}} registered={false} onRegistered={async () => {}} />);
    expect(screen.getByText("Zoom")).toBeTruthy();
    expect(screen.getByText("Limited to 30")).toBeTruthy();
    expect(screen.getByText("Physiotherapists")).toBeTruthy();
    expect(screen.getByText("Beginner")).toBeTruthy();
    expect(screen.getByText("20 November 2026")).toBeTruthy();
  });

  it("an in-person workshop shows its venue and city, not a platform", async () => {
    const { default: WorkshopDetail } = await import("../physiofeed/components/opportunities/WorkshopDetail.jsx");
    const w = {
      id: "w2", type: "workshop", title: "Taping", org: "O", description: "d", postedAgo: "Just now", tags: [], mode: "In-person",
      fee: "Free", date: "2026-11-20", time: "10:00 – 12:00", venue: "Hall 2", city: "Bhopal", address: "12 MP Nagar",
      instructor: { name: "Dr A", role: "PT", initials: "DA", gradient: "blue" },
    };
    render(<WorkshopDetail opp={w} onBack={() => {}} registered={false} onRegistered={async () => {}} />);
    expect(screen.getByText("Hall 2, Bhopal")).toBeTruthy();
    expect(screen.getByText("12 MP Nagar")).toBeTruthy();
    expect(screen.queryByText("Platform")).toBeNull();
  });
});
