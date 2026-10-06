// studyModeSmoke.test.jsx
// Smoke test for the read-only "Study mode" view inside Learn: a 4-column
// grid of square image thumbnails (one per real ROM item, from the same
// ROM_DATA the real clinical screen uses) that opens a full detail page
// with a large image + all of that item's real data when a thumbnail is
// tapped -- distinct from tapping the ROM card itself, which still opens
// the real data-entry screen (covered by learnTabSmoke.test.jsx via the
// full App -- as of 2026-09-19 tapping a studyable row opens study mode too). Rendered standalone (not through App) to isolate this from
// the rest of the app shell.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import LearnTabEntry from "../physiofeed/LearnTabEntry.jsx";

describe("Learn tab — Study mode", () => {
  it("opens a 4-col thumbnail grid for ROM, then a full detail page on tap", async () => {
    const onNav = vi.fn();
    render(<LearnTabEntry onNav={onNav} />);

    // Learn opens on a home grid of cards (2026-09-18 redesign); the
    // assessment list now lives behind "Practical Skills".
    fireEvent.click(screen.getByText("Practical Skills"));
    expect(screen.getByRole("heading", { name: "Practical Skills" })).toBeTruthy();

    // Every item with real per-item data is a grid card (no separate "Study" pill any more):
    // 9 study cards for an ordinary user (Palpation is admin-only). Tap ROM's card.
    expect(screen.queryAllByRole("button", { name: /^Study$/ }).length).toBe(0);
    expect(document.querySelectorAll('[data-testid^="learn-card-"]').length).toBe(10); // 9 study cards + Exercise Prescription
    fireEvent.click(screen.getByTestId("learn-card-rom"));

    // Grid overview: real ROM region pills + square thumbnails, each
    // exposing an accessible "Open <name>" label. Tapping the card never
    // called onNav -- study mode is a separate entry point.
    await waitFor(() => {
      expect(screen.getByText("Range of Motion")).toBeTruthy();
    });
    expect(onNav).not.toHaveBeenCalled();
    const thumbnails = screen.getAllByRole("button", { name: /^Open / });
    expect(thumbnails.length).toBeGreaterThan(0);

    // Tap the first thumbnail -- opens the full detail page (large,
    // uncropped image + real data cards matching the real clinical
    // screen's own expanded card -- Goniometer placement is the first
    // one it shows for ROM), not an inline-expanding card.
    fireEvent.click(thumbnails[0]);
    await waitFor(() => {
      expect(screen.getByText("Back")).toBeTruthy();
      expect(screen.getByText(/• Range of motion/)).toBeTruthy();
    });
    // The detail page is split into Learn / Technique / Video / Quiz tabs
    // (2026-09 redesign); goniometer placement lives on Technique.
    fireEvent.click(screen.getByRole("button", { name: "Technique" }));
    expect(screen.getByText(/goniometer placement/i)).toBeTruthy();

    // Back returns to the grid, not all the way out to Learn.
    fireEvent.click(screen.getByText("Back"));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Open / }).length).toBeGreaterThan(0);
    });
  });
});
