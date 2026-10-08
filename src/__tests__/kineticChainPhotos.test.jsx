// kineticChainPhotos.test.jsx
// Each Kinetic Chain test has 3 reference-photo slots, uploadable inside the
// app, and the same 3 photos must appear in the Kinetic Chain step, its info
// card, the AI Ortho (Objective) screen's info card and Learn. They all take
// their ids from kcImages.js, so these tests pin that down and check that an
// upload goes to the slot that was tapped. The Cloudinary service is mocked:
// the slots are a shared, production account.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";

vi.mock("../services/cloudinary.js", () => ({
  uploadImage: vi.fn(() => Promise.resolve({})),
  uploadErrorMessage: vi.fn(() => "upload failed message"),
}));

// Only an admin sees the empty "Add" slots, so most tests below run as one.
let mockAdmin = true;
vi.mock("../useIsAdmin.js", () => ({ useIsAdmin: () => mockAdmin }));

import { uploadImage, uploadErrorMessage } from "../services/cloudinary.js";
import { kcImageIds, KC_IMAGE_SLOTS } from "../kcImages.js";
import PhotoSlots from "../PhotoSlots.jsx";
import { KC_REGIONS } from "../sharedClinicalData.js";
import { KineticChainSection, kcRichItem } from "../orthoAdvancedTools.jsx";
import { InfoButton } from "../orthoFieldKit.jsx";
import KineticStudy from "../physiofeed/learn/KineticStudy.jsx";

const allTests = Object.values(KC_REGIONS).flatMap((r) => r.tests || []);
const firstRegionKey = Object.keys(KC_REGIONS)[0];
const firstTest = KC_REGIONS[firstRegionKey].tests[0];

beforeEach(() => { vi.clearAllMocks(); window.alert = vi.fn(); mockAdmin = true; });

describe("kcImageIds", () => {
  it("gives 3 slots, keeping the already-uploaded bare id as slot 1", () => {
    expect(KC_IMAGE_SLOTS).toBe(3);
    expect(kcImageIds("kc_ankle_df")).toEqual(["kc_ankle_df", "kc_ankle_df_2", "kc_ankle_df_3"]);
  });

  it("never gives two different tests the same slot id", () => {
    const ids = allTests.flatMap((t) => kcImageIds(t.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("PhotoSlots", () => {
  it("shows one slot per id", () => {
    render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    for (let n = 1; n <= 3; n++) expect(screen.getByTestId(`photo-slot-${n}`)).toBeTruthy();
  });

  it("is a swipe gallery (one slide per photo, scroll-snap) that the phone grid-collapse CSS cannot stack", () => {
    // utils.jsx turns any inline style containing "repeat(4," / "1fr 1fr" into a
    // single column on phones -- that made 4 huge stacked tiles. Slides sit side
    // by side in a horizontal scroll-snap track instead (like the Cardio/Neuro cards).
    render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    const track = screen.getByTestId("photo-slots-track");
    const style = track.getAttribute("style");
    expect(style).toContain("scroll-snap-type: x mandatory");
    expect(style).not.toMatch(/repeat\(|1fr 1fr|grid/);
    expect(track.children.length).toBe(3);
  });

  it("shows a dot per photo, and tapping a dot moves to that photo", () => {
    render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    const dots = [1, 2, 3].map((n) => screen.getByLabelText(`Show photo ${n} of 3`));
    expect(dots[0].getAttribute("aria-current")).toBe("true");
    fireEvent.click(dots[2]);
    expect(dots[2].getAttribute("aria-current")).toBe("true");
    expect(dots[0].getAttribute("aria-current")).toBeNull();
  });

  it("has a camera button on a photo that replaces it in the same slot", async () => {
    render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    fireEvent.click(screen.getByLabelText("Replace photo 2"));
    const file = new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("photo-slots-input"), { target: { files: [file] } });
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, "kc_x_2"));
  });

  it("uploads to the id of the empty slot that was tapped, then shows the photo", async () => {
    const { container } = render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    // nothing is uploaded yet: every image 404s
    container.querySelectorAll("img").forEach((img) => fireEvent.error(img));
    const slot3 = await screen.findByLabelText("Add photo 3");
    fireEvent.click(slot3);
    const file = new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("photo-slots-input"), { target: { files: [file] } });
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, "kc_x_3"));
    // that slot now tries to show the photo again instead of "Add photo 3"
    await waitFor(() => expect(screen.queryByLabelText("Add photo 3")).toBeNull());
    expect(screen.getByLabelText("Add photo 1")).toBeTruthy();
  });

  it("tells the user when an upload fails and leaves the slot empty", async () => {
    uploadImage.mockRejectedValueOnce(new Error("Upload failed"));
    const { container } = render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    container.querySelectorAll("img").forEach((img) => fireEvent.error(img));
    fireEvent.click(await screen.findByLabelText("Add photo 2"));
    fireEvent.change(screen.getByTestId("photo-slots-input"), { target: { files: [new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" })] } });
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith("upload failed message"));
    expect(uploadErrorMessage).toHaveBeenCalled();
    expect(screen.getByLabelText("Add photo 2")).toBeTruthy();
  });

  it("opens an uploaded photo full size, where it can be replaced in the same slot", async () => {
    render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    fireEvent.click(screen.getByLabelText("View photo 2"));
    expect(screen.getByText("Photo 2 of 3")).toBeTruthy();
    fireEvent.click(screen.getByText(/Replace photo/));
    const file = new File([new Uint8Array(10)], "p.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("photo-slots-input"), { target: { files: [file] } });
    await waitFor(() => expect(uploadImage).toHaveBeenCalledWith(file, "kc_x_2"));
  });
});

describe("Kinetic Chain test cards", () => {
  it("show the test's own uploaded photo in the list", () => {
    const { container } = render(<KineticChainSection data={{}} setData={() => {}} />);
    const srcs = [...container.querySelectorAll("img")].map((i) => i.getAttribute("src"));
    expect(srcs.some((u) => u.endsWith(`/${firstTest.id}`))).toBe(true);
  });
});

describe("the reference photo is 40% smaller", () => {
  it("Kinetic Chain's opened test shows the gallery at 60% of the card width, centred", () => {
    render(<KineticChainSection data={{}} setData={() => {}} />);
    fireEvent.click(screen.getByText(firstTest.label));
    const frame = screen.getByTestId("photo-slots-frame");
    expect(frame.style.width).toBe("60%");
    expect(frame.style.margin).toMatch(/auto/);
  });

  it("other places that use PhotoSlots keep the full width", () => {
    render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    expect(screen.getByTestId("photo-slots-frame").style.width).toBe("100%");
  });
});

describe("PhotoSlots for a student (not an admin)", () => {
  beforeEach(() => { mockAdmin = false; });

  it("shows nothing at all -- no heading, no empty slots -- when no photo is uploaded", () => {
    const { container } = render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    container.querySelectorAll("img").forEach((img) => fireEvent.error(img));
    expect(screen.queryByText("Reference photos")).toBeNull();
    expect(screen.queryByLabelText(/Add photo/)).toBeNull();
    expect(screen.queryByLabelText(/View photo/)).toBeNull();
  });

  it("shows only the photos that loaded, with no Add slot for the rest", () => {
    const { container } = render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    const imgs = container.querySelectorAll("img");
    fireEvent.load(imgs[0]);
    fireEvent.load(imgs[2]);
    fireEvent.error(imgs[1]);
    expect(screen.getByText("Reference photos")).toBeTruthy();
    expect(screen.getByLabelText("View photo 1").parentElement.style.display).not.toBe("none");
    expect(screen.getByLabelText("View photo 3").parentElement.style.display).not.toBe("none");
    expect(screen.queryByLabelText(/Add photo/)).toBeNull();
  });

  it("opens a photo full size without a Replace button", () => {
    const { container } = render(<PhotoSlots ids={kcImageIds("kc_x")} />);
    const imgs = container.querySelectorAll("img");
    fireEvent.load(imgs[0]);
    fireEvent.load(imgs[2]);
    fireEvent.click(screen.getByLabelText("View photo 3"));
    expect(screen.getByText("Photo 2 of 2")).toBeTruthy();
    expect(screen.queryByText(/Replace photo/)).toBeNull();
  });
});

describe("the same 3 photos show everywhere", () => {
  it("the kinetic chain info card item carries the 3 ids", () => {
    expect(kcRichItem(firstTest).images).toEqual(kcImageIds(firstTest.id));
    expect(kcRichItem(firstTest).image).toBe(firstTest.id);
  });

  it("the info card sheet shows 4 slots", () => {
    render(<InfoButton title={firstTest.label} richItem={kcRichItem(firstTest)} />);
    fireEvent.click(screen.getByRole("button", { name: /ⓘ/ }));
    for (let n = 1; n <= 3; n++) expect(screen.getByTestId(`photo-slot-${n}`)).toBeTruthy();
  });

  it("the Kinetic Chain step shows 4 slots for the opened test", () => {
    render(<KineticChainSection data={{}} setData={() => {}} />);
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
      uploaded = [firstTest.id, `${firstTest.id}_3`];
      render(<KineticStudy onBack={() => {}} />);
      fireEvent.click(screen.getAllByText(firstTest.label)[0]);
      expect(await screen.findByLabelText("Photo 2 of 2")).toBeTruthy();
      expect(screen.queryByLabelText("Photo 3 of 3")).toBeNull();
      expect(screen.queryByLabelText("Photo 4 of 4")).toBeNull();
    });

    it("does not show a pager at all when only one photo is uploaded", async () => {
      uploaded = [firstTest.id];
      render(<KineticStudy onBack={() => {}} />);
      fireEvent.click(screen.getAllByText(firstTest.label)[0]);
      await new Promise((r) => setTimeout(r, 20));
      expect(screen.queryByLabelText(/Photo \d of/)).toBeNull();
    });
  });
});
