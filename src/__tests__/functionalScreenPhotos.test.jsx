// functionalScreenPhotos.test.jsx
// Each Functional Movement Screen test has the same 3 uploadable reference-photo
// slots a Kinetic Chain test has (2026-10-05, Aditi: "do same for functional
// movement screen"), shown as a swipe gallery in the opened test, its info card,
// the AI Ortho (Objective) screen and Learn. Cloudinary is mocked: the slots
// are a shared, production account.
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../services/cloudinary.js", () => ({
  uploadImage: vi.fn(() => Promise.resolve({})),
  uploadErrorMessage: vi.fn(() => "upload failed message"),
}));

import { fmaImageIds, kcImageIds, FMA_IMAGE_SLOTS } from "../kcImages.js";
import { FMA_DATA } from "../orthoAdvancedLibrary.js";
import { KC_REGIONS } from "../sharedClinicalData.js";
import { FmaSection, fmaRichItem } from "../orthoAdvancedTools.jsx";
import { InfoButton } from "../orthoFieldKit.jsx";
import FunctionalStudy from "../physiofeed/learn/FunctionalStudy.jsx";

const allTests = Object.values(FMA_DATA).flat();
const firstRegionLabel = Object.keys(FMA_DATA)[0];
const firstTest = FMA_DATA[firstRegionLabel][0];

beforeEach(() => { vi.clearAllMocks(); window.alert = vi.fn(); });

describe("fmaImageIds", () => {
  it("gives 3 prefixed slots", () => {
    expect(FMA_IMAGE_SLOTS).toBe(3);
    expect(fmaImageIds("lfs_sts")).toEqual(["fma_lfs_sts", "fma_lfs_sts_2", "fma_lfs_sts_3"]);
  });

  it("never gives two different tests the same slot id (a test shared by several regions shares its photos)", () => {
    const uniqueTestIds = [...new Set(allTests.map((t) => t.id))];
    const ids = uniqueTestIds.flatMap((id) => fmaImageIds(id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("never clashes with a Kinetic Chain slot id", () => {
    const kc = new Set(Object.values(KC_REGIONS).flatMap((r) => (r.tests || []).flatMap((t) => kcImageIds(t.id))));
    expect(allTests.flatMap((t) => fmaImageIds(t.id)).filter((id) => kc.has(id))).toEqual([]);
  });
});

describe("the same 3 photos show everywhere", () => {
  it("the info card item carries the 3 ids", () => {
    expect(fmaRichItem(firstTest).images).toEqual(fmaImageIds(firstTest.id));
    expect(fmaRichItem(firstTest).image).toBe(fmaImageIds(firstTest.id)[0]);
  });

  it("the info card sheet shows the 3-photo gallery on the Perform tab", () => {
    render(<InfoButton title={firstTest.label} richItem={fmaRichItem(firstTest)} />);
    fireEvent.click(screen.getByRole("button", { name: /ⓘ/ }));
    for (let n = 1; n <= 3; n++) expect(screen.getByTestId(`photo-slot-${n}`)).toBeTruthy();
    expect(screen.getByLabelText("Show photo 3 of 3")).toBeTruthy();
  });

  it("the Functional Movement Screen step shows the gallery for the opened test", () => {
    render(<FmaSection data={{}} setData={() => {}} />);
    fireEvent.click(screen.getByText(firstTest.label));
    for (let n = 1; n <= 3; n++) expect(screen.getByTestId(`photo-slot-${n}`)).toBeTruthy();
  });

  it("Learn's detail view pages through the same 3 photos", () => {
    render(<FunctionalStudy onBack={() => {}} />);
    fireEvent.click(screen.getAllByText(firstTest.label)[0]);
    expect(screen.getByLabelText("Photo 1 of 3")).toBeTruthy();
    expect(screen.getByLabelText("Photo 3 of 3")).toBeTruthy();
  });
});
