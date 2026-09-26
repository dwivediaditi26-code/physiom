// Coverage for the 2026-09-03 AI-assisted Ortho Outpatient fixes:
//  1. (Removed.) "Select from old patient data" was taken out of the
//     Subjective step on 2026-09-11 (b7fe240), and its list screen with it.
//  2. The region the narrative already named is carried through, so the
//     region screen opens pre-ticked instead of empty.
//  3. Everything /api/parse extracts reaches the form (demographics + red
//     flags, not just Subjective/Pain) and is also shown verbatim.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import {
  regionsFromParseResult,
  mapParseResultToOrthoUpdates,
  extractedRows,
} from "../orthoAiIntake.js";

describe("regionsFromParseResult", () => {
  it("maps the parse enum onto the wizard's own region ids, with the narrative's side", () => {
    expect(regionsFromParseResult({ region: "Shoulder (R)" })).toEqual([{ id: "shoulder", side: "Right" }]);
    expect(regionsFromParseResult({ region: "Hip / Groin", laterality: "Left" })).toEqual([{ id: "hip", side: "Left" }]);
    // Spine regions are sideless in this wizard -- laterality is dropped.
    expect(regionsFromParseResult({ region: "Lumbar / SI", laterality: "Right" })).toEqual([{ id: "lumbar", side: "" }]);
  });

  it("carries additionalRegions through and never duplicates a region", () => {
    const out = regionsFromParseResult({ region: "Cervical spine", additionalRegions: ["Knee (L)", "Cervical spine"] });
    expect(out).toEqual([{ id: "cervical", side: "" }, { id: "knee", side: "Left" }]);
  });

  it("resolves the one Elbow/Wrist/Hand bucket from the narrative's own wording", () => {
    expect(regionsFromParseResult({ region: "Elbow/Wrist/Hand", chiefComplaint: "Lateral elbow pain" })[0].id).toBe("elbow");
    expect(regionsFromParseResult({ region: "Elbow/Wrist/Hand", locationDescription: "Numb fingers at night" })[0].id).toBe("hand");
    expect(regionsFromParseResult({ region: "Elbow/Wrist/Hand" })[0].id).toBe("wrist");
  });

  it("returns nothing when the narrative named no body area", () => {
    expect(regionsFromParseResult({ region: null })).toEqual([]);
  });
});

describe("mapParseResultToOrthoUpdates — the whole extraction reaches the form", () => {
  const result = {
    chiefComplaint: "Post-op right shoulder stiffness",
    age: 25,
    sex: "Male",
    occupation: "Painter",
    region: "Shoulder (R)",
    laterality: "Right",
    nrsNow: 6,
    flags: ["Night pain waking the patient"],
    hasBladderBowelSymptoms: true,
  };

  it("fills Demographics from age/sex/occupation/laterality", () => {
    expect(mapParseResultToOrthoUpdates(result).demographics).toEqual({
      age: "25",
      sex: "Male",
      occupation: "Painter",
      affectedSide: "Right",
    });
  });

  it("writes red flags into the screen's free-text notes only, never its clinical checklists", () => {
    const { redFlags } = mapParseResultToOrthoUpdates(result);
    expect(Object.keys(redFlags)).toEqual(["grf_notes"]);
    expect(redFlags.grf_notes).toMatch(/Night pain waking the patient/);
    expect(redFlags.grf_notes).toMatch(/cauda equina/i);
  });

  it("still fills Subjective and Pain, and carries the regions it heard", () => {
    const updates = mapParseResultToOrthoUpdates(result);
    expect(updates.subjective.chiefComplaint).toBe("Post-op right shoulder stiffness");
    expect(updates.pain.current).toBe("6");
    expect(updates.regions).toEqual([{ id: "shoulder", side: "Right" }]);
  });

  it("keeps the extraction verbatim for the read-only 'as extracted' panel", () => {
    const rows = extractedRows(result);
    expect(rows.find((r) => r.key === "chiefComplaint").value).toBe("Post-op right shoulder stiffness");
    expect(rows.find((r) => r.key === "hasBladderBowelSymptoms").value).toBe("Yes");
    // Nothing null/empty is padded in.
    expect(rows.every((r) => r.value)).toBe(true);
  });
});

describe("SubjectiveSection entry options", () => {
  it("no longer offers 'Select from old patient data' (removed 2026-09-11)", async () => {
    const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");
    render(
      <SubjectiveSection
        data={{}}
        setData={vi.fn()}
        selectedRegions={[]}
        regionLabelOf={(r) => r.id}
        patientData={{ cc_main: "Low back ache" }}
      />
    );
    expect(screen.queryByText(/Select from old patient data/)).toBeNull();
  });
});
