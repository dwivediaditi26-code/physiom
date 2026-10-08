// functionalScreenPhotos.test.jsx
// Each Functional Movement Screen test has the same 3 uploadable reference-photo
// slots a Kinetic Chain test has (2026-10-05, Aditi: "do same for functional
// movement screen"), shown as a swipe gallery in the opened test, its info card,
// the AI Ortho (Objective) screen and Learn. Cloudinary is mocked: the slots
// are a shared, production account.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../services/cloudinary.js", () => ({
  uploadImage: vi.fn(() => Promise.resolve({})),
  uploadErrorMessage: vi.fn(() => "upload failed message"),
}));

// Only an admin sees the empty "Add" slots, so these tests run as one.
vi.mock("../useIsAdmin.js", () => ({ useIsAdmin: () => true }));

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

  describe("Learn's detail view", () => {
    // The gallery checks each slot with an Image() to see what is uploaded.
    // Fake that: only the ids in `uploaded` "load", the rest 404.
    const RealImage = globalThis.Image;
    let uploaded = [];
    beforeEach(() => {
      globalThis.Image = class {
        set src(url) { setTimeout(() => (uploaded.some((id) => url.endsWith(`/${id}`)) ? this.onload?.() : this.onerror?.()), 0); }
      };
    });
    afterEach(() => { globalThis.Image = RealImage; });

    it("pages through only the photos that were uploaded", async () => {
      uploaded = fmaImageIds(firstTest.id).slice(0, 2);
      render(<FunctionalStudy onBack={() => {}} />);
      fireEvent.click(screen.getAllByText(firstTest.label)[0]);
      expect(await screen.findByLabelText("Photo 2 of 2")).toBeTruthy();
      expect(screen.queryByLabelText("Photo 3 of 3")).toBeNull();
    });
  });

  it("the test cards in the list show the test's own uploaded photo (the fma_ ids, not the Kinetic Chain ids)", () => {
    const { container } = render(<FmaSection data={{}} setData={() => {}} />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs.some((u) => u.endsWith(`/${fmaImageIds(firstTest.id)[0]}`))).toBe(true);
    expect(srcs.some((u) => u.endsWith(`/${firstTest.id}`))).toBe(false);
  });

  describe("a test that is in two regions' lists keeps separate photos where asked", () => {
    it("Trunk Stability Push-Up: Lumbar keeps the original photo ids, Shoulder gets its own", () => {
      expect(fmaImageIds("fms_tspu", "Lumbar")[0]).toBe("fma_fms_tspu");
      expect(fmaImageIds("fms_tspu")[0]).toBe("fma_fms_tspu");
      expect(fmaImageIds("fms_tspu", "Shoulder")).toEqual(["fma_fms_tspu_shoulder", "fma_fms_tspu_shoulder_2", "fma_fms_tspu_shoulder_3"]);
      expect(fmaImageIds("fms_tspu", "shoulder")[0]).toBe("fma_fms_tspu_shoulder");
    });

    it("other shared tests (e.g. Deep Squat in Hip/Knee/Ankle) still share one set", () => {
      expect(fmaImageIds("fms_sq", "Hip")).toEqual(fmaImageIds("fms_sq", "Knee"));
    });

    it("the Shoulder screen opens the push-up with the Shoulder photo slots, the Lumbar screen with the original", () => {
      const open = (regionLabel) => {
        const { container, unmount } = render(<FmaSection data={{}} setData={() => {}} />);
        fireEvent.click(screen.getByRole("button", { name: regionLabel }));
        fireEvent.click(screen.getByText(/Trunk Stability Push-Up/));
        const srcs = [...container.querySelectorAll('[data-testid="photo-slots-track"] img')].map((i) => i.getAttribute("src"));
        unmount();
        return srcs;
      };
      expect(open("Shoulder").some((u) => u.includes("fma_fms_tspu_shoulder"))).toBe(true);
      const lumbar = open("Lumbar");
      expect(lumbar.some((u) => u.includes("fma_fms_tspu"))).toBe(true);
      expect(lumbar.some((u) => u.includes("shoulder"))).toBe(false);
    });
  });

  it("the reference photo is 40% smaller (60% of the card width) on the opened test", () => {
    render(<FmaSection data={{}} setData={() => {}} />);
    fireEvent.click(screen.getByText(firstTest.label));
    expect(screen.getByTestId("photo-slots-frame").style.width).toBe("60%");
  });
});
