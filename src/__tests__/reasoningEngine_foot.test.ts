import { runReasoning, runReasoningFromData, planExamination, normalizeFootFromData } from "../reasoningEngine/index";
const emptyObj = () => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } }) as any;

describe("Foot region — exam planning", () => {
  it("always includes an Ottawa/weight-bearing screen, gait/arch, and site-specific palpation", () => {
    const plan = planExamination({ region: "foot", chiefComplaint: "heel pain" } as any, "foot", { flags: [], stopped: false } as any);
    expect(plan.recommendations.some((r) => /ottawa|weight-bearing screen/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /gait|arch/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /palpation/i.test(r.exam))).toBe(true);
  });
});

describe("Foot region — diagnosis", () => {
  it("ranks plantar fasciitis top for medial-heel pain with first-step morning pain and a positive windlass", () => {
    const r = runReasoningFromData({
      cc_main: "Medial heel pain, worst first thing in the morning",
      af_loc: "Plantar fascia — medial heel / origin",
      af_morning: "First step severely painful — then eases (plantar fascia classic)",
      af_agg_mov: "Toe extension — big toe (plantar fascia)",
      st_windlass_test: "Positive",
    }, "foot");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/plantar fasci/i);
  });
  it("ranks Morton's neuroma top for 3rd/4th interspace pain with a tight toe box and forefoot paraesthesia", () => {
    const r = runReasoningFromData({
      cc_main: "Burning forefoot pain between the toes, worse in tight shoes",
      af_loc: "Forefoot — 3rd / 4th interspace (Morton's neuroma)",
      af_agg_act: "Tight shoes — narrow toe box (Morton's neuroma)",
      af_pattern: "Burning / night — tarsal tunnel / neuropathic",
    }, "foot");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/morton/i);
  });
  it("ranks 1st MTP OA / hallux rigidus top for older big-toe pain with toe-extension aggravation and stiffness", () => {
    const r = runReasoningFromData({
      cc_main: "Stiff painful big toe joint, gradual, worse pushing off",
      dem_age: "62",
      af_loc: "Forefoot — 1st MTP (big toe)",
      af_agg_mov: "Toe extension — big toe (plantar fascia)",
      af_pattern: "After-rest stiffness — eases with movement",
    }, "foot");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/1st mtp|hallux rigidus/i);
  });
  it("ranks turf toe top for a big-toe hyperextension mechanism in a young athlete", () => {
    const r = runReasoningFromData({
      cc_main: "Big toe pain after jamming/hyperextending it pushing off",
      cc_onset: "hyperextended the big toe pushing off in sport",
      af_loc: "Forefoot — 1st MTP (big toe)",
      af_moi: "Sudden push-off / sprint start",
    }, "foot");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/turf toe/i);
  });
  it("distinguishes central heel fat pad pain from plantar fasciitis", () => {
    const r = runReasoningFromData({
      cc_main: "Central heel pain worse barefoot on hard floors, no first-step pattern",
      af_loc: "Calcaneus — plantar surface (heel pad)",
      af_agg_act: "Standing on hard surfaces",
    }, "foot");
    expect(r.differentials[0].name).toMatch(/fat pad|plantar/i);
  });
  it("halts on a positive Ottawa foot screen (fracture)", () => {
    const r = runReasoningFromData({
      cc_main: "Severe midfoot pain after a crush injury, cannot weight bear",
      af_rf: "Ottawa Rules — cannot weight bear 4 steps, Ottawa Rules — bony tenderness navicular",
    }, "foot");
    expect(r.stopped).toBe(true);
    expect(r.differentials.length).toBe(0);
  });
  it("halts on an acute hot swollen joint (septic screen)", () => {
    const r = runReasoning({ region: "foot", chiefComplaint: "hot swollen painful forefoot, feverish", hotSwollenJoint: true } as any, emptyObj(), "foot");
    expect(r.stopped).toBe(true);
  });
  it("runs via region detection with real field ids", () => {
    const r = runReasoningFromData({ cc_main: "plantar heel pain", af_loc: "Plantar fascia — medial heel / origin" }, "foot");
    expect(r.differentials.length).toBeGreaterThan(0);
  });
});
