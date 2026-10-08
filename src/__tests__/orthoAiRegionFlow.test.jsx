// orthoAiRegionFlow.test.jsx
// AI Parse -> Apply -> the manual Subjective form is filled the same way a
// clinician would fill it by hand: generic fields, pain, AND the region tab's
// own checklist (2026-10-07, Aditi: "see if the AI extracted subjective
// assessment fills out all the manual subjective assessment"). Uses the same
// cases as the live Playwright run, with /api/parse answered by the case's
// recorded `parse`.
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AI_REGION_CASES } from "../../e2e/ai-region-cases.js";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));
const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");
const { mapParseResultToOrthoUpdates } = await import("../orthoAiIntake.js");
const { formatSubjectiveSection } = await import("../orthoOutpatientSections.jsx");

afterEach(() => vi.restoreAllMocks());

async function parseAndApply(c) {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => c.parse })));
  render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
  fireEvent.change(screen.getByPlaceholderText(/45 year old office worker/), { target: { value: c.narrative } });
  fireEvent.click(screen.getByRole("button", { name: /Parse with AI/ }));
  await screen.findByText("Extracted Patient Information");
  fireEvent.click(screen.getByRole("button", { name: /Apply to Subjective/ }));
  await screen.findByText("Region-specific subjective");
}

function openAllRegionSections() {
  // every collapsed group header -> open it
  screen.getAllByRole("button").filter((b) => b.className.includes("collapsible-head")).forEach((b) => fireEvent.click(b));
}

describe("AI Parse fills the region-specific Subjective form", () => {
  const c = AI_REGION_CASES.find((x) => x.id === "shoulder-impingement");

  it("ticks the region checklist from the narrative and keeps the AI note", async () => {
    await parseAndApply(c);
    openAllRegionSections();
    const inputs = [...document.querySelectorAll("input.select-input")].map((i) => i.value);
    expect(inputs).toContain("Lateral shoulder (deltoid)");
    expect(inputs).toContain("Insidious / overuse");
    expect(inputs.some((v) => v.includes("Overhead reaching") && v.includes("Reaching behind back"))).toBe(true);
    expect(inputs).toContain("Worse at night");
    expect(screen.getByDisplayValue(/Chief complaint:/)).toBeTruthy(); // "From AI intake" note
  });

  it("shows how many fields in each group the AI answered", async () => {
    await parseAndApply(c);
    const heads = screen.getAllByRole("button").filter((b) => b.className.includes("collapsible-head")).map((b) => b.textContent);
    expect(heads.some((t) => /\(\d+\/\d+\)/.test(t))).toBe(true);
  });
});

describe("what the AI filled shows in Final Review and the PDF", () => {
  // Final Review and the PDF both print formatSubjectiveSection's rows.
  it("lists the region answers (not just the generic fields)", () => {
    const c = AI_REGION_CASES.find((x) => x.id === "knee-patellofemoral");
    const u = mapParseResultToOrthoUpdates(c.parse);
    const rows = formatSubjectiveSection({ ...u.subjective, regions: u.regionData });
    const asText = rows.map((r) => `${r.label}: ${r.value}`).join("\n");
    expect(asText).toMatch(/Knee — Aggravating movement: .*Stairs \(down\)/);
    expect(asText).toMatch(/Knee — Pain location: Around the kneecap/);
    expect(asText).toMatch(/Knee — Mechanism of injury: Insidious \/ overuse/);
    expect(asText).toMatch(/Chief complaint: Left anterior knee pain/);
    expect(asText).not.toMatch(/__aiExtracted/);
  });
});

describe("AI Parse screen offers manual entry", () => {
  it("has an 'Add manually instead' button that opens the manual Subjective form", () => {
    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Add manually instead/ }));
    expect(screen.queryByPlaceholderText(/45 year old office worker/)).toBeNull();
    expect(screen.getAllByText(/Chief complaint/).length).toBeGreaterThan(0);
  });
});
