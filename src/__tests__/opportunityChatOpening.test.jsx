import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

let profile = null;
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile }) }));
vi.mock("../physiofeed/data/db.js", () => ({ getMessages: () => Promise.resolve([]), sendMessage: vi.fn() }));
import OpportunityChat from "../physiofeed/components/opportunities/OpportunityChat.jsx";

const opp = { id: "1", title: "Sports Job", org: "Org", tags: ["Sports"], creatorId: "poster", mentor: { name: "Dr. Poster, PT", initials: "P", gradient: "violet" } };
const box = async () => (await screen.findByRole("textbox")).value;

describe("Message the organiser", () => {
  it("never invents a background: with no skills entered the opening text claims none", async () => {
    profile = { id: "me", name: "Me" };
    render(<MemoryRouter><OpportunityChat opp={opp} onBack={() => {}} /></MemoryRouter>);
    const v = await box();
    expect(v).toContain("very interested in this Sports Job");
    expect(v).not.toMatch(/background/i);
  });
  it("uses the member's own title and skills when they have them", async () => {
    profile = { id: "me", name: "Me", clinicalTitle: "Physiotherapist", skills: ["ACL Rehab", "Taping", "Other"] };
    render(<MemoryRouter><OpportunityChat opp={opp} onBack={() => {}} /></MemoryRouter>);
    expect(await box()).toContain("I'm Physiotherapist, very interested");
    expect(await box()).toContain("My background is in ACL Rehab and Taping.");
  });
  it("a guest gets a sign-in message, not a composer with the demo profile's text", async () => {
    profile = { isDemo: true, id: "demo", name: "Dr. Aditi Sharma, PT", skills: ["ACL Rehabilitation"] };
    render(<MemoryRouter><OpportunityChat opp={opp} onBack={() => {}} /></MemoryRouter>);
    expect(await screen.findByText(/Sign in or create a free account to message/)).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
