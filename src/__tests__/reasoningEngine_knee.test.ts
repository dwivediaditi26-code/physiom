import { planExamination, runReasoning, runReasoningFromData, normalizeKneeFromData } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const acl = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "twisted knee playing football, heard a pop, swelled up within an hour", kneeNonContactTwistMechanism: true, kneeAcutePopFelt: true, kneeImmediateHaemarthrosis: true },
  o: { ...emptyObj(), specialTests: { lachman: true, pivot_shift: true } },
});

const pcl = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "dashboard injury in car accident", kneePclMechanism: true },
  o: { ...emptyObj(), specialTests: { posterior_drawer: true } },
});

const meniscal = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "twisted knee, catching and clicking at the joint line", kneeJointLineMechanical: true, kneeTrueLocking: true },
  o: { ...emptyObj(), specialTests: { mcmurray: true, thessaly: true } },
});

const mcl = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "direct blow to medial knee in tackle, medial pain", kneeValgusMechanism: true, kneeMedialJointPain: true },
  o: { ...emptyObj(), specialTests: { valgus_stress: true } },
});

const lcl = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "direct blow to lateral knee, lateral pain", kneeVarusMechanism: true, kneeLateralJointPain: true },
  o: { ...emptyObj(), specialTests: { varus_stress: true } },
});

const pfps = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "anterior knee pain, worse sitting through a movie and going down stairs", kneeAnteriorPainPattern: true, kneeMovieSignPositive: true, kneeWorseDescendingStairs: true },
  o: { ...emptyObj(), specialTests: { clarkes: true, patellar_grind: true } },
});

const patellarTendinopathy = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "pain at bottom of kneecap, jumping athlete", kneePatellarTendonPattern: true },
  o: { ...emptyObj(), mmt: [{ muscle: "Quadriceps (Knee Extension)", grade: 4, painOnResist: true }], palpation: { tenderStructures: ["patellar tendon inferior pole"] } },
});

const kneeOa = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "gradual diffuse knee pain over years, older patient", kneeDiffuseWholeKneePain: true, onsetInsidious: true, ageOver50: true },
  o: { ...emptyObj(), rom: [{ movement: "Flexion", activeROM: 95, passiveROM: 100, normalROM: 140 }], specialTests: { effusion: true } },
});

const itb = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "knee", chiefComplaint: "lateral knee pain in a runner, worse downhill", kneeLateralItbPattern: true },
  o: { ...emptyObj(), specialTests: { noble: true, ober: true } },
});

describe("Knee region — exam planning (Stage 2)", () => {
  it("adds the full ACL cluster (Lachman's/drawer/pivot shift) for a non-contact twist mechanism", () => {
    const plan = planExamination({ region: "knee", chiefComplaint: "twisted knee", kneeNonContactTwistMechanism: true }, "knee");
    expect(plan.recommendations.some((r) => /Lachman/i.test(r.exam))).toBe(true);
  });
  it("adds the meniscal cluster (McMurray's/Apley's/Thessaly) for mechanical joint-line symptoms", () => {
    const plan = planExamination({ region: "knee", chiefComplaint: "clicking knee", kneeJointLineMechanical: true }, "knee");
    expect(plan.recommendations.some((r) => /McMurray/i.test(r.exam))).toBe(true);
  });
  it("adds Clarke's/patellar grind for a movie-sign-positive presentation", () => {
    const plan = planExamination({ region: "knee", chiefComplaint: "anterior knee pain", kneeMovieSignPositive: true }, "knee");
    expect(plan.recommendations.some((r) => /Clarke/i.test(r.exam))).toBe(true);
  });
  it("forces refer-first on irreducible locking (joint emergency)", () => {
    const plan = planExamination({ region: "knee", chiefComplaint: "locked knee, cannot extend", irreducibleLocking: true }, "knee");
    expect(plan.referFirst).not.toBeNull();
    expect(plan.recommendations[0].exam).toMatch(/Refer/i);
  });
});

describe("Knee region — diagnosis (Stage 5)", () => {
  it("ranks ACL tear top for non-contact twist + pop + immediate haemarthrosis + positive Lachman's/pivot shift", () => {
    const { s, o } = acl();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/ACL/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(60);
  });
  it("ranks PCL injury top for a dashboard mechanism + positive posterior drawer", () => {
    const { s, o } = pcl();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/PCL/i);
  });
  it("ranks meniscal tear top for joint-line mechanical symptoms + locking + positive McMurray's/Thessaly", () => {
    const { s, o } = meniscal();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/[Mm]eniscal/i);
  });
  it("ranks MCL sprain top for a valgus mechanism + medial pain + positive valgus stress test", () => {
    const { s, o } = mcl();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/MCL/i);
  });
  it("ranks LCL sprain top for a varus mechanism + lateral pain + positive varus stress test", () => {
    const { s, o } = lcl();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/LCL/i);
  });
  it("ranks PFPS top for anterior pain + movie sign + worse descending stairs + positive Clarke's/grind", () => {
    const { s, o } = pfps();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/[Pp]atellofemoral|PFPS/i);
  });
  it("ranks patellar tendinopathy top for inferior-pole pain + painful resisted extension + tendon tenderness", () => {
    const { s, o } = patellarTendinopathy();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/[Pp]atellar tendinopathy/i);
  });
  it("ranks knee osteoarthritis top for diffuse insidious pain + flexion loss + effusion in an older patient", () => {
    const { s, o } = kneeOa();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/osteoarthritis/i);
  });
  it("ranks iliotibial band friction syndrome top for lateral pain in a runner + positive Noble's/Ober's", () => {
    const { s, o } = itb();
    const r = runReasoning(s, o, "knee");
    expect(r.differentials[0].name).toMatch(/[Ii]liotibial|IT band/i);
  });
  it("halts and refers on a hot swollen joint (septic arthritis screen)", () => {
    const r = runReasoning({ region: "knee", chiefComplaint: "hot swollen knee", hotSwollenJoint: true }, emptyObj(), "knee");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/joint emergency|septic/i);
  });
  it("halts and refers on a suspected fracture (trauma + unable to weight bear / Ottawa positive)", () => {
    const r = runReasoning({ region: "knee", chiefComplaint: "fell on knee, cannot walk", traumaHistory: true, unableToWeightBear: true }, emptyObj(), "knee");
    expect(r.stopped).toBe(true);
  });
});

describe("Knee region — normalizer field-mapping (real field ids, left/right asymmetry)", () => {
  it("does not fabricate a positive Lachman's/valgus/effusion finding from negative or graded-normal real option text", () => {
    const data = {
      cc_main: "knee pain",
      st_lachmans: "Negative — firm end-feel",
      st_valgus_stress_knee: "Negative",
      st_effusion: "No effusion",
    };
    const { objective } = normalizeKneeFromData(data);
    expect(objective.specialTests.lachman).toBeUndefined();
    expect(objective.specialTests.valgus_stress).toBeUndefined();
    expect(objective.specialTests.effusion).toBeUndefined();
  });
  it("detects a positive Lachman's grade and a 'Large effusion' option that never contain the literal word 'positive'", () => {
    const data = {
      cc_main: "knee pain",
      st_lachmans: "Grade 2 (5–10mm — partial tear)",
      st_effusion: "Large effusion (visible swelling)",
    };
    const { objective } = normalizeKneeFromData(data);
    expect(objective.specialTests.lachman).toBe(true);
    expect(objective.specialTests.effusion).toBe(true);
  });
  it("reads RIGHT-knee-only subjective data (knr_ prefix) despite the field asymmetry with the left-knee module", () => {
    // Right knee has no knr_agg_other/knr_sport_*/knr_weightbear/knr_plc equivalents, and its
    // swelling-pattern field is "knr_swelling_patt" (truncated), not "_pattern" like the left side.
    // This proves the combo() dual-side reader picks up right-side-only data correctly.
    const data = {
      cc_main: "right knee pain",
      knr_moi: "Twisting — non-contact (ACL)",
      knr_pop: "Yes — clear pop (ACL flag)",
      knr_swelling: "Immediate <2hrs (haemarthrosis flag)",
      knr_swelling_patt: "Persistent low-grade",
    };
    const { subjective } = normalizeKneeFromData(data);
    expect(subjective.kneeNonContactTwistMechanism).toBe(true);
    expect(subjective.kneeAcutePopFelt).toBe(true);
    expect(subjective.kneeImmediateHaemarthrosis).toBe(true);
    expect(subjective.kneeDelayedOrRecurrentSwelling).toBe(true);
  });
  it("detects real knl_/knr_/st_/rom_ field ids end-to-end through the dispatcher for a left-knee ACL presentation", () => {
    const data = {
      cc_main: "left knee twisted playing football",
      knl_moi: "Twisting injury — non-contact (ACL pattern)",
      knl_pop: "Yes — clear pop (ACL flag)",
      knl_swelling: "Immediate within 2 hours (haemarthrosis — ACL / fracture flag)",
      st_lachmans: "Grade 3 (> 10mm, soft end-feel — complete ACL rupture)",
      rom_kflex_L_arom: "110", rom_kflex_L_prom: "115",
    };
    const r = runReasoningFromData(data, "knee");
    expect(r.region).toBe("knee");
    expect(r.differentials[0].name).toMatch(/ACL/i);
    expect(r.differentials[0].supportingFindings.length).toBeGreaterThan(0);
  });
});
