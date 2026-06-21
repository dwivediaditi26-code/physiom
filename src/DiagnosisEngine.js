/**
 * DiagnosisEngine.js
 * Clinical diagnosis suggestion engine for PhysioM
 * Based on: Magee's Orthopedic Physical Assessment (7th ed.),
 *           Wainner CPR (2003), Cook et al., Dutton's Orthopaedic,
 *           Clinical Prediction Rules literature
 */

// Helper: check if a field value is "positive"
const isPos = (val) => {
  if (!val) return false;
  const s = String(val).toLowerCase();
  return s.includes("positive") || s.includes("+ve") || s === "yes" || s === "present" || s === "true";
};

const isNeg = (val) => {
  if (!val) return false;
  const s = String(val).toLowerCase();
  return s.includes("negative") || s.includes("-ve") || s === "no" || s === "absent";
};

const numVal = (val) => {
  const n = parseFloat(String(val || "").replace(/[^\d.-]/g, ""));
  return isNaN(n) ? null : n;
};

const hasText = (val) => val && String(val).trim().length > 0;

/**
 * Main export: runDiagnosisEngine(data)
 * Returns array of { diagnosis, icd10, confidence, confidenceLabel, supportingFindings, region, reference }
 * Sorted by confidence descending.
 */
export function runDiagnosisEngine(data) {
  const d = data || {};
  const v = (k) => d[k] || "";
  const results = [];

  const add = (region, diagnosis, icd10, hits, total, findings, reference) => {
    const pct = Math.round((hits / total) * 100);
    const label = pct >= 80 ? "High" : pct >= 55 ? "Moderate" : "Low";
    if (hits >= 1) {
      results.push({ region, diagnosis, icd10, confidence: pct, confidenceLabel: label, supportingFindings: findings.filter(Boolean), hits, total, reference });
    }
  };

  // ═══════════════════════════════════════════════════════
  // CERVICAL SPINE
  // ═══════════════════════════════════════════════════════

  // Cervical Radiculopathy — Wainner CPR (2003): 4 criteria
  {
    const spurling   = isPos(v("st_spurling"));
    const distract   = isPos(v("st_distraction"));
    const upper_limb = isPos(v("st_upper_limb_tension")) || isPos(v("st_ultt"));
    const cx_rot     = numVal(v("cx_rot_r")) || numVal(v("cx_rot_l"));
    const rotLimit   = cx_rot !== null && cx_rot < 60;
    const arm_pain   = hasText(v("s_radiation")) && /arm|hand|finger|elbow|forearm/i.test(v("s_radiation"));
    const hits = [spurling, distract, upper_limb, rotLimit].filter(Boolean).length;
    add("Cervical", "Cervical Radiculopathy", "M54.12", hits, 4,
      [spurling && "Spurling's Test +ve", distract && "Cervical Distraction +ve",
       upper_limb && "ULTT +ve", rotLimit && `Cervical rotation < 60° (${cx_rot}°)`,
       arm_pain && "Arm/hand radiation reported"],
      "Wainner et al. 2003 CPR; Magee Ch.4"
    );
  }

  // Cervical Facet Syndrome
  {
    const locPain    = /neck|cerv|occipit/i.test(v("s_location") || v("dem_body_part") || "");
    const spurling   = isPos(v("st_spurling"));
    const noRadiate  = !hasText(v("s_radiation")) || !/arm|hand|finger/i.test(v("s_radiation"));
    const extPain    = /pain|restrict/i.test(v("cx_ext") || "");
    const sideFlexPain = isPos(v("st_foraminal_compression")) || /pain/i.test(v("cx_lat_r") || v("cx_lat_l") || "");
    const hits = [locPain, !spurling && noRadiate, extPain || sideFlexPain].filter(Boolean).length;
    add("Cervical", "Cervical Facet Syndrome", "M47.812", hits, 3,
      [locPain && "Localised cervical/occipital pain", !spurling && "Spurling's negative (non-radicular)",
       extPain && "Pain on extension", sideFlexPain && "Pain on ipsilateral side-flexion/compression"],
      "Magee Orthopedic Physical Assessment Ch.4; Dutton Ch.25"
    );
  }

  // Cervicogenic Headache
  {
    const headache   = /head|occipit/i.test(v("s_location") || v("s_chief_complaint") || "");
    const cx_flex    = numVal(v("cx_flex"));
    const flexLimit  = cx_flex !== null && cx_flex < 40;
    const frt        = isPos(v("st_frt")) || isPos(v("st_flexion_rotation_test"));
    const unilateral = /one side|unilateral|left|right/i.test(v("s_chief_complaint") || "");
    const hits = [headache, flexLimit, frt, unilateral].filter(Boolean).length;
    add("Cervical", "Cervicogenic Headache", "G44.841", hits, 4,
      [headache && "Headache / occipital pain", flexLimit && `Cervical flexion restricted (${cx_flex}°)`,
       frt && "Flexion Rotation Test +ve", unilateral && "Unilateral head/neck pain"],
      "Hall & Robinson FRT (Sp 0.93); Magee Ch.4"
    );
  }

  // Cervical Disc Herniation
  {
    const spurling   = isPos(v("st_spurling"));
    const distract   = isPos(v("st_distraction"));
    const ultt       = isPos(v("st_upper_limb_tension")) || isPos(v("st_ultt"));
    const dermatomal = hasText(v("neuro_dermatomal")) || hasText(v("n_c5")) || hasText(v("n_c6")) || hasText(v("n_c7"));
    const arm_rad    = /arm|forearm|hand|finger/i.test(v("s_radiation") || "");
    const hits = [spurling, ultt, dermatomal, arm_rad].filter(Boolean).length;
    add("Cervical", "Cervical Disc Herniation", "M50.10", hits, 4,
      [spurling && "Spurling's +ve", distract && "Distraction relieves symptoms",
       dermatomal && "Dermatomal neurological pattern", arm_rad && "Arm/hand radiation"],
      "Magee Ch.4; Wainner CPR"
    );
  }

  // Myelopathy
  {
    const hoffmann  = isPos(v("st_hoffmann"));
    const inverted  = isPos(v("st_inverted_supinator"));
    const babinski  = isPos(v("st_babinski"));
    const bilateral = /bilat|both/i.test(v("s_location") || v("s_radiation") || "");
    const gait_dist = hasText(v("gait_pattern")) && /atax|shuffl|spastic|wide/i.test(v("gait_pattern"));
    const hits = [hoffmann, inverted, babinski, gait_dist].filter(Boolean).length;
    add("Cervical", "Cervical Myelopathy", "G99.2", hits, 4,
      [hoffmann && "Hoffmann's Sign +ve", inverted && "Inverted Supinator Sign +ve",
       babinski && "Babinski +ve", gait_dist && "Gait disturbance present"],
      "Cook et al. 2009; Magee Ch.4 UMN signs"
    );
  }

  // ═══════════════════════════════════════════════════════
  // LUMBAR SPINE
  // ═══════════════════════════════════════════════════════

  // Lumbar Disc Herniation with Radiculopathy
  {
    const slr       = isPos(v("st_slr_test")) || isPos(v("st_slr"));
    const crossed   = isPos(v("st_crossed_slr")) || isPos(v("st_well_leg_raise"));
    const lx_flex   = numVal(v("lx_flex"));
    const flexLimit = lx_flex !== null && lx_flex < 60;
    const radiation = /leg|foot|calf|buttock|glut/i.test(v("s_radiation") || "");
    const dermL     = hasText(v("n_l4")) || hasText(v("n_l5")) || hasText(v("n_s1"));
    const hits = [slr, crossed, flexLimit, radiation, dermL].filter(Boolean).length;
    add("Lumbar", "Lumbar Disc Herniation with Radiculopathy", "M51.16", hits, 5,
      [slr && "SLR +ve (neural tension)", crossed && "Crossed SLR +ve (high specificity)",
       flexLimit && `Lumbar flexion restricted (${lx_flex}°)`, radiation && "Leg/foot radiation",
       dermL && "L4/L5/S1 dermatomal involvement"],
      "Magee Ch.9; Deville et al. SLR meta-analysis"
    );
  }

  // Lumbar Facet Syndrome
  {
    const extPain   = /pain|restrict/i.test(v("lx_ext") || "");
    const localised = !/leg|foot|below knee/i.test(v("s_radiation") || "");
    const slr       = isPos(v("st_slr_test")) || isPos(v("st_slr"));
    const morningS  = /morning|stiff|better with movement/i.test(v("s_aggravating") || v("s_behaviour") || "");
    const palpTend  = hasText(v("palpation_lx")) || hasText(v("lx_palpation"));
    const hits = [extPain, localised && !slr, morningS, palpTend].filter(Boolean).length;
    add("Lumbar", "Lumbar Facet Syndrome", "M47.816", hits, 4,
      [extPain && "Pain on lumbar extension/side-flex", localised && "Localised LBP without radiation",
       !slr && "SLR negative", morningS && "Morning stiffness / better with movement",
       palpTend && "Paravertebral tenderness on palpation"],
      "Magee Ch.9; Maitland PIVM assessment"
    );
  }

  // Lumbar Canal Stenosis
  {
    const bilateral = /bilat|both leg/i.test(v("s_radiation") || "");
    const walkLimit = /walk|distance|stand/i.test(v("s_aggravating") || "");
    const relief    = /sit|forward flex|lean/i.test(v("s_easing") || "");
    const age       = numVal(v("dem_age"));
    const older     = age !== null && age > 50;
    const extPain   = /pain/i.test(v("lx_ext") || "");
    const hits = [bilateral, walkLimit, relief, older, extPain].filter(Boolean).length;
    add("Lumbar", "Lumbar Canal Stenosis", "M48.06", hits, 5,
      [bilateral && "Bilateral leg symptoms", walkLimit && "Claudication on walking/standing",
       relief && "Relief with sitting/forward flexion", older && `Age > 50 (${age}y)`,
       extPain && "Extension provokes symptoms"],
      "Katz et al. 1995; Magee Ch.9 neurogenic claudication"
    );
  }

  // SIJ Dysfunction — van der Wurff CPR: ≥3 of 5 provocation tests
  {
    const thigh_thrust = isPos(v("st_thigh_thrust")) || isPos(v("st_posterior_shear"));
    const compression  = isPos(v("st_sacral_compression")) || isPos(v("st_compression"));
    const distraction  = isPos(v("st_sacral_distraction")) || isPos(v("st_distraction_sij"));
    const faber        = isPos(v("st_faber")) || isPos(v("st_patrick"));
    const gaenslen    = isPos(v("st_gaenslen"));
    const hits = [thigh_thrust, compression, distraction, faber, gaenslen].filter(Boolean).length;
    add("Lumbar/Pelvis", "SIJ Dysfunction", "M53.3", hits, 5,
      [thigh_thrust && "Thigh Thrust +ve", compression && "Sacral Compression +ve",
       distraction && "Sacral Distraction +ve", faber && "FABER +ve", gaenslen && "Gaenslen's +ve"],
      "van der Wurff CPR 2006 (≥3/5 = Sn 0.85, Sp 0.79); Laslett et al."
    );
  }

  // Piriformis Syndrome
  {
    const freiberg  = isPos(v("st_freiberg"));
    const pace      = isPos(v("st_pace"));
    const beatty    = isPos(v("st_beatty"));
    const buttock   = /buttock|piriform|deep glut/i.test(v("s_location") || "");
    const hits = [freiberg, pace, beatty, buttock].filter(Boolean).length;
    add("Lumbar/Hip", "Piriformis Syndrome", "G57.00", hits, 4,
      [freiberg && "Freiberg's Test +ve", pace && "Pace's Test +ve",
       beatty && "Beatty's Test +ve", buttock && "Deep buttock / gluteal pain"],
      "Magee Ch.11; Fishman et al."
    );
  }

  // ═══════════════════════════════════════════════════════
  // SHOULDER
  // ═══════════════════════════════════════════════════════

  // Rotator Cuff Tear — Hegedus meta-analysis cluster
  {
    const empty_can  = isPos(v("st_empty_can")) || isPos(v("st_supraspinatus"));
    const drop_arm   = isPos(v("st_drop_arm"));
    const ext_rot_wk = isPos(v("st_external_rotation_lag")) || isPos(v("st_er_lag"));
    const painful_arc= isPos(v("st_painful_arc"));
    const hits = [empty_can, drop_arm, ext_rot_wk, painful_arc].filter(Boolean).length;
    add("Shoulder", "Rotator Cuff Tear", "M75.120", hits, 4,
      [empty_can && "Empty Can (Jobe) +ve", drop_arm && "Drop Arm Test +ve",
       ext_rot_wk && "External Rotation Lag Sign +ve", painful_arc && "Painful Arc +ve"],
      "Hegedus et al. 2008 meta-analysis; Magee Ch.5"
    );
  }

  // Subacromial Impingement
  {
    const neer       = isPos(v("st_neer"));
    const hawkins    = isPos(v("st_hawkins")) || isPos(v("st_hawkins_kennedy"));
    const painful_arc= isPos(v("st_painful_arc"));
    const empty_can  = isPos(v("st_empty_can"));
    const hits = [neer, hawkins, painful_arc, !isPos(v("st_drop_arm"))].filter(Boolean).length;
    add("Shoulder", "Subacromial Impingement Syndrome", "M75.1", hits, 4,
      [neer && "Neer Impingement +ve", hawkins && "Hawkins-Kennedy +ve",
       painful_arc && "Painful Arc 60–120°", empty_can && "Empty Can +ve"],
      "Magee Ch.5; Hegedus meta-analysis 2012"
    );
  }

  // Adhesive Capsulitis (Frozen Shoulder)
  {
    const shr_flex  = numVal(v("rom_shr_flex_R") || v("rom_shr_flex_L") || v("rom_sflex"));
    const shr_abd   = numVal(v("rom_shr_abd_R") || v("rom_shr_abd_L") || v("rom_sabd"));
    const shr_er    = numVal(v("rom_shr_er_R") || v("rom_shr_er_L") || v("rom_ser"));
    const capsular  = (shr_er !== null && shr_er < 30) && (shr_abd !== null && shr_abd < 90);
    const nightPain = /night/i.test(v("s_behaviour") || "");
    const gradual   = /gradual|insidious/i.test(v("s_onset") || "");
    const hits = [capsular, nightPain, gradual, shr_flex !== null && shr_flex < 120].filter(Boolean).length;
    add("Shoulder", "Adhesive Capsulitis (Frozen Shoulder)", "M75.0", hits, 4,
      [capsular && `Capsular pattern: ER < 30° (${shr_er}°), Abd < 90° (${shr_abd}°)`,
       nightPain && "Night pain", gradual && "Gradual/insidious onset",
       shr_flex !== null && shr_flex < 120 && `Flexion restricted (${shr_flex}°)`],
      "Magee Ch.5 capsular pattern; Cyriax end-feel"
    );
  }

  // Biceps Tendinopathy / SLAP
  {
    const speeds    = isPos(v("st_speeds"));
    const yergason = isPos(v("st_yergason"));
    const obriens  = isPos(v("st_obriens")) || isPos(v("st_active_compression"));
    const anterior  = /anterior|bicipital groove|front of shoulder/i.test(v("s_location") || "");
    const hits = [speeds, yergason, obriens, anterior].filter(Boolean).length;
    add("Shoulder", "Biceps Tendinopathy / SLAP Lesion", "M75.2", hits, 4,
      [speeds && "Speed's Test +ve", yergason && "Yergason's Test +ve",
       obriens && "O'Brien's Active Compression +ve", anterior && "Anterior shoulder / bicipital groove pain"],
      "Magee Ch.5; Liu et al. O'Brien test"
    );
  }

  // AC Joint Pathology
  {
    const crossarm  = isPos(v("st_cross_arm")) || isPos(v("st_horizontal_adduction"));
    const obriens  = isPos(v("st_obriens"));
    const acTend   = /ac joint|acromioclavicular/i.test(v("s_location") || v("lx_palpation") || "");
    const hits = [crossarm, obriens, acTend].filter(Boolean).length;
    add("Shoulder", "AC Joint Pathology", "M75.5", hits, 3,
      [crossarm && "Cross-arm Adduction Test +ve", obriens && "O'Brien's +ve",
       acTend && "AC joint tenderness"],
      "Magee Ch.5; Chronopoulos et al."
    );
  }

  // ═══════════════════════════════════════════════════════
  // ELBOW
  // ═══════════════════════════════════════════════════════

  // Lateral Epicondylalgia
  {
    const cozen     = isPos(v("st_cozen")) || isPos(v("st_tennis_elbow"));
    const mill      = isPos(v("st_mill"));
    const maudsley  = isPos(v("st_maudsley"));
    const lateral   = /lateral|outer|extensor|tennis/i.test(v("s_location") || "");
    const hits = [cozen, mill, maudsley, lateral].filter(Boolean).length;
    add("Elbow", "Lateral Epicondylalgia (Tennis Elbow)", "M77.1", hits, 4,
      [cozen && "Cozen's Test +ve", mill && "Mill's Test +ve",
       maudsley && "Maudsley's Test +ve", lateral && "Lateral elbow / extensor forearm pain"],
      "Magee Ch.6; Shiri & Viikari-Juntura"
    );
  }

  // Medial Epicondylalgia
  {
    const golfer    = isPos(v("st_golfer_elbow")) || isPos(v("st_medial_epicondyle"));
    const medial    = /medial|inner|flexor|golfer/i.test(v("s_location") || "");
    const hits = [golfer, medial].filter(Boolean).length;
    add("Elbow", "Medial Epicondylalgia (Golfer's Elbow)", "M77.0", hits, 2,
      [golfer && "Medial Epicondyle Stress Test +ve", medial && "Medial elbow / flexor forearm pain"],
      "Magee Ch.6"
    );
  }

  // Cubital Tunnel Syndrome
  {
    const tinel_elbow = isPos(v("st_tinel_elbow")) || isPos(v("st_tinel_cubital"));
    const elbow_flex_test = isPos(v("st_elbow_flexion_test"));
    const ring_little = /ring|little|4th|5th|ulnar/i.test(v("s_radiation") || v("neuro_dermatomal") || "");
    const hits = [tinel_elbow, elbow_flex_test, ring_little].filter(Boolean).length;
    add("Elbow", "Cubital Tunnel Syndrome (Ulnar Nerve)", "G56.20", hits, 3,
      [tinel_elbow && "Tinel's at cubital tunnel +ve", elbow_flex_test && "Elbow Flexion Test +ve",
       ring_little && "Ring/little finger paraesthesia"],
      "Magee Ch.6; Novak et al."
    );
  }

  // ═══════════════════════════════════════════════════════
  // WRIST / HAND
  // ═══════════════════════════════════════════════════════

  // Carpal Tunnel Syndrome — Wainner CPR
  {
    const phalen    = isPos(v("st_phalen"));
    const tinel_w   = isPos(v("st_tinel_wrist")) || isPos(v("st_tinel"));
    const flick     = isPos(v("st_flick_sign"));
    const carpal_compress = isPos(v("st_carpal_compression"));
    const thumb_med = /thumb|index|middle|median|lateral 3/i.test(v("s_radiation") || v("neuro_dermatomal") || "");
    const hits = [phalen, tinel_w, flick, carpal_compress, thumb_med].filter(Boolean).length;
    add("Wrist", "Carpal Tunnel Syndrome", "G56.00", hits, 5,
      [phalen && "Phalen's Test +ve", tinel_w && "Tinel's at wrist +ve",
       flick && "Flick Sign +ve", carpal_compress && "Carpal Compression Test +ve",
       thumb_med && "Median nerve distribution symptoms"],
      "Wainner et al. 2005 CPR; Magee Ch.7"
    );
  }

  // De Quervain's Tenosynovitis
  {
    const finkelstein = isPos(v("st_finkelstein"));
    const thumb_base  = /thumb|radial|de quervain|first cmcarpometacarpal/i.test(v("s_location") || "");
    const hits = [finkelstein, thumb_base].filter(Boolean).length;
    add("Wrist", "De Quervain's Tenosynovitis", "M65.4", hits, 2,
      [finkelstein && "Finkelstein's Test +ve", thumb_base && "Thumb base / radial wrist pain"],
      "Magee Ch.7"
    );
  }

  // ═══════════════════════════════════════════════════════
  // HIP
  // ═══════════════════════════════════════════════════════

  // Hip OA
  {
    const hip_flex  = numVal(v("rom_hp_flex_R") || v("rom_hp_flex_L") || v("rom_hflex"));
    const hip_ir    = numVal(v("rom_hp_ir_R") || v("rom_hp_ir_L") || v("rom_hir"));
    const capsular  = (hip_flex !== null && hip_flex < 100) && (hip_ir !== null && hip_ir < 15);
    const faber     = isPos(v("st_faber")) || isPos(v("st_patrick"));
    const groin     = /groin|anterior hip|hip joint/i.test(v("s_location") || "");
    const age       = numVal(v("dem_age"));
    const hits = [capsular, faber, groin, age !== null && age > 45].filter(Boolean).length;
    add("Hip", "Hip Osteoarthritis", "M16.10", hits, 4,
      [capsular && `Capsular pattern: Flex restricted (${hip_flex}°), IR restricted (${hip_ir}°)`,
       faber && "FABER +ve", groin && "Anterior hip / groin pain",
       age !== null && age > 45 && `Age > 45 (${age}y)`],
      "Magee Ch.11; Sutlive et al. CPR 2008"
    );
  }

  // FAI (Femoroacetabular Impingement)
  {
    const fadir     = isPos(v("st_fadir")) || isPos(v("st_impingement_hip"));
    const faber     = isPos(v("st_faber")) || isPos(v("st_patrick"));
    const groin     = /groin|anterior hip|deep hip/i.test(v("s_location") || "");
    const young     = numVal(v("dem_age")); const isYoung = young !== null && young < 45;
    const hits = [fadir, faber, groin, isYoung].filter(Boolean).length;
    add("Hip", "Femoroacetabular Impingement (FAI)", "M24.85", hits, 4,
      [fadir && "FADIR Test +ve", faber && "FABER +ve",
       groin && "Groin / anterior hip pain", isYoung && `Young active patient (${young}y)`],
      "Magee Ch.11; Reiman et al. meta-analysis"
    );
  }

  // Greater Trochanteric Pain Syndrome
  {
    const ober      = isPos(v("st_ober"));
    const lateral   = /lateral hip|greater trochanter|GTPS|ITB/i.test(v("s_location") || "");
    const palpTend  = /trochanter/i.test(v("palpation_hip") || v("lx_palpation") || "");
    const hits = [ober, lateral, palpTend].filter(Boolean).length;
    add("Hip", "Greater Trochanteric Pain Syndrome", "M70.60", hits, 3,
      [ober && "Ober's Test +ve (ITB tightness)", lateral && "Lateral hip / trochanteric pain",
       palpTend && "Trochanteric tenderness on palpation"],
      "Magee Ch.11; Grimaldi & Fearon"
    );
  }

  // ═══════════════════════════════════════════════════════
  // KNEE
  // ═══════════════════════════════════════════════════════

  // ACL Injury — Swain CPR
  {
    const lachman   = isPos(v("st_lachman"));
    const ant_drawer= isPos(v("st_anterior_drawer_knee")) || isPos(v("st_anterior_drawer"));
    const pivot     = isPos(v("st_pivot_shift"));
    const trauma    = /trauma|twist|plant|cut|pivot|sport/i.test(v("s_onset") || v("s_mechanism") || "");
    const effusion  = isPos(v("obs_swelling_present")) || /effusion|swelling/i.test(v("s_chief_complaint") || "");
    const hits = [lachman, ant_drawer, pivot, trauma].filter(Boolean).length;
    add("Knee", "ACL Injury", "S83.511A", hits, 4,
      [lachman && "Lachman's Test +ve (gold standard)", ant_drawer && "Anterior Drawer +ve",
       pivot && "Pivot Shift +ve (high specificity)", trauma && "Traumatic twisting/pivoting mechanism",
       effusion && "Acute haemarthrosis / effusion"],
      "Magee Ch.12; Swain et al. CPR; Benjaminse meta-analysis"
    );
  }

  // Meniscal Tear
  {
    const mcmurray  = isPos(v("st_mcmurray"));
    const thessaly  = isPos(v("st_thessaly"));
    const apley     = isPos(v("st_apley"));
    const jointLine = /joint line/i.test(v("s_location") || v("palpation_knee") || "");
    const hits = [mcmurray, thessaly, apley, jointLine].filter(Boolean).length;
    add("Knee", "Meniscal Tear", "S83.200A", hits, 4,
      [mcmurray && "McMurray's Test +ve", thessaly && "Thessaly Test +ve (most sensitive)",
       apley && "Apley's Compression +ve", jointLine && "Joint line tenderness"],
      "Magee Ch.12; Hegedus meta-analysis; Karachalios Thessaly"
    );
  }

  // Patellofemoral Pain Syndrome
  {
    const clarke    = isPos(v("st_clarke")) || isPos(v("st_patella_grind"));
    const stairPain = /stair|squat|prolonged sit|theater/i.test(v("s_aggravating") || "");
    const anterior  = /anterior|front|peripatellar|retropatellar/i.test(v("s_location") || "");
    const hits = [clarke, stairPain, anterior].filter(Boolean).length;
    add("Knee", "Patellofemoral Pain Syndrome", "M22.2", hits, 3,
      [clarke && "Clarke's Sign +ve", stairPain && "Stairs / squatting / prolonged sitting aggravates",
       anterior && "Anterior / peripatellar knee pain"],
      "Magee Ch.12; Nijs et al."
    );
  }

  // Knee OA
  {
    const kflex     = numVal(v("rom_knl_flex_R") || v("rom_knl_flex_L") || v("rom_kflex"));
    const flexLimit = kflex !== null && kflex < 110;
    const crepitus  = isPos(v("st_crepitus")) || /crepitus/i.test(v("obs_general_notes") || "");
    const age       = numVal(v("dem_age"));
    const varus     = /varum|varus|bow/i.test(v("obs_posture_lower") || "");
    const hits = [flexLimit, crepitus, age !== null && age > 50, varus].filter(Boolean).length;
    add("Knee", "Knee Osteoarthritis", "M17.11", hits, 4,
      [flexLimit && `Knee flexion restricted (${kflex}°)`, crepitus && "Crepitus present",
       age !== null && age > 50 && `Age > 50 (${age}y)`, varus && "Varus deformity"],
      "Magee Ch.12; Altman criteria 1986"
    );
  }

  // ═══════════════════════════════════════════════════════
  // ANKLE / FOOT
  // ═══════════════════════════════════════════════════════

  // Lateral Ankle Sprain
  {
    const ant_drawer_ank = isPos(v("st_anterior_drawer_ankle"));
    const talar_tilt     = isPos(v("st_talar_tilt"));
    const lateral_ank    = /lateral|outer|CFL|ATFL|peroneal/i.test(v("s_location") || "");
    const trauma_ank     = /inversion|roll|twist/i.test(v("s_onset") || v("s_mechanism") || "");
    const hits = [ant_drawer_ank, talar_tilt, lateral_ank, trauma_ank].filter(Boolean).length;
    add("Ankle", "Lateral Ankle Sprain (ATFL/CFL)", "S93.401A", hits, 4,
      [ant_drawer_ank && "Anterior Drawer (ankle) +ve", talar_tilt && "Talar Tilt +ve",
       lateral_ank && "Lateral ankle pain", trauma_ank && "Inversion/rolling mechanism"],
      "Magee Ch.13; van Dijk criteria"
    );
  }

  // Achilles Tendinopathy
  {
    const arc_sign  = isPos(v("st_arc_sign")) || isPos(v("st_royal_london"));
    const thompson  = isPos(v("st_thompson")) || isPos(v("st_simmonds"));
    const posterior = /achilles|posterior heel|tendon/i.test(v("s_location") || "");
    const morning   = /morning|first step|stiff/i.test(v("s_behaviour") || v("s_aggravating") || "");
    const hits = [arc_sign, posterior, morning, !isPos(v("st_thompson"))].filter(Boolean).length;
    add("Ankle", "Achilles Tendinopathy", "M76.6", hits, 4,
      [arc_sign && "Arc Sign / Royal London Hospital Test +ve",
       thompson && "Thompson Test +ve (rules out rupture)", posterior && "Posterior heel / Achilles tendon pain",
       morning && "Morning stiffness / first step pain"],
      "Magee Ch.13; Cook & Purdam continuum model"
    );
  }

  // Plantar Fasciitis
  {
    const windlass  = isPos(v("st_windlass"));
    const heel_pain = /plantar|heel|sole|arch/i.test(v("s_location") || "");
    const morning   = /morning|first step/i.test(v("s_behaviour") || v("s_aggravating") || "");
    const hits = [windlass, heel_pain, morning].filter(Boolean).length;
    add("Ankle", "Plantar Fasciitis", "M72.2", hits, 3,
      [windlass && "Windlass Test +ve", heel_pain && "Plantar heel / arch pain",
       morning && "Worst on first steps in morning"],
      "Magee Ch.13; Owens et al."
    );
  }

  // Sort by confidence desc, then hits desc
  results.sort((a, b) => b.confidence - a.confidence || b.hits - a.hits);

  return results;
}

/**
 * getTopDiagnoses(data, n=3)
 * Returns top N diagnoses — convenience wrapper
 */
export function getTopDiagnoses(data, n = 3) {
  return runDiagnosisEngine(data).slice(0, n);
}
