import { planExamination, runReasoning, runReasoningFromData, normalizeThoracicFromData } from "../reasoningEngine/index";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const facetSyndrome = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "mid back pain, worse with rotation", thoracicMidRegionPain: true, thoracicRotationAggravation: true, thoracicExtensionAggravation: true, thoracicManipulationRelief: true, onsetInsidious: true },
  o: { ...emptyObj(), rom: [{ movement: "Rotation L", activeROM: 20, passiveROM: 20, normalROM: 35 }], specialTests: { kc_thoracic_rotation_restricted: true } },
});

const ribDysfunction = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "sharp pain with deep breath", thoracicBreathingAggravation: true, thoracicCoughSneezeAggravation: true },
  o: { ...emptyObj(), specialTests: { rib_point_tenderness: true, rib_spring_test_positive: true, kc_rib_mobility_abnormal: true }, palpation: { tenderStructures: ["costovertebral joint"] } },
});

const costochondritis = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "anterior chest wall pain after a cold", thoracicChestWallPain: true, thoracicPostViralOnset: true, thoracicBreathingAggravation: true },
  o: { ...emptyObj(), specialTests: { costochondritis_pattern: true }, palpation: { tenderStructures: ["costochondral junction"] } },
});

const ribStressFracture = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "lateral rib pain, competitive rower", thoracicStressFractureRiskActivity: true, thoracicHighImpactSportMechanism: true, thoracicCoughSneezeAggravation: true },
  o: { ...emptyObj(), specialTests: { rib_point_tenderness: true } },
});

const discHerniation = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "band-like pain around the ribs after lifting", thoracicDermatomalBandPattern: true, thoracicLiftingMechanism: true, thoracicRotationInjuryMechanism: true, paresthesia: true },
  o: emptyObj(),
});

const scheuermanns = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "fixed rounded upper back, teenager", thoracicPosturalInsidiousOnset: true, progressiveStiffness: true },
  o: { ...emptyObj(), rom: [{ movement: "Extension", activeROM: 5, passiveROM: 5, normalROM: 25 }], specialTests: { kc_thoracic_extension_restricted: true } },
});

const compressionFracture = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "sudden severe mid-back pain, minimal trauma, elderly", thoracicOsteoporoticMinimalTraumaMechanism: true, ageOver50: true, nightPain: true, constantPain: true },
  o: { ...emptyObj(), imaging: { performed: true, summary: "MRI: acute compression fracture T8" } },
});

const intercostalNeuralgia = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "burning band pain around the ribs", thoracicDermatomalBandPattern: true, thoracicChestWallPain: true, paresthesia: true },
  o: emptyObj(),
});

const posturalPain = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "thoracic", chiefComplaint: "upper back ache, desk job", thoracicPosturalInsidiousOnset: true, thoracicProlongedSittingAggravation: true },
  o: { ...emptyObj(), specialTests: { kc_thoracic_rotation_restricted: true, kc_thoracic_extension_restricted: true } },
});

describe("Thoracic region — exam planning (Stage 2)", () => {
  it("always includes a red flag screen, active ROM, and a rib/costovertebral screen", () => {
    const plan = planExamination({ region: "thoracic", chiefComplaint: "mid back pain" }, "thoracic");
    expect(plan.recommendations.some((r) => /red flag/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /active thoracic rom/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /rib cage.*costovertebral screen/i.test(r.exam))).toBe(true);
  });
  it("adds a costochondral/Tietze exam when chest wall pain is present", () => {
    const plan = planExamination({ region: "thoracic", chiefComplaint: "chest wall pain", thoracicChestWallPain: true }, "thoracic");
    expect(plan.recommendations.some((r) => /costochondral/i.test(r.exam))).toBe(true);
  });
  it("adds a fracture screen when minimal-trauma osteoporotic mechanism is present", () => {
    const plan = planExamination({ region: "thoracic", chiefComplaint: "back pain, minimal trauma", thoracicOsteoporoticMinimalTraumaMechanism: true }, "thoracic");
    expect(plan.recommendations.some((r) => /percussion tenderness/i.test(r.exam))).toBe(true);
  });
});

describe("Thoracic region — diagnosis (Stage 5)", () => {
  it("ranks thoracic facet syndrome top for rotation/extension aggravation + manipulation relief", () => {
    const { s, o } = facetSyndrome();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/facet syndrome/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });
  it("ranks costovertebral/rib dysfunction top for breathing aggravation + rib spring test", () => {
    const { s, o } = ribDysfunction();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/costovertebral/i);
  });
  it("ranks costochondritis top for post-viral anterior chest wall pain", () => {
    const { s, o } = costochondritis();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/costochondritis/i);
  });
  it("ranks rib stress fracture top for a rowing athlete with point tenderness", () => {
    const { s, o } = ribStressFracture();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/rib stress fracture/i);
  });
  it("ranks thoracic disc herniation/radiculopathy top for dermatomal band pain after lifting", () => {
    const { s, o } = discHerniation();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/disc herniation/i);
  });
  it("ranks Scheuermann's/postural kyphosis top for a fixed-kyphosis adolescent presentation", () => {
    const { s, o } = scheuermanns();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/Scheuermann/i);
  });
  it("ranks osteoporotic compression fracture top for a minimal-trauma elderly presentation with imaging", () => {
    const { s, o } = compressionFracture();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/compression fracture/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(60);
  });
  it("ranks intercostal neuralgia top for burning dermatomal band pain without a lifting/rotation mechanism", () => {
    const { s, o } = intercostalNeuralgia();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/intercostal neuralgia/i);
  });
  it("ranks postural thoracic pain syndrome top for a desk-worker sustained-posture pattern", () => {
    const { s, o } = posturalPain();
    const r = runReasoning(s, o, "thoracic");
    expect(r.differentials[0].name).toMatch(/postural thoracic pain/i);
  });
  it("halts and refers on cardiac-pattern symptoms (visceral referral screen)", () => {
    const r = runReasoning({ region: "thoracic", chiefComplaint: "chest tightness radiating to left arm", thoracicCardiacSymptoms: true }, emptyObj(), "thoracic");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/non-musculoskeletal/i);
  });
  it("halts and refers on possible thoracic cord compression signs", () => {
    const r = runReasoning({ region: "thoracic", chiefComplaint: "back pain with leg weakness", thoracicCordCompressionSigns: true }, emptyObj(), "thoracic");
    expect(r.stopped).toBe(true);
    expect(r.interpretation!.referralRecommendation).toMatch(/spinal cord compression/i);
  });
});

describe("Thoracic region — normalizer field-mapping (real field ids only)", () => {
  it("maps tx_loc/tx_agg_mov/tx_rel real option text to the correct subjective flags", () => {
    const data = {
      cc_main: "mid back pain",
      tx_loc: "Mid thoracic T5–T8",
      tx_agg_mov: "Rotation (most thoracic sensitive to)",
      tx_rel: "Manipulation — significant relief",
    };
    const { subjective } = normalizeThoracicFromData(data);
    expect(subjective.thoracicMidRegionPain).toBe(true);
    expect(subjective.thoracicRotationAggravation).toBe(true);
    expect(subjective.thoracicManipulationRelief).toBe(true);
    expect(subjective.thoracicUpperRegionPain).toBeFalsy();
  });
  it("maps kc_thoracic_rotation/kc_rib_mobility real categorical text to the correct specialTests flags", () => {
    const data = {
      cc_main: "back pain",
      kc_thoracic_rotation: "Severely restricted — <25° or asymmetric >15°",
      kc_rib_mobility: "Asymmetric expansion — one side restricted",
    };
    const { objective } = normalizeThoracicFromData(data);
    expect(objective.specialTests.kc_thoracic_rotation_restricted).toBe(true);
    expect(objective.specialTests.kc_rib_mobility_abnormal).toBe(true);
  });
  it("runs the engine on a thoracic dataset via region detection (real field ids)", () => {
    const r = runReasoningFromData({ cc_main: "thoracic pain", tx_loc: "Mid thoracic T5–T8", rom_thflex_arom: "45" }, "thoracic");
    expect(r.differentials.length).toBeGreaterThan(0);
  });
});
