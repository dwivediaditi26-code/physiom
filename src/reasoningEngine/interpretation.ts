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
