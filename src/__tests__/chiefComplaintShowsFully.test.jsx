// chiefComplaintShowsFully.test.jsx -- Aditi (2026-10-10): "chief complaint should show fully". The Chief complaint box grows to
// the height of its text instead of scrolling inside two rows. Other text areas keep their fixed size.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { TextArea } = await import("../orthoFieldKit.jsx");
const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");

// jsdom has no layout, so give the textarea a height that depends on how much text it holds (20px per 40 characters).
const realScrollHeight = Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight");
function fakeLayout() {
  Object.defineProperty(HTMLTextAreaElement.prototype, "scrollHeight", {
    configurable: true,
    get() { return Math.max(1, Math.ceil(this.value.length / 40)) * 20; },
  });
}
afterEach(() => {
  if (realScrollHeight) Object.defineProperty(Element.prototype, "scrollHeight", realScrollHeight);
  delete HTMLTextAreaElement.prototype.scrollHeight;
});

describe("auto-growing text area", () => {
  it("is as tall as its text, and grows when the text grows", () => {
    fakeLayout();
    const { rerender } = render(<TextArea label="X" autoGrow value={"a".repeat(80)} onChange={() => {}} />);
    const box = screen.getByRole("textbox");
    expect(box.style.height).toBe("40px");
    rerender(<TextArea label="X" autoGrow value={"a".repeat(200)} onChange={() => {}} />);
    expect(box.style.height).toBe("100px");
    rerender(<TextArea label="X" autoGrow value="" onChange={() => {}} />);
    expect(box.style.height).toBe("20px");
  });

  it("typing still reaches onChange", () => {
    fakeLayout();
    const seen = [];
    render(<TextArea label="X" autoGrow value="" onChange={(v) => seen.push(v)} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "knee pain" } });
    expect(seen).toEqual(["knee pain"]);
  });

  it("other text areas keep their fixed two rows (no inline height)", () => {
    fakeLayout();
    render(<TextArea label="Y" value={"a".repeat(300)} onChange={() => {}} />);
    const box = screen.getByRole("textbox");
    expect(box.style.height).toBe("");
    expect(box.getAttribute("rows")).toBe("2");
  });
});

describe("Subjective step", () => {
  it("Chief complaint uses the growing box; Previous treatment does not", () => {
    fakeLayout();
    const long = "Deep anterior hip pain on sitting for long periods, worse getting out of the car. They also rolled the ankle inwards on uneven ground, outer ankle swollen.";
    render(
      <SubjectiveSection data={{ subjective: { chiefComplaint: long } }} setData={() => {}} selectedRegions={[]} setSelectedRegions={() => {}} regionLabelOf={(r) => r.label} requireAuth={() => true} />
    );
    const chief = screen.getByPlaceholderText("In the patient's own words...");
    expect(chief.value).toBe(long);
    expect(chief.style.height).toBe(Math.ceil(long.length / 40) * 20 + "px");
    expect(screen.getByPlaceholderText(/Prior physio, injections/).style.height).toBe("");
  });
});
