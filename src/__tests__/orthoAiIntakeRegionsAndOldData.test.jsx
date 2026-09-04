// Coverage for the 2026-09-03 AI-assisted Ortho Outpatient fixes:
//  1. "Select from old patient data" lists real records to choose from
//     instead of blind-importing one hardcoded source.
//  2. The region the narrative already named is carried through, so the
//     region screen opens pre-ticked instead of empty.
//  3. Everything /api/parse extracts reaches the form (demographics + red
//     flags, not just Subjective/Pain) and is also shown verbatim.
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import {
  regionsFromParseResult,
  listOldPatientRecords,
  updatesFromOldRecord,
  mapParseResultToOrthoUpdates,
  extractedRows,
} from "../orthoAiIntake.js";
import OrthoOldDataPicker from "../OrthoOldDataPicker.jsx";

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

describe("listOldPatientRecords", () => {
  const snapshot = JSON.stringify({
    savedAt: "2026-08-01T10:00:00.000Z",
    regions: "Right Shoulder",
    condition: "Soft-tissue Injury",
    selectedRegions: [{ id: "shoulder", side: "Right" }],
    data: {
      subjective: { chiefComplaint: "Right shoulder pain", duration: "3 weeks", regions: { shoulder: { irritability: "Moderate" } } },
      pain: { current: "5" },
    },
  });

  it("lists every prior record on the patient, with a preview of what it would bring in", () => {
    const records = listOldPatientRecords({
      ortho_outpatient_assessment: snapshot,
      cc_main: "Low back ache",
      goal_main: "Return to gym",
    });
    expect(records.map((r) => r.id)).toEqual(["ortho_outpatient_assessment", "old_flow_subjective"]);
    expect(records[0].sublabel).toMatch(/Right Shoulder/);
    expect(records[0].rows.map((r) => r.label)).toContain("Chief complaint");
    expect(records[1].rows.map((r) => r.value)).toContain("Low back ache");
  });

  it("returns an empty list (not a broken record) for a patient with nothing on file", () => {
    expect(listOldPatientRecords({})).toEqual([]);
    expect(listOldPatientRecords(null)).toEqual([]);
    // A snapshot that failed to parse is skipped rather than thrown on.
    expect(listOldPatientRecords({ ortho_outpatient_assessment: "{not json" })).toEqual([]);
  });

  it("hands back the region selection and region checklist the record was recorded with", () => {
    const [record] = listOldPatientRecords({ ortho_outpatient_assessment: snapshot });
    const updates = updatesFromOldRecord(record);
    expect(updates.regions).toEqual([{ id: "shoulder", side: "Right" }]);
    expect(updates.subjective.regions).toEqual({ shoulder: { irritability: "Moderate" } });
    expect(updates.pain).toEqual({ current: "5" });
  });
});

describe("OrthoOldDataPicker", () => {
  const patientData = {
    ortho_outpatient_assessment: JSON.stringify({
      savedAt: "2026-08-01T10:00:00.000Z",
      regions: "Right Shoulder",
      data: { subjective: { chiefComplaint: "Right shoulder pain" }, pain: {} },
    }),
    cc_main: "Low back ache",
  };

  it("shows the list of records and only applies one when it is explicitly chosen", () => {
    const onApply = vi.fn();
    render(<OrthoOldDataPicker patientData={patientData} onApply={onApply} />);

    expect(screen.getByText(/Outpatient \/ Musculoskeletal assessment/)).toBeTruthy();
    expect(screen.getByText(/Subjective Assessment \(earlier flow\)/)).toBeTruthy();
    expect(onApply).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText(/Outpatient \/ Musculoskeletal assessment/));
    expect(screen.getByText("Right shoulder pain")).toBeTruthy();
    fireEvent.click(screen.getByText("Use this record"));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0].subjective.chiefComplaint).toBe("Right shoulder pain");
  });

  it("says so plainly when the patient has no earlier record, instead of doing nothing", () => {
    render(<OrthoOldDataPicker patientData={{}} onApply={vi.fn()} />);
    expect(screen.getByText(/Nothing on file for this patient yet/)).toBeTruthy();
  });
});

describe("SubjectiveSection — the three entry options", () => {
  it("offers 'Select from old patient data' and opens the real list on tap", async () => {
    const { SubjectiveSection } = await import("../orthoOutpatientSections.jsx");
    function Harness() {
      const [data, setData] = React.useState({});
      return (
        <SubjectiveSection
          data={data}
          setData={setData}
          selectedRegions={[]}
          regionLabelOf={(r) => r.id}
          patientData={{ cc_main: "Low back ache" }}
        />
      );
    }
    render(<Harness />);
    const trigger = screen.getByText(/Select from old patient data/);
    fireEvent.click(trigger);
    expect(screen.getByText(/Subjective Assessment \(earlier flow\)/)).toBeTruthy();
    fireEvent.click(screen.getByText("Use this record"));
    // Imported into the form itself, not just previewed.
    expect(screen.getByDisplayValue("Low back ache")).toBeTruthy();
  });
});
