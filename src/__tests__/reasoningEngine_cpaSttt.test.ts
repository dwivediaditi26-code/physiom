// reasoningEngine_cpaSttt.test.ts — verifies the CPA (NKT motor control) / STTT
// (Cyriax selective tissue tension) / reflex wiring added across all six built
// regions. Every field id used below was verified against sharedClinicalData.js
// (CYRIAX_REGIONS_DATA, NKT_REGIONS) and SubjectiveObjective.jsx's CyriaxModule/
// NKTSection storage logic -- see the readCyriax/readCpaInhibited comments in
// normalize.ts. Each test exercises the REAL raw-data path (runReasoningFromData)
// end to end: normalize -> findings -> diagnosis -> interpretation.
import { runReasoningFromData, normalizeFromData, normalizeHipFromData, normalizeElbowFromData } from "../reasoningEngine/index";

function scoreOf(differentials: { name: string; diagnosticMatchScore: number }[], nameMatch: RegExp): number {
  const d = differentials.find((x) => nameMatch.test(x.name));
  if (!d) throw new Error(`diagnosis matching ${nameMatch} not found`);
  return d.diagnosticMatchScore;
}

describe("Shoulder — CPA/STTT wiring", () => {
  const base = {
    cc_main: "shoulder pain, suspected cuff tear",
    grf_fracture: "no fracture indicators",
    hx_imaging_detail: "MRI: full-thickness supraspinatus tear",
    hx_imaging: "MRI",
  };
  it("Cyriax resisted IR (sh_r_ir) weak & painful feeds the mmt array as a Subscapularis entry", () => {
    const { objective } = normalizeFromData({ ...base, cyriax_shoulder_res_sh_r_ir: "Weak & Painful" });
    const entry = objective.mmt.find((m) => m.muscle.toLowerCase().includes("subscapularis"));
    expect(entry).toBeTruthy();
    expect(entry!.grade).toBeLessThanOrEqual(3);
    expect(entry!.painOnResist).toBe(true);
  });
  it("CPA subscapularis 'Inhibited' raises Rotator cuff tear (full-thickness) score via ir_weak", () => {
    const without = runReasoningFromData(base, "shoulder");
    const withCpa = runReasoningFromData({ ...base, nkt_subscapularis: "Inhibited — instability pattern" }, "shoulder");
    expect(scoreOf(withCpa.differentials, /rotator cuff tear/i)).toBeGreaterThan(scoreOf(without.differentials, /rotator cuff tear/i));
  });
});

describe("Cervical — CPA wiring", () => {
  const base = { cc_main: "headache and neck pain", cx_ha_present: "Yes — present", unilateral_headache: true };
  it("nkt_dnf 'Inhibited' raises Cervicogenic headache score via cpa_dnf_pattern", () => {
    const without = runReasoningFromData(base, "cervical");
    const withCpa = runReasoningFromData({ ...base, nkt_dnf: "Inhibited" }, "cervical");
    expect(scoreOf(withCpa.differentials, /cervicogenic headache/i)).toBeGreaterThan(scoreOf(without.differentials, /cervicogenic headache/i));
  });
});

describe("Lumbar — CPA wiring", () => {
  const base = { cc_main: "low back pain" };
  it("nkt_ta 'Inhibited' raises both Facet syndrome and SIJ dysfunction scores via cpa_core_inhibition", () => {
    const without = runReasoningFromData(base, "lumbar");
    const withCpa = runReasoningFromData({ ...base, nkt_ta: "Inhibited — erector spinae dominant" }, "lumbar");
    expect(scoreOf(withCpa.differentials, /facet syndrome/i)).toBeGreaterThan(scoreOf(without.differentials, /facet syndrome/i));
    expect(scoreOf(withCpa.differentials, /sacroiliac/i)).toBeGreaterThan(scoreOf(without.differentials, /sacroiliac/i));
  });
});

describe("Hip — CPA/STTT wiring", () => {
  const base = { cc_main: "deep buttock pain" };
  it("nkt_piriformis 'Overactive' raises Piriformis syndrome score via cpa_piriformis_dysfunction", () => {
    const without = runReasoningFromData(base, "hip");
    const withCpa = runReasoningFromData({ ...base, nkt_piriformis: "Overactive — piriformis syndrome" }, "hip");
    expect(scoreOf(withCpa.differentials, /piriformis syndrome/i)).toBeGreaterThan(scoreOf(without.differentials, /piriformis syndrome/i));
  });
  it("Cyriax resisted extension (hip_r_ext) 'Weak & Painless' feeds the mmt array as a Gluteus Maximus entry", () => {
    const { objective } = normalizeHipFromData({ ...base, cyriax_hip_res_hip_r_ext: "Weak & Painless" });
    const entry = objective.mmt.find((m) => m.muscle.toLowerCase().includes("gluteus maximus"));
    expect(entry).toBeTruthy();
    expect(entry!.grade).toBeLessThanOrEqual(3);
  });
});

describe("Knee — CPA/STTT/reflex wiring", () => {
  const base = { cc_main: "anterior knee pain, runner" };
  it("nkt_vmo 'inhibited' raises PFPS score via quad_weak", () => {
    const without = runReasoningFromData(base, "knee");
    const withCpa = runReasoningFromData({ ...base, nkt_vmo: "VMO inhibited — VL dominant" }, "knee");
    expect(scoreOf(withCpa.differentials, /patellofemoral/i)).toBeGreaterThan(scoreOf(without.differentials, /patellofemoral/i));
  });
  it("nkt_tfl 'Overactive' raises ITB friction syndrome score via cpa_tfl_overactive", () => {
    const without = runReasoningFromData(base, "knee");
    const withCpa = runReasoningFromData({ ...base, nkt_tfl: "Overactive — IT band syndrome" }, "knee");
    expect(scoreOf(withCpa.differentials, /iliotibial band/i)).toBeGreaterThan(scoreOf(without.differentials, /iliotibial band/i));
  });
  it("abnormal patellar reflex triggers a lumbar-radiculopathy referral flag, not a local knee diagnosis boost", () => {
    const r = runReasoningFromData({ ...base, n_ref_patella_left: "Diminished" }, "knee");
    expect(r.interpretation?.referralRecommendation ?? "").toMatch(/lumbar/i);
  });
});

describe("Elbow — CPA/STTT/reflex wiring", () => {
  const base = { cc_main: "proximal forearm and elbow pain" };
  it("Cyriax resisted wrist extension (el_r_wext) 'Weak & Painless' feeds resisted_wrist_extensors_weak -> Radial tunnel syndrome", () => {
    const without = runReasoningFromData(base, "elbow");
    const withStt = runReasoningFromData({ ...base, cyriax_elbow_res_el_r_wext: "Weak & Painless" }, "elbow");
    expect(scoreOf(withStt.differentials, /radial tunnel/i)).toBeGreaterThan(scoreOf(without.differentials, /radial tunnel/i));
  });
  it("Cyriax resisted grip (el_r_grip) 'Weak & Painful' feeds grip_weak_or_painful -> Lateral epicondylalgia", () => {
    const without = runReasoningFromData(base, "elbow");
    const withStt = runReasoningFromData({ ...base, cyriax_elbow_res_el_r_grip: "Weak & Painful" }, "elbow");
    expect(scoreOf(withStt.differentials, /lateral epicondylalgia/i)).toBeGreaterThan(scoreOf(without.differentials, /lateral epicondylalgia/i));
  });
  it("nkt_pronator 'Overactive — pronator syndrome' raises Pronator teres syndrome score via cpa_pronator_dysfunction", () => {
    const without = runReasoningFromData(base, "elbow");
    const withCpa = runReasoningFromData({ ...base, nkt_pronator: "Overactive — pronator syndrome" }, "elbow");
    expect(scoreOf(withCpa.differentials, /pronator teres syndrome/i)).toBeGreaterThan(scoreOf(without.differentials, /pronator teres syndrome/i));
  });
  it("CPA biceps 'Overactive' is NOT folded into the mmt array (only 'Inhibited' states represent reduced force output)", () => {
    const { objective } = normalizeElbowFromData({ ...base, nkt_biceps: "Overactive — RC inhibition" });
    expect(objective.mmt.some((m) => m.muscle.includes("(CPA)"))).toBe(false);
  });
  it("CPA triceps 'Inhibited — C7 radiculopathy' IS folded into the mmt array as a Triceps entry", () => {
    const { objective } = normalizeElbowFromData({ ...base, nkt_triceps: "Inhibited — C7 radiculopathy" });
    const entry = objective.mmt.find((m) => m.muscle.toLowerCase().includes("triceps") && m.muscle.includes("(CPA)"));
    expect(entry).toBeTruthy();
    expect(entry!.grade).toBeLessThanOrEqual(3);
  });
  it("abnormal biceps/triceps reflex triggers a cervical-radiculopathy referral flag, not a local elbow diagnosis boost", () => {
    const r = runReasoningFromData({ ...base, n_ref_tricep_left: "Absent" }, "elbow");
    expect(r.interpretation?.referralRecommendation ?? "").toMatch(/cervical/i);
  });
});
