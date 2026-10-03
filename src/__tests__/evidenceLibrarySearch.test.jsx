import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const searchPubMed = vi.fn();
vi.mock("../physiofeed/data/db.js", () => ({
  searchPubMedForEvidence: (q) => searchPubMed(q),
  searchEuropePMCForEvidence: vi.fn(() => Promise.resolve([])),
}));

import LiveSearchPanel from "../physiofeed/components/evidence/LiveSearchPanel.jsx";

const result = (title) => ({ pmid: title, id: title, title, journal: "J", year: 2024, summary: "s", url: "https://x" });

describe("Evidence Library search panel", () => {
  beforeEach(() => {
    localStorage.clear();
    searchPubMed.mockReset();
    searchPubMed.mockImplementation((q) => Promise.resolve([result("Result for " + q)]));
  });

  it("a topic card runs a real search with that topic's own query", async () => {
    render(<LiveSearchPanel />);
    await waitFor(() => expect(searchPubMed).toHaveBeenCalledWith("physiotherapy rehabilitation"));
    fireEvent.click(screen.getByRole("button", { name: "Knee OA" }));
    await waitFor(() => expect(searchPubMed).toHaveBeenCalledWith("knee osteoarthritis exercise therapy"));
    expect(await screen.findByText("Result for knee osteoarthritis exercise therapy")).toBeTruthy();
  });

  it("opens PEDro and Cochrane outside the app with the current query", async () => {
    render(<LiveSearchPanel />);
    fireEvent.change(screen.getByLabelText("Search research"), { target: { value: "ACL rehab" } });
    const pedro = screen.getByRole("link", { name: /PEDro/ });
    expect(pedro.getAttribute("href")).toContain("abstract_with_title=ACL%20rehab");
    expect(pedro.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: /Cochrane/ }).getAttribute("href")).toContain("q=ACL%20rehab");
  });

  it("shows an error with Try again when the search fails", async () => {
    searchPubMed.mockRejectedValue(new Error("boom"));
    render(<LiveSearchPanel />);
    expect(await screen.findByText("boom")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("keeps the latest search when an older, slower one finishes later", async () => {
    let releaseSlow;
    searchPubMed.mockImplementation((q) =>
      q === "knee osteoarthritis exercise therapy"
        ? new Promise((res) => { releaseSlow = () => res([result("SLOW knee")]); })
        : Promise.resolve([result("Result for " + q)]));
    render(<LiveSearchPanel />);
    await screen.findByText("Result for physiotherapy rehabilitation");
    fireEvent.click(screen.getByRole("button", { name: "Knee OA" }));
    fireEvent.click(screen.getByRole("button", { name: "Low back pain" }));
    await screen.findByText("Result for low back pain physiotherapy");
    releaseSlow();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("SLOW knee")).toBeNull();
    expect(screen.getByText("Result for low back pain physiotherapy")).toBeTruthy();
  });
});
