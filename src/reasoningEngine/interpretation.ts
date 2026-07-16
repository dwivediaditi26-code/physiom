// interpretation.ts — Stage 6 CLINICAL INTERPRETATION. Runs after provisional
// diagnosis. Every statement is grounded ONLY in findings actually present or in
// the ranked differential; nothing is fabricated. Deterministic. Region-aware:
// shoulder + cervical implemented; other regions extend via the same pattern.

import type {
  Finding, DiagnosisCandidate, RedFlagResult, SubjectiveInput,
  CompletenessReport, ClinicalInterpretation,
} from "./types";

export function buildInterpretation(
  region: string,
  findings: Finding[],
  differentials: DiagnosisCandidate[],
  redFlag: RedFlagResult,
  subjective: SubjectiveInput,
  completeness: CompletenessReport
): ClinicalInterpretation {
  const has = (c: string) => findings.some((f) => f.code === c);
  const top = differentials.find((d) => !d.excluded && d.diagnosticMatchScore > 0) || null;

  const primaryImpairments: string[] = [];
  const likelyPainGenerators: string[] = [];
  const movementDysfunction: string[] = [];
  const functionalLimitations: string[] = [];
  const treatmentPriorities: string[] = [];
  const suggestedGoals: string[] = [];
  const homeAdvice: string[] = [];
  if (top) likelyPainGenerators.push(top.name);
  const name = top?.name || "";

  if (region === "shoulder") {
    if (has("capsular_pattern")) primaryImpairments.push("Global passive ROM restriction in a capsular pattern (ER>Abd>IR)");
    if (has("global_rom_loss")) primaryImpairments.push("Marked loss of shoulder range");
    if (has("abduction_weak") || has("er_weak")) primaryImpairments.push("Rotator cuff weakness on resisted testing");
    if (has("painful_arc")) primaryImpairments.push("Painful mid-range arc of elevation");
    if (has("greater_tuberosity_tender")) likelyPainGenerators.push("Supraspinatus insertion / greater tuberosity");
    if (has("ac_joint_tender")) likelyPainGenerators.push("Acromioclavicular joint");
    if (has("bicipital_groove_tender")) likelyPainGenerators.push("Long head of biceps");
    if (has("painful_arc")) movementDysfunction.push("Impingement-type painful arc during elevation");
    if (has("capsular_pattern")) movementDysfunction.push("Capsular restriction limiting functional elevation and rotation");
    if (has("overhead_aggravation")) { movementDysfunction.push("Overhead loading reproduces symptoms"); functionalLimitations.push("Difficulty with overhead reaching/lifting"); }
    if (has("night_pain")) functionalLimitations.push("Disturbed sleep (night pain)");
    if (has("capsular_pattern")) functionalLimitations.push("Difficulty with rotation-dependent tasks (dressing, reaching behind)");

    if (name.includes("Adhesive")) {
      treatmentPriorities.push("Stage-appropriate ROM restoration", "Pain modulation in irritable phase", "Graded capsular mobilisation as irritability settles");
      suggestedGoals.push("Restore functional external rotation and elevation for ADLs");
      homeAdvice.push("Gentle pain-free pendular and range exercises; avoid aggressive end-range stretching while irritable");
    } else if (name.includes("tear")) {
      treatmentPriorities.push("Protect healing/structure", "Scapular and cuff control within tolerance", "Consider surgical opinion if lag signs and functional loss persist");
      suggestedGoals.push("Restore active elevation and functional strength within pain limits");
      homeAdvice.push("Avoid heavy overhead loading; isometric cuff activation within comfort");
    } else if (name.includes("impingement") || name.includes("tendinopathy") || name.includes("Subacromial")) {
      treatmentPriorities.push("Load management and relative rest from provocative overhead activity", "Progressive rotator cuff and scapular strengthening", "Address posture/scapular control");
      suggestedGoals.push("Pain-free overhead function and return to activity");
      homeAdvice.push("Progressive isometric-to-isotonic cuff exercises; modify overhead activity temporarily");
    } else if (name.includes("instability")) {
      treatmentPriorities.push("Dynamic stabiliser retraining", "Avoid provocative apprehension positions early", "Proprioceptive/scapular control");
      suggestedGoals.push("Restore stable, controlled shoulder function");
      homeAdvice.push("Closed-chain stability work; avoid end-range abduction/ER loading initially");
    } else if (name.includes("AC joint")) {
      treatmentPriorities.push("Relative rest from cross-body loading", "Scapular and cuff support", "Load modification");
      suggestedGoals.push("Pain-free cross-body and overhead function");
      homeAdvice.push("Temporarily avoid heavy cross-body activity; ice for symptom control");
    }
  } else if (region === "cervical") {
    if (has("myotome_weak")) primaryImpairments.push("Myotomal weakness on resisted testing");
    if (has("reflex_change") || has("sensory_deficit")) primaryImpairments.push("Neurological deficit (reflex/sensory change)");
    if (has("cervical_ext_rom_limited") || has("cervical_rot_rom_limited")) primaryImpairments.push("Restricted cervical range (extension/rotation)");
    if (has("radiating_arm_pain")) likelyPainGenerators.push("Cervical nerve root");
    if (has("facet_tender")) likelyPainGenerators.push("Cervical facet (zygapophyseal) joint");
    if (has("upper_cervical_tender")) likelyPainGenerators.push("Upper cervical segments (C1-2)");
    if (has("ext_rot_aggravation")) movementDysfunction.push("Extension-rotation provocation (facet loading)");
    if (has("cervical_rot_rom_limited")) movementDysfunction.push("Restricted rotation limiting functional head turning");
    if (has("radiating_arm_pain")) functionalLimitations.push("Arm symptoms with sustained postures / overhead tasks");
    if (has("headache_cervical")) functionalLimitations.push("Neck-related headache affecting concentration/work");
    if (has("neck_stiffness")) functionalLimitations.push("Difficulty with driving / prolonged sitting");

    if (name.includes("radiculopathy")) {
      treatmentPriorities.push("Neural symptom modulation and load management", "Postural and deep neck flexor retraining", "Consider traction/neurodynamic mobilisation as tolerated; monitor neuro status");
      suggestedGoals.push("Reduce arm symptoms and restore pain-free functional neck movement");
      homeAdvice.push("Avoid sustained provocative end-range positions; posture breaks; gentle nerve-glide within comfort");
    } else if (name.includes("facet") || name.includes("mechanical")) {
      treatmentPriorities.push("Segmental mobilisation of the symptomatic level", "Deep neck flexor / scapular control exercise", "Postural and ergonomic correction");
      suggestedGoals.push("Restore pain-free cervical range and function");
      homeAdvice.push("Active range exercises within comfort; workstation/ergonomic adjustment");
    } else if (name.includes("Cervicogenic")) {
      treatmentPriorities.push("Upper cervical (C1-2) mobilisation", "Deep neck flexor endurance training", "Address contributing posture");
      suggestedGoals.push("Reduce headache frequency/intensity via cervical treatment");
      homeAdvice.push("Cranio-cervical flexion exercise; posture correction; avoid prolonged neck flexion");
    } else if (name.includes("Whiplash") || name.includes("WAD")) {
      treatmentPriorities.push("Reassurance and early graded active movement", "Avoid over-protection / prolonged rest", "Progressive load as irritability settles");
      suggestedGoals.push("Restore confident, pain-managed neck movement and return to activity");
      homeAdvice.push("Stay active within comfort; gentle regular range exercises; avoid collar/immobilisation");
    }
  } else if (region === "lumbar") {
    if (has("lumbar_flexion_limited")) primaryImpairments.push("Restricted lumbar flexion");
    if (has("lumbar_extension_limited")) primaryImpairments.push("Restricted lumbar extension");
    if (has("myotome_weak")) primaryImpairments.push("Myotomal weakness on resisted testing");
    if (has("reflex_change") || has("sensory_deficit")) primaryImpairments.push("Neurological deficit (reflex/sensory change)");
    if (has("facet_tender")) likelyPainGenerators.push("Lumbar facet (zygapophyseal) joint");
    if (has("si_joint_tender")) likelyPainGenerators.push("Sacroiliac joint");
    if (has("slr_positive") || has("leg_pain_below_knee")) likelyPainGenerators.push("Lumbar nerve root");
    if (has("flexion_aggravation")) movementDysfunction.push("Flexion-provoked pain pattern");
    if (has("extension_aggravation")) movementDysfunction.push("Extension-provoked pain pattern");
    if (has("neurogenic_claudication")) movementDysfunction.push("Walking/standing tolerance limited by a neurogenic claudication pattern");
    if (has("sitting_aggravation")) functionalLimitations.push("Reduced sitting tolerance");
    if (has("neurogenic_claudication")) functionalLimitations.push("Limited walking distance");
    if (has("leg_pain_below_knee")) functionalLimitations.push("Leg-dominant symptoms affecting mobility/ADLs");

    if (name.includes("radiculopathy")) {
      treatmentPriorities.push("Neural symptom modulation and load management", "Directional-preference exercise if centralising", "Monitor neurological status; escalate if progressive");
      suggestedGoals.push("Reduce leg-dominant symptoms and restore pain-free functional movement");
      homeAdvice.push("Avoid prolonged flexed/sitting postures if these worsen leg symptoms; gentle nerve-glide within comfort");
    } else if (name.includes("Discogenic") || name.includes("disc")) {
      treatmentPriorities.push("Directional-preference (McKenzie) exercise toward centralisation", "Core/motor control retraining", "Graded activity modification");
      suggestedGoals.push("Centralise and reduce leg-dominant symptoms; restore functional lumbar movement");
      homeAdvice.push("Repeated end-range exercise in the direction of preference; avoid prolonged flexion/sitting");
    } else if (name.includes("facet") || name.includes("mechanical")) {
      treatmentPriorities.push("Segmental mobilisation of the symptomatic level", "Motor control / lumbar stabilisation exercise", "Postural and load management advice");
      suggestedGoals.push("Restore pain-free lumbar range and function");
      homeAdvice.push("Active range exercise within comfort; avoid sustained end-range extension");
    } else if (name.includes("Sacroiliac") || name.includes("SIJ")) {
      treatmentPriorities.push("SIJ motor-control retraining (transversus abdominis/multifidus/gluteals)", "Consider SI belt/support if needed", "Avoid asymmetric loading early");
      suggestedGoals.push("Restore pain-free functional loading and gait");
      homeAdvice.push("Pelvic stability exercise; avoid prolonged single-leg standing/asymmetric postures early");
    } else if (name.includes("stenosis")) {
      treatmentPriorities.push("Flexion-biased loading and exercise", "Graded walking program with rest-break pacing", "Deconditioning prevention");
      suggestedGoals.push("Increase walking tolerance and overall function");
      homeAdvice.push("Flexion-biased exercise (e.g. stationary cycling); pace walking with planned rest breaks");
    } else if (name.includes("Spondylolisthesis") || name.includes("spondylolysis")) {
      treatmentPriorities.push("Avoid repeated extension/impact loading", "Segmental core/multifidus stabilisation", "Gradual, monitored return to sport/activity");
      suggestedGoals.push("Pain-free functional stability without extension provocation");
      homeAdvice.push("Avoid repeated extension/impact loading (e.g. gymnastics, fast bowling) until stable; abdominal/multifidus stabilisation program");
    }
  } else if (region === "hip") {
    if (has("hip_ir_capsular_pattern")) primaryImpairments.push("Capsular restriction pattern (IR most limited — early hip OA sign)");
    if (has("hip_flexion_loss")) primaryImpairments.push("Restricted hip flexion");
    if (has("gmed_weak")) primaryImpairments.push("Gluteus medius weakness on resisted testing");
    if (has("hip_groin_dominant_pattern")) likelyPainGenerators.push("Intra-articular hip joint (FAI/OA/labral)");
    if (has("greater_trochanter_tender")) likelyPainGenerators.push("Greater trochanter / gluteal tendon insertion");
    if (has("ischial_tuberosity_tender")) likelyPainGenerators.push("Ischial tuberosity / proximal hamstring origin");
    if (has("adductor_origin_tender")) likelyPainGenerators.push("Adductor origin / pubic ramus");
    if (has("deep_buttock_pain")) likelyPainGenerators.push("Deep gluteal space / piriformis");
    if (has("fadir_aggravation") || has("fadir_test_positive")) movementDysfunction.push("FADIR (flexion-adduction-internal rotation) provokes symptoms");
    if (has("trendelenburg_positive")) movementDysfunction.push("Trendelenburg gait pattern (abductor insufficiency)");
    if (has("snapping_hip_internal") || has("snapping_hip_external")) movementDysfunction.push("Audible/palpable snapping with hip movement");
    if (has("worse_lying_on_side")) functionalLimitations.push("Disturbed sleep (worse lying on affected side)");
    if (has("ischial_sitting_pain")) functionalLimitations.push("Reduced sitting tolerance on hard surfaces");
    if (has("hip_morning_stiffness")) functionalLimitations.push("Morning stiffness affecting early mobility");

    if (name.includes("Femoroacetabular") || name.includes("labral")) {
      treatmentPriorities.push("Activity modification to reduce end-range flexion/IR loading", "Hip and core motor control retraining", "Consider imaging/surgical opinion if mechanical locking or failed conservative care");
      suggestedGoals.push("Reduce groin pain and restore pain-free functional hip flexion/rotation");
      homeAdvice.push("Avoid deep squatting/prolonged sitting in flexion; graded hip strengthening within comfort");
    } else if (name.includes("osteoarthritis")) {
      treatmentPriorities.push("Load management and graded activity", "Hip range and strengthening exercise", "Weight management/education if relevant");
      suggestedGoals.push("Maintain/improve hip range and reduce pain with functional activity");
      homeAdvice.push("Regular low-impact activity (cycling/swimming); avoid prolonged rest");
    } else if (name.includes("trochanteric") || name.includes("gluteal tendinopathy")) {
      treatmentPriorities.push("Load management — avoid compressive positions (adduction/crossing legs)", "Progressive gluteal tendon loading programme", "Address Trendelenburg/abductor control");
      suggestedGoals.push("Reduce lateral hip pain and restore pain-free single-leg loading");
      homeAdvice.push("Avoid sleeping on affected side/standing with hip hitched; isometric gluteal loading");
    } else if (name.includes("hamstring")) {
      treatmentPriorities.push("Load management — avoid deep hip flexion with knee extension", "Progressive proximal hamstring loading programme", "Address sitting posture/duration");
      suggestedGoals.push("Reduce ischial pain and restore pain-free sitting and loading tolerance");
      homeAdvice.push("Avoid prolonged sitting on hard/unsupported surfaces; gradual isometric-to-isotonic hamstring loading");
    } else if (name.includes("Adductor")) {
      treatmentPriorities.push("Load management — reduce kicking/change-of-direction volume", "Progressive adductor strengthening programme", "Address kinetic chain (pelvis/core) control");
      suggestedGoals.push("Reduce groin pain and restore pain-free sprinting/kicking tolerance");
      homeAdvice.push("Graded adductor isometric-to-isotonic loading; avoid provocative kicking/twisting until settled");
    } else if (name.includes("Piriformis") || name.includes("deep gluteal")) {
      treatmentPriorities.push("Address sitting posture/duration and direct compression", "Piriformis/deep rotator soft-tissue and mobility work", "Neural mobility work if sciatic irritation present");
      suggestedGoals.push("Reduce deep buttock pain and restore pain-free sitting");
      homeAdvice.push("Avoid prolonged sitting on wallets/hard surfaces; gentle piriformis stretching within comfort");
    } else if (name.includes("Snapping hip")) {
      treatmentPriorities.push("Soft-tissue/flexibility work to the involved structure (iliopsoas or ITB)", "Movement retraining to reduce provocative repetition", "Reassurance if painless (benign in most cases)");
      suggestedGoals.push("Reduce/resolve associated pain; snapping itself may persist but become asymptomatic");
      homeAdvice.push("Gentle iliopsoas/ITB flexibility work; gradual return to provocative activity as tolerated");
    }
  } else if (region === "knee") {
    if (has("knee_extension_loss")) primaryImpairments.push("Extension loss/lag (mechanical block or extensor mechanism deficit)");
    if (has("knee_flexion_loss")) primaryImpairments.push("Restricted knee flexion");
    if (has("quad_weak")) primaryImpairments.push("Quadriceps weakness on resisted testing");
    if (has("knee_recurrent_effusion") || has("effusion_positive")) primaryImpairments.push("Joint effusion present");
    if (has("medial_joint_line_tender")) likelyPainGenerators.push("Medial joint line / medial meniscus");
    if (has("lateral_joint_line_tender")) likelyPainGenerators.push("Lateral joint line / lateral meniscus");
    if (has("patellar_tendon_tender")) likelyPainGenerators.push("Patellar tendon / inferior pole");
    if (has("knee_true_locking")) movementDysfunction.push("True mechanical locking (cannot fully extend)");
    if (has("knee_giving_way_pivot")) movementDysfunction.push("Giving way with pivoting/direction change");
    if (has("knee_movie_sign")) movementDysfunction.push("Pain with prolonged flexion (movie sign)");
    if (has("knee_worse_descending_stairs")) functionalLimitations.push("Difficulty descending stairs");
    if (has("knee_joint_line_mechanical")) functionalLimitations.push("Mechanical catching/clicking limiting activity");
    if (has("knee_recurrent_effusion")) functionalLimitations.push("Recurrent swelling limiting activity tolerance");

    if (name.includes("ACL")) {
      treatmentPriorities.push("Protect healing/limit pivoting activity", "Progressive quadriceps/hamstring and neuromuscular control retraining", "Consider orthopaedic opinion for reconstruction if instability/functional demand warrants");
      suggestedGoals.push("Restore quadriceps strength and dynamic knee stability");
      homeAdvice.push("Avoid pivoting/cutting sport until cleared; closed-chain strengthening and balance work within tolerance");
    } else if (name.includes("PCL")) {
      treatmentPriorities.push("Protect healing — avoid posterior tibial stress positions", "Quadriceps-dominant strengthening (relatively protect hamstrings early)", "Consider orthopaedic opinion if high-grade or multi-ligament involvement");
      suggestedGoals.push("Restore functional strength and stability without posterior tibial stress");
      homeAdvice.push("Avoid kneeling/deep flexion loading early; quadriceps strengthening emphasis");
    } else if (name.includes("Meniscal") || name.includes("meniscus")) {
      treatmentPriorities.push("Load management — avoid deep flexion/twisting under load", "Progressive strengthening as symptoms allow", "Consider orthopaedic opinion if true locking or failed conservative care");
      suggestedGoals.push("Reduce mechanical symptoms and restore pain-free functional range");
      homeAdvice.push("Avoid deep squatting/twisting on a loaded knee; graded return to activity");
    } else if (name.includes("MCL")) {
      treatmentPriorities.push("Protect healing — avoid valgus stress early", "Progressive strengthening and bracing as indicated by grade", "Graded return to sport once stable and pain-free");
      suggestedGoals.push("Restore pain-free functional stability to valgus loading");
      homeAdvice.push("Avoid valgus-loading activities until healing; isometric quadriceps/hamstring work early");
    } else if (name.includes("LCL")) {
      treatmentPriorities.push("Protect healing — avoid varus stress early", "Progressive strengthening and bracing as indicated by grade", "Graded return to sport once stable and pain-free");
      suggestedGoals.push("Restore pain-free functional stability to varus loading");
      homeAdvice.push("Avoid varus-loading activities until healing; isometric quadriceps/hamstring work early");
    } else if (name.includes("Patellofemoral") || name.includes("PFPS")) {
      treatmentPriorities.push("Load management — reduce provocative stair/squat volume", "Quadriceps (VMO-emphasis) and hip abductor/external rotator strengthening", "Address movement pattern (dynamic knee valgus) and footwear/orthotic factors");
      suggestedGoals.push("Reduce anterior knee pain and restore pain-free stair/squat tolerance");
      homeAdvice.push("Graded quadriceps and hip strengthening; temporarily reduce stair/running volume");
    } else if (name.includes("tendinopathy")) {
      treatmentPriorities.push("Load management — relative rest from jumping/plyometric load", "Progressive tendon loading programme (isometric to heavy-slow-resistance)", "Address training load/technique factors");
      suggestedGoals.push("Restore pain-free functional loading of the patellar tendon");
      homeAdvice.push("Isometric quadriceps loading for pain relief; graded return to jumping/sport load");
    } else if (name.includes("osteoarthritis")) {
      treatmentPriorities.push("Load management and graded activity", "Quadriceps and functional strengthening", "Weight management/education if relevant");
      suggestedGoals.push("Maintain/improve knee range and reduce pain with functional activity");
      homeAdvice.push("Regular low-impact activity (cycling/swimming); avoid prolonged rest");
    } else if (name.includes("Iliotibial") || name.includes("band friction")) {
      treatmentPriorities.push("Load management — reduce running volume/downhill running temporarily", "ITB/hip abductor flexibility and strengthening", "Address training load and running technique factors");
      suggestedGoals.push("Reduce lateral knee pain and restore pain-free running tolerance");
      homeAdvice.push("Temporarily reduce running volume/hills; hip abductor strengthening and ITB flexibility work");
    }
  } else if (region === "elbow") {
    if (has("elbow_extension_loss")) primaryImpairments.push("Extension loss (earliest sign of elbow OA/effusion)");
    if (has("elbow_flexion_loss")) primaryImpairments.push("Restricted elbow flexion");
    if (has("biceps_resisted_pain_or_weak")) primaryImpairments.push("Weak or painful resisted elbow flexion/supination (biceps)");
    if (has("lateral_epicondyle_tender")) likelyPainGenerators.push("Lateral epicondyle / common extensor origin");
    if (has("medial_epicondyle_tender")) likelyPainGenerators.push("Medial epicondyle / common flexor origin");
    if (has("olecranon_tender")) likelyPainGenerators.push("Olecranon / triceps insertion");
    if (has("cubital_tunnel_tender") || has("ulnar_nerve_symptoms")) likelyPainGenerators.push("Ulnar nerve at the cubital tunnel");
    if (has("biceps_tendon_tender")) likelyPainGenerators.push("Distal biceps tendon / cubital fossa");
    if (has("resisted_wrist_extension_aggravation") || has("resisted_wrist_extensors_pain")) movementDysfunction.push("Resisted wrist extension reproduces lateral elbow pain");
    if (has("resisted_wrist_flexion_aggravation") || has("resisted_wrist_flexors_pain")) movementDysfunction.push("Resisted wrist flexion reproduces medial elbow pain");
    if (has("sustained_flexion_aggravation")) movementDysfunction.push("Sustained elbow flexion provokes ulnar nerve symptoms");
    if (has("elbow_repetitive_overuse")) functionalLimitations.push("Difficulty with repetitive gripping/keyboard/tool-use tasks");
    if (has("ulnar_nerve_symptoms")) functionalLimitations.push("Intermittent little/ring finger tingling affecting fine tasks");

    if (name.includes("Lateral epicondylalgia")) {
      treatmentPriorities.push("Load management — relative rest from provocative gripping activity", "Progressive extensor tendon loading programme (isometric to heavy-slow-resistance)", "Address grip technique/equipment and workstation ergonomics");
      suggestedGoals.push("Restore pain-free grip and resisted wrist extension");
      homeAdvice.push("Counterforce brace during provocative tasks; isometric wrist extensor loading for pain relief");
    } else if (name.includes("Medial epicondylalgia")) {
      treatmentPriorities.push("Load management — relative rest from provocative gripping activity", "Progressive flexor-pronator tendon loading programme (isometric to heavy-slow-resistance)", "Address grip technique/equipment and throwing/swing mechanics");
      suggestedGoals.push("Restore pain-free grip and resisted wrist flexion");
      homeAdvice.push("Isometric wrist flexor loading for pain relief; gradual return to provocative grip/swing activity");
    } else if (name.includes("biceps")) {
      treatmentPriorities.push("Protect/offload if acute rupture suspected — urgent orthopaedic opinion", "Progressive biceps loading programme if tendinopathy (not rupture)", "Address eccentric loading exposure (e.g. heavy lifting mechanics)");
      suggestedGoals.push("Restore pain-free resisted elbow flexion/supination");
      homeAdvice.push("Avoid heavy eccentric lifting until assessed; if sudden pop/deformity reported, seek urgent orthopaedic review");
    } else if (name.includes("osteoarthritis")) {
      treatmentPriorities.push("Load management and graded activity", "Elbow range and strengthening exercise", "Activity modification for heavy/repetitive loading if relevant");
      suggestedGoals.push("Maintain/improve elbow range (particularly extension) and reduce pain with function");
      homeAdvice.push("Regular pain-free range-of-motion exercise; avoid prolonged immobilisation");
    } else if (name.includes("bursitis")) {
      treatmentPriorities.push("Protect from further direct pressure/trauma", "Monitor for signs of septic bursitis (warmth, redness, systemic illness) — urgent referral if present", "Address any repetitive leaning/pressure habit");
      suggestedGoals.push("Resolve swelling and restore pain-free elbow function");
      homeAdvice.push("Use elbow padding to avoid direct pressure; monitor for increasing redness/warmth/fever and seek urgent review if these develop");
    } else if (name.includes("UCL")) {
      treatmentPriorities.push("Protect healing — avoid valgus/throwing loading early", "Progressive flexor-pronator strengthening to support the medial elbow", "Graded, monitored return-to-throw programme");
      suggestedGoals.push("Restore pain-free functional stability to valgus loading");
      homeAdvice.push("Avoid throwing/valgus-loading activity until assessed; consider orthopaedic/sports medicine opinion if instability suspected");
    } else if (name.includes("Cubital tunnel")) {
      treatmentPriorities.push("Reduce sustained/repetitive elbow flexion exposure (e.g. phone use, sleeping position)", "Ulnar nerve gliding/mobility work within comfort", "Consider referral if progressive weakness or intrinsic wasting develops");
      suggestedGoals.push("Reduce ulnar nerve symptoms and protect nerve function");
      homeAdvice.push("Avoid prolonged/sustained elbow flexion (e.g. sleeping with elbow bent, phone held to ear); elbow padding to avoid direct compression");
    } else if (name.includes("Radial tunnel")) {
      treatmentPriorities.push("Load management — reduce provocative resisted supination/gripping activity", "Radial nerve gliding/mobility work within comfort", "Differentiate from and co-manage alongside lateral epicondylalgia if both present");
      suggestedGoals.push("Reduce lateral forearm pain and restore pain-free resisted supination");
      homeAdvice.push("Avoid repetitive resisted supination/pronation tasks; gentle radial nerve glides within comfort");
    } else if (name.includes("Pronator teres")) {
      treatmentPriorities.push("Load management — reduce provocative repetitive pronation activity", "Median nerve gliding/mobility work within comfort", "Address forearm muscle flexibility and load tolerance");
      suggestedGoals.push("Reduce proximal forearm pain and restore pain-free resisted pronation");
      homeAdvice.push("Avoid repetitive resisted pronation tasks; gentle median nerve glides within comfort");
    }
  }

  const yellowFlags: string[] = [];
  if (subjective.constantPain && subjective.nightPain) {
    yellowFlags.push("Constant + night pain reported — monitor for distress/central sensitisation; not itself a red flag.");
  }

  let referralRecommendation: string | null = null;
  if (redFlag.triggered) {
    referralRecommendation = `Red flag present — refer/escalate before continuing: ${redFlag.flags.map((f) => f.message).join(" ")}`;
  } else if (region === "shoulder" && (has("er_lag_positive") || has("drop_arm_positive") || has("imaging_full_thickness_tear"))) {
    referralRecommendation = "Positive lag/drop-arm sign or imaged full-thickness tear — consider orthopaedic/imaging referral.";
  } else if (region === "cervical" && (has("hoffmann_positive") || has("gait_disturbance"))) {
    referralRecommendation = "UMN sign / gait disturbance — urgent referral to exclude cervical myelopathy before local treatment.";
  } else if (region === "cervical" && has("myotome_weak") && has("reflex_change")) {
    referralRecommendation = "Progressive/objective neurological deficit — consider medical/imaging referral alongside conservative care.";
  } else if (region === "lumbar" && has("myotome_weak") && (has("reflex_change") || has("sensory_deficit"))) {
    referralRecommendation = "Objective neurological deficit — consider medical/imaging referral alongside conservative care.";
  } else if (region === "lumbar" && has("neurogenic_claudication") && has("bilateral_leg_symptoms")) {
    referralRecommendation = "Bilateral neurogenic claudication pattern — consider imaging referral to confirm spinal stenosis if not improving with conservative care.";
  } else if (region === "hip" && has("hip_catching_locking") && has("hip_scour_positive")) {
    referralRecommendation = "Mechanical catching/locking with a positive Scour test — consider orthopaedic/imaging referral to assess for labral tear or loose body.";
  } else if (region === "hip" && subjective.avnRiskFactors) {
    referralRecommendation = "Avascular necrosis risk factors present — consider imaging referral before progressing loaded exercise.";
  } else if (region === "hip" && subjective.nonMskReferralSuspected) {
    referralRecommendation = "Non-musculoskeletal presentation suspected — refer for medical assessment.";
  } else if (region === "knee" && has("knee_true_locking")) {
    referralRecommendation = "True mechanical locking (cannot fully extend) — consider orthopaedic referral to assess for a displaced meniscal tear or loose body.";
  } else if (region === "knee" && has("knee_immediate_haemarthrosis") && has("lachman_positive")) {
    referralRecommendation = "Immediate haemarthrosis with a positive Lachman's test — consider orthopaedic referral to assess ACL integrity.";
  } else if (region === "knee" && has("knee_reflex_change")) {
    referralRecommendation = "Patellar reflex change noted at the knee — this reflects L3-L4 nerve root function, not local knee pathology; consider lumbar spine assessment/referral to screen for radiculopathy.";
  } else if (region === "elbow" && has("imaging_biceps_rupture")) {
    referralRecommendation = "Imaged distal biceps rupture — consider orthopaedic surgical opinion referral (early repair improves outcomes).";
  } else if (region === "elbow" && has("valgus_stress_elbow_positive") && subjective.elbowThrowingMechanism) {
    referralRecommendation = "Positive valgus stress test in a throwing athlete — consider orthopaedic/sports medicine referral to assess UCL integrity before return to throwing.";
  } else if (region === "elbow" && has("elbow_reflex_change")) {
    referralRecommendation = "Biceps or triceps reflex change noted at the elbow — this reflects C5-C7 nerve root function, not local elbow pathology; consider cervical spine assessment/referral to screen for radiculopathy.";
  }

  const cap = (r: string) => r.charAt(0).toUpperCase() + r.slice(1);
  const summary = redFlag.triggered
    ? `${cap(region)} presentation with a positive red-flag screen; diagnosis withheld pending referral. Assessment ${completeness.evidenceConfidence}% complete.`
    : top
      ? `${cap(region)} presentation most consistent with ${top.name} (${top.band.toLowerCase()} match ${top.diagnosticMatchScore}%). Assessment ${completeness.evidenceConfidence}% complete${completeness.missingCritical.length ? "; key exams still outstanding" : ""}.`
      : `Insufficient findings to prioritise a differential yet. Assessment ${completeness.evidenceConfidence}% complete — complete the recommended examination first.`;

  return {
    summary,
    primaryImpairments,
    likelyPainGenerators: [...new Set(likelyPainGenerators)],
    movementDysfunction,
    functionalLimitations,
    redFlags: redFlag.flags.map((f) => f.message),
    yellowFlags,
    treatmentPriorities,
    suggestedGoals,
    homeAdvice,
    referralRecommendation,
  };
}
