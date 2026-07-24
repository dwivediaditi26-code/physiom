import { runReasoning, runReasoningFromData, planExamination, normalizeHandFromData } from "../reasoningEngine/index";
const emptyObj = () => ({ rom: [], mmt: [], specialTests: {}, palpation: { tenderStructures: [] }, functional: { movements: [] }, imaging: { performed: false } }) as any;

describe("Hand region — exam planning", () => {
  it("always includes a fracture/tendon screen, digit inspection/palpation, and grip/pinch", () => {
    const plan = planExamination({ region: "hand", chiefComplaint: "finger pain" } as any, "hand", { flags: [], stopped: false } as any);
    expect(plan.recommendations.some((r) => /fracture\/tendon/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /palpation of the digits|inspection/i.test(r.exam))).toBe(true);
    expect(plan.recommendations.some((r) => /grip and pinch/i.test(r.exam))).toBe(true);
  });
});

describe("Hand region — diagnosis", () => {
  it("ranks digital OA top for older finger-joint pain with stiffness, insidious", () => {
    const r = runReasoningFromData({
      cc_main: "Gradual aching in the finger joints, stiff in the mornings",
      dem_age: "64",
      ew_loc: "Multiple fingers / whole hand",
      ew_pattern: "Morning stiffness — eases with use",
    }, "hand");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/osteoarthritis|heberden/i);
  });
  it("ranks thumb UCL injury (skier's thumb) top for a thumb MCP valgus trauma", () => {
    const r = runReasoningFromData({
      cc_main: "Thumb pain after a fall skiing, forced the thumb out",
      cc_onset: "fell skiing and forced/valgus the thumb, caught in strap",
      ew_loc: "Thumb MCP",
      ew_moi: "Direct trauma — wrist / hand",
    }, "hand");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/ulnar collateral|skier/i);
  });
  it("ranks trigger finger top for a catching/locking digit", () => {
    const r = runReasoningFromData({
      cc_main: "Finger keeps catching and locking when I bend it",
      ew_loc: "Palm — thenar eminence (thumb base)",
      ew_neuro: "Trigger finger — click / lock with flexion",
    }, "hand");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/trigger finger/i);
  });
  it("ranks Dupuytren's top for a palmar cord / ring-finger contracture", () => {
    const r = runReasoningFromData({
      cc_main: "Ring finger slowly bending in, tight cord in the palm",
      ew_loc: "Palm — hypothenar eminence (little finger)",
      ew_rf: "Dupuytren's contracture — ring finger flexion contracture",
    }, "hand");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/dupuytren/i);
  });
  it("ranks a finger sprain top for a jammed-finger trauma", () => {
    const r = runReasoningFromData({
      cc_main: "Jammed my finger catching a ball, swollen and sore",
      cc_onset: "jammed the finger catching a ball",
      ew_loc: "Fingers — specify in notes",
    }, "hand");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/sprain|collateral|jammed/i);
  });
  it("ranks Raynaud's top for cold-induced colour change", () => {
    const r = runReasoningFromData({
      cc_main: "Fingers go white then blue in the cold",
      ew_rf: "Raynaud's phenomenon — colour changes with cold",
    }, "hand");
    expect(r.stopped).toBe(false);
    expect(r.differentials[0].name).toMatch(/raynaud/i);
  });
  it("halts on an acute hot swollen small joint (septic screen)", () => {
    const r = runReasoning({ region: "hand", chiefComplaint: "hot swollen painful finger joint, feverish", hotSwollenJoint: true } as any, emptyObj(), "hand");
    expect(r.stopped).toBe(true);
  });
  it("runs via region detection with real field ids", () => {
    const r = runReasoningFromData({ cc_main: "finger joint pain", ew_loc: "Multiple fingers / whole hand" }, "hand");
    expect(r.differentials.length).toBeGreaterThan(0);
  });
});
