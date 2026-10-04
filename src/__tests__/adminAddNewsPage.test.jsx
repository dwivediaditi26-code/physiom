import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

let admin = true;
vi.mock("../physiofeed/context/AppDataContext.jsx", () => ({ useAppData: () => ({ profile: { isAdmin: admin } }) }));
const draftNewsItem = vi.fn();
const publishNewsItem = vi.fn();
vi.mock("../physiofeed/data/db.js", () => ({
  draftNewsItem: (...a) => draftNewsItem(...a),
  publishNewsItem: (...a) => publishNewsItem(...a),
}));

import AdminAddNewsPage from "../physiofeed/pages/AdminAddNewsPage.jsx";

const renderPage = () => render(
  <MemoryRouter initialEntries={["/admin/news"]}>
    <Routes>
      <Route path="/admin/news" element={<AdminAddNewsPage />} />
      <Route path="/feed" element={<div>FEED</div>} />
      <Route path="/news" element={<div>NEWS</div>} />
    </Routes>
  </MemoryRouter>
);

describe("Admin Add news page", () => {
  beforeEach(() => { admin = true; draftNewsItem.mockReset(); publishNewsItem.mockReset(); });

  it("sends non-admins away", () => {
    admin = false;
    renderPage();
    expect(screen.getByText("FEED")).toBeTruthy();
  });

  it("AI draft fills the form for review but does not publish by itself", async () => {
    draftNewsItem.mockResolvedValue({ draft: { title: "Drafted title", summary: "S", category: "conference", source_name: "Org", source_url: "https://org.example/n", location: "", deadline: "", published: "" }, note: null });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Paste the notice/), { target: { value: "notice text" } });
    fireEvent.click(screen.getByRole("button", { name: /Draft with AI/ }));
    await waitFor(() => expect(screen.getByDisplayValue("Drafted title")).toBeTruthy());
    expect(draftNewsItem).toHaveBeenCalledWith("notice text", "");
    expect(publishNewsItem).not.toHaveBeenCalled();
  });

  it("Publish stays disabled until title, source name and link are filled, then publishes with the notify choice", async () => {
    publishNewsItem.mockResolvedValue({ ok: true, updated: false, notified: true });
    renderPage();
    const publish = screen.getByRole("button", { name: "Publish to News" });
    expect(publish.disabled).toBe(true);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs.find((i) => i.maxLength === 300), { target: { value: "Hand typed title" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. AIIMS New Delhi"), { target: { value: "AIIMS" } });
    fireEvent.change(screen.getAllByPlaceholderText("https://…")[1], { target: { value: "https://aiims.edu/n" } });
    expect(publish.disabled).toBe(false);
    fireEvent.click(screen.getByLabelText(/Send a phone notification/));
    fireEvent.click(publish);
    await waitFor(() => expect(publishNewsItem).toHaveBeenCalledWith(expect.objectContaining({ title: "Hand typed title", source_url: "https://aiims.edu/n", notify: false })));
    expect(await screen.findByText(/Published to News/)).toBeTruthy();
  });

  it("shows the server's error instead of pretending it published", async () => {
    publishNewsItem.mockRejectedValue(new Error("Admin access required."));
    renderPage();
    fireEvent.change(screen.getAllByRole("textbox").find((i) => i.maxLength === 300), { target: { value: "T" } });
    fireEvent.change(screen.getByPlaceholderText("e.g. AIIMS New Delhi"), { target: { value: "S" } });
    fireEvent.change(screen.getAllByPlaceholderText("https://…")[1], { target: { value: "https://x.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Publish to News" }));
    expect(await screen.findByText("Admin access required.")).toBeTruthy();
    expect(screen.queryByText(/Published to News/)).toBeNull();
  });
});
