// shoulderPhase05.test.js — direct unit coverage for the adapter that plugs
// the existing Shoulder reasoningEngine into the Phase 0/0.5 UI shape (see
// shoulderPhase05.js's header comment). UI-level coverage (does the card
// actually render/persist/nav correctly inside SubjectiveObjective.jsx) lives
// in shoulderPhase05Persistence.test.jsx; this file is about the adapter's
// own translation logic in isolation.
import { describe, it, expect } from "vitest";
import { runShoulderPhase05, shoulderTestNav } from "../shoulderPhase05.js";

describe("shoulderPhase05 adapter", () => {
  it("classic impingement case: 10 conditions, correct top match, tier translated to the shared vocabulary", () => {
    const data = {
      cc_main: "Pain reaching overhead and lifting things above shoulder height",
      cc_onset: "Insidious, gradual onset",
      st_hawkins: "Positive", st_neer: "Positive",
      shl_arc: "60-120 abduction (subacromial / impingement pattern)",
    };
    const r = runShoulderPhase05(data);
    expect(r.conditions.length).toBe(10);
    expect(r.conditions[0].id).toBe("SH01");
    expect(r.conditions[0].name).toBe("Subacromial pain syndrome (impingement)");
    expect(["Strong match", "Possible match", "Weak match", "Insufficient data", "Unlikely"]).toContain(r.conditions[0].matchTier);
    expect(r.conditions[0].matchTier).toBe("Possible match"); // score 64%, Moderate band
    expect(r.redFlagOverride.triggered).toBe(false);
  });

  it("required/recommended objective test lists exclude subjective-only (history/painBehaviour) findings", () => {
    const r = runShoulderPhase05({});
    const impingement = r.conditions.find(c => c.name === "Subacromial pain syndrome (impingement)");
    const allSuggested = [...impingement.objectiveTests.required, ...impingement.objectiveTests.recommended];
    // "overhead_aggravation" (painBehaviour domain) is a supportingFinding for
    // impingement in the evidence model -- it must NOT appear as a suggested
    // objective test, since it's a subjective history item already on the form.
    expect(allSuggested.some(t => /overhead activity aggravates|overhead aggravation/i.test(t))).toBe(false);
    // But a genuine objective special test for the same condition must appear.
    expect(allSuggested).toContain("Hawkins-Kennedy Test");
  });

  it("red flag case halts and returns an empty conditions list with a triggered override", () => {
    const data = { cc_main: "Severe pain after a fall", cc_onset: "Traumatic — fell", shl_rf: "Suspected fracture" };
    const r = runShoulderPhase05(data);
    expect(r.redFlagOverride.triggered).toBe(true);
    expect(r.redFlagOverride.reason).toMatch(/fracture/i);
    expect(r.conditions.length).toBe(0);
  });

  it("shoulderTestNav resolves a special-test label, returns null for palpation (honest gap) and for unknown labels", () => {
    expect(shoulderTestNav("Hawkins-Kennedy Test")).not.toBeNull();
    expect(shoulderTestNav("Hawkins-Kennedy Test").nav).toBe("special");
    expect(shoulderTestNav("Palpation — AC Joint")).toBeNull();
    expect(shoulderTestNav("totally made up test name")).toBeNull();
  });

  it("Painful Arc suggestion is pointed at the ROM module, not left non-clickable", () => {
    const target = shoulderTestNav("Painful Arc (active abduction)");
    expect(target).not.toBeNull();
    expect(target.nav).toBe("rom");
    expect(target.ctx.romRegion).toBe("Shoulder");
  });

  it("blank data returns all 10 conditions at Insufficient data or Unlikely, never crashes", () => {
    const r = runShoulderPhase05({});
    expect(r.conditions.length).toBe(10);
    r.conditions.forEach(c => expect(["Insufficient data", "Unlikely"]).toContain(c.matchTier));
  });

  it("condition ids are stable by evidence-model order, not by score rank", () => {
    const r1 = runShoulderPhase05({});
    const acJoint1 = r1.conditions.find(c => c.name === "AC joint pathology");
    const r2 = runShoulderPhase05({ cc_main: "Pain right on top of the shoulder near the collarbone", st_cross_arm: "Positive" });
    const acJoint2 = r2.conditions.find(c => c.name === "AC joint pathology");
    expect(acJoint1.id).toBe(acJoint2.id);
    expect(acJoint1.id).toBe("SH05");
  });
});
