import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const searchLive = vi.fn();
vi.mock("../physiofeed/data/db.js", () => ({
  searchEvidenceLive: (source, params) => searchLive(source, params),
}));

import LiveSearchPanel from "../physiofeed/components/evidence/LiveSearchPanel.jsx";

const result = (title, extra = {}) => ({ pmid: title, id: title, title, journal: "J", year: 2024, summary: "short summary", abstract: "FULL ABSTRACT TEXT", authors: "Smith A", types: [], url: "https://x", ...extra });
const respond = (source, p) => Promise.resolve({ results: [result("Result for " + p.query)], total: source === "pubmed" ? 120 : 80 });

describe("Evidence Library search panel", () => {
  beforeEach(() => {
    localStorage.clear();
    searchLive.mockReset();
    searchLive.mockImplementation(respond);
  });

  it("a topic card runs a real search with that topic's own query", async () => {
    render(<LiveSearchPanel />);
    await waitFor(() => expect(searchLive).toHaveBeenCalledWith("pubmed", expect.objectContaining({ query: "physiotherapy rehabilitation" })));
    fireEvent.click(screen.getByRole("button", { name: /Knee OA/ }));
    await waitFor(() => expect(searchLive).toHaveBeenCalledWith("pubmed", expect.objectContaining({ query: "knee osteoarthritis exercise therapy" })));
    expect(await screen.findByText("Result for knee osteoarthritis exercise therapy")).toBeTruthy();
  });

  it("All sources searches both sources and drops the duplicate paper", async () => {
    searchLive.mockImplementation((source) => Promise.resolve({
      results: source === "pubmed" ? [result("Paper A", { pmid: "1", doi: "10.1/a" })] : [result("Paper A (Europe PMC copy)", { id: "x", pmid: "1" }), result("Paper B", { id: "b", pmid: "2" })],
      total: 5,
    }));
    render(<LiveSearchPanel />);
    expect(await screen.findByText("Paper A")).toBeTruthy();
    expect(screen.getByText("Paper B")).toBeTruthy();
    expect(screen.queryByText("Paper A (Europe PMC copy)")).toBeNull();
  });

  it("the study type filter and sort are sent to the search", async () => {
    render(<LiveSearchPanel />);
    await screen.findByText(/Result for/);
    fireEvent.change(screen.getByLabelText("Study type"), { target: { value: "rct" } });
    await waitFor(() => expect(searchLive).toHaveBeenCalledWith("pubmed", expect.objectContaining({ studyType: "rct" })));
    fireEvent.change(screen.getByLabelText("Sort results"), { target: { value: "newest" } });
    await waitFor(() => expect(searchLive).toHaveBeenCalledWith("pubmed", expect.objectContaining({ sort: "newest", studyType: "rct" })));
  });

  it("the Year filter sends a real start year", async () => {
    render(<LiveSearchPanel />);
    await screen.findByText(/Result for/);
    fireEvent.change(screen.getByLabelText("Year"), { target: { value: "5" } });
    await waitFor(() => expect(searchLive).toHaveBeenCalledWith("pubmed", expect.objectContaining({ yearFrom: new Date().getFullYear() - 5 })));
  });

  it("shows the real total for a single source and loads the next page", async () => {
    render(<LiveSearchPanel />);
    fireEvent.click(screen.getByRole("button", { name: "PubMed" }));
    expect(await screen.findByText("120 results")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(searchLive).toHaveBeenCalledWith("pubmed", expect.objectContaining({ page: 1 })));
  });

  it("Abstract expands the full abstract from the record", async () => {
    render(<LiveSearchPanel />);
    await screen.findByText(/Result for/);
    expect(screen.queryByText("FULL ABSTRACT TEXT")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /Abstract/ })[0]);
    expect(screen.getByText("FULL ABSTRACT TEXT")).toBeTruthy();
  });

  it("badges come from the record's own publication types", async () => {
    searchLive.mockResolvedValue({ results: [result("A", { types: ["Journal Article", "Systematic Review"] }), result("B", { types: ["Journal Article"] })], total: 2 });
    render(<LiveSearchPanel />);
    await screen.findByText("A");
    const badges = Array.from(document.querySelectorAll("span")).map((n) => n.textContent);
    expect(badges).toContain("Systematic review");
    expect(badges).not.toContain("Randomized trial");
  });

  it("opens PEDro and Cochrane outside the app with the current query", async () => {
    render(<LiveSearchPanel />);
    fireEvent.change(screen.getByLabelText("Search research"), { target: { value: "ACL rehab" } });
    const pedro = screen.getByRole("link", { name: /PEDro/ });
    expect(pedro.getAttribute("href")).toContain("abstract_with_title=ACL%20rehab");
    expect(pedro.getAttribute("target")).toBe("_blank");
    expect(screen.getByRole("link", { name: /Cochrane/ }).getAttribute("href")).toContain("q=ACL%20rehab");
  });

  it("shows an error with Try again when every source fails", async () => {
    searchLive.mockRejectedValue(new Error("boom"));
    render(<LiveSearchPanel />);
    expect(await screen.findByText("boom")).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
  });

  it("keeps the latest search when an older, slower one finishes later", async () => {
    let releaseSlow;
    searchLive.mockImplementation((source, p) =>
      p.query === "knee osteoarthritis exercise therapy"
        ? new Promise((res) => { releaseSlow = () => res({ results: [result("SLOW knee")], total: 1 }); })
        : respond(source, p));
    render(<LiveSearchPanel />);
    await screen.findByText("Result for physiotherapy rehabilitation");
    fireEvent.click(screen.getByRole("button", { name: /Knee OA/ }));
    fireEvent.click(screen.getByRole("button", { name: /Low back pain/ }));
    await screen.findByText("Result for low back pain physiotherapy");
    releaseSlow();
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByText("SLOW knee")).toBeNull();
    expect(screen.getByText("Result for low back pain physiotherapy")).toBeTruthy();
  });
});
