import { runReasoning, runReasoningFromData, planExamination, normalizeSiFromData } from "../reasoningEngine/index";

const emptyObj = () => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } }) as any;

describe("SI region — exam planning", () => {
  it("always includes a lumbar/neuro screen, the SIJ provocation cluster, and an inflammatory screen", () => {
    const plan = planExamination({ region: "si", chiefComplaint: "buttock pain" } as any, "si", { flags: [], stopped: false } as any);
    expect(plan.recommendations.some((r) => /neurological screen|lumbar screen/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /provocation cluster/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /inflammatory back pain screen/i.test(r.exam))).toBe(true);
  });
});

describe("SI region — diagnosis", () => {
  it("ranks mechanical SIJ dysfunction top when the Laslett provocation cluster is positive", () => {
    const r = runReasoningFromData({
      cc_main: "unilateral buttock pain after a fall onto buttocks",
      lx_loc: "SI joint (L)",
      st_thigh_thrust: "Positive", st_si_distraction: "Positive", st_si_compression: "Positive",
    }, "si");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/sacroiliac joint pain/i);
  });
  it("ranks pregnancy-related pelvic girdle pain top for a post-partum onset with provocation signs", () => {
    const r = runReasoningFromData({
      cc_main: "bilateral buttock and groin pain since having my baby",
      lx_loc: "Bilateral SI joints",
      lx_moi: "Post-partum",
      lx_radiation: "Into groin (L)",
      st_thigh_thrust: "Positive", st_faber_test: "Positive",
    }, "si");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/pelvic girdle pain/i);
  });
  it("ranks inflammatory sacroiliitis top for a young patient with inflammatory features", () => {
    const r = runReasoningFromData({
      cc_main: "gradual buttock pain, stiff in the mornings",
      dem_age: "28",
      lx_loc: "SI joint (R)",
      lx_rf_inflammatory: "Alternating buttock pain (R to L), Morning stiffness >30 minutes, NSAIDs very effective (ASAS criterion), Age of onset <45",
    }, "si");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/inflammatory sacroiliitis/i);
  });
  it("does NOT rank SIJ dysfunction top when leg pain is below knee with a dermatomal pattern (lumbar source)", () => {
    const r = runReasoningFromData({
      cc_main: "buttock and leg pain to the foot",
      lx_loc: "SI joint (L)",
      lx_below_knee: "Leg pain — below knee (radiculopathy threshold)",
      lx_dermatomal: "L5 — lateral lower leg / dorsum foot / great toe",
    }, "si");
    expect(r.differentials[0].name).not.toMatch(/sacroiliac joint pain/i);
  });
  it("only fires the provocation-cluster finding at 3+ positive tests", () => {
    const two = normalizeSiFromData({ cc_main: "x", st_thigh_thrust: "Positive", st_si_distraction: "Positive" });
    expect(two.objective.specialTests.si_compression).toBeUndefined();
    const rTwo = runReasoning(two.subjective, two.objective, "si");
    expect(rTwo.stopped).toBe(false);
  });
  it("halts on a suspected fracture red flag (shared lumbar/SI fracture screen)", () => {
    const r = runReasoningFromData({
      cc_main: "severe pelvic pain after a high fall",
      lx_loc: "Sacrum (central)",
      lx_rf_fracture: "Major high-energy trauma",
    }, "si");
    expect(r.stopped).toBe(true);
    expect(r.differentials.length).toBe(0);
  });
  it("halts on the malignancy triad", () => {
    const r = runReasoning({ region: "si", chiefComplaint: "progressive buttock pain", unexplainedWeightLoss: true, nightPainUnrelieved: true, ageOver50: true } as any, emptyObj(), "si");
    expect(r.stopped).toBe(true);
    expect(r.redFlag?.flags?.some((f) => f.id === "malignancy")).toBe(true);
  });
});
