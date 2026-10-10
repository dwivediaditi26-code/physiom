// regionGroupFilledSummary.test.jsx -- Aditi (2026-10-10), two screenshots of the Region-specific subjective area:
//   1. "it should show if it is filled": a collapsed group said only "(1/3)"; it now also shows WHAT is ticked, in one short line.
//   2. "it is taking too much space": the long explanation under the heading is now two lines, with the rest under "More".
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");

function show(regions) {
  document.body.innerHTML = "";
  const data = { subjective: { regions } };
  return render(
    <SubjectiveSection data={data} setData={() => {}} selectedRegions={[{ id: "hip", label: "Hip" }]} setSelectedRegions={() => {}} regionLabelOf={(r) => r.label} requireAuth={() => true} />
  );
}
const heads = () => [...document.querySelectorAll(".collapsible-head")];
const headOf = (title) => heads().find((h) => h.textContent.includes(title));

describe("collapsed groups show what is filled in", () => {
  it("shows the ticked answers under the group name, with a check mark and the count", () => {
    show({ hip: { location: "Anterior hip / hip flexor region", mechanism: "Twisting / pivoting mechanism, Fall", aggravating: "Prolonged sitting" } });
    const loc = headOf("Location");
    expect(loc.textContent).toMatch(/✓ Location/);
    expect(loc.querySelector(".collapsible-head-sub").textContent).toBe("Anterior hip / hip flexor region");
    const mech = headOf("Mechanism");
    expect(mech.querySelector(".collapsible-head-sub").textContent).toBe("Twisting / pivoting mechanism, Fall · Prolonged sitting");
    expect(mech.querySelector(".collapsible-head-sub").getAttribute("title")).toBe("Twisting / pivoting mechanism, Fall · Prolonged sitting");
  });

  it("a group with nothing ticked shows no summary and no check mark", () => {
    show({ hip: { location: "Anterior groin" } });
    const pattern = headOf("Pattern");
    expect(pattern.querySelector(".collapsible-head-sub")).toBeNull();
    expect(pattern.textContent).not.toMatch(/✓/);
  });

  it("opening a group hides its summary (the answers are shown in full below)", () => {
    show({ hip: { location: "Anterior groin" } });
    const loc = headOf("Location");
    expect(loc.querySelector(".collapsible-head-sub")).not.toBeNull();
    fireEvent.click(loc);
    expect(headOf("Location").querySelector(".collapsible-head-sub")).toBeNull();
  });
});

describe("the explanation under Region-specific subjective is short", () => {
  it("the visible part is the star line and the ranking rule; the rest sits in a closed 'More'", () => {
    show({});
    const more = document.querySelector("details.star-more");
    expect(more).not.toBeNull();
    expect(more.hasAttribute("open")).toBe(false);
    const hint = more.parentElement;
    const visible = [...hint.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
    expect(visible).toMatch(/this answer changes which conditions/);
    expect(visible).toMatch(/ranks once Chief complaint, Onset or Duration and 2 ⭐ answers are filled in/);
    expect(visible.length).toBeLessThan(220);
    expect(more.textContent).toMatch(/lightly read/);
  });
});
