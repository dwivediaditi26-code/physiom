// normalOrthoNoAiWording.test.jsx -- Aditi (2026-10-10): "this is the normal ortho ... it should not say the AI, there is nothing here
// in the AI". The normal Ortho assessment has no "AI Objective Assessment" step, so the Subjective step must not show the ⭐ marks, the
// line that explains them, or an empty "From AI intake" box. The AI-assisted flow (aiEntry) keeps all three.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");

function show(regionId, { aiEntry, data } = {}) {
  document.body.innerHTML = "";
  return render(
    <SubjectiveSection data={data || {}} setData={() => {}} selectedRegions={[{ id: regionId, label: regionId }]} setSelectedRegions={() => {}}
      regionLabelOf={(r) => r.label} requireAuth={() => true} aiEntry={aiEntry} />
  );
}
const text = () => document.body.textContent;
// The groups start collapsed (no questions on screen), so open every one before looking for stars.
function openAllGroups() {
  document.querySelectorAll(".collapsible-head").forEach((b) => fireEvent.click(b));
}

describe("normal Ortho assessment (not AI-assisted)", () => {
  it.each(["knee", "hip", "ankleFoot", "shoulder", "lumbar"])("%s: no star marks, no star line, no 'AI Objective Assessment'", (id) => {
    show(id);
    expect(screen.getByText("Region-specific subjective")).toBeTruthy();
    const before = document.querySelectorAll(".field-label").length;
    openAllGroups();
    expect(document.querySelectorAll(".field-label").length).toBeGreaterThan(before + 3); // the region questions really are on screen now
    expect(text()).not.toMatch(/⭐/);
    expect(text()).not.toMatch(/AI Objective Assessment/);
    expect(text()).not.toMatch(/this answer changes which conditions/);
  });

  it("no empty 'From AI intake' box", () => {
    show("knee");
    expect(screen.queryByText(/From AI intake/)).toBeNull();
  });

  it("the region questions themselves are still there", () => {
    show("knee");
    expect(screen.getAllByRole("button").some((b) => /Location|Mechanism/.test(b.textContent))).toBe(true);
  });

  it("a note the AI intake panel already wrote is still shown, and is honestly labelled", () => {
    show("knee", { data: { subjective: { regions: { knee: { aiNotes: "Twisted the knee playing football." } } } } });
    expect(screen.getByText(/From AI intake/)).toBeTruthy();
    expect(screen.getByDisplayValue("Twisted the knee playing football.")).toBeTruthy();
  });
});

describe("AI-assisted flow (aiEntry)", () => {
  it("keeps the star marks, the star line and the 'From AI intake' box", () => {
    show("knee", { aiEntry: true });
    openAllGroups();
    expect([...document.querySelectorAll(".field-label")].some((l) => l.textContent.startsWith("⭐"))).toBe(true);
    expect(text()).toMatch(/AI Objective Assessment/);
    expect(screen.getByText(/From AI intake/)).toBeTruthy();
  });
});
