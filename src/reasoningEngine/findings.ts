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
  add("age_over_50", "history", !!subjective.ageOver50, "History: age 50+ (degenerative risk factor)");

  if (region === "shoulder") {
    deriveShoulder(subjective, objective, add);
  }
  if (region === "cervical") {
    deriveCervical(subjective, objective, add);
  }
  if (region === "lumbar") {
    deriveLumbar(subjective, objective, add);
  }
  if (region === "hip") {
    deriveHip(subjective, objective, add);
  }
  if (region === "knee") {
    deriveKnee(subjective, objective, add);
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
  age_over_50: "history",
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
  // hip
  fadir_test_positive: "specialTests", faber_groin_positive: "specialTests",
  faber_sij_positive: "specialTests", hip_scour_positive: "specialTests",
  trendelenburg_positive: "specialTests", thomas_test_positive: "specialTests",
  ober_test_positive: "specialTests", piriformis_test_positive: "specialTests",
  hamstring_90_90_tight: "specialTests",
  fadir_aggravation: "painBehaviour", faber_aggravation: "painBehaviour",
  c_sign_positive: "history", hip_groin_dominant_pattern: "history",
  lateral_hip_pattern: "history", worse_lying_on_side: "painBehaviour",
  ischial_sitting_pain: "painBehaviour", proximal_hamstring_pattern: "history",
  adductor_pattern: "history", pubic_symphysis_pattern: "history",
  kicking_sprint_mechanism: "history", snapping_hip_internal: "history",
  snapping_hip_external: "history", hip_catching_locking: "painBehaviour",
  hip_crepitus_grinding: "painBehaviour", deep_buttock_pain: "history",
  meralgia_pattern: "history", hip_morning_stiffness: "painBehaviour",
  gmed_weak: "mmt", resisted_abduction_pain: "mmt",
  resisted_hip_extension_pain: "mmt", resisted_adduction_pain: "mmt",
  hip_ir_capsular_pattern: "rom", hip_flexion_loss: "rom",
  greater_trochanter_tender: "palpation", ischial_tuberosity_tender: "palpation",
  adductor_origin_tender: "palpation",
  imaging_hip_oa: "imaging", imaging_avn: "imaging", imaging_labral_tear: "imaging",
  // knee
  lachman_positive: "specialTests", anterior_drawer_positive: "specialTests",
  posterior_drawer_positive: "specialTests", pivot_shift_positive: "specialTests",
  valgus_stress_positive: "specialTests", varus_stress_positive: "specialTests",
  mcmurray_positive: "specialTests", apley_compression_positive: "specialTests",
  thessaly_positive: "specialTests", clarkes_positive: "specialTests",
  patellar_grind_positive: "specialTests", effusion_positive: "specialTests",
  noble_positive: "specialTests",
  knee_non_contact_twist: "history", knee_acute_pop: "history",
  knee_immediate_haemarthrosis: "history", knee_giving_way_pivot: "history",
  knee_true_locking: "painBehaviour", knee_movie_sign: "painBehaviour",
  knee_worse_descending_stairs: "painBehaviour", knee_valgus_mechanism: "history",
  knee_varus_mechanism: "history", knee_pcl_mechanism: "history",
  knee_joint_line_mechanical: "painBehaviour", knee_recurrent_effusion: "painBehaviour",
  knee_anterior_pain_pattern: "history", knee_patellar_tendon_pattern: "history",
  knee_medial_joint_pain: "history", knee_lateral_joint_pain: "history",
  knee_lateral_itb_pattern: "history", knee_diffuse_pain: "history",
  quad_weak: "mmt", resisted_knee_extension_pain: "mmt",
  knee_flexion_loss: "rom", knee_extension_loss: "rom",
  medial_joint_line_tender: "palpation", lateral_joint_line_tender: "palpation",
  patellar_tendon_tender: "palpation",
  imaging_knee_oa: "imaging", imaging_meniscal_tear: "imaging", imaging_acl_tear: "imaging",
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

function deriveHip(s: SubjectiveInput, o: ObjectiveFindings, add: Add): void {
  const t = o.specialTests;

  add("c_sign_positive", "history", !!s.cSignPositive, "History: C-sign — patient cups anterolateral hip (intra-articular pattern)");
  add("hip_groin_dominant_pattern", "history", !!s.hipGroinDominantPattern, "History: groin-dominant pain pattern (intra-articular: FAI/OA/labral)");
  add("lateral_hip_pattern", "history", !!s.lateralHipPattern, "History: lateral hip pain pattern (trochanteric/abductor)");
  add("proximal_hamstring_pattern", "history", !!s.proximalHamstringPattern, "History: ischial tuberosity / proximal hamstring pain pattern");
  add("adductor_pattern", "history", !!s.adductorPattern, "History: adductor / groin pain pattern");
  add("pubic_symphysis_pattern", "history", !!s.pubicSymphysisPattern, "History: pubic symphysis pain pattern (athletic pubalgia / osteitis pubis)");
  add("kicking_sprint_mechanism", "history", !!s.kickingOrSprintMechanism, "History: kicking/lunging/sprint mechanism");
  add("snapping_hip_internal", "history", !!s.snappingHipInternal, "History: internal snapping (coxa saltans interna — iliopsoas)");
  add("snapping_hip_external", "history", !!s.snappingHipExternal, "History: external snapping (coxa saltans externa — ITB over trochanter)");
  add("deep_buttock_pain", "history", !!s.deepButtockPain, "History: deep buttock pain, not SIJ (piriformis / deep gluteal)");
  add("meralgia_pattern", "history", !!s.meralgiaPattern, "History: lateral thigh burning/numbness pattern (meralgia paraesthetica)");
  add("fadir_aggravation", "painBehaviour", !!s.fadirAggravation, "History: FADIR combined movement aggravates (FAI pattern)");
  add("faber_aggravation", "painBehaviour", !!s.faberAggravation, "History: FABER combined movement aggravates (SIJ/labral pattern)");
  add("worse_lying_on_side", "painBehaviour", !!s.worseLyingOnAffectedSide, "History: worse lying on affected side (trochanteric)");
  add("ischial_sitting_pain", "painBehaviour", !!s.ischialSittingPain, "History: worse sitting on hard surface (ischial tuberosity)");
  add("hip_catching_locking", "painBehaviour", !!s.hipCatchingOrLocking, "History: catching/giving way/locking (labral or loose body)");
  add("hip_crepitus_grinding", "painBehaviour", !!s.hipCrepitusGrinding, "History: crepitus/grinding (osteoarthritic)");
  add("hip_morning_stiffness", "painBehaviour", !!s.hipMorningStiffness, "History: morning stiffness easing with movement");

  add("fadir_test_positive", "specialTests", isPositive(t, "fadir"), "FADIR test: positive — anterior groin pain (FAI / labral)");
  add("faber_groin_positive", "specialTests", isPositive(t, "faber_groin"), "FABER/Patrick's test: positive — groin pain (hip joint)");
  add("faber_sij_positive", "specialTests", isPositive(t, "faber_sij"), "FABER/Patrick's test: positive — posterior pelvic pain (SIJ)");
  add("hip_scour_positive", "specialTests", isPositive(t, "hip_scour"), "Hip Scour test: positive (labral tear / loose body / OA)");
  add("trendelenburg_positive", "specialTests", isPositive(t, "trendelenburg"), "Trendelenburg test: positive (gluteus medius weakness)");
  add("thomas_test_positive", "specialTests", isPositive(t, "thomas"), "Thomas test: positive (hip flexor / rectus femoris / TFL tightness)");
  add("ober_test_positive", "specialTests", isPositive(t, "ober"), "Ober's test: positive (IT band / TFL tightness)");
  add("piriformis_test_positive", "specialTests", isPositive(t, "piriformis"), "Piriformis (FAIR) test: positive (deep gluteal / piriformis syndrome)");
  add("hamstring_90_90_tight", "specialTests", isPositive(t, "hamstring_90_90"), "90-90 hamstring test: hamstring tightness present");

  const weak = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.grade <= 3);
  const painfulResist = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.painOnResist === true);
  add("gmed_weak", "mmt", weak("gluteus medius"), "MMT: gluteus medius weakness (<=3/5)");
  add("resisted_abduction_pain", "mmt", painfulResist("gluteus medius") || painfulResist("tensor fasciae latae"), "MMT: painful resisted abduction (trochanteric/abductor tendinopathy)");
  add("resisted_hip_extension_pain", "mmt", painfulResist("gluteus maximus") || painfulResist("hamstring"), "MMT: painful resisted hip extension (proximal hamstring/gluteal)");
  add("resisted_adduction_pain", "mmt", painfulResist("adduct"), "MMT: painful resisted adduction (adductor strain)");

  const romByMove = new Map<string, { active: number | null; passive: number | null; normal: number | null }>();
  for (const r of o.rom) romByMove.set(r.movement.toLowerCase(), { active: r.activeROM, passive: r.passiveROM, normal: r.normalROM });
  const lossPct = (m: string): number | null => {
    const r = romByMove.get(m);
    if (!r || r.passive == null || r.normal == null || r.normal === 0) return null;
    return Math.max(0, (r.normal - r.passive) / r.normal);
  };
  const ir = lossPct("internal rotation");
  const flex = lossPct("flexion");
  const abd = lossPct("abduction");
  const capsular = ir != null && flex != null && abd != null && ir >= 0.3 && ir >= flex && flex >= abd - 0.001;
  add("hip_ir_capsular_pattern", "rom", capsular, "ROM: hip capsular pattern (IR most limited, then flexion, then abduction — early OA sign)");
  const limited = (m: string): boolean => {
    const r = romByMove.get(m);
    if (!r || r.active == null || r.normal == null || r.normal === 0) return false;
    return (r.normal - r.active) / r.normal >= 0.25;
  };
  add("hip_flexion_loss", "rom", limited("flexion"), "ROM: hip flexion limited (>=25%)");

  const tender = (name: string): boolean => o.palpation.tenderStructures.some((x) => x.toLowerCase().includes(name));
  add("greater_trochanter_tender", "palpation", tender("trochanter") || tender("gluteal tendinopathy") || tender("gluteus medius"), "Palpation: greater trochanter tenderness (GTPS)");
  add("ischial_tuberosity_tender", "palpation", tender("ischial"), "Palpation: ischial tuberosity tenderness (proximal hamstring)");
  add("adductor_origin_tender", "palpation", tender("adductor") || tender("pubic"), "Palpation: adductor origin / pubic ramus tenderness");

  const imagingSummary = (o.imaging?.summary || "").toLowerCase();
  add("imaging_hip_oa", "imaging", imagingSummary.includes("osteoarth") || imagingSummary.includes(" oa"), "Imaging: hip osteoarthritis reported");
  add("imaging_avn", "imaging", imagingSummary.includes("avascular necrosis") || imagingSummary.includes("avn") || imagingSummary.includes("osteonecrosis"), "Imaging: avascular necrosis reported");
  add("imaging_labral_tear", "imaging", imagingSummary.includes("labral") || imagingSummary.includes("labrum"), "Imaging: acetabular labral tear reported");
}

function deriveKnee(s: SubjectiveInput, o: ObjectiveFindings, add: Add): void {
  const t = o.specialTests;

  add("knee_non_contact_twist", "history", !!s.kneeNonContactTwistMechanism, "History: non-contact twisting/pivoting mechanism (ACL pattern)");
  add("knee_acute_pop", "history", !!s.kneeAcutePopFelt, "History: heard/felt a pop at time of injury (ACL flag)");
  add("knee_immediate_haemarthrosis", "history", !!s.kneeImmediateHaemarthrosis, "History: immediate swelling within 2 hours (haemarthrosis — ACL/fracture flag)");
  add("knee_giving_way_pivot", "history", !!s.kneeGivingWayWithPivot, "History: giving way with direction change/pivot (ACL pattern)");
  add("knee_valgus_mechanism", "history", !!s.kneeValgusMechanism, "History: direct blow medial knee — valgus stress mechanism (MCL)");
  add("knee_varus_mechanism", "history", !!s.kneeVarusMechanism, "History: direct blow lateral knee — varus stress mechanism (LCL)");
  add("knee_pcl_mechanism", "history", !!s.kneePclMechanism, "History: dashboard/direct blow anterior tibia mechanism (PCL)");
  add("knee_anterior_pain_pattern", "history", !!s.kneeAnteriorPainPattern, "History: anterior knee / peripatellar pain pattern (PFPS)");
  add("knee_patellar_tendon_pattern", "history", !!s.kneePatellarTendonPattern, "History: patellar tendon inferior-pole pain pattern");
  add("knee_medial_joint_pain", "history", !!s.kneeMedialJointPain, "History: medial joint line pain pattern");
  add("knee_lateral_joint_pain", "history", !!s.kneeLateralJointPain, "History: lateral joint line pain pattern");
  add("knee_lateral_itb_pattern", "history", !!s.kneeLateralItbPattern, "History: lateral (ITB attachment) pain pattern");
  add("knee_diffuse_pain", "history", !!s.kneeDiffuseWholeKneePain, "History: diffuse whole-knee pain pattern");
  add("knee_true_locking", "painBehaviour", !!s.kneeTrueLocking, "History: true mechanical locking (cannot fully extend)");
  add("knee_movie_sign", "painBehaviour", !!s.kneeMovieSignPositive, "History: movie sign — pain with prolonged knee flexion (PFPS)");
  add("knee_worse_descending_stairs", "painBehaviour", !!s.kneeWorseDescendingStairs, "History: worse descending stairs (patellofemoral/meniscal)");
  add("knee_joint_line_mechanical", "painBehaviour", !!s.kneeJointLineMechanical, "History: mechanical catching/clicking/grinding at joint line");
  add("knee_recurrent_effusion", "painBehaviour", !!s.kneeDelayedOrRecurrentSwelling, "History: delayed or recurrent effusion pattern");

  add("lachman_positive", "specialTests", isPositive(t, "lachman"), "Lachman's test: positive (ACL — most sensitive)");
  add("anterior_drawer_positive", "specialTests", isPositive(t, "anterior_drawer"), "Anterior drawer: positive (ACL)");
  add("posterior_drawer_positive", "specialTests", isPositive(t, "posterior_drawer"), "Posterior drawer: positive (PCL)");
  add("pivot_shift_positive", "specialTests", isPositive(t, "pivot_shift"), "Pivot shift: positive (ACL — rotational instability)");
  add("valgus_stress_positive", "specialTests", isPositive(t, "valgus_stress"), "Valgus stress test: positive (MCL)");
  add("varus_stress_positive", "specialTests", isPositive(t, "varus_stress"), "Varus stress test: positive (LCL)");
  add("mcmurray_positive", "specialTests", isPositive(t, "mcmurray"), "McMurray's test: positive (meniscal)");
  add("apley_compression_positive", "specialTests", isPositive(t, "apley_compression"), "Apley's grind (compression): positive (meniscal)");
  add("thessaly_positive", "specialTests", isPositive(t, "thessaly"), "Thessaly test: positive (meniscal — weight-bearing)");
  add("clarkes_positive", "specialTests", isPositive(t, "clarkes"), "Clarke's sign: positive (patellofemoral)");
  add("patellar_grind_positive", "specialTests", isPositive(t, "patellar_grind"), "Patellar grind test: positive (patellofemoral cartilage)");
  add("effusion_positive", "specialTests", isPositive(t, "effusion"), "Sweep/ballottement test: effusion present");
  add("noble_positive", "specialTests", isPositive(t, "noble"), "Noble compression test: positive (IT band syndrome)");
  add("ober_test_positive", "specialTests", isPositive(t, "ober"), "Ober's test: positive (IT band tightness)");

  const weak = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.grade <= 3);
  const painfulResist = (name: string): boolean => o.mmt.some((m) => m.muscle.toLowerCase().includes(name) && m.painOnResist === true);
  add("quad_weak", "mmt", weak("quadriceps"), "MMT: quadriceps weakness (<=3/5)");
  add("resisted_knee_extension_pain", "mmt", painfulResist("quadriceps"), "MMT: painful resisted knee extension (patellar tendinopathy/PFPS)");

  const romByMove = new Map<string, { active: number | null; passive: number | null; normal: number | null }>();
  for (const r of o.rom) romByMove.set(r.movement.toLowerCase(), { active: r.activeROM, passive: r.passiveROM, normal: r.normalROM });
  const limited = (m: string): boolean => {
    const r = romByMove.get(m);
    if (!r || r.active == null || r.normal == null || r.normal === 0) return false;
    return (r.normal - r.active) / r.normal >= 0.25;
  };
  add("knee_flexion_loss", "rom", limited("flexion"), "ROM: knee flexion limited (>=25%)");
  const extEntry = romByMove.get("extension");
  add("knee_extension_loss", "rom", !!extEntry && extEntry.active != null && extEntry.active > 5, "ROM: extension lag/loss present (earliest OA sign; also ACL block / extensor mechanism flag)");

  const tender = (name: string): boolean => o.palpation.tenderStructures.some((x) => x.toLowerCase().includes(name));
  add("medial_joint_line_tender", "palpation", tender("medial joint") || tender("medial meniscus"), "Palpation: medial joint line tenderness");
  add("lateral_joint_line_tender", "palpation", tender("lateral joint") || tender("lateral meniscus"), "Palpation: lateral joint line tenderness");
  add("patellar_tendon_tender", "palpation", tender("patellar tendon") || tender("infrapatellar"), "Palpation: patellar tendon tenderness");

  const imagingSummary = (o.imaging?.summary || "").toLowerCase();
  add("imaging_knee_oa", "imaging", imagingSummary.includes("osteoarth") || imagingSummary.includes(" oa"), "Imaging: knee osteoarthritis reported");
  add("imaging_meniscal_tear", "imaging", imagingSummary.includes("meniscal") || imagingSummary.includes("meniscus"), "Imaging: meniscal tear reported");
  add("imaging_acl_tear", "imaging", imagingSummary.includes("acl") || imagingSummary.includes("anterior cruciate"), "Imaging: ACL tear reported");
}
