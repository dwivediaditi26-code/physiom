// aiIntakeParser.test.jsx
// Covers wiring the AI dictation/intake feature into the AI Assistant
// chat window. The user reported "when speaking to AI it is not taking
// my word" -- investigation found the AI Assistant chat had no write
// path to the patient record at all (no `set` prop, /api/chat only ever
// returns a text reply). Meanwhile SubjectiveObjective.jsx already had a
// complete, working dictation feature (mic/text button -> /api/parse ->
// review -> apply), just not reachable from the chat the user was
// actually using.
//
// Extracted that feature's field-mapping logic into aiIntakeParser.js so
// both surfaces share exactly one implementation (no drift risk), wired
// a new extraction path into AIAssistant.jsx reusing it, and fixed a
// real gap found while extracting: the AI already returns a `flags`
// array of red-flag phrases it noticed, but the original code silently
// discarded it. Now surfaced as a prompt to screen, appended to the
// real, visible neuro_clinician_notes field -- never auto-marked
// positive/negative.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
import { mapParseResultToUpdates, REGION_PREFIX_MAP } from "../aiIntakeParser.js";
import AIAssistant from "../AIAssistant.jsx";

// The user's own real dictation example, as /api/parse would plausibly
// structure it from "25 year old, post-op stiffness and limited ROM
// right shoulder, 2 months back had greater tuberosity fracture, post-op
// stiffness and pain due to RTA".
const shoulderRTAResult = {
  age: 25, sex: "Male", occupation: null,
  region: "Shoulder", laterality: "Right",
  duration: "6 weeks–3 months", onset: "Post-surgical",
  nrsNow: 5, nrsWorst: 7, nrsBest: 2,
  painQuality: ["Aching", "Tightness"],
  aggMovements: ["overhead reaching", "external rotation"],
  aggActivities: [],
  relMovements: ["rest"],
  hasRadiation: false,
  neuroSymptoms: [],
  flags: ["post-surgical — screen for infection signs", "screen for DVT given recent surgery"],
};

describe("mapParseResultToUpdates — the shared extraction logic", () => {
  it("maps demographics, chief complaint, and region-prefixed fields correctly for the shoulder RTA example", () => {
    const { updates, region } = mapParseResultToUpdates(shoulderRTAResult, {});
    expect(updates.dem_age).toBe("25");
    expect(updates.dem_sex).toBe("Male");
    expect(updates.cc_duration).toBe("6 weeks–3 months");
    expect(updates.cc_onset).toBe("Post-surgical");
    expect(updates.cc_vas_now).toBe("5");
    expect(region).toBe("Shoulder (R)");
    expect(REGION_PREFIX_MAP[region]).toBe("shr");
    expect(updates.shr_agg_notes).toContain("overhead reaching");
    expect(updates.shr_rel_notes).toContain("rest");
  });

  it("surfaces red flags for review without ever auto-marking them positive or negative", () => {
    const { redFlagsToReview, updates } = mapParseResultToUpdates(shoulderRTAResult, {});
    expect(redFlagsToReview).toEqual(["post-surgical — screen for infection signs", "screen for DVT given recent surgery"]);
    // The mapping function itself never touches any nrf_/red-flag field directly
    expect(Object.keys(updates).some(k => k.startsWith("nrf_"))).toBe(false);
  });

  it("produces a human-readable filled-field summary", () => {
    const { filledLabels } = mapParseResultToUpdates(shoulderRTAResult, {});
    expect(filledLabels).toContain("Age");
    expect(filledLabels).toContain("Duration");
    expect(filledLabels).toContain("Aggravating factors");
    expect(filledLabels).toContain("Region: Shoulder (R)");
  });

  it("returns no region/prefix when the AI could not classify one", () => {
    const { updates, region } = mapParseResultToUpdates({ age: 40 }, {});
    expect(region).toBeNull();
    expect(updates.dem_age).toBe("40");
  });

  it("left-side shoulder and knee laterality map to the correct distinct prefixes", () => {
    expect(mapParseResultToUpdates({ region: "Shoulder", laterality: "Left" }, {}).region).toBe("Shoulder (L)");
    expect(mapParseResultToUpdates({ region: "Knee", laterality: "Left" }, {}).region).toBe("Knee (L)");
  });
});

describe("AI Assistant chat — extraction flow", () => {
  it("shows the 'Fill patient record' button only when a set function is provided", () => {
    const { rerender } = render(<AIAssistant data={{}} onClose={() => {}} />);
    expect(screen.queryByText(/Fill patient record/)).not.toBeInTheDocument();
    rerender(<AIAssistant data={{}} set={vi.fn()} onClose={() => {}} />);
    expect(screen.getByText(/Fill patient record/)).toBeInTheDocument();
  });

  it("extracting the user's narrative shows a review card with real fields, and confirming calls set() with the mapped updates", async () => {
    const setMock = vi.fn();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(shoulderRTAResult) })
    );

    render(<AIAssistant data={{}} set={setMock} onClose={() => {}} />);
    const textarea = screen.getByPlaceholderText(/Ask about this patient/);
    fireEvent.change(textarea, { target: { value: "25 year old, post-op stiffness right shoulder, RTA fracture 2 months back" } });
    fireEvent.click(screen.getByText(/Fill patient record from this instead/));

    await waitFor(() => expect(screen.getByText(/Found \d+ field/)).toBeInTheDocument());
    expect(screen.getByText(/Worth screening/)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith("/api/parse", expect.objectContaining({ method: "POST" }));

    fireEvent.click(screen.getByText("✓ Confirm and fill record"));
    expect(setMock).toHaveBeenCalledTimes(1);
    const savedUpdates = setMock.mock.calls[0][0];
    expect(savedUpdates.dem_age).toBe("25");
    expect(savedUpdates.neuro_clinician_notes).toContain("infection signs");
    expect(screen.getByText(/Filled \d+ field/)).toBeInTheDocument();
  });

  it("discarding a review card removes it without ever calling set()", async () => {
    const setMock = vi.fn();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ age: 30 }) })
    );
    render(<AIAssistant data={{}} set={setMock} onClose={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText(/Ask about this patient/), { target: { value: "30 year old with back pain" } });
    fireEvent.click(screen.getByText(/Fill patient record from this instead/));
    await waitFor(() => expect(screen.getByText(/Found \d+ field/)).toBeInTheDocument());
    fireEvent.click(screen.getByText("Discard"));
    expect(screen.queryByText(/Found \d+ field/)).not.toBeInTheDocument();
    expect(setMock).not.toHaveBeenCalled();
  });
});
