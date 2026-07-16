import { planExamination, runReasoning, runReasoningFromData, normalizeHipFromData } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const fai = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "anterior groin pain, worse with deep flexion", fadirAggravation: true, cSignPositive: true, hipGroinDominantPattern: true },
  o: { ...emptyObj(), specialTests: { fadir: true } },
});

const oa = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "gradual groin pain, morning stiffness", hipGroinDominantPattern: true, hipMorningStiffness: true, hipCrepitusGrinding: true, onsetInsidious: true, ageOver50: true },
  o: { ...emptyObj(), rom: [
    { movement: "Internal rotation", activeROM: 20, passiveROM: 20, normalROM: 45 },
    { movement: "Flexion", activeROM: 90, passiveROM: 95, normalROM: 120 },
    { movement: "Abduction", activeROM: 38, passiveROM: 40, normalROM: 45 },
  ] },
});

const gtps = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "lateral hip pain, worse lying on that side at night", lateralHipPattern: true, worseLyingOnAffectedSide: true },
  o: { ...emptyObj(), specialTests: { trendelenburg: true, ober: true }, mmt: [{ muscle: "Gluteus Medius (Abduction)", grade: 3 }] },
});

const proximalHamstring = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "pain at sit bone, worse sitting on hard chairs", ischialSittingPain: true, proximalHamstringPattern: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Hamstrings (Hip Extension/Knee Flexion)", grade: 4, painOnResist: true }], palpation: { tenderStructures: ["ischial tuberosity"] } },
});

const adductor = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "groin pain kicking a football", adductorPattern: true, kickingOrSprintMechanism: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Hip Adductors (Adduction)", grade: 4, painOnResist: true }] },
});

const piriformis = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "deep buttock pain, not SIJ", deepButtockPain: true },
  o: { ...emptyObj(), specialTests: { piriformis: true } },
});

const snappingHip = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "hip", chiefComplaint: "clicking in front of hip when I walk, iliopsoas snap", snappingHipInternal: true },
  o: emptyObj(),
});

describe("Hip region — exam planning (Stage 2)", () => {
  it("adds FADIR test + imaging consideration when FADIR aggravates", () => {
    const plan = planExamination({ region: "hip", chiefComplaint: "groin pain", fadirAggravation: true }, "hip");
    expect(plan.recommendations.some((r) => /FADIR/i.test(r.exam))).toBe(true);
  });
  it("adds resisted abduction + Trendelenburg + Ober's when lateral hip pattern is present", () => {
    const plan = planExamination({ region: "hip", chiefComplaint: "lateral hip pain", lateralHipPattern: true }, "hip");
    expect(plan.recommendations.some((r) => /Trendelenburg/i.test(r.exam))).toBe(true);
  });
  it("adds piriformis (FAIR) test when deep buttock pain is present", () => {
    const plan = planExamination({ region: "hip", chiefComplaint: "deep buttock pain", deepButtockPain: true }, "hip");
    expect(plan.recommendations.some((r) => /Piriformis|FAIR/i.test(r.exam))).toBe(true);
  });
  it("forces refer-first on a hot swollen joint red flag (septic arthritis screen)", () => {
    const plan = planExamination({ region: "hip", chiefComplaint: "hot swollen hip", hotSwollenJoint: true }, "hip");
    expect(plan.referFirst).not.toBeNull();
    expect(plan.recommendations[0].exam).toMatch(/Refer/i);
  });
});

describe("Hip region — diagnosis (Stage 5)", () => {
  it("ranks FAI/labral top for a FADIR-positive, C-sign-positive, groin-dominant presentation", () => {
    const { s, o } = fai();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/impingement|labral/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });
  it("ranks hip osteoarthritis top for an IR-capsular-pattern, crepitus, older-insidious presentation", () => {
    const { s, o } = oa();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/osteoarthritis/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(60);
  });
  it("ranks greater trochanteric pain syndrome top for lateral hip pain + Trendelenburg + weak gluteus medius", () => {
    const { s, o } = gtps();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/trochanteric|gluteal tendinopathy/i);
  });
  it("ranks proximal hamstring tendinopathy top for ischial sitting pain + painful resisted extension", () => {
    const { s, o } = proximalHamstring();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/hamstring tendinopathy/i);
  });
  it("ranks adductor-related groin pain top for a kicking mechanism + painful resisted adduction", () => {
    const { s, o } = adductor();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/adductor|groin/i);
  });
  it("ranks piriformis / deep gluteal syndrome top for deep buttock pain + positive FAIR test", () => {
    const { s, o } = piriformis();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/piriformis|deep gluteal/i);
  });
  it("ranks snapping hip syndrome top for an internal-snapping presentation", () => {
    const { s, o } = snappingHip();
    const r = runReasoning(s, o, "hip");
    expect(r.differentials[0].name).toMatch(/snapping hip/i);
  });
  it("halts and refers on a suspected NOF fracture (trauma + cannot weight bear)", () => {
    const r = runReasoning({ region: "hip", chiefComplaint: "fell on hip, cannot walk", traumaHistory: true, unableToWeightBear: true }, emptyObj(), "hip");
    expect(r.stopped).toBe(true);
    expect(r.differentials).toHaveLength(0);
  });
  it("halts and refers on a hot swollen joint (septic arthritis screen)", () => {
    const r = runReasoning({ region: "hip", chiefComplaint: "hot swollen hip, unwell", hotSwollenJoint: true }, emptyObj(), "hip");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/joint emergency|septic/i);
  });
});

describe("Hip region — normalizer field-mapping (real field ids only)", () => {
  it("does not fabricate a positive FADIR/Scour/90-90 finding from benign or negative real option text", () => {
    const data = {
      cc_main: "hip pain",
      st_fadir_test: "Negative",
      st_hip_scour: "Negative",
      st_90_90: "Normal (< 20° from full extension)",
      hp_mechanical: "Soft click — soft / benign",
    };
    const { objective, subjective } = normalizeHipFromData(data);
    expect(objective.specialTests.fadir).toBeUndefined();
    expect(objective.specialTests.hip_scour).toBeUndefined();
    expect(objective.specialTests.hamstring_90_90).toBeUndefined();
    expect(subjective.hipCatchingOrLocking).toBe(false);
  });
  it("detects real hp_/st_/rom_/mmt_ field ids end-to-end through the dispatcher", () => {
    const data = {
      cc_main: "right groin pain, worse with FADIR movement",
      hp_agg_mov: "FADIR combined (flexion + adduction + IR) — FAI pattern",
      hp_c_sign: "Yes — typical intra-articular pattern",
      hp_loc_pattern: "Groin-dominant — likely intra-articular (FAI / OA / labral)",
      st_fadir_test: "Positive — anterior groin pain (FAI / labral tear)",
      rom_hflex_L_arom: "95", rom_hflex_L_prom: "100",
    };
    const r = runReasoningFromData(data, "hip");
    expect(r.region).toBe("hip");
    expect(r.differentials[0].name).toMatch(/impingement|labral/i);
    expect(r.differentials[0].supportingFindings.length).toBeGreaterThan(0);
  });
});
