// findings.ts — deterministically derives explicit clinical findings from the
// normalised subjective + objective inputs. This REPLACES the old fragile
// substring flag-matching: findings are explicit codes with a stated source,
// so scoring is transparent and reproducible. Only affirmatively-present
// findings are emitted; anything "not mentioned" is simply absent.

import type { SubjectiveInput, ObjectiveFindings, Finding } from "./types";

const isPositive = (tests: Record<string, boolean>, id: string): boolean => tests[id] === true;

/** Shoulder-first finding derivation. Region-agnostic scaffolding; shoulder
 *  logic is explicit and cited to standard tests. Other regions extend here. */
export function deriveFindings(
  subjective: SubjectiveInput,
  objective: ObjectiveFindings,
  region: string
): Finding[] {
  const f: Finding[] = [];
  const add = (code: string, domain: Finding["domain"], present: boolean, source: string) => {
    if (present) f.push({ code, domain, present: true, source });
  };

  // ── History / pain behaviour (region-agnostic subjective signals) ──
  add("insidious_onset", "history", !!subjective.onsetInsidious, "History: insidious onset");
  add("traumatic_onset", "history", !!subjective.onsetTraumatic, "History: traumatic onset");
  add("night_pain", "painBehaviour", !!subjective.nightPain, "History: night pain reported");
  add("constant_pain", "painBehaviour", !!subjective.constantPain, "History: constant pain");
  add("eases_with_rest", "painBehaviour", !!subjective.easesWithRest, "History: eases with rest (mechanical)");
  add("paresthesia", "history", !!subjective.paresthesia, "History: paraesthesia reported");
  add("radiation_below_elbow", "history", !!subjective.radiationBelowElbow, "History: radiation below elbow");
  add("overhead_aggravation", "painBehaviour", !!subjective.overheadAggravation, "History: overhead activity aggravates");
  add("progressive_stiffness", "history", !!subjective.progressiveStiffness, "History: progressive global stiffness");

  if (region === "shoulder") {
    deriveShoulder(subjective, objective, add);
  }
  if (region === "cervical") {
    deriveCervical(subjective, objective, add);
  }
  if (region === "lumbar") {
    deriveLumbar(subjective, objective, add);
  }
  return f;
}

type Add = (code: string, domain: Finding["domain"], present: boolean, source: string) => void;

function deriveShoulder(s: SubjectiveInput, o: ObjectiveFindings, add: Add): void {
  const t = o.specialTests;

  // Special-test findings (explicit, cited)
  add("hawkins_positive", "specialTests", isPositive(t, "hawkins"), "Hawkins-Kennedy: positive (subacromial)");
  add("neer_positive", "specialTests", isPositive(t, "neer"), "Neer: positive (subacromial)");
  add("painful_arc", "specialTests", isPositive(t, "painful_arc"), "Painful arc 60-120°: positive");
  add("empty_can_positive", "specialTests", isPositive(t, "empty_can"), "Empty can (Jobe): positive (supraspinatus)");
  add("er_lag_positive", "specialTests", isPositive(t, "er_lag"), "External rotation lag: positive (full-thickness cuff)");
  add("drop_arm_positive", "specialTests", isPositive(t, "drop_arm"), "Drop-arm: positive (large cuff tear)");
  add("lift_off_positive", "specialTests", isPositive(t, "lift_off"), "Lift-off: positive (subscapularis)");
  add("ac_scarf_positive", "specialTests", isPositive(t, "scarf"), "Scarf/cross-body: positive (AC joint)");
  add("obrien_positive", "specialTests", isPositive(t, "obrien"), "O'Brien active compression: positive (SLAP/AC)");
  add("apprehension_positive", "specialTests", isPositive(t, "apprehension"), "Apprehension: positive (anterior instability)");
  add("relocation_positive", "specialTests", isPositive(t, "relocation"), "Relocation: positive (anterior instability)");
  add("speeds_positive", "specialTests", isPositive(t, "speeds"), "Speed's: positive (biceps)");
  add("spurling_positive", "specialTests", isPositive(t, "spurling"), "Spurling's: positive (cervical referral)");

  // ROM findings — capsular pattern = ER > Abd > IR loss (adhesive capsulitis).
  const romByMove = new Map<string, { active: number | null; passive: number | null; normal: number | null }>();
  for (const r of o.rom) {
    romByMove.set(r.movement.toLowerCase(), { active: r.activeROM, passive: r.passiveROM, normal: r.normalROM });
  }
  const lossPct = (m: string): number | null => {
    const r = romByMove.get(m);
    if (!r || r.passive == null || r.normal == null || r.normal === 0) return null;
    return Math.max(0, (r.normal - r.passive) / r.normal);
  };
  const er = lossPct("external rotation");
  const abd = lossPct("abduction");
  const ir = lossPct("internal rotation");
  const capsular = er != null && abd != null && ir != null && er >= 0.3 && er >= abd && abd >= ir - 0.001;
  add("capsular_pattern", "rom", capsular, "ROM: capsular pattern (ER>Abd>IR passive loss)");
  add("global_rom_loss", "rom", (er != null && er >= 0.5) && (abd != null && abd >= 0.5), "ROM: marked global passive loss");

  // End-feel
  const hardCapsuleEndFeel = o.rom.some((r) => (r.endFeel || "").toLowerCase().includes("capsular") || (r.endFeel || "").toLowerCase().includes("hard"));
  add("capsular_end_feel", "endFeel", hardCapsuleEndFeel, "End-feel: firm/capsular");

  // MMT — weakness of abduction/ER suggests cuff involvement (grade <= 3 = weak)
  const weak = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.grade <= 3);
  const painfulResist = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.painOnResist === true);
  add("abduction_weak", "mmt", weak("abduct") || weak("supraspinatus"), "MMT: abduction/supraspinatus weakness (<=3/5)");
  add("er_weak", "mmt", weak("external") || weak("infraspinatus"), "MMT: external rotation/infraspinatus weakness (<=3/5)");
  add("painful_weak_resist", "mmt", painfulResist("abduct") || painfulResist("supraspinatus") || painfulResist("external"), "MMT: painful resisted contraction (contractile lesion)");

  // Palpation
  const tender = (name: string): boolean => o.palpation.tenderStructures.some((s) => s.toLowerCase().includes(name));
  add("ac_joint_tender", "palpation", tender("ac") || tender("acromioclavicular"), "Palpation: AC joint tenderness");
  add("greater_tuberosity_tender", "palpation", tender("tuberosity") || tender("supraspinatus"), "Palpation: greater tuberosity tenderness");
  add("bicipital_groove_tender", "palpation", tender("biceps") || tender("bicipital"), "Palpation: bicipital groove tenderness");

  // Imaging
  add("imaging_calcific", "imaging", (o.imaging?.summary || "").toLowerCase().includes("calcif"), "Imaging: calcific deposit reported");
  add("imaging_full_thickness_tear", "imaging", (o.imaging?.summary || "").toLowerCase().includes("full-thickness") || (o.imaging?.summary || "").toLowerCase().includes("full thickness"), "Imaging: full-thickness cuff tear reported");
  add("imaging_oa", "imaging", (o.imaging?.summary || "").toLowerCase().includes("osteoarth") || (o.imaging?.summary || "").toLowerCase().includes(" oa"), "Imaging: glenohumeral OA reported");
}

/** Static registry of every finding code -> its clinical domain. Used by the
 *  scoring engine to compute max-possible weighted score even for findings that
 *  are absent in a given patient. Keeps scoring transparent and reproducible. */
import type { Domain } from "./types";
export const FINDING_DOMAIN: Record<string, Domain> = {
  insidious_onset: "history", traumatic_onset: "history", paresthesia: "history",
  radiation_below_elbow: "history", progressive_stiffness: "history",
  night_pain: "painBehaviour", constant_pain: "painBehaviour", eases_with_rest: "painBehaviour",
  overhead_aggravation: "painBehaviour",
  hawkins_positive: "specialTests", neer_positive: "specialTests", painful_arc: "specialTests",
  empty_can_positive: "specialTests", er_lag_positive: "specialTests", drop_arm_positive: "specialTests",
  lift_off_positive: "specialTests", ac_scarf_positive: "specialTests", obrien_positive: "specialTests",
  apprehension_positive: "specialTests", relocation_positive: "specialTests", speeds_positive: "specialTests",
  spurling_positive: "specialTests",
  capsular_pattern: "rom", global_rom_loss: "rom",
  capsular_end_feel: "endFeel",
  abduction_weak: "mmt", er_weak: "mmt", painful_weak_resist: "mmt",
  ac_joint_tender: "palpation", greater_tuberosity_tender: "palpation", bicipital_groove_tender: "palpation",
  imaging_calcific: "imaging", imaging_full_thickness_tear: "imaging", imaging_oa: "imaging",
  // cervical
  radiating_arm_pain: "history", dermatomal_pattern: "history", headache_cervical: "history",
  unilateral_headache: "history", neck_stiffness: "history", gait_disturbance: "history",
  ext_rot_aggravation: "painBehaviour",
  distraction_relief: "specialTests", ultta_positive: "specialTests",
  rotation_lt_60: "specialTests", flexion_rotation_positive: "specialTests", hoffmann_positive: "specialTests",
  reflex_change: "specialTests", sensory_deficit: "specialTests",
  myotome_weak: "mmt",
  cervical_ext_rom_limited: "rom", cervical_rot_rom_limited: "rom",
  facet_tender: "palpation", upper_cervical_tender: "palpation",
  // lumbar
  leg_pain_below_knee: "history", bilateral_leg_symptoms: "history",
  neurogenic_claudication: "history", sij_pain_pattern: "history",
  young_athlete_extension_pain: "history", foot_drop_reported: "history",
  flexion_aggravation: "painBehaviour", extension_aggravation: "painBehaviour",
  sitting_aggravation: "painBehaviour", centralises_extension: "painBehaviour",
  centralises_flexion: "painBehaviour",
  slr_positive: "specialTests", slump_positive: "specialTests",
  femoral_stretch_positive: "specialTests", prone_instability_positive: "specialTests",
  stork_positive: "specialTests", kemp_positive: "specialTests",
  si_cluster_positive: "specialTests", lateral_shift_positive: "specialTests",
  lumbar_flexion_limited: "rom", lumbar_extension_limited: "rom",
  si_joint_tender: "palpation",
  imaging_spondylolisthesis: "imaging", imaging_disc_herniation: "imaging",
  imaging_stenosis: "imaging",
};

function deriveCervical(s: SubjectiveInput, o: ObjectiveFindings, add: Add): void {
  const t = o.specialTests;

  // History / behaviour (cervical-specific subjective signals)
  add("radiating_arm_pain", "history", !!s.radiatingArmPain, "History: radiating arm pain");
  add("dermatomal_pattern", "history", !!s.dermatomalPattern, "History: dermatomal distribution");
  add("headache_cervical", "history", !!s.headacheFromNeck, "History: headache arising from neck");
  add("unilateral_headache", "history", !!s.unilateralHeadache, "History: unilateral (side-locked) headache");
  add("neck_stiffness", "history", !!s.neckStiffness, "History: neck stiffness");
  add("gait_disturbance", "history", !!s.gaitDisturbance, "History: gait disturbance (UMN concern)");
  add("ext_rot_aggravation", "painBehaviour", !!s.extensionRotationAggravation, "History: extension/rotation aggravates");

  // Special tests / neuro
  add("spurling_positive", "specialTests", t.spurling === true, "Spurling's: positive (radiculopathy)");
  add("distraction_relief", "specialTests", t.distraction === true, "Cervical distraction: relieves (radiculopathy)");
  add("ultta_positive", "specialTests", t.ultt === true, "Upper limb tension test A: positive (neural)");
  add("rotation_lt_60", "specialTests", t.rotation_lt_60 === true, "Cervical rotation <60° to affected side");
  add("flexion_rotation_positive", "specialTests", t.flexion_rotation === true, "Flexion-rotation test: positive (C1-2, cervicogenic HA)");
  add("hoffmann_positive", "specialTests", t.hoffmann === true, "Hoffmann's: positive (UMN / myelopathy)");
  add("reflex_change", "specialTests", t.reflex_change === true, "Reflex change (radiculopathy)");
  add("sensory_deficit", "specialTests", t.sensory_deficit === true, "Dermatomal sensory deficit");

  // MMT — myotome weakness
  const weak = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.grade <= 3);
  add("myotome_weak", "mmt", weak("myotome") || weak("c5") || weak("c6") || weak("c7") || weak("c8"), "MMT: myotomal weakness (<=3/5)");

  // ROM
  const romByMove = new Map<string, { active: number | null; passive: number | null; normal: number | null }>();
  for (const r of o.rom) romByMove.set(r.movement.toLowerCase(), { active: r.activeROM, passive: r.passiveROM, normal: r.normalROM });
  const limited = (m: string): boolean => {
    const r = romByMove.get(m);
    if (!r || r.active == null || r.normal == null || r.normal === 0) return false;
    return (r.normal - r.active) / r.normal >= 0.25;
  };
  add("cervical_ext_rom_limited", "rom", limited("extension"), "ROM: cervical extension limited (>=25%)");
  add("cervical_rot_rom_limited", "rom", limited("rotation"), "ROM: cervical rotation limited (>=25%)");

  // Palpation
  const tender = (name: string): boolean => o.palpation.tenderStructures.some((x) => x.toLowerCase().includes(name));
  add("facet_tender", "palpation", tender("facet") || tender("zygapophyseal"), "Palpation: facet joint tenderness");
  add("upper_cervical_tender", "palpation", tender("suboccipital") || tender("upper cervical") || tender("c1") || tender("c2"), "Palpation: upper cervical tenderness");
}


function deriveLumbar(s: SubjectiveInput, o: ObjectiveFindings, add: Add): void {
  const t = o.specialTests;

  // History / behaviour (lumbar-specific subjective signals)
  add("leg_pain_below_knee", "history", !!s.legPainBelowKnee, "History: leg pain extending below the knee (radiculopathy threshold)");
  add("bilateral_leg_symptoms", "history", !!s.bilateralLegSymptoms, "History: bilateral leg symptoms");
  add("dermatomal_pattern", "history", !!s.dermatomalPattern, "History: dermatomal leg pain distribution");
  add("neurogenic_claudication", "history", !!s.neurogenicClaudication, "History: walking/standing tolerance limited, relieved by flexion/sitting (neurogenic claudication pattern)");
  add("sij_pain_pattern", "history", !!s.sacroiliacPainPattern, "History: SI joint / buttock-localised pain pattern");
  add("young_athlete_extension_pain", "history", !!s.youngAthleteExtensionPain, "History: young athlete with extension-provoked low back pain");
  add("foot_drop_reported", "history", !!s.footDropReported, "History: reported foot drop / difficulty clearing foot");
  add("flexion_aggravation", "painBehaviour", !!s.flexionAggravation, "History: forward bending/flexion aggravates");
  add("extension_aggravation", "painBehaviour", !!s.extensionAggravation, "History: backward bending/extension aggravates");
  add("sitting_aggravation", "painBehaviour", !!s.sittingAggravation, "History: sitting aggravates");
  add("centralises_extension", "painBehaviour", !!s.centralisesWithExtension, "History: extension (press-up) centralises symptoms (McKenzie directional preference)");
  add("centralises_flexion", "painBehaviour", !!s.centralisesWithFlexion, "History: flexion (knee-to-chest) centralises symptoms (McKenzie directional preference)");

  // Special tests / neuro (explicit, cited)
  add("slr_positive", "specialTests", isPositive(t, "slr"), "Straight Leg Raise: positive (L4-S1 nerve root tension)");
  add("slump_positive", "specialTests", isPositive(t, "slump"), "Slump test: positive (neural tension, entire neuraxis)");
  add("femoral_stretch_positive", "specialTests", isPositive(t, "femoral_stretch"), "Femoral Nerve Stretch Test: positive (L2-L4 nerve root tension)");
  add("prone_instability_positive", "specialTests", isPositive(t, "prone_instab"), "Prone Instability Test: positive (segmental instability)");
  add("stork_positive", "specialTests", isPositive(t, "stork"), "Stork test: positive (spondylolysis / pars stress)");
  add("kemp_positive", "specialTests", isPositive(t, "kemp"), "Kemp's test: positive (facet joint)");
  add("lateral_shift_positive", "specialTests", isPositive(t, "lateral_shift"), "Lateral shift correction: symptoms centralise (disc, directional preference)");
  const siPositives = ["si_distraction", "si_compression", "gaenslen", "thigh_thrust"].filter((k) => isPositive(t, k));
  add("si_cluster_positive", "specialTests", siPositives.length >= 3, `SIJ provocation cluster: ${siPositives.length}/4 positive (Laslett cluster ≥3)`);
  add("reflex_change", "specialTests", t.reflex_change === true, "Reflex change: patella (L3-L4) / Achilles (S1)");
  add("sensory_deficit", "specialTests", t.sensory_deficit === true, "Dermatomal sensory deficit (lumbosacral)");

  // MMT — myotome weakness (L3-S1)
  const weak = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.grade <= 3);
  add("myotome_weak", "mmt", weak("myotome"), "MMT: lumbosacral myotomal weakness (<=3/5)");

  // ROM — flexion/extension limitation (>=25% active loss vs normal)
  const romByMove = new Map<string, { active: number | null; passive: number | null; normal: number | null }>();
  for (const r of o.rom) romByMove.set(r.movement.toLowerCase(), { active: r.activeROM, passive: r.passiveROM, normal: r.normalROM });
  const limited = (m: string): boolean => {
    const r = romByMove.get(m);
    if (!r || r.active == null || r.normal == null || r.normal === 0) return false;
    return (r.normal - r.active) / r.normal >= 0.25;
  };
  add("lumbar_flexion_limited", "rom", limited("flexion"), "ROM: lumbar flexion limited (>=25%)");
  add("lumbar_extension_limited", "rom", limited("extension"), "ROM: lumbar extension limited (>=25%)");

  // Palpation
  const tender = (name: string): boolean => o.palpation.tenderStructures.some((x) => x.toLowerCase().includes(name));
  add("facet_tender", "palpation", tender("facet") || tender("zygapophyseal"), "Palpation: lumbar facet joint tenderness");
  add("si_joint_tender", "palpation", tender("si joint") || tender("sacroiliac") || tender("sij"), "Palpation: SI joint tenderness");

  // Imaging
  const imagingSummary = (o.imaging?.summary || "").toLowerCase();
  add("imaging_spondylolisthesis", "imaging", imagingSummary.includes("spondylolisthesis") || imagingSummary.includes("pars") || imagingSummary.includes("forward slip"), "Imaging: spondylolisthesis / pars defect reported");
  add("imaging_disc_herniation", "imaging", imagingSummary.includes("disc herniation") || imagingSummary.includes("hnp") || imagingSummary.includes("prolapse"), "Imaging: disc herniation reported");
  add("imaging_stenosis", "imaging", imagingSummary.includes("stenosis"), "Imaging: spinal stenosis reported");
}
