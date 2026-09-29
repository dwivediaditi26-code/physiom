// outcomeMeasuresScaleLink.test.jsx
// OutcomeMeasuresPro accepts navContext.scaleId so a caller can open one
// scale's live-entry view directly, and falls back to the normal
// searchable list when no scale is given.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import OutcomeMeasuresPro from "../OutcomeMeasuresPro.jsx";

describe("OutcomeMeasuresPro scale deep link", () => {
  it("opens straight into a scale's live-entry view when given navContext.scaleId", () => {
    render(<OutcomeMeasuresPro data={{}} set={vi.fn()} navContext={{ scaleId: "rancho" }} />);
    expect(screen.getByText(/Rancho Los Amigos Scale/)).toBeInTheDocument();
  });

  it("shows the normal searchable list when no navContext is given (no regression)", () => {
    render(<OutcomeMeasuresPro data={{}} set={vi.fn()} />);
    // In the flat list view every scale card is visible at once; jumping
    // straight into one scale (the navContext.scaleId behaviour) would
    // only show that single scale, not the whole browsable set.
    expect(screen.getByText(/Rancho Los Amigos Scale/)).toBeInTheDocument();
    expect(screen.getByText(/Barthel Index/)).toBeInTheDocument();
    expect(screen.getByText(/Berg Balance Scale/)).toBeInTheDocument();
  });
});
