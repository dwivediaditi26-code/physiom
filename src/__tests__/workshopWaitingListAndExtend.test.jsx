// Waiting list on a full workshop, the poster's "Waiting list" labels, the
// Extend dialog, and which actions My Postings offers per status.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

let seats = null;
vi.mock("../physiofeed/data/db.js", () => ({
  getSeatsTaken: () => Promise.resolve(seats),
  registerForWorkshop: vi.fn(() => Promise.resolve()),
}));
vi.mock("../analytics/trackEvent.js", () => ({ trackEvent: vi.fn() }));

import WorkshopDetail from "../physiofeed/components/opportunities/WorkshopDetail.jsx";
import ApplicantPipeline from "../physiofeed/components/opportunities/ApplicantPipeline.jsx";
import ExtendListingModal from "../physiofeed/components/opportunities/ExtendListingModal.jsx";
import MyPostingsPage from "../physiofeed/components/opportunities/MyPostingsPage.jsx";

const ws = { id: "5", type: "workshop", title: "W", org: "O", orgInitials: "O", description: "d", date: "2099-11-20", time: "10:00 – 12:00", mode: "Online", fee: "Free", lifecycleStatus: "published", maxParticipants: 2, registrationMethod: "physiofeed", creatorId: "u1" };

describe("Workshop detail when seats are full", () => {
  beforeEach(() => { seats = null; });
  it("lets people join a waiting list when the poster allowed it", async () => {
    seats = 2;
    render(<WorkshopDetail opp={{ ...ws, allowWaitlist: true }} onBack={() => {}} registered={false} onRegistered={() => {}} onMessage={() => {}} />);
    expect(await screen.findByRole("button", { name: "Join Waiting List" })).toBeTruthy();
    expect(screen.getByText(/full, waiting list open/)).toBeTruthy();
  });
  it("stops registrations when full and no waiting list", async () => {
    seats = 2;
    render(<WorkshopDetail opp={ws} onBack={() => {}} registered={false} onRegistered={() => {}} onMessage={() => {}} />);
    expect(await screen.findByText("Seats are full")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Register Now|Join Waiting List/ })).toBeNull();
  });
  it("shows Register Now and the seats left while there is room, and never guesses 'full' when the count is unknown", async () => {
    seats = 1;
    const { unmount } = render(<WorkshopDetail opp={ws} onBack={() => {}} registered={false} onRegistered={() => {}} onMessage={() => {}} />);
    expect(await screen.findByText(/1 left/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Register Now" })).toBeTruthy();
    unmount();
    seats = null;
    render(<WorkshopDetail opp={ws} onBack={() => {}} registered={false} onRegistered={() => {}} onMessage={() => {}} />);
    expect(screen.getByRole("button", { name: "Register Now" })).toBeTruthy();
  });
  it("tells people when registration closes", () => {
    render(<WorkshopDetail opp={{ ...ws, deadline: "2099-11-10" }} onBack={() => {}} registered={false} onRegistered={() => {}} onMessage={() => {}} />);
    expect(screen.getByText(/Registration closes on 10 November 2099/)).toBeTruthy();
  });
});

describe("Poster's registrations list", () => {
  it("marks people past the seat limit as Waiting list, by who registered first", () => {
    const mk = (id, name, at) => ({ id, name, appliedAt: at, appliedAgo: "x", status: "new", initials: "X", gradient: "violet", skills: [] });
    render(<ApplicantPipeline registrantsOnly opp={{ ...ws }} applicants={[mk("3", "Third", "2026-10-03T12:03:00Z"), mk("2", "Second", "2026-10-03T12:02:00Z"), mk("1", "First", "2026-10-03T12:01:00Z")]} onBack={() => {}} onOpenApplicant={() => {}} onPass={() => {}} onShortlist={() => {}} onChat={() => {}} />);
    expect(screen.getAllByText("Waiting list").length).toBe(1);
    expect(screen.getByText("Third").parentElement.textContent).toContain("Waiting list");
    expect(screen.getByText(/1 on the waiting list/)).toBeTruthy();
  });
});

describe("Extend dialog", () => {
  const job = { id: "1", type: "job", title: "J", lifecycleStatus: "published", deadline: "2099-01-10" };
  it("needs a real change and a date that is not in the past", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    render(<ExtendListingModal opp={job} onClose={() => {}} onSave={onSave} />);
    const save = screen.getByRole("button", { name: "Extend" });
    expect(save.disabled).toBe(true);
    fireEvent.change(document.querySelector("input[type=date]"), { target: { value: "2020-01-01" } });
    expect(screen.getByText(/can't be in the past/)).toBeTruthy();
    expect(save.disabled).toBe(true);
    fireEvent.change(document.querySelector("input[type=date]"), { target: { value: "2099-03-01" } });
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ deadline: "2099-03-01" }));
  });
  it("expired workshop: must pick a new date; seats can only go up; reopen wording for closed", async () => {
    const onSave = vi.fn(() => Promise.resolve());
    const { unmount } = render(<ExtendListingModal opp={{ ...ws, date: "2020-05-05", lifecycleStatus: "expired" }} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByRole("button", { name: "Extend" }).disabled).toBe(true);
    expect(screen.getByText(/date has passed/)).toBeTruthy();
    const [reg, evt] = document.querySelectorAll("input[type=date]");
    fireEvent.change(evt, { target: { value: "2099-12-12" } });
    expect(screen.getByRole("button", { name: "Extend" }).disabled).toBe(false);
    const seatsInput = screen.getByDisplayValue("2");
    fireEvent.change(seatsInput, { target: { value: "1" } });
    expect(screen.getByText(/Seats can only go up from 2/)).toBeTruthy();
    fireEvent.change(seatsInput, { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Extend" }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith({ deadline: "", eventDate: "2099-12-12", maxParticipants: 10 }));
    unmount();
    render(<ExtendListingModal opp={{ ...job, lifecycleStatus: "closed" }} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByRole("button", { name: "Extend & reopen" }).disabled).toBe(false);
  });
});

describe("My Postings actions per status", () => {
  const labelsFor = (lifecycleStatus) => {
    const opp = { id: "1", type: "job", title: "T", org: "O", lifecycleStatus, stats: { views: 0, applications: 0, chats: 0 } };
    const noop = () => {};
    const { unmount } = render(<MyPostingsPage postings={[opp]} onBack={noop} onNewPost={noop} onViewApplicants={noop} onView={noop} onEdit={noop} onPublish={noop} onClose={noop} onReopen={noop} onCancel={noop} onDuplicate={noop} onDelete={noop} onExtend={noop} />);
    if (lifecycleStatus === "closed" || lifecycleStatus === "expired" || lifecycleStatus === "cancelled") {
      fireEvent.click(screen.getByText(/View past \/ closed listings/));
    }
    fireEvent.click(screen.getByLabelText("Listing options"));
    const labels = [...document.querySelectorAll("button")].map((b) => b.textContent.trim());
    unmount();
    return labels;
  };
  it.each([
    ["draft", ["Edit listing", "Publish", "Delete listing"], ["Extend"]],
    ["published", ["Edit listing", "Extend", "Close listing", "Cancel listing", "Delete listing"], ["Reopen"]],
    ["closed", ["Edit listing", "Extend & reopen", "Reopen", "Duplicate as new draft", "Delete listing"], []],
    ["expired", ["Edit listing", "Extend", "Duplicate as new draft", "Delete listing"], []],
    ["cancelled", ["Duplicate as new draft", "Delete listing"], ["Edit listing", "Extend"]],
  ])("%s", (status, has, hasNot) => {
    const labels = labelsFor(status);
    has.forEach((l) => expect(labels).toContain(l));
    hasNot.forEach((l) => expect(labels).not.toContain(l));
  });
});
