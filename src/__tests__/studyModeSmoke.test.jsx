// studyModeSmoke.test.jsx
// Smoke test for the read-only "Study mode" view inside Learn: a 4-column
// grid of square image thumbnails (one per real ROM item, from the same
// ROM_DATA the real clinical screen uses) that opens a full detail page
// with a large image + all of that item's real data when a thumbnail is
// tapped -- distinct from tapping the ROM card itself, which still opens
// the real data-entry screen (covered by learnTabSmoke.test.jsx via the
// full App). Rendered standalone (not through App) to isolate this from
// the rest of the app shell.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LearnTabEntry from "../physiofeed/LearnTabEntry.jsx";

describe("Learn tab — Study mode", () => {
  it("opens a 4-col thumbnail grid for ROM, then a full detail page on tap", async () => {
    const onNav = vi.fn();
    render(<LearnTabEntry onNav={onNav} />);

    expect(screen.getByText("Assessment Library")).toBeTruthy();

    // Of the 10 Assessment Library cards, only ROM/MMT/Special/Neuro get a
    // "Study mode" button, and ROM is the first of those four in display
    // order (Demographics/Subjective/Posture/Observation/Palpation come
    // first but aren't studyable) -- so the first match is ROM's.
    const studyBtns = screen.getAllByText(/study mode/i);
    expect(studyBtns.length).toBe(4);
    fireEvent.click(studyBtns[0]);

    // Grid overview: real ROM region pills + square thumbnails, each
    // exposing an accessible "Open <name>" label. Tapping the card never
    // called onNav -- study mode is a separate entry point.
    await waitFor(() => {
      expect(screen.getByText("Range of Motion")).toBeTruthy();
    });
    expect(onNav).not.toHaveBeenCalled();
    const thumbnails = screen.getAllByRole("button", { name: /^Open / });
    expect(thumbnails.length).toBeGreaterThan(0);

    // Tap the first thumbnail -- opens the full detail page (large image
    // + real data), not an inline-expanding card.
    fireEvent.click(thumbnails[0]);
    await waitFor(() => {
      expect(screen.getByText("Back")).toBeTruthy();
      expect(screen.getByText(/how to perform/i)).toBeTruthy();
    });

    // Back returns to the grid, not all the way out to Learn.
    fireEvent.click(screen.getByText("Back"));
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^Open / }).length).toBeGreaterThan(0);
    });
  });
});
