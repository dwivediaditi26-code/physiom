// photoAdminOnly.test.jsx
// Reference photos in the info cards: only an admin (Aditi, Anupam) sees the
// empty "add a photo" box and the Replace buttons; everyone else sees a photo
// only when it really loaded, and no blank space at all when it did not
// (2026-10-10, Aditi: "any image, if it is not there in the info card, in
// functional, in kinetic, in anything, in AI -- it should not show the blank
// space of the image").
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

let mockAdmin = false;
vi.mock("../useIsAdmin.js", () => ({ useIsAdmin: () => mockAdmin }));

import InfoCard from "../InfoCard.jsx";
import { InfoButton } from "../orthoFieldKit.jsx";
import { FindingCard, PatientPhotoTile } from "../ConditionObjectiveAssessment.jsx";
import StudyImage from "../physiofeed/learn/StudyImage.jsx";
import StudyGrid from "../physiofeed/learn/StudyGrid.jsx";
import SpecialStudy from "../physiofeed/learn/SpecialStudy.jsx";

beforeEach(() => { mockAdmin = false; });

const SRC = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/c_heart_rate_2";
const card = (perform) => ({ icon: "❤", category: "Cardio", title: "Heart rate", perform: { boxes: [], ...perform }, scale: {}, interpret: {} });

describe("InfoCard (Cardio / Neuro) photo", () => {
  it("shows a non-admin no upload box and no blank space when there is no photo", () => {
    render(<InfoCard data={card({ image: null })} onClose={() => {}} />);
    expect(screen.queryByText(/Add position\/technique image/)).toBeNull();
    expect(screen.queryByText(/Tap to upload a photo/)).toBeNull();
    expect(document.querySelector("img")).toBeNull();
  });

  it("hides the photo box from a non-admin until the photo has loaded, and drops it if it fails", () => {
    render(<InfoCard data={card({ image: SRC })} onClose={() => {}} />);
    const img = document.querySelector("img");
    expect(img.parentElement.parentElement.style.display).toBe("none");
    fireEvent.load(img);
    expect(img.parentElement.parentElement.style.display).not.toBe("none");
    expect(screen.queryByLabelText("Replace this photo")).toBeNull();
    fireEvent.error(img);
    expect(document.querySelector("img")).toBeNull();
    expect(screen.queryByText(/Tap to upload a photo/)).toBeNull();
  });

  it("keeps the upload box and the Replace button for an admin", () => {
    mockAdmin = true;
    render(<InfoCard data={card({ image: SRC })} onClose={() => {}} />);
    const img = document.querySelector("img");
    expect(screen.getByLabelText("Replace this photo")).toBeTruthy();
    fireEvent.error(img);
    expect(screen.getByText(/Tap to upload a photo/)).toBeTruthy();
  });
});

describe("ROM / MMT / special-test info sheet photo", () => {
  const openSheet = () => {
    render(<InfoButton title="Hip flexion" richItem={{ title: "Hip flexion", image: "rom_hip_flexion", perform: <div>How to perform</div> }} />);
    fireEvent.click(screen.getByRole("button", { name: /ⓘ/ }));
  };

  it("shows a non-admin nothing, not even a box, when the photo is missing", () => {
    openSheet();
    expect(screen.getByText("How to perform")).toBeTruthy();
    const img = document.querySelector(".sheet-hero img");
    expect(document.querySelector(".sheet-hero").style.display).toBe("none");
    fireEvent.error(img);
    expect(document.querySelector(".sheet-hero")).toBeNull();
    expect(screen.queryByText(/Tap to add a reference photo/)).toBeNull();
    expect(screen.queryByText(/No reference photo/)).toBeNull();
  });

  it("shows a non-admin the photo once it has loaded, with no Replace button", () => {
    openSheet();
    fireEvent.load(document.querySelector(".sheet-hero img"));
    expect(document.querySelector(".sheet-hero").style.display).not.toBe("none");
    expect(screen.queryByLabelText("Replace photo")).toBeNull();
  });

  it("gives an admin the add-photo box and the Replace button", () => {
    mockAdmin = true;
    openSheet();
    expect(screen.getByLabelText("Replace photo")).toBeTruthy();
    fireEvent.error(document.querySelector(".sheet-hero img"));
    expect(screen.getByText(/Tap to add a reference photo/)).toBeTruthy();
  });

  it("shows nobody a 'No reference photo' box when the item has no photo id", () => {
    mockAdmin = true;
    render(<InfoButton title="Test" richItem={{ title: "Test", perform: <div>How</div> }} />);
    fireEvent.click(screen.getByRole("button", { name: /ⓘ/ }));
    expect(screen.queryByText(/No reference photo/)).toBeNull();
  });
});

describe("AI Objective finding photos", () => {
  const finding = () => render(<FindingCard index={0} icon="ti-eye" label="Swelling" active={false} onToggle={() => {}} photoId="physiom_findings/knee/observation/swelling" />);

  it("hides the photo tile from a non-admin until the photo loads, and removes it if there is none", () => {
    finding();
    const img = document.querySelector("img");
    expect(img.parentElement.style.display).toBe("none");
    fireEvent.load(img);
    expect(img.parentElement.style.display).not.toBe("none");
    fireEvent.error(img);
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector(".ti-camera-plus")).toBeNull();
    expect(screen.getByText("Swelling")).toBeTruthy();
  });

  it("keeps the add-photo tile for an admin", () => {
    mockAdmin = true;
    finding();
    fireEvent.error(document.querySelector("img"));
    expect(document.querySelector(".ti-camera-plus")).toBeTruthy();
  });

  it("the ROM / special-test photo tile is nothing for a non-admin with no photo, and the add tile for an admin", () => {
    const { container, unmount } = render(<PatientPhotoTile photoId="physiom_findings/knee/rom/flexion" />);
    fireEvent.error(container.querySelector("img"));
    expect(container.innerHTML).toBe("");
    unmount();
    mockAdmin = true;
    const second = render(<PatientPhotoTile photoId="physiom_findings/knee/rom/flexion" />);
    fireEvent.error(second.container.querySelector("img"));
    expect(second.container.querySelector(".ti-camera-plus")).toBeTruthy();
  });
});

describe("Learn detail photo", () => {
  it("leaves nothing for a missing full-size photo that has no icon of its own", () => {
    const { container } = render(<StudyImage name={null} full />);
    expect(container.innerHTML).toBe("");
  });

  it("keeps a caller's own icon", () => {
    render(<StudyImage name={null} full fallback={<span>heart icon</span>} />);
    expect(screen.getByText("heart icon")).toBeTruthy();
  });
});

describe("Learn grid cards", () => {
  const thumbs = (c) => c.querySelectorAll(".h-32");

  it("gives a card with no photo and no icon no image box at all", () => {
    const { container } = render(<StudyGrid items={[{ id: "a", title: "Spurling's Test" }]} onSelect={() => {}} />);
    expect(thumbs(container).length).toBe(0);
    expect(screen.getByText("Spurling's Test")).toBeTruthy();
  });

  it("drops the box when the card's photo turns out to be missing", () => {
    const { container } = render(<StudyGrid items={[{ id: "a", title: "Spurling's Test", image: "special_spurling" }]} onSelect={() => {}} />);
    expect(thumbs(container).length).toBe(1);
    fireEvent.error(container.querySelector("img"));
    expect(thumbs(container).length).toBe(0);
  });

  it("keeps the box for a card that has its own emoji", () => {
    const { container } = render(<StudyGrid items={[{ id: "a", title: "Barthel", emoji: "🧑‍🦽" }]} onSelect={() => {}} />);
    expect(thumbs(container).length).toBe(1);
  });
});

describe("Learn special-test cards", () => {
  it("show no 'Sens —' or 'Spec —' pill for a test with no published figure, but keep real figures", () => {
    render(<SpecialStudy onBack={() => {}} />);
    // Cervical Spine tab: Spurling's has figures; Costoclavicular-type tests are stored with "—".
    expect(screen.getAllByText(/^Sens \d/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/^Sens —$/).length).toBe(0);
    expect(screen.queryAllByText(/^Spec —$/).length).toBe(0);
  });

  it("lets each grid card keep its own height instead of stretching to the tallest in its row", () => {
    const { container } = render(<StudyGrid items={[{ id: "a", title: "A" }, { id: "b", title: "B" }]} onSelect={() => {}} />);
    expect(container.querySelector(".grid").className).toMatch(/items-start/);
  });
});
