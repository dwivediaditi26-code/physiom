import { runReasoning } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

describe("Stage 6 clinical interpretation", () => {
  it("recommends orthopaedic/imaging referral when a lag sign is positive", () => {
    const s: SubjectiveInput = { region: "shoulder", chiefComplaint: "shoulder pain after fall", onsetTraumatic: true, traumaHistory: true };
    const o: ObjectiveFindings = {
      rom: [], mmt: [{ muscle: "Infraspinatus (external rotation)", grade: 3 }],
      specialTests: { er_lag: true, drop_arm: true },
      palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "shoulder");
    expect(r.interpretation!.referralRecommendation).toMatch(/orthopaedic|imaging/i);
  });

  it("withholds a diagnostic summary and states referral on a red flag", () => {
    const r = runReasoning({ region: "shoulder", chiefComplaint: "pain", systemicIllness: true },
      { rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } }, "shoulder");
    expect(r.interpretation!.referralRecommendation).toMatch(/Red flag/i);
    expect(r.interpretation!.summary).toMatch(/red-flag/i);
  });

  it("grounds impairments only in findings actually present", () => {
    const s: SubjectiveInput = { region: "shoulder", chiefComplaint: "stiff shoulder", progressiveStiffness: true };
    const o: ObjectiveFindings = {
      rom: [
        { movement: "External rotation", activeROM: 30, passiveROM: 40, normalROM: 90, endFeel: "capsular" },
        { movement: "Abduction", activeROM: 90, passiveROM: 100, normalROM: 180 },
        { movement: "Internal rotation", activeROM: 50, passiveROM: 55, normalROM: 70 },
      ],
      mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "shoulder");
    expect(r.interpretation!.primaryImpairments.some((x) => /capsular/i.test(x))).toBe(true);
  });

  // Regression coverage: hip/knee previously fell through buildInterpretation's
  // region if/else chain with NO matching branch (only shoulder/cervical/lumbar
  // existed), silently producing empty primaryImpairments/treatmentPriorities/
  // etc for every hip and knee case. The region-specific diagnosis/exam-plan
  // tests never caught this because they don't assert on interpretation detail
  // -- only on differentials[0].name and plan.recommendations. These three
  // tests assert the detail is actually populated, for every migrated region,
  // so this gap can't silently reopen.
  it("populates hip-specific impairments and treatment priorities (not just the bare diagnosis name)", () => {
    const s: SubjectiveInput = { region: "hip", chiefComplaint: "lateral hip pain", lateralHipPattern: true, worseLyingOnAffectedSide: true };
    const o: ObjectiveFindings = {
      rom: [], mmt: [{ muscle: "Gluteus Medius (Abduction)", grade: 3 }],
      specialTests: { trendelenburg: true, ober: true },
      palpation: { tenderStructures: ["greater trochanter"] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "hip");
    expect(r.interpretation!.primaryImpairments.length).toBeGreaterThan(0);
    expect(r.interpretation!.likelyPainGenerators.some((x) => /trochanter/i.test(x))).toBe(true);
    expect(r.interpretation!.treatmentPriorities.length).toBeGreaterThan(0);
    expect(r.interpretation!.homeAdvice.length).toBeGreaterThan(0);
  });

  it("populates knee-specific impairments and treatment priorities (not just the bare diagnosis name)", () => {
    const s: SubjectiveInput = { region: "knee", chiefComplaint: "non-contact twist, pop, swelling, giving way", kneeNonContactTwistMechanism: true, kneeAcutePopFelt: true, kneeImmediateHaemarthrosis: true, kneeGivingWayWithPivot: true };
    const o: ObjectiveFindings = {
      rom: [], mmt: [], specialTests: { lachman: true, pivot_shift: true },
      palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "knee");
    expect(r.interpretation!.primaryImpairments.length + r.interpretation!.movementDysfunction.length).toBeGreaterThan(0);
    expect(r.interpretation!.treatmentPriorities.some((x) => /quadriceps|neuromuscular|pivot/i.test(x))).toBe(true);
    expect(r.interpretation!.homeAdvice.length).toBeGreaterThan(0);
  });

  it("populates elbow-specific impairments and treatment priorities (not just the bare diagnosis name)", () => {
    const s: SubjectiveInput = { region: "elbow", chiefComplaint: "lateral elbow pain, tennis player", lateralElbowPainPattern: true, elbowRacquetSportMechanism: true, resistedWristExtensionPain: true };
    const o: ObjectiveFindings = {
      rom: [], mmt: [], specialTests: { cozens: true, mills: true },
      palpation: { tenderStructures: ["lateral epicondyle"] }, functional: { movements: [] }, imaging: { performed: false },
    };
    const r = runReasoning(s, o, "elbow");
    expect(r.interpretation!.likelyPainGenerators.some((x) => /epicondyle/i.test(x))).toBe(true);
    expect(r.interpretation!.movementDysfunction.length).toBeGreaterThan(0);
    expect(r.interpretation!.treatmentPriorities.some((x) => /load management|tendon/i.test(x))).toBe(true);
    expect(r.interpretation!.homeAdvice.length).toBeGreaterThan(0);
  });
});
