import { describe, it, expect } from "vitest";
import { runShoulderReasoningFromData } from "../reasoningEngine/index";

// Shoulder region — regression + sanity coverage for the existing deterministic
// reasoningEngine (src/reasoningEngine/), used by ProbableDiagnosis.jsx.
// Constructed from realistic patient data through the real normalizeFromData +
// runReasoning pipeline (not hand-built SubjectiveInput/ObjectiveFindings), so
// these also exercise the real app field-name mapping.

describe("Shoulder reasoningEngine — sanity + regressions", () => {
  it("classic subacromial impingement history + Hawkins/Neer/painful arc ranks impingement top", () => {
    const data = {
      cc_main: "Pain reaching overhead and lifting things above shoulder height",
      cc_onset: "Insidious, gradual onset",
      st_hawkins: "Positive", st_neer: "Positive",
      shl_arc: "60-120 abduction (subacromial / impingement pattern)",
    };
    const r = runShoulderReasoningFromData(data);
    const top = r.differentials.find((d) => !d.excluded);
    expect(top?.name).toBe("Subacromial pain syndrome (impingement)");
  });

  it("regression: 'Drop arm' documented via the shl_rf/shr_rf red-flag checklist (not via st_er_lag text) must still register as drop_arm_positive", () => {
    // Bug found this sweep: shl_rf/shr_rf each have a dedicated "Drop arm" option
    // ("Drop arm — acute full-thickness tear" / "Drop arm — acute") for a clinician
    // who documents a positive drop-arm sign directly via that checklist. Only the
    // st_er_lag "massive/full lag" inference was ever read into specialTests.drop_arm,
    // so a drop-arm finding documented this (arguably more direct) way silently never
    // reached the Rotator cuff tear differential's supporting evidence. Fixed in
    // normalize.ts's shoulder setT("drop_arm", ...) to also OR in has(shRf, "drop arm").
    const data = {
      cc_main: "Sudden inability to hold arm up after a fall, gives way",
      shl_rf: "Drop arm — acute full-thickness tear",
    };
    const r = runShoulderReasoningFromData(data);
    const tear = r.differentials.find((d) => d.name.includes("tear"));
    expect(tear?.supportingFindings.some((s) => /drop-arm/i.test(s))).toBe(true);
  });

  it("blank assessment produces no false-positive High-confidence differential", () => {
    const r = runShoulderReasoningFromData({});
    const highConfidence = r.differentials.find((d) => !d.excluded && d.band === "High");
    expect(highConfidence).toBeUndefined();
  });

  it("negation safety: 'denies night pain, no trauma' in free-text cc_main is not read as positive", () => {
    const data = {
      cc_main: "Aching shoulder pain with overhead reaching, denies night pain, no trauma or injury",
      cc_onset: "Insidious, gradual onset, no injury",
    };
    const r = runShoulderReasoningFromData(data);
    const top = r.differentials.find((d) => !d.excluded);
    expect(top?.supportingFindings.some((s) => /night pain/i.test(s))).toBe(false);
    expect(top?.supportingFindings.some((s) => /traumatic onset/i.test(s))).toBe(false);
  });

  it("red flag: fracture screen (shl_rf 'Suspected fracture' + traumatic onset) halts diagnosis", () => {
    const data = {
      cc_main: "Severe pain after a fall, cannot move my arm at all",
      cc_onset: "Traumatic — fell directly onto shoulder",
      shl_rf: "Suspected fracture",
    };
    const r = runShoulderReasoningFromData(data);
    expect(r.redFlag.triggered).toBe(true);
    expect(r.stopped).toBe(true);
  });
});
