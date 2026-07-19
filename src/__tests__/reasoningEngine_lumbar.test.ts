import { planExamination, runReasoning, runReasoningFromData, normalizeLumbarFromData } from "../reasoningEngine/index";
import { stableStringify } from "../reasoningEngine/determinism";
import type { SubjectiveInput, ObjectiveFindings } from "../reasoningEngine/types";

const emptyObj = (): ObjectiveFindings => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } });

const radiculopathy = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "lumbar", chiefComplaint: "back and right leg pain below the knee", legPainBelowKnee: true, dermatomalPattern: true, footDropReported: true },
  o: {
    rom: [], mmt: [{ muscle: "L5 myotome", grade: 3 }],
    specialTests: { slr: true, slump: true, reflex_change: true, sensory_deficit: true },
    palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

const facet = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "lumbar", chiefComplaint: "back pain worse arching backward", extensionAggravation: true },
  o: {
    rom: [{ movement: "Extension", activeROM: 15, passiveROM: 18, normalROM: 25 }],
    mmt: [], specialTests: { kemp: true }, palpation: { tenderStructures: ["right facet"] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

const sacroiliac = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "lumbar", chiefComplaint: "right buttock and SI joint pain", sacroiliacPainPattern: true },
  o: {
    rom: [], mmt: [], specialTests: { si_distraction: true, si_compression: true, gaenslen: true },
    palpation: { tenderStructures: ["SI joint"] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

const stenosis = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "lumbar", chiefComplaint: "bilateral leg heaviness walking, relieved leaning forward", neurogenicClaudication: true, extensionAggravation: true, bilateralLegSymptoms: true },
  o: {
    rom: [{ movement: "Extension", activeROM: 15, passiveROM: 18, normalROM: 25 }],
    mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

const spondylolisthesis = (): { s: SubjectiveInput; o: ObjectiveFindings } => ({
  s: { region: "lumbar", chiefComplaint: "young athlete, LBP worse on extension", youngAthleteExtensionPain: true, extensionAggravation: true },
  o: {
    rom: [], mmt: [], specialTests: { stork: true, prone_instab: true },
    palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false },
  },
});

describe("Lumbar region — exam planning (Stage 2)", () => {
  it("adds a neuro screen + SLR/slump when leg pain extends below the knee", () => {
    const plan = planExamination({ region: "lumbar", chiefComplaint: "back and leg pain", legPainBelowKnee: true }, "lumbar");
    expect(plan.recommendations.some((r) => /Neurological screen|SLR|slump/i.test(r.exam))).toBe(true);
  });
  it("adds an SIJ provocation cluster when pain is SI-joint localised", () => {
    const plan = planExamination({ region: "lumbar", chiefComplaint: "buttock and SI joint pain", sacroiliacPainPattern: true }, "lumbar");
    expect(plan.recommendations.some((r) => /SIJ|sacroiliac/i.test(r.exam))).toBe(true);
  });
  it("adds walking-tolerance / extension-flexion testing when a neurogenic claudication pattern is reported", () => {
    const plan = planExamination({ region: "lumbar", chiefComplaint: "leg heaviness walking", neurogenicClaudication: true }, "lumbar");
    expect(plan.recommendations.some((r) => /[Ww]alking tolerance/.test(r.exam))).toBe(true);
  });
  it("forces refer-first on a cauda equina red flag", () => {
    const plan = planExamination({ region: "lumbar", chiefComplaint: "back pain", saddleAnesthesia: true }, "lumbar");
    expect(plan.referFirst).not.toBeNull();
    expect(plan.recommendations[0].exam).toMatch(/Refer/i);
  });
});

describe("Lumbar region — diagnosis (Stage 5)", () => {
  it("ranks Lumbar radiculopathy top for an SLR-positive, dermatomal, myotome-weak cluster", () => {
    const { s, o } = radiculopathy();
    const r = runReasoning(s, o, "lumbar");
    expect(r.differentials[0].name).toMatch(/radiculopathy/i);
    expect(r.differentials[0].diagnosticMatchScore).toBeGreaterThan(50);
  });
  it("ranks facet syndrome / mechanical LBP top for extension provocation without neuro signs", () => {
    const { s, o } = facet();
    const r = runReasoning(s, o, "lumbar");
    expect(r.differentials[0].name).toMatch(/facet|mechanical/i);
  });
  it("ranks sacroiliac joint dysfunction top for a positive Laslett-style cluster", () => {
    const { s, o } = sacroiliac();
    const r = runReasoning(s, o, "lumbar");
    expect(r.differentials[0].name).toMatch(/[Ss]acroiliac|SIJ/i);
  });
  it("ranks spinal stenosis top for a bilateral, extension-provoked neurogenic claudication pattern", () => {
    const { s, o } = stenosis();
    const r = runReasoning(s, o, "lumbar");
    expect(r.differentials[0].name).toMatch(/stenosis/i);
  });
  it("ranks spondylolisthesis/spondylolysis top for a young athlete with a positive stork test", () => {
    const { s, o } = spondylolisthesis();
    const r = runReasoning(s, o, "lumbar");
    expect(r.differentials[0].name).toMatch(/[Ss]pondylolisthesis|spondylolysis/i);
  });
  it("halts and refers on cauda equina red-flag signs (red flag precedence)", () => {
    const r = runReasoning({ region: "lumbar", chiefComplaint: "back and leg pain", saddleAnesthesia: true, bilateralLegWeakness: true }, emptyObj(), "lumbar");
    expect(r.stopped).toBe(true);
    expect(r.differentials).toHaveLength(0);
    expect(r.interpretation!.referralRecommendation).toMatch(/Red flag/i);
  });
  it("is deterministic across repeated runs", () => {
    const { s, o } = radiculopathy();
    expect(stableStringify(runReasoning(s, o, "lumbar"))).toBe(stableStringify(runReasoning(s, o, "lumbar")));
  });
  it("gates spondylolisthesis (low score) without a positive stork test or young-athlete history", () => {
    const { s, o } = sacroiliac();
    const r = runReasoning(s, o, "lumbar");
    const spondylo = r.differentials.find((d) => /[Ss]pondylolisthesis/.test(d.name));
    expect(spondylo!.diagnosticMatchScore).toBeLessThan(20);
  });
});

describe("Lumbar region — interpretation + normalize", () => {
  it("recommends imaging/medical referral text when an objective neurological deficit is present", () => {
    const { s, o } = radiculopathy();
    const r = runReasoning(s, o, "lumbar");
    expect(r.interpretation!.referralRecommendation).toMatch(/neurological deficit/i);
  });
  it("normalizes a flat lumbar record and runs via the dispatcher", () => {
    const data = {
      cc_main: "Low back pain with right leg pain below the knee",
      lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
      lx_dermatomal: "L5 — lateral lower leg / dorsum foot / great toe",
      st_slr_test: "Positive 30–60° (highly specific for disc herniation)",
      myo_l5_left: "5", myo_l5_right: "3",
    };
    const { subjective, objective, region } = normalizeLumbarFromData(data);
    expect(region).toBe("lumbar");
    expect(subjective.legPainBelowKnee).toBe(true);
    expect(objective.specialTests.slr).toBe(true);
    expect(objective.mmt[0].grade).toBe(3);
    const r = runReasoningFromData(data, "lumbar");
    expect(r.differentials[0].name).toMatch(/radiculopathy/i);
  });
  it("detects the cauda equina red flag from the real lx_rf_cauda field and withholds diagnosis", () => {
    const data = {
      cc_main: "Severe low back pain",
      lx_rf_cauda: ["Saddle area anaesthesia — perineum / inner thighs", "Bladder retention — cannot urinate"],
    };
    const r = runReasoningFromData(data, "lumbar");
    expect(r.stopped).toBe(true);
    expect(r.redFlag.triggered).toBe(true);
  });

  // Real-case validation (deep audit): older patient, bilateral leg heaviness
  // provoked by walking/standing and relieved by leaning forward -- the
  // textbook neurogenic claudication pattern of central/lateral recess
  // stenosis -- built from real field ids and run through the actual
  // production entrypoint.
  it("ranks spinal stenosis top for a real flat record with a neurogenic claudication pattern", () => {
    const data = {
      dem_age: "68",
      cc_main: "Bilateral leg heaviness and back pain when walking, better sitting down",
      lx_claudication: "Relieved by leaning forward / bending (neurogenic claudication — stenosis)",
      lx_below_knee: "Leg pain — bilateral (cauda equina / stenosis flag)",
      lx_agg_mov: ["Backward bending (extension)"],
      rom_lext_arom: "12", rom_lext_prom: "15",
    };
    const r = runReasoningFromData(data, "lumbar");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/stenosis/i);
  });

  // Real-case validation (deep audit): confirms the pre-existing (already
  // correct) malignancy wiring -- age 50+, unexplained weight loss
  // (grf_systemic), and unrelieved constant night pain (lx_night) -- still
  // fires end to end through real field ids after this audit's other changes.
  it("fires the malignancy red flag from real dem_age/grf_systemic/lx_night fields", () => {
    const data = {
      dem_age: "67",
      cc_main: "Progressive low back pain over 2 months, unintentional weight loss",
      lx_night: ["Constant night pain — cannot sleep"],
      grf_systemic: ["Unexplained weight loss >5kg"],
    };
    const r = runReasoningFromData(data, "lumbar");
    expect(r.stopped).toBe(true);
    expect(r.redFlag?.flags?.some((f) => f.id === "malignancy")).toBe(true);
  });
});
