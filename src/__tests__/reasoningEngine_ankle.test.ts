import { planExamination, runReasoning, runReasoningFromData, normalizeAnkleFromData } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const lateralSprain = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "rolled ankle playing basketball", ankleLateralPainPattern: true, ankleInversionSprainMechanism: true, ankleAtflPopFelt: true, onsetTraumatic: true },
  o: { ...emptyObj(), specialTests: { ant_drawer_ankle_positive: true, talar_tilt_positive: true }, palpation: { tenderStructures: ["lateral malleolus"] } },
});

const chronicInstability = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "ankle keeps giving way, 5th sprain", anklePreviousMultipleSprains: true, ankleGivingWayInstability: true },
  o: { ...emptyObj(), specialTests: { kc_subtalar_hypermobile: true, cpa_peroneal_overactive: true, talar_tilt_positive: true }, mmt: [{ muscle: "Peroneals (Eversion)", grade: 3, painOnResist: false }] },
});

const highAnkleSprain = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "external rotation injury playing football", ankleHighSprainMechanism: true, ankleAnteriorPainPattern: true, onsetTraumatic: true },
  o: { ...emptyObj(), specialTests: { squeeze_ankle_positive: true } },
});

const achillesTendinopathy = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "gradual mid-Achilles pain in a runner", achillesMidPortionPainPattern: true, ankleMorningStiffnessAchilles: true, ankleWarmsUpThenWorsensPattern: true, onsetInsidious: true },
  o: { ...emptyObj(), specialTests: { royal_london_positive: true, cpa_gastroc_overactive: true }, palpation: { tenderStructures: ["achilles tendon"] } },
});

const achillesRupture = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "felt a pop in the Achilles, can't push off", ankleAchillesRuptureFeltPop: true, ankleSuspectedAchillesRuptureFlag: true },
  o: { ...emptyObj(), specialTests: { thompson_positive: true }, palpation: { tenderStructures: ["achilles tendon"] } },
});

const ankleOA = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "stiff aching ankle, older patient", ageOver50: true, progressiveStiffness: true },
  o: {
    ...emptyObj(),
    rom: [
      { movement: "Dorsiflexion", activeROM: 10, passiveROM: 10, normalROM: 20 },
      { movement: "Plantarflexion", activeROM: 30, passiveROM: 30, normalROM: 50 },
    ],
    specialTests: { kc_ankle_df_restricted: true },
    imaging: { performed: true, summary: "XR: ankle osteoarthritis with joint space narrowing" },
  },
});

const pttd = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "gradual medial ankle pain, collapsing arch", ankleMedialPainPattern: true, onsetInsidious: true },
  o: { ...emptyObj(), specialTests: { navicular_drop_significant: true, kc_subtalar_hypermobile: true }, mmt: [{ muscle: "Tibialis Posterior (Inversion)", grade: 3, painOnResist: false }], palpation: { tenderStructures: ["medial malleolus"] } },
});

const peronealTendinopathy = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "lateral ankle pain, history of sprains, overloaded peroneals", ankleLateralPainPattern: true, anklePreviousMultipleSprains: true },
  o: { ...emptyObj(), specialTests: { cpa_peroneal_overactive: true }, mmt: [{ muscle: "Peroneals (Eversion)", grade: 3, painOnResist: false }] },
});

const tarsalTunnel = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "burning tingling into the sole of the foot", ankleRadiatesTarsalTunnel: true, paresthesia: true, nightPain: true },
  o: { ...emptyObj(), specialTests: { tinel_ankle_positive: true }, palpation: { tenderStructures: ["tarsal tunnel"] } },
});

const anteriorImpingement = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "ankle", chiefComplaint: "anterior ankle pinching pain on squatting", ankleAnteriorPainPattern: true, ankleDorsiflexionAggravation: true },
  o: { ...emptyObj(), rom: [{ movement: "Dorsiflexion", activeROM: 12, passiveROM: 12, normalROM: 20 }], specialTests: { kc_ankle_df_restricted: true } },
});

describe("Ankle region — exam planning (Stage 2)", () => {
  it("always includes a red flag screen, ROM, and a ligament stability screen", () => {
    const plan = planExamination({ region: "ankle", chiefComplaint: "ankle pain" }, "ankle");
    expect(plan.recommendations.some((r) => /ottawa ankle rules/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /active \+ passive ankle rom/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /ligament stability screen/i.test(r.exam))).toBe(true);
  });
  it("adds a Thompson's/Royal London exam when mid-portion Achilles pain is present", () => {
    const plan = planExamination({ region: "ankle", chiefComplaint: "Achilles pain", achillesMidPortionPainPattern: true }, "ankle");
    expect(plan.recommendations.some((r) => /thompson.*royal london/i.test(r.exam))).toBe(true);
  });
  it("adds a rupture-exclusion exam when Achilles rupture is suspected on intake", () => {
    const plan = planExamination({ region: "ankle", chiefComplaint: "felt a pop, can't push off", ankleSuspectedAchillesRuptureFlag: true }, "ankle");
    expect(plan.recommendations.some((r) => /thompson.*tendon gap/i.test(r.exam))).toBe(true);
  });
});

describe("Ankle region — diagnosis (Stage 5)", () => {
  it("ranks lateral ankle sprain top for an acute inversion mechanism with positive stability tests", () => {
    const { s, o } = lateralSprain();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/lateral ankle sprain/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });
  it("ranks chronic ankle instability top for recurrent sprains with giving-way and subtalar hypermobility", () => {
    const { s, o } = chronicInstability();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/chronic ankle instability/i);
  });
  it("ranks high ankle sprain top for an external rotation mechanism with a positive squeeze test", () => {
    const { s, o } = highAnkleSprain();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/high ankle sprain/i);
  });
  it("scores high ankle sprain 0 without a positive squeeze test (required finding)", () => {
    const r = runReasoning({ region: "ankle", chiefComplaint: "ankle pain", ankleHighSprainMechanism: true }, emptyObj(), "ankle");
    const dx = r.differentials.find((d) => /high ankle sprain/i.test(d.name));
    expect(dx?.diagnosticMatchScore).toBe(0);
  });
  it("ranks Achilles tendinopathy top for an insidious mid-portion pattern with a positive Royal London test", () => {
    const { s, o } = achillesTendinopathy();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/achilles tendinopathy/i);
  });
  it("ranks complete Achilles rupture top for a positive Thompson's test with a felt pop", () => {
    const { s, o } = achillesRupture();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/achilles tendon rupture/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(80);
  });
  it("ranks ankle osteoarthritis top for an older patient with restricted DF/PF and OA on imaging", () => {
    const { s, o } = ankleOA();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/ankle osteoarthritis/i);
  });
  it("ranks tibialis posterior dysfunction (PTTD) top for medial pain with significant navicular drop", () => {
    const { s, o } = pttd();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/tibialis posterior dysfunction|PTTD/i);
  });
  it("ranks peroneal tendinopathy top for lateral pain with overactive/weak peroneals and no acute mechanism", () => {
    const { s, o } = peronealTendinopathy();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/peroneal tendinopathy/i);
  });
  it("ranks tarsal tunnel syndrome top for a positive Tinel's sign with plantar paraesthesia", () => {
    const { s, o } = tarsalTunnel();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/tarsal tunnel syndrome/i);
  });
  it("ranks anterior ankle impingement top for anterior pain with restricted dorsiflexion", () => {
    const { s, o } = anteriorImpingement();
    const r = runReasoning(s, o, "ankle");
    expect(r.differentials[0].name).toMatch(/anterior ankle impingement/i);
  });
  it("halts and refers on suspected fracture (trauma + unable to weight bear)", () => {
    const r = runReasoning({ region: "ankle", chiefComplaint: "fell awkwardly, can't weight bear", traumaHistory: true, unableToWeightBear: true }, emptyObj(), "ankle");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/fracture/i);
  });
  it("halts and refers on an acute hot swollen joint (septic arthritis screen)", () => {
    const r = runReasoning({ region: "ankle", chiefComplaint: "hot swollen ankle, unwell", hotSwollenJoint: true }, emptyObj(), "ankle");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/septic arthritis/i);
  });
  it("reaches the fracture red flag from a positive Ottawa screen alone, without a separately-coded mechanism (50-vignette validation fix)", () => {
    const r = runReasoningFromData({
      cc_main: "Severe ankle pain, cannot weight bear",
      af_rf: "Ottawa Rules — cannot weight bear 4 steps, Ottawa Rules — bony tenderness posterior lateral malleolus",
    }, "ankle");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/fracture/i);
  });
});

describe("Ankle region — normalizer field-mapping (real field ids only)", () => {
  it("maps af_loc/af_moi/af_agg_mov real option text to the correct subjective flags", () => {
    const data = {
      cc_main: "ankle pain",
      af_loc: "Lateral ankle — ATFL / CFL region",
      af_moi: "Inversion sprain — foot rolled in",
      af_agg_mov: "Dorsiflexion (foot up)",
    };
    const { subjective } = normalizeAnkleFromData(data);
    expect(subjective.ankleLateralPainPattern).toBe(true);
    expect(subjective.ankleInversionSprainMechanism).toBe(true);
    expect(subjective.ankleDorsiflexionAggravation).toBe(true);
    expect(subjective.ankleMedialPainPattern).toBeFalsy();
  });
  it("maps kc_ankle_df/kc_subtalar real categorical text to the correct specialTests flags", () => {
    const data = {
      cc_main: "ankle pain",
      kc_ankle_df: "Severely restricted — <4cm / <10°",
      kc_subtalar: "Hypermobile — excessive pronation",
    };
    const { objective } = normalizeAnkleFromData(data);
    expect(objective.specialTests.kc_ankle_df_restricted).toBe(true);
    expect(objective.specialTests.kc_subtalar_hypermobile).toBe(true);
  });
  it("runs the engine on an ankle dataset via region detection (real field ids)", () => {
    const r = runReasoningFromData({ cc_main: "ankle pain", af_loc: "Lateral ankle — ATFL / CFL region", rom_adf_L_arom: "15" }, "ankle");
    expect(r.differentials.length).toBeGreaterThan(0);
  });
});
