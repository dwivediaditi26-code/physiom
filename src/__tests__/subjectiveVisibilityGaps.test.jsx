// Regression test for a real gap the user hit live: a shoulder patient
// (Priya Soni) was parsed with the AI intake tool -- goal_main, pmh_notes,
// and shr_fn_notes all landed correctly (confirmed via Live SOAP's text,
// which reads exactly those fields) -- but neither SOAPNoteModule's own
// JSX "S · Subjective" card nor PatientProfileModal's Subjective tab
// showed the patient's goal, PMH/medications, or functional limitations
// at all. Same class of bug as neuroVisibilityFix.test.jsx: these two
// screens scan their OWN independent field lists rather than reusing
// buildRealtimeSOAP's, so they'd silently drifted behind it.
//
// SOAPNoteModule was missing pmh_notes and goal_main entirely, and its
// per-region "Clinician notes" card had no fn_notes category (agg/rel/
// loc/moi/symp notes only). PatientProfileModal's Subjective tab read an
// older field convention throughout (ar_goal_*/phx_conditions/med_current/
// _agg_mov/_fn_adl) that doesn't overlap with what the AI parser (or the
// manual dictation flow) actually writes (goal_main/pmh_notes/_agg_notes/
// _rel_notes/_fn_notes) -- fixed with additive fallbacks so data from
// either convention displays, without changing existing behaviour for
// records already using the older fields.

import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SOAPNoteModule } from "../ClinicalModules.jsx";
import { PatientProfileModal } from "../PatientDatabase.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }, from: () => ({ select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }) } }));

// Mirrors exactly what mapParseResultToUpdates would have written for the
// real "Priya Soni" shoulder case: goal_main, pmh_notes, and shr_fn_notes
// all set by the AI parser, none of it clinician-authored (ar_goal_*,
// pmh_conditions, med_current) or from the older dropdown fields.
const priyaData = {
  dem_name: "priya soni", dem_age: "46", dem_sex: "Female", dem_occupation: "school teacher",
  cx_selected_regions: JSON.stringify(["Shoulder (R)"]),
  cc_main: "Right shoulder pain, difficulty lifting arm and sleeping on side",
  cc_duration: "3–6 months (chronic)", cc_onset: "Gradual — insidious",
  cc_vas_now: "3", cc_vas_worst: "8",
  shr_pattern: "Mechanical — clearly varies with movement/position/load",
  shr_night: "Wakes up due to pain when sleeping on right side",
  shr_agg_notes: "Lifting arm above shoulder level\nReaching behind back\nComb hair\nFastening bra\nWriting on classroom board\nHanging clothes",
  shr_rel_notes: "Taking a hot shower\nResting arm",
  shr_fn_notes: "Difficulty writing on classroom board\nDifficulty hanging clothes",
  pmh_notes: "Type 2 diabetes for ten years, controlled with metformin; no other major medical problems. Medications: Metformin",
  goal_main: "Regain full shoulder movement and return to normal daily activities without pain",
};

describe("SOAPNoteModule's on-screen S card shows AI-parsed goal/PMH/functional data", () => {
  it("shows the patient's stated goal (goal_main), distinct from clinician treatment goals", () => {
    const { container } = render(<SOAPNoteModule data={priyaData} set={vi.fn()} initialTab="S" />);
    expect(container.innerHTML).toContain("Regain full shoulder movement");
  });

  it("shows PMH/medications from pmh_notes even when pmh_conditions/med_current were never set", () => {
    const { container } = render(<SOAPNoteModule data={priyaData} set={vi.fn()} initialTab="S" />);
    expect(container.innerHTML).toContain("Type 2 diabetes");
    expect(container.innerHTML).toContain("Metformin");
  });

  it("includes functional limitations as their own category in the per-region Clinician notes card", () => {
    const { container } = render(<SOAPNoteModule data={priyaData} set={vi.fn()} initialTab="S" />);
    const html = container.innerHTML;
    expect(html).toContain("Functional limitations");
    expect(html).toContain("Difficulty writing on classroom board");
  });
});

describe("PatientProfileModal's Subjective tab shows the same AI-parsed data", () => {
  it("shows the patient goal and PMH/medications via the goal_main/pmh_notes fallback", () => {
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: priyaData }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="subjective" />
    );
    const html = container.innerHTML;
    expect(html).toContain("Regain full shoulder movement");
    expect(html).toContain("Type 2 diabetes");
  });

  it("shows aggravating/relieving/functional-limitation text from the _notes fields in the per-region card", () => {
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: priyaData }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="subjective" />
    );
    const html = container.innerHTML;
    expect(html).toContain("Reaching behind back");
    expect(html).toContain("Taking a hot shower");
    expect(html).toContain("Difficulty writing on classroom board");
  });

  it("still shows older-convention data untouched (no regression for records not using the AI parser)", () => {
    const legacyData = {
      cx_selected_regions: JSON.stringify(["Knee (R)"]),
      ar_goal_pain: "Reduce pain to 2/10", phx_conditions: "Hypertension, well controlled",
      knr_agg_mov: "squatting|stairs",
    };
    const { container } = render(
      <PatientProfileModal patient={{ id: "1", data: legacyData }} onClose={() => {}} onLoadAssessment={() => {}} onSaveField={() => {}} onNav={() => {}} initialTab="subjective" />
    );
    const html = container.innerHTML;
    expect(html).toContain("Reduce pain to 2/10");
    expect(html).toContain("Hypertension");
    expect(html).toContain("squatting");
  });
});
