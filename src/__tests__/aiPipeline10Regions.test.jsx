// Full 5-stage AI intake pipeline verification, across 10 different
// conditions spanning all 10 regions the real backend (api/parse.js)
// supports. For each condition this proves, against the ACTUAL
// production code paths (not reimplemented copies):
//
//   1. Speak or type   -- a natural, unstructured narrative goes in
//   2. AI extracts      -- mocked /api/parse response (matching the
//                          exact JSON shape api/parse.js's system
//                          prompt asks Groq for -- see that file)
//   3. You review        -- the extraction review card renders with the
//                          real detected fields, and any red flag the AI
//                          noticed is shown as a warning, never silently
//                          auto-applied
//   4. Auto-fills tabs   -- confirming calls the real `set()` with the
//                          same field IDs SubjectiveObjective.jsx's own
//                          manual form inputs write to, AND registers
//                          the region into cx_selected_regions so the
//                          Subjective tab actually unlocks analysis
//   5. Review & Analysis -- the resulting data is run through the real,
//                          unmodified runEngineV6() (the same function
//                          the manual "Review & Run Analysis" button
//                          calls) and must not crash
//
// Each case is deliberately a different body region + a different
// clinical picture (acute trauma, insidious/degenerative, post-surgical,
// overuse, sport injury) so this isn't just the same code path with the
// region swapped.

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIAssistant from "../AIAssistant.jsx";
import { runEngineV6 } from "../SubjectiveObjective.jsx";

vi.mock("../supabase.js", () => ({ supabase: { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) } } }));

Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});

const PC = { accent:"#7c3aed", a2:"#9333ea", bg:"#F7F7F8", surface:"#fff", border:"#e5e7eb", text:"#111827", muted:"#6b7280", isDark:false };

// ── 10 conditions, one per region api/parse.js supports ──────────────
const CASES = [
  {
    label: "Cervical spine -- whiplash from RTA, arm radiation + dizziness flag",
    region: "Cervical spine", prefix: "cx",
    narrative: "45 year old office worker, neck pain since a car accident nine days ago, sharp pain shooting into the right arm, and she says she gets dizzy when she turns her head quickly.",
    parseResult: {
      age: 45, sex: "Female", occupation: "Office worker", region: "Cervical spine", laterality: "Right",
      duration: "1–2 weeks (acute)", onset: "MVA / whiplash", nrsNow: 6, nrsWorst: 8, nrsBest: 3,
      painQuality: ["Sharp","Shooting"], aggMovements: ["Turning head", "Looking up"], aggActivities: ["Driving"],
      relMovements: ["Resting"], hasRadiation: true, radiationSide: "Right", radiationArea: "Right arm to forearm",
      neuroSymptoms: ["Tingling"], flags: ["Dizziness on quick head rotation -- screen for vertebrobasilar insufficiency"],
    },
  },
  {
    label: "Lumbar / SI -- lifting injury, leg radiation + bladder-change flag",
    region: "Lumbar / SI", prefix: "lx",
    narrative: "38 year old warehouse worker, threw his back out lifting a box four days ago, pain shooting down the left leg to the foot, and mentioned some difficulty starting urination since yesterday.",
    parseResult: {
      age: 38, sex: "Male", occupation: "Warehouse worker", region: "Lumbar / SI", laterality: "Left",
      duration: "< 1 week (hyperacute)", onset: "Lifting injury", nrsNow: 7, nrsWorst: 9, nrsBest: 4,
      painQuality: ["Sharp","Burning"], aggMovements: ["Bending forward","Sitting"], aggActivities: ["Lifting"],
      relMovements: ["Lying flat"], hasRadiation: true, radiationSide: "Left", radiationArea: "Left leg to foot",
      neuroSymptoms: ["Shooting pain","Numbness"], hasLegNeuro: true,
      flags: ["New difficulty initiating urination -- screen for cauda equina syndrome, same-day medical referral if confirmed"],
    },
  },
  {
    label: "Thoracic spine -- postural desk-worker mid-back pain",
    region: "Thoracic spine", prefix: "tx",
    narrative: "29 year old software developer, dull aching pain between the shoulder blades for about two months, worse by end of day at the desk, better after stretching.",
    parseResult: {
      age: 29, sex: "Male", occupation: "Software developer", region: "Thoracic spine", laterality: null,
      duration: "6 weeks–3 months", onset: "Gradual — insidious", nrsNow: 3, nrsWorst: 5, nrsBest: 1,
      painQuality: ["Dull","Aching"], aggMovements: ["Prolonged sitting"], aggActivities: ["Desk work"],
      relMovements: ["Stretching","Changing position"], hasRadiation: false, neuroSymptoms: [], flags: [],
    },
  },
  {
    label: "Shoulder (R) -- post-op fracture stiffness (user's own dictated example)",
    region: "Shoulder (R)", prefix: "shr",
    narrative: "25 year old patient, post op stiffness and limited ROM in the right shoulder, two months back had a greater tuberosity of humerus fracture and post op pain due to a road traffic accident.",
    parseResult: {
      age: 25, sex: null, occupation: null, region: "Shoulder", laterality: "Right",
      duration: "6 weeks–3 months", onset: "Post-surgical", nrsNow: 4, nrsWorst: 6, nrsBest: 2,
      painQuality: ["Aching","Tightness"], aggMovements: ["Overhead reaching","External rotation"], aggActivities: ["Dressing"],
      relMovements: ["Rest"], hasRadiation: false, neuroSymptoms: [], flags: [],
    },
  },
  {
    label: "Shoulder (L) -- frozen shoulder, insidious onset, night pain",
    region: "Shoulder (L)", prefix: "shl",
    narrative: "56 year old woman, left shoulder has been gradually stiffening over the last four months, no injury, wakes her at night, can't reach behind her back anymore.",
    parseResult: {
      age: 56, sex: "Female", occupation: null, region: "Shoulder", laterality: "Left",
      duration: "3–6 months (chronic)", onset: "Gradual — insidious", nrsNow: 4, nrsWorst: 7, nrsBest: 2,
      painQuality: ["Aching","Tightness"], aggMovements: ["Reaching behind back","Lying on that side"], aggActivities: ["Sleeping"],
      relMovements: ["Arm supported"], hasRadiation: false, neuroSymptoms: [],
      flags: [],
    },
  },
  {
    label: "Knee (L) -- ACL tear, twisting sports injury",
    region: "Knee (L)", prefix: "knl",
    narrative: "19 year old football player, twisted his left knee landing from a jump yesterday, heard a pop, swelling straight away, feels unstable and can't put full weight on it.",
    parseResult: {
      age: 19, sex: "Male", occupation: "Student athlete", region: "Knee", laterality: "Left",
      duration: "< 1 week (hyperacute)", onset: "Twisting injury", nrsNow: 6, nrsWorst: 9, nrsBest: 4,
      painQuality: ["Sharp","Throbbing"], aggMovements: ["Weight bearing","Pivoting"], aggActivities: ["Walking"],
      relMovements: ["Elevation","Ice"], hasRadiation: false, neuroSymptoms: [],
      flags: ["Reported instability/giving-way with an audible pop at time of injury -- screen for ACL rupture, consider imaging"],
    },
  },
  {
    label: "Knee (R) -- osteoarthritis, elderly, gradual onset",
    region: "Knee (R)", prefix: "knr",
    narrative: "68 year old retired teacher, right knee pain gradually worsening over two years, worse going down stairs, some grinding feeling, better resting.",
    parseResult: {
      age: 68, sex: "Female", occupation: "Retired", region: "Knee", laterality: "Right",
      duration: "> 2 years", onset: "Gradual — insidious", nrsNow: 3, nrsWorst: 6, nrsBest: 1,
      painQuality: ["Aching","Grinding"], aggMovements: ["Descending stairs","Squatting"], aggActivities: ["Walking long distances"],
      relMovements: ["Rest","Elevation"], hasRadiation: false, neuroSymptoms: [], flags: [],
    },
  },
  {
    label: "Hip / Groin -- sprinter hip flexor strain",
    region: "Hip / Groin", prefix: "hp",
    narrative: "22 year old sprinter, felt a sudden sharp pull in the right groin during a sprint drill three days ago, pain with hip flexion and kicking.",
    parseResult: {
      age: 22, sex: "Male", occupation: "Athlete", region: "Hip / Groin", laterality: "Right",
      duration: "< 1 week (hyperacute)", onset: "Sudden — traumatic", nrsNow: 4, nrsWorst: 7, nrsBest: 2,
      painQuality: ["Sharp","Tightness"], aggMovements: ["Hip flexion","Kicking","Sprinting"], aggActivities: ["Running"],
      relMovements: ["Rest","Ice"], hasRadiation: false, neuroSymptoms: [], flags: [],
    },
  },
  {
    label: "Ankle / Foot -- inversion sprain playing basketball",
    region: "Ankle / Foot", prefix: "af",
    narrative: "31 year old, rolled his left ankle landing awkwardly playing basketball two days ago, swelling and bruising on the outside of the ankle, painful to walk on.",
    parseResult: {
      age: 31, sex: "Male", occupation: null, region: "Ankle / Foot", laterality: "Left",
      duration: "< 1 week (hyperacute)", onset: "Sudden — traumatic", nrsNow: 5, nrsWorst: 8, nrsBest: 3,
      painQuality: ["Sharp","Throbbing"], aggMovements: ["Weight bearing","Inversion"], aggActivities: ["Walking"],
      relMovements: ["Elevation","Ice"], hasRadiation: false, neuroSymptoms: [], flags: [],
    },
  },
  {
    label: "Elbow/Wrist/Hand -- tennis elbow, repetitive strain",
    region: "Elbow/Wrist/Hand", prefix: "ew",
    narrative: "44 year old graphic designer, right elbow pain on the outside for about six weeks, worse with typing and gripping, gradual onset, no injury.",
    parseResult: {
      age: 44, sex: "Female", occupation: "Graphic designer", region: "Elbow/Wrist/Hand", laterality: "Right",
      duration: "6 weeks–3 months", onset: "Repetitive strain", nrsNow: 3, nrsWorst: 6, nrsBest: 1,
      painQuality: ["Aching","Burning"], aggMovements: ["Gripping","Wrist extension"], aggActivities: ["Typing"],
      relMovements: ["Rest"], hasRadiation: false, neuroSymptoms: [], flags: [],
    },
  },
];

describe("AI intake pipeline -- 10 conditions across all 10 regions", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  test.each(CASES)("$label", async ({ region, prefix, narrative, parseResult }) => {
    const setMock = vi.fn();
    const data = {};

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => parseResult,
    });

    render(<AIAssistant data={data} set={setMock} PC={PC} onClose={() => {}} />);

    // ── Stage 1: type a natural narrative (no structure) ──────────────
    const textarea = screen.getByPlaceholderText(/ask.*anything|type|message/i);
    fireEvent.change(textarea, { target: { value: narrative } });

    // ── Stage 2: AI extracts -- click the record-filling button ───────
    const fillBtn = screen.getByText(/Fill patient record from this instead/i);
    fireEvent.click(fillBtn);

    // ── Stage 3: You review -- the review card appears with real data ─
    await waitFor(() => {
      expect(screen.getByText(/Confirm and fill record/i)).toBeInTheDocument();
    });
    // Region correctly detected and shown (appears both in the "Region
    // detected" line and as one of the filled-field chips, so there can
    // legitimately be more than one match here)
    expect(screen.getAllByText(new RegExp(region.replace(/[().]/g, "\\$&"))).length).toBeGreaterThan(0);
    // Nothing has been saved yet at review stage
    expect(setMock).not.toHaveBeenCalled();
    // Red flags, if the AI found any, are shown as a warning -- not silently applied
    if (parseResult.flags?.length) {
      expect(screen.getByText(/Worth screening/i)).toBeInTheDocument();
    }

    // ── Stage 4: confirm -- auto-fills tabs via the real set() path ───
    const confirmBtn = screen.getByText(/Confirm and fill record/i);
    fireEvent.click(confirmBtn);

    expect(setMock).toHaveBeenCalledTimes(1);
    const updates = setMock.mock.calls[0][0];

    // Same field IDs the manual Subjective form itself writes to
    if (parseResult.age) expect(updates.dem_age).toBe(String(parseResult.age));
    if (parseResult.duration) expect(updates.cc_duration).toBe(parseResult.duration);
    if (parseResult.onset) expect(updates.cc_onset).toBe(parseResult.onset);
    if (parseResult.aggMovements?.length) expect(updates[prefix + "_agg_notes"]).toContain(parseResult.aggMovements[0]);
    // Region gets registered so "Review & Run Analysis" actually unlocks
    expect(JSON.parse(updates.cx_selected_regions)).toContain(region);
    // Red flags land in the real, visible clinician-notes field, never auto-marked
    if (parseResult.flags?.length) {
      expect(updates.neuro_clinician_notes).toContain(parseResult.flags[0]);
    }

    // ── Stage 5: Review & Run Analysis -- same engine, unmodified ─────
    const mergedData = { ...data, ...updates };
    const result = runEngineV6(mergedData, [region]);
    expect(result).not.toBeNull();
    expect(typeof result).toBe("object");
  });
});
