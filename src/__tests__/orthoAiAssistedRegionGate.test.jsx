// orthoAiAssistedRegionGate.test.jsx
// Regression coverage for: "region selection is not happening in AI...
// while speaking... it's not taking the region" (2026-09-26, Aditi).
//
// The "AI Assisted Assessment" entry's journey dots (AiJourneyDots,
// jumpableIndices = AI_PRE_WIZARD_JUMPABLE = {0,1,2,3,4} in OrthoAssessment.jsx)
// let a clinician jump straight from Demographics to Subjective, past
// Region's own canProceedRegion gate (which normally requires at least one
// region ticked before continuing). If the spoken/written narrative then
// doesn't clearly name a body region either, applyIntakeUpdates() used to
// still advance straight to step 3 with selectedRegions still empty --
// Objective/Summary then have nothing to show and there's no visible
// explanation why. It should instead send the clinician back to Region
// with a clear message, not silently go nowhere.
// Since 2026-10-10 the paragraph card lives on the wizard's own Subjective step
// (no pre-wizard chooser screen), so the same safety net now sits there: what the
// AI filled stays, and the clinician lands on Region with the message.
import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../supabase.js", () => import("../__mocks__/supabase.js"));

const { default: OrthoAssessment } = await import("../OrthoAssessment.jsx");

async function openAiPanelAndParse(narrative) {
  // The optional paragraph card is on the Subjective step AI entry opens on, so there is
  // nothing to click before typing (it loads a moment after the page).
  fireEvent.change(await screen.findByPlaceholderText(/45-year-old with gradual onset/), { target: { value: narrative } });
  fireEvent.click(screen.getByRole("button", { name: "Generate with AI" }));
}

describe("OrthoAssessment — AI-assisted entry's region gate", () => {
  let alertSpy;
  beforeEach(() => {
    alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {});
  });
  afterEach(() => {
    alertSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it("sends the clinician back to Region (with a message) when the narrative names no region and none was picked manually", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chiefComplaint: "Generalized aches", region: null, additionalRegions: [] }),
    }));

    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    await openAiPanelAndParse("I have some generalized body aches for a while now.");

    await screen.findByRole("button", { name: /Apply to Subjective/ });
    fireEvent.click(screen.getByRole("button", { name: /Apply to Subjective/ }));

    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/didn't clearly name a body region/i));
    expect((await screen.findAllByText("Body Region")).length).toBeGreaterThan(0);
    // Went to Region, not to Objective/Summary with nothing to show.
    expect(screen.queryByText("Analyze your case")).toBeNull();
  });

  it("proceeds straight through when the narrative does name a region, same as before", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ chiefComplaint: "Right shoulder pain", region: "Shoulder (R)", additionalRegions: [] }),
    }));

    render(<OrthoAssessment entryMode="ai" onSave={() => {}} />);
    await openAiPanelAndParse("My right shoulder has been hurting for two weeks.");

    await screen.findByRole("button", { name: /Apply to Subjective/ });
    fireEvent.click(screen.getByRole("button", { name: /Apply to Subjective/ }));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(screen.queryByText("Body Region")).toBeNull();
  });
});
