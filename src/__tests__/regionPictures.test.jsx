// regionPictures.test.jsx
// The body-region cards on the Ortho "Which region(s) are involved?" screen:
// small WebP pictures, fetched lazily (only when that screen is on screen), and
// a plain icon -- not a broken-image box -- if one fails to arrive.
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegionPicker } from "../orthoSetupKit.jsx";

describe("Ortho region cards", () => {
  it("use the small WebP pictures and load them lazily", () => {
    render(<RegionPicker selectedRegions={[]} setSelectedRegions={() => {}} />);
    const img = screen.getByTestId("region-art-lumbar");
    expect(img.getAttribute("src")).toMatch(/anatomy\/spine\/lumbar\.webp$/);
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("show the plain bone icon, not a broken-image box, when a region picture fails to arrive", () => {
    const { container } = render(<RegionPicker selectedRegions={[]} setSelectedRegions={() => {}} />);
    const img = screen.getByTestId("region-art-lumbar");
    fireEvent.error(img);
    expect(screen.queryByTestId("region-art-lumbar")).toBeNull();
    expect(container.querySelectorAll(".ti-bone").length).toBeGreaterThan(0);
    expect(screen.getByTestId("region-art-cervical")).toBeTruthy(); // the others are untouched
  });
});
