// PatientDatabase.jsx — Patient DB helpers, BodyChart, Profile modal, DB panel
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabase.js";
import { getC } from "./utils.jsx";
import { DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION } from "./sharedClinicalData.js";
import { MMT_DATA_LABELS, mmtFallbackLabel, ST_DATA_LABELS, SCALE_DATA_LABELS, resolveCyriaxKey } from "./sharedClinicalData.js";
import { NKT_REGIONS } from "./sharedClinicalData.js";
import BodyChartPro from "./BodyChartPro.jsx";
// These used to be flat constants shared by every user of a device. Now
// they're per-user: two students sharing one browser/tablet each get their
// own slot, so signing in as student B can never inherit student A's
// still-cached local records (which, before this fix, could even get
// re-uploaded to Supabase mistagged under student B's account — see
// syncPatientsToSupabase below).
const dbKey = (userId) => `physio_patient_db_v1_${userId || "anon"}`;
const draftKey = (userId) => `physio_draft_v1_${userId || "anon"}`;
// Back-compat plain constants (pre-multi-user, unscoped) — kept only so an
// old cache from before this change can be migrated, never written to again.
const DB_KEY_LEGACY = "physio_patient_db_v1";
const DRAFT_KEY_LEGACY = "physio_draft_v1";

const SEED_PATIENT = {
  id: "pt_priya_sharma_01",
  name: "Priya Sharma",
  createdAt: "2026-06-22T08:00:00.000Z",
  updatedAt: "2026-06-22T09:30:00.000Z",
  hasRedFlags: false,
  lastDx: "L4/L5 disc herniation with left-sided radiculopathy — McKenzie Derangement, Extension preference",
  data: {
    dem_name:"Priya Sharma", dem_dob:"15/03/1992", dem_sex:"Female", dem_dominant:"Right",
    dem_occupation:"Software Engineer", dem_employer:"Tech Company", dem_work_status:"Full time",
    dem_referral:"Self referred", dem_gp:"Dr. Mehta, Mumbai Clinic", dem_consent:"Yes — verbal",
    dem_notes:"34-year-old software engineer presenting with LBP + left leg radiation. MRI confirmed L4/L5 disc herniation.",
    cc_main:"My lower back is killing me and the pain shoots down my left leg. I can't sit at my desk for more than 20 minutes.",
    cc_onset:"Lifting — spine flexed AND rotated (most common disc mechanism)",
    cc_duration:"6 weeks–3 months",
    cc_vas_now:6, cc_vas_worst:8, cc_vas_best:3,
    cc_quality:["Sharp","Burning","Shooting","Tingling","Pins and needles"],
    cc_notes:"Pain centralises with prone press-ups (McKenzie extension preference). Peripheralises with forward flexion. Classic L4/L5 discogenic presentation.",
    goal_main:"Return to pain-free work and resume 5km jogging",
    goal_concern:"I'm worried the disc is permanently damaged and I'll need surgery",
    goal_belief:"I think my disc has slipped out of place",
    goal_success:"Sitting at desk for full workday without pain, jogging 5km",
    goal_expect:"Full recovery — hopeful",
    goal_told:"Yes — helpful clear explanation",
    goal_timeline:"1–3 months",
    goal_notes:"Good understanding of McKenzie approach after explanation. Motivated. Mild fear-avoidance around exercise but open to education.",
    hx_first:"Yes — first ever", hx_episodes:"First episode", hx_resolve:"N/A — first episode",
    hx_prev_physio:"None", hx_imaging:["MRI — abnormal"],
    hx_imaging_detail:"MRI L-spine 2026-05-20: L4/L5 left paracentral disc herniation with mild neural foraminal stenosis.",
    hx_injections:["None"], hx_surgery:"None", hx_providers:["GP managing"],
    hx_notes:"First episode. MRI obtained early due to neurological signs. GP prescribed ibuprofen 400mg PRN.",
    grf_systemic:["None — systemically well"], grf_cancer:["No cancer history"],
    grf_fracture:["No fracture indicators"], grf_infection:["No infection risk"],
    grf_neuro:["No neurological red flags"], grf_vascular:["No vascular red flags"],
    grf_action:"No red flags — proceed with assessment",
    pmh_conditions:["No significant PMH"], pmh_surgical:"None", pmh_family:"No relevant family history",
    med_current:["NSAIDs — as needed"], med_effectiveness:"Moderately effective",
    med_allergies:"None known", pmh_notes:"Ibuprofen 400mg as needed. No contraindications to exercise.",
    ls_health:"Good", ls_exercise:"Moderate — 2–3x/week", ls_exercise_type:"Recreational running, yoga",
    ls_smoking:"Never smoked", ls_alcohol:"Occasional social",
    ls_sleep_quality:"Poor — rarely refreshed", ls_sleep_position:["Side (L)","Side (R)"],
    ls_stress:"Moderate stress",
    ls_occ_demands:["Primarily seated / desk","Computer / screen >4hrs daily","Laptop only — no docking"],
    ls_weight_change:"Stable", ls_notes:"Works from home. Ergonomics assessed — using laptop without stand.",
    lx_loc:["Lower lumbar (L4-L5)","Paraspinal left of midline","Buttock (L) — lower","To posterior thigh (L)"],
    lx_radiation:["To posterior thigh (L)","To lateral lower leg (L5)","To dorsum of foot (L5)"],
    lx_dermatomal:["L5 — lateral lower leg / dorsum foot / great toe"],
    lx_below_knee:"Leg pain — below knee (radiculopathy threshold)",
    lx_loc_notes:"Left-sided L4/L5 distribution. Pain extends to dorsum of foot. Paresthesia in L5 dermatome.",
    lx_moi:["Prolonged poor posture over time","Bending forward without lifting"],
    lx_moi_load:"Body weight only", lx_moi_position:["Flexed forward"],
    lx_moi_first:"Gradual development over days",
    lx_moi_notes:"Insidious onset over 6 weeks. Works 8-10hrs/day at laptop without ergonomic setup.",
    lx_agg_post:["Sitting — any duration","Sitting >15 minutes","Soft / unsupported seating"],
    lx_agg_mov:["Forward bending (flexion)","Combined flexion + rotation left","Transitional movements (sit to stand etc)"],
    lx_agg_act:["Coughing (discogenic indicator — intradiscal pressure)","Sneezing (discogenic indicator)","Getting up from sitting","Getting in / out of car","Getting out of bed"],
    lx_agg_worst:"Prolonged sitting at desk",
    lx_agg_notes:"Sitting tolerance <20 min. Cough/sneeze reproduces leg pain — strong discogenic indicator.",
    lx_rel_post:["Lying prone (face down)","Prone on elbows (extension load)","Walking slowly"],
    lx_rel_mov:["Extension — McKenzie press-up / cobra","Walking"],
    lx_rel_manual:["Heat — hot water bottle","Specific physio exercises"],
    lx_rel_med:["NSAIDs — moderately effective"],
    lx_directional:"Extension preference — press-up centralises symptoms",
    lx_rel_best:"Prone lying / McKenzie press-ups",
    lx_rel_notes:"Clear extension preference. Centralisation occurs with prone press-ups.",
    lx_pattern:["Constant — varies in intensity hour to hour","Morning dominant","Activity-proportional (warms up then fades)"],
    lx_morning:"Stiff — eases within 30 min",
    lx_night:["Difficulty finding comfortable position","Wakes once from pain","Leg pain at night — neural"],
    lx_24hr:"Mechanical — worse with load and posture, better with rest",
    lx_trajectory:"Plateau — no change",
    lx_irritability:"Moderate — provoked with sustained activity, settles reasonably",
    lx_symp_notes:"Mechanical pattern with neural component. Settles within 30-60 min of offloading.",
    lx_neuro_present:"Yes — unilateral (L)",
    lx_neuro_quality:["Burning — constant","Tingling","Pins and needles","Numbness — objective"],
    lx_neuro_signs:["Numbness — specific dermatome","Heel walking difficult (L4/L5)","Reduced or absent ankle reflex (S1)"],
    lx_claudication:"No claudication pattern",
    lx_bladder_baseline:"Normal bladder and bowel before pain onset",
    lx_neuro_notes:"L5 dermatomal numbness dorsum left foot. EHL weakness grade 4/5. Left knee reflex mildly reduced.",
    lx_rf_cauda:["No cauda equina signs"], lx_rf_fracture:["No fracture indicators"],
    lx_rf_inflammatory:["No inflammatory features"], lx_rf_serious:["No other red flags"],
    lx_rf_notes:"Red flags screened and cleared. Cauda equina negative.",
    lx_yf_beliefs:["Believes pain = damage / structural harm","Believes this is serious / progressive disease"],
    lx_yf_fear:"Mild — some avoidance of certain activities",
    lx_yf_emotion:["Mild anxiety"],
    lx_yf_work:["Job dissatisfaction prior to injury"],
    lx_yf_social:["Adequate social support"],
    lx_yf_startback:"Medium risk (total ≥4, subscale <4)",
    lx_yf_notes:"Mild fear-avoidance. Education required re: disc herniation natural history.",
    lx_fn_sitting:"Comfortable for 15–30 min", lx_fn_standing:"Comfortable for 30–60 min",
    lx_fn_walking:"Walks >1 km",
    lx_fn_adl:["Putting on shoes and socks","Bending to floor level","Getting out of bed"],
    lx_fn_work:"Modified duties",
    lx_fn_psfs:"1. Sitting at desk for 1 hour: 3/10\n2. Walking 5km: 2/10\n3. Getting in/out of car: 4/10",
    lx_fn_notes:"Significant work impact. Cannot exercise at previous level.",
    bps_beliefs:"Believes disc is permanently damaged. Fears surgery inevitable.",
    bps_social:"Supportive partner and family. Works from home.",
    bps_psychological:"Mild anxiety about recovery. STarT Back medium risk. No depression.",
    bps_expectations:"Wants to avoid surgery, return to jogging within 8-12 weeks.",
    bps_coping:"Uses heat packs, gentle walking.",
    bps_fear:"Mild fear of re-injury with exercise.",
    bps_mood:"Mild frustration and anxiety. Not clinically depressed.",
    bps_selfeff:"Moderate — believes she can improve with guidance.",
    bps_work_facs:"Employer supportive of working from home.",
    bps_outcome:"PHQ-2: 1/6 — no significant depression.",
    sleep_quality:"4/10", sleep_hours:"5-6",
    sleep_position:"Side-lying with pillow between knees best tolerated",

    // ── KINETIC CHAIN ─────────────────────────────────────────────────────
    kc_ankle_df:"Moderately restricted — 4–6cm / 10–14°",
    kc_subtalar:"Hypermobile — excessive pronation",
    kc_great_toe:"Mildly restricted — 40–59°",
    kc_knee_stability:"Dynamic valgus — functional tasks only",
    kc_patellar_mobility:"Restricted lateral tilt — J-tracking pattern",
    kc_tibiofemoral_rot:"Reduced screw-home mechanism",
    kc_hip_ir_mob:"Restricted — <30° bilateral",
    kc_hip_ext_mob:"Restricted — Thomas test positive (hip flexor tightness)",
    kc_hip_er_mob:"Normal",
    kc_hip_abd_mob:"Mildly restricted — Ober test mildly positive",
    kc_lumbar_stability:"Unstable — poor segmental control (prone instability positive)",
    kc_lumbar_flexion_ctrl:"Dysfunctional — early hinge at L4/L5",
    kc_lumbar_rotation_ctrl:"Restricted rotation control — poor dissociation",
    kc_thoracic_rotation:"Restricted bilateral — <40°",
    kc_thoracic_extension:"Restricted — flat thoracic kyphosis",
    kc_rib_mobility:"Limited left rib expansion",
    kc_scapulohumeral_rhythm:"Abnormal — early scapular elevation",
    kc_gh_ir_mob:"Restricted — GIRD positive right shoulder",
    kc_cervical_thoracic_jct:"Dysfunctional — loss of CT junction mobility",
    kc_cervical_rot_mob:"Restricted left rotation — 55°",
    kc_cervical_flex_ext:"Restricted extension — chin poke pattern",
    kc_notes:"Ankle DF restriction driving knee valgus. Thoracic stiffness limiting cervical and shoulder mobility. Classic lower crossed syndrome + early upper crossed pattern.",

    // ── FASCIA ────────────────────────────────────────────────────────────
    fa_skin_roll:"Restricted — taut band with tenderness (fascial densification)",
    fa_passive_tension:"Restricted SBL — hamstring and thoracolumbar tension",
    fa_active_line_load:"SBL overloaded — posterior chain dominant pattern",
    fa_densification:"Densification present — lumbar and cervical regions (Stecco positive)",
    fa_sbl_hamstring:"Restricted — fascial vs muscle length test positive",
    fa_tlf:"Restricted TLF — poor lumbar dissociation and rotation",
    fa_spiral_rot:"Asymmetric spiral rotation — right dominant compensation",
    fa_ll_test:"Restricted lateral line — left hip",
    fa_dfl_arch:"DFL arch collapsed — poor intrinsic foot support",
    fa_dfl_breathing:"Diaphragm restricted — paradoxical breathing pattern noted",
    fa_remote_test:"Positive — cervical symptoms change with lumbar treatment (regional interdependence)",
    fa_force_closure:"Reduced — SIJ force closure deficit",
    fa_compensation_map:"SBL dominant with DFL inhibition — posterior chain overload pattern",
    fa_scar:"No surgical scars",

    // ── NKT / CPA ─────────────────────────────────────────────────────────
    nkt_dnf:"Inhibited", nkt_scm:"Facilitated", nkt_upper_trap:"Facilitated",
    nkt_lower_trap:"Inhibited", nkt_serratus:"Inhibited", nkt_subscapularis:"Inhibited",
    nkt_infraspinatus:"Facilitated", nkt_pec_minor:"Facilitated",
    nkt_ta:"Inhibited", nkt_multifidus:"Inhibited", nkt_diaphragm:"Inhibited",
    nkt_ql:"Facilitated", nkt_psoas:"Facilitated", nkt_erector_spinae:"Facilitated",
    nkt_gmax:"Inhibited", nkt_gmed:"Inhibited", nkt_tfl:"Facilitated",
    nkt_vmo:"Inhibited", nkt_hamstrings:"Facilitated", nkt_gastroc:"Facilitated",
    nkt_tib_ant:"Inhibited",
    nkt_notes:"Classic LCS + UCS pattern. Glute inhibition with TFL/hamstring dominance driving lumbar overload. DNF inhibited with SCM/upper trap facilitation.",

    // ── FUNCTIONAL SCREENS ────────────────────────────────────────────────
    kfs_data:JSON.stringify({ grades:{ kfs_squat:2, kfs_lunge:1, kfs_step_down:2, kfs_single_leg:2 }, notes:{ kfs_squat:"Clear dynamic valgus bilateral, heel rise at 60° squat depth", kfs_step_down:"Contralateral hip drop — Trendelenburg pattern" } }),
    lfs_data:JSON.stringify({ grades:{ lfs_flexion:2, lfs_extension:1, lfs_rot:2, lfs_lateral:1 }, notes:{ lfs_flexion:"Early hinge L4/L5, poor hip hinge dissociation from lumbar" } }),
    sfs_data:JSON.stringify({ grades:{ sfs_overhead:2, sfs_push:1, sfs_pull:2 }, notes:{ sfs_overhead:"Early scapular elevation with loss of posterior tilt — impingement risk" } }),
    hfs_data:JSON.stringify({ grades:{ hfs_squat:1, hfs_hinge:2, hfs_lunge:1 }, notes:{ hfs_hinge:"Hip flexor dominant pattern, poor posterior chain activation" } }),
    afs_data:JSON.stringify({ grades:{ afs_raise:2, afs_lunge:2, afs_hop:1 }, notes:{ afs_raise:"Cannot complete single leg heel raise — gastroc/soleus inhibition" } }),

    // ── OUTCOME MEASURES ─────────────────────────────────────────────────
    om_report:{ scores:{ ndi:"42%", odi:"38%", psfs:"4.2/10", dash:"36" } },

    // ── ERGONOMICS ────────────────────────────────────────────────────────
    ergo_total_score:"7", ergo_cervical_risk:"8", ergo_lumbar_risk:"6",
    ergo_ucs_risk:"7", ergo_rsi_risk:"5", ergo_nerve_risk:"4",
    ergo_sitting_hrs:"9 hours/day",

    // ── TREATMENT TECHNIQUES ──────────────────────────────────────────────
    tx_techniques:[
      { type:"manual", technique:"PA central glide", region:"L4/5", grade:"III", dosage:"3×60s", response:"Pain reduced 7→4/10, centralisation confirmed" },
      { type:"dn", dn_muscle:"Gluteus Medius", laterality:"bilateral", dn_needles:"4", dn_depth:"30mm", dn_twitch:"positive" },
      { type:"st", st_technique:"Myofascial release", st_region:"Thoracolumbar fascia", duration:"5 min" }
    ],

    // ── EXERCISE PRESCRIPTION ─────────────────────────────────────────────
    hep_programme:[
      { name:"Dead Bug", sets:"3", reps:"10", hold:"5", freq:"daily", notes:"Maintain neutral spine, no lumbar extension" },
      { name:"Glute Bridge", sets:"3", reps:"15", hold:"3", freq:"daily", notes:"Bilateral to start, progress to single leg week 2" },
      { name:"Wall Ankle DF Lunge", sets:"3", reps:"10", hold:"2", freq:"daily", notes:"Measure distance to wall — target 10cm" },
      { name:"Thoracic Rotation in Side Lying", sets:"2", reps:"10", hold:"3", freq:"daily", notes:"Keep hips stacked, focus thoracic not lumbar" },
      { name:"McKenzie Press-Up", sets:"3", reps:"10", hold:"1", freq:"every 2 hrs", notes:"Centralise leg pain — stop if peripheralises" }
    ],

    // ── GAIT ──────────────────────────────────────────────────────────────
    gait_observation:"Antalgic gait with reduced left stance phase and trunk lean",
    gait_deviations:"Bilateral dynamic valgus on loading, reduced push-off right, minor Trendelenburg left",

    // ── FMA ───────────────────────────────────────────────────────────────
    fma_report:{ scores:{ squat:1, gait:2, single_leg:1, lunge:2, bend:2 } },

    // ── SPECIAL TESTS (STT) ───────────────────────────────────────────────
    // Cervical
    st_spurling:"Positive — right (radiculopathy)",
    st_distraction:"Negative",
    st_vbi:"Negative",
    st_frt:"Positive — restricted right rotation (C1/C2)",
    st_upper_limb_tension:"Positive — right (median nerve)",
    // Lumbar / Neural
    lx_slr_left:"Negative",
    lx_slr_right:"Positive — 45° reproduction of right leg pain",
    lx_slump:"Positive — right leg symptoms reproduced",
    lx_kemp:"Positive — right-sided lumbar pain",
    // Shoulder
    st_hawkins:"Positive — right subacromial pain",
    st_neer:"Positive — right subacromial",
    st_empty_can:"Negative",
    st_apprehension:"Negative",
    st_speeds:"Negative",
    // Knee
    st_lachman:"Negative",
    st_mcmurray:"Positive — medial joint line click right",
    st_valgus_stress:"Negative",
    st_varus_stress:"Negative",
    st_anterior_drawer:"Negative",
    // Hip
    st_faber:"Positive — right groin pain reproduction",
    st_fadir:"Positive — right anterior hip pain",
    st_trendelenburg:"Positive — left (gluteus medius weakness)",
    // Ankle
    st_anterior_drawer_ankle:"Negative",
    st_thompson:"Negative",
  }
};

const SEED_PATIENT_2 = {
  id: "pt_arjun_kapoor_01",
  name: "Arjun Kapoor",
  createdAt: "2026-06-20T09:00:00.000Z",
  updatedAt: "2026-06-20T11:00:00.000Z",
  hasRedFlags: false,
  lastDx: "3 months post ACL reconstruction (BPTB graft) — return-to-sport rehabilitation phase",
  data: {
    // ── DEMOGRAPHICS ──
    dem_name:"Arjun Kapoor", dem_dob:"12/09/2003", dem_sex:"Male", dem_dominant:"Right",
    dem_occupation:"Student / Footballer", dem_employer:"Mumbai FC Youth Academy", dem_work_status:"Part time",
    dem_referral:"Orthopaedic surgeon (Dr. Rajan, Hinduja Hospital)", dem_gp:"Dr. Singh, Bandra",
    dem_consent:"Yes — verbal",

    // ── CHIEF COMPLAINT ──
    cc_main:"Right knee pain and instability — 3 months post ACL reconstruction (BPTB graft). Unable to return to football training. Concerned about re-injury.",
    cc_body_region:"Knee Right",
    cc_onset:"Surgical — ACL reconstruction 3 months ago following non-contact pivot injury during football match",
    cc_duration:"3 months post-op (injury 5 months ago)",
    cc_vas_now:"2", cc_vas_worst:"6", cc_vas_best:"0",
    cc_quality:"Anterior knee ache with activity; sharp pain on stairs descent; intermittent swelling after training",
    cc_notes:"BPTB graft. Surgeon cleared for physiotherapy-guided RTS protocol. Target: return to full training by month 6. Psychologically anxious about re-injury (high TSK).",

    // ── AGGRAVATING / EASING ──
    knr_agg_mov:"Stairs descent|||Deep squatting|||Pivoting / change of direction|||Running — cutting movements|||Jumping and landing",
    knr_agg_act:"Football training drills|||Prolonged walking >30 min|||Kneeling|||Getting up from floor",
    knr_agg_worst:"Stairs descent and landing from jump",
    knr_agg_notes:"Anterior knee pain likely donor site irritation (BPTB). Swelling after >45 min activity. No true instability episodes but perception of giving way.",
    knr_rel_mov:"Rest|||Ice after activity|||Elevation",
    knr_rel_notes:"Swelling settles within 2 hours with RICE. Morning stiffness <10 minutes.",

    // ── 24H BEHAVIOUR ──
    knr_morning:"Mild stiffness — settles within 10 minutes",
    knr_night:"Occasional ache if overdone during day — not waking",
    cc_24h_pattern:"Intermittent — activity-dependent",

    // ── PMH / HISTORY ──
    hx_first:"First significant knee injury",
    hx_previous_injury:"Right knee ACL tear — non-contact pivot injury, Mumbai FC U19 league match, January 2026",
    hx_surgery:"Right ACL reconstruction with BPTB graft — Hinduja Hospital, March 2026 (Dr. Rajan)",
    hx_imaging:"MRI pre-op: complete ACL tear, bone bruising medial tibial plateau. Post-op X-ray: satisfactory graft positioning.",
    hx_imaging_detail:"Tunnel placement confirmed adequate. No meniscal repair required.",
    hx_providers:"Orthopaedic surgeon, hospital physiotherapist (weeks 0–6)",
    hx_notes:"Weeks 0–6: hospital physio — range of motion, quadriceps activation, gait retraining. Weeks 6–12: gym-based strengthening. Now week 13 — starting sport-specific rehab phase.",
    hx_resolve:"Progressing well — achieved 0–120° ROM, able to jog on treadmill",

    // ── MEDICATIONS / PMH ──
    pmh_conditions:"Nil significant",
    pmh_medications:"Nil regular. Ibuprofen PRN for post-training swelling (as needed).",
    pmh_allergies:"NKDA",
    pmh_notes:"Pre-injury: fit, healthy, playing competitive football 5x/week. No previous knee pathology.",

    // ── GOALS ──
    ar_goal_function:"Return to full football training and match play",
    ar_goal_pain:"Pain-free activity and training",
    ar_goal_return:"Return to competitive football by month 6 (September 2026)",
    goal_expect:"Expects full recovery — motivated and compliant",
    goal_belief:"Understands surgical repair was successful; concerned about re-rupture risk",
    goal_concern:"Fear of re-injury during return to sport",
    goal_notes:"High athletic motivation. Mild kinesiophobia (TSK elevated). Needs education on graft maturation timeline and graduated RTS criteria.",

    // ── PSYCHOSOCIAL ──
    tsk_q1:"3", tsk_q2:"2", tsk_q3:"3", tsk_q4:"2", tsk_q5:"3",
    tsk_q6:"2", tsk_q7:"3", tsk_q8:"2", tsk_q9:"3", tsk_q10:"2", tsk_q11:"3",
    fabq_pa1:"3", fabq_pa2:"3", fabq_pa3:"2", fabq_pa4:"3",
    fabq_w5:"1", fabq_w6:"1", fabq_w7:"1", fabq_w9:"1", fabq_w10:"1", fabq_w11:"1", fabq_w15:"1",

    // ── OBSERVATION ──
    obs_gait:"Mild antalgic gait right side — reduced knee flexion in swing phase. Foot progression angle normal bilateral.",
    obs_posture:"Slight quadriceps wasting right compared to left. Mild anterior pelvic tilt.",
    obs_swelling:"Trace effusion right knee — medial parapatellar region. No warmth.",
    obs_muscle_wasting:"Right quadriceps — approximately 1.5cm circumference deficit vs left at 15cm above patella",

    // ── ROM ──
    rom_knee_flex_r:"118°", rom_knee_flex_l:"135°",
    rom_knee_ext_r:"−2° extension lag", rom_knee_ext_l:"0°",
    rom_hip_flex_r:"115°", rom_hip_flex_l:"120°",
    rom_ankle_df_r:"14°", rom_ankle_df_l:"18°",

    // ── MMT ──
    mmt_quad_r:"4/5", mmt_quad_l:"5/5",
    mmt_hams_r:"4+/5", mmt_hams_l:"5/5",
    mmt_glut_med_r:"4/5", mmt_glut_med_l:"5/5",
    mmt_glut_max_r:"4+/5", mmt_glut_max_l:"5/5",
    mmt_gastroc_r:"5/5", mmt_gastroc_l:"5/5",
    mmt_hip_flex_r:"4+/5", mmt_hip_flex_l:"5/5",

    // ── SPECIAL TESTS ──
    st_lachman:"Negative — firm end feel. Grade 0.",
    st_anterior_drawer:"Negative",
    st_pivot_shift:"Negative under anaesthetic (intra-op). Not tested — post-op.",
    st_mcmurray:"Negative bilateral",
    st_thessaly:"Negative right",
    st_valgus_stress:"Negative",
    st_varus_stress:"Negative",
    st_patellar_grind:"Positive — anterior knee pain with compression and grind (donor site irritation)",
    st_clarke:"Positive — anterior knee pain (BPTB harvest site)",
    st_posterior_drawer:"Negative",
    st_dial:"Negative",

    // ── NEUROLOGICAL ──
    n_l3_right:"Normal", n_l3_left:"Normal",
    n_l4_right:"Normal", n_l4_left:"Normal",
    n_l5_right:"Normal", n_l5_left:"Normal",
    n_s1_right:"Normal", n_s1_left:"Normal",
    mmt_l3_r:"5/5", mmt_l4_r:"5/5", mmt_l5_r:"5/5", mmt_s1_r:"5/5",
    n_ref_patella_right:"Normal 2+", n_ref_patella_left:"Normal 2+",
    n_ref_achilles_right:"Normal 2+", n_ref_achilles_left:"Normal 2+",

    // ── FUNCTIONAL SCREEN ──
    kfs_data: JSON.stringify({
      grades: {
        kfs_squat: 1,
        kfs_step_down: 2,
        kfs_single_leg: 2,
        kfs_lunge: 1,
        kfs_hop: 2,
      },
      notes: {
        kfs_squat: "Compensated — reduced depth right, quadriceps dominance pattern",
        kfs_step_down: "Abnormal — dynamic valgus right knee on descent, Trendelenburg right hip",
        kfs_single_leg: "Abnormal — excessive trunk lean right, knee medialises past 2nd toe",
        kfs_lunge: "Compensated — anterior trunk lean, reduced knee flexion range",
        kfs_hop: "Abnormal — LSI (Limb Symmetry Index) 68% single hop, 71% triple hop — below 90% RTS threshold",
      }
    }),

    // ── OUTCOME MEASURES ──
    om_lefs_score:"52",
    om_psfs1:"Running and changing direction", om_psfs1_now:"3",
    om_psfs2:"Stairs descent", om_psfs2_now:"5",
    om_psfs3:"Single leg squat", om_psfs3_now:"4",
    om_koos_pain:"72", om_koos_adl:"78", om_koos_sport:"38", om_koos_qol:"31",

    // ── GAIT ANALYSIS ──
    gait_antalgic:"Right — reduced knee flexion swing phase",
    gait_trendelenburg:"Positive right — gluteus medius weakness",
    gait_step_length:"Reduced right stride length",
    gait_cadence:"Normal",
    gait_notes:"Compensatory strategies evident — trunk lean right during stance, reduced push-off right. Consistent with quadriceps inhibition pattern post ACL.",

    // ── WORKING DIAGNOSIS / SOAP A ──
    soap_a_diagnosis:"3 months post right ACL reconstruction (BPTB graft) — return-to-sport rehabilitation",
    soap_icd10:"M23.619",
    soap_assessment:"Patient is 13 weeks post right ACL reconstruction. Demonstrates adequate ROM (118° flexion, −2° extension lag) with significant quadriceps inhibition (4/5 MMT, 1.5cm thigh wasting). Functional testing reveals LSI of 68–71% on hop tests — below the 90% threshold required for RTS. Dynamic valgus on step-down and single leg squat indicates hip abductor deficit contributing to ACL stress. Anterior knee pain consistent with BPTB donor site irritation (Patellar grind and Clarke's test positive). Psychosocial screening reveals elevated fear of re-injury (TSK). Prognosis: good for return to full competition at 6 months with targeted strengthening, neuromuscular control, and graduated RTS protocol.",
    soap_a:"3/12 post R ACL reconstruction (BPTB). Quadriceps inhibition — LSI 68%. Dynamic valgus on loading tasks — hip abductor deficit. BPTB donor site irritation — anterior knee pain. Elevated kinesiophobia (TSK). Not yet cleared for RTS — requires LSI >90% and psychological readiness.",

    // ── TREATMENT ──
    soap_modalities:"Neuromuscular electrical stimulation (NMES) to right quadriceps, blood flow restriction training (BFR), manual therapy — patellar mobilisation",
    soap_frequency:"2x per week physiotherapy + daily HEP",
    tx_techniques:"NMES quadriceps, BFR training, patellar mobilisation grade III–IV, hip abductor/external rotator strengthening",
    hep_programme:"Quad sets + SLR 3x15, Terminal knee extension with band 3x15, Single leg press 0–60° 3x12, Hip abductor side-lying 3x15, Nordic curl progression 3x8, Balance board single leg 3x45s, Step-down eccentric control 3x12",

    // ── PLAN ──
    soap_plan:"Phase 3 RTS protocol: (1) Achieve full extension, quadriceps LSI >80% (weeks 13–16). (2) Plyometric loading — box jumps, deceleration drills, lateral cuts (weeks 16–20). (3) Sport-specific drills — ball work, full training if LSI >90% and psychological clearance (weeks 20–24). Review with surgeon at month 6.",
    soap_goals:"LSI >90% hop tests by week 20. Full training by month 6. Reduce TSK score — graded exposure and education.",
    soap_review:"2 weeks",
  }
};

const DEMO_PATIENTS = [];

const DEMO_VERSION = "v2026-06c"; // bump this when demo patients change

function loadPatientDB(userId) {
  const DB_KEY = dbKey(userId);
  const DRAFT_KEY = draftKey(userId);
  try {
    // One-time clear: if user has old demo data from before v2026-06-21, wipe it
    const cleared = localStorage.getItem("pm_cleared_demo_v5");
    if (!cleared) {
      localStorage.removeItem(DB_KEY_LEGACY);
      localStorage.removeItem(DRAFT_KEY_LEGACY);
      localStorage.setItem("pm_cleared_demo_v5", "1");
    }
    const stored = JSON.parse(localStorage.getItem(DB_KEY) || "[]");
    // Remove any old demo patients that were previously seeded
    const real = stored.filter(p => !p.id.startsWith("demo_"));
    if (real.length !== stored.length) {
      try { localStorage.setItem(DB_KEY, JSON.stringify(real)); } catch {}
    }
    // Seed both demo patients if missing or outdated
    const priya  = real.find(p => p.id === SEED_PATIENT.id);
    const arjun  = real.find(p => p.id === SEED_PATIENT_2.id);
    const needsSeed = real.length === 0 ||
      (priya && Object.keys(priya.data || {}).length < 230) ||
      !arjun;
    if (needsSeed) {
      const others = real.filter(p => p.id !== SEED_PATIENT.id && p.id !== SEED_PATIENT_2.id);
      const seeded = [SEED_PATIENT, SEED_PATIENT_2, ...others];
      try { localStorage.setItem(DB_KEY, JSON.stringify(seeded)); } catch {}
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: SEED_PATIENT.id, data: SEED_PATIENT.data })); } catch {}
      return seeded;
    }
    return real;
  } catch { return []; }
}
// userId is passed explicitly by the caller (rather than this function calling
// supabase.auth.getUser() itself) so a save that was already in flight can't
// get re-tagged to whichever account happens to be logged in by the time the
// network request actually completes — it's always tagged with the user who
// was active when the save was *initiated*.
async function syncPatientsToSupabase(patients, userId) {
  try {
    if (!userId) return; // not logged in — don't sync
    const rows = patients.map(p => ({
      id: p.id,
      user_id: userId,
      name: p.name || "Unknown",
      data: p.data || {},
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: p.updatedAt || new Date().toISOString(),
      has_red_flags: p.hasRedFlags || false,
      last_dx: p.lastDx || "",
    }));
    const { error } = await supabase.from("patients").upsert(rows, { onConflict: "id" });
    if (error) { console.warn("[Supabase sync]", error.message); throw error; }
  } catch (e) { console.warn("[Supabase sync error]", e); throw e; }
}
function savePatientDB(patients, userId) {
  try { localStorage.setItem(dbKey(userId), JSON.stringify(patients)); } catch {}
  return syncPatientsToSupabase(patients, userId); // returns a promise — callers that want a save-status indicator can await/.then/.catch this
}
const TASK_KEY = 'physio_task_db_v1';
function loadTaskDB() {
  try { const r=localStorage.getItem(TASK_KEY); return r?JSON.parse(r):[]; } catch { return []; }
}
function saveTaskDB(tasks) {
  try { localStorage.setItem(TASK_KEY, JSON.stringify(tasks)); } catch {}
}
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// ── Avatar initials helper ─────────────────────────────────────────────────────
function getInitials(name="") {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
  return name.slice(0,2).toUpperCase() || "?";
}

// ── Avatar gradient by id ──────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  ["#00e5ff","#7f5af0"],["#f97316","#ff4d6d"],["#00c97a","#00e5ff"],
  ["#ffb300","#f97316"],["#a78bfa","#ec4899"],["#38bdf8","#00c97a"],
];
function avatarGrad(id="") {
  const i = id.charCodeAt(id.length-1) % AVATAR_GRADIENTS.length;
  return `linear-gradient(135deg,${AVATAR_GRADIENTS[i][0]},${AVATAR_GRADIENTS[i][1]})`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BODY CHART — Interactive pain location mapper
// ─── Interactive Body Chart ────────────────────────────────────────────────────
// Uses the 4-view anatomical body chart image (Cloudinary: body-chart)
// Click/tap anywhere → detects body region → places colored marker

const BODY_CHART_IMG = "https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/body-chart";

const SYMPTOM_TYPES = [
  { id:"pain",     label:"Pain",      color:"#EF4444", symbol:"✕", bg:"#FEF2F2" },
  { id:"referred", label:"Referred",  color:"#F97316", symbol:"○", bg:"#FFF7ED" },
  { id:"numb",     label:"Numbness",  color:"#3B82F6", symbol:"≡", bg:"#EFF6FF" },
  { id:"tingling", label:"Tingling",  color:"#EAB308", symbol:"~", bg:"#FEFCE8" },
  { id:"stiff",    label:"Stiffness", color:"#8B5CF6", symbol:"◆", bg:"#F5F3FF" },
];

// The image has 4 views side by side (each ~25% width):
// 0-25%: Anterior | 25-50%: Left Lateral | 50-75%: Right Lateral | 75-100%: Posterior
function getViewFromX(xPct) {
  if (xPct < 25)  return "anterior";
  if (xPct < 50)  return "left";
  if (xPct < 75)  return "right";
  return "posterior";
}

// Within each view, normalise x to 0-100% of that view
function getLocalX(xPct) {
  const view = getViewFromX(xPct);
  const offsets = { anterior:0, left:25, right:50, posterior:75 };
  return ((xPct - offsets[view]) / 25) * 100;
}

function getBodyRegionFromChart(xPct, yPct) {
  const view = getViewFromX(xPct);
  const lx   = getLocalX(xPct);
  const y    = yPct;

  // Each view occupies full height. Body figure is centred within each quadrant.
  // The figure runs roughly y: 2%–98%, centred around x: 50% of each view.
  // Lateral views: figure shifted slightly (centre ~45%)

  // ── Y bands (same for all views) ──────────────────────────────────────────
  if (y < 8)  return { region:"Head",           view };
  if (y < 14) return { region:"Neck",            view };

  if (view === "anterior" || view === "posterior") {
    // Frontal views: bilateral
    const isLeft  = lx < 45;
    const isRight = lx > 55;
    const mid     = !isLeft && !isRight;

    if (y < 24) {
      if (lx < 28 || lx > 72) return { region: lx<50 ? "Left Shoulder":"Right Shoulder", view };
      return { region: view==="anterior" ? "Upper Chest":"Upper Thoracic Spine", view };
    }
    if (y < 34) {
      if (lx < 26 || lx > 74) return { region: lx<50 ? "Left Upper Arm":"Right Upper Arm", view };
      return { region: view==="anterior" ? "Chest / Ribs":"Mid Thoracic Spine", view };
    }
    if (y < 44) {
      if (lx < 24 || lx > 76) return { region: lx<50 ? "Left Forearm":"Right Forearm", view };
      return { region: view==="anterior" ? "Abdomen":"Lower Thoracic Spine", view };
    }
    if (y < 54) {
      if (lx < 22 || lx > 78) return { region: lx<50 ? "Left Hand / Wrist":"Right Hand / Wrist", view };
      return { region: view==="anterior" ? "Lower Abdomen":"Lumbar Spine", view };
    }
    if (y < 62) return { region: view==="anterior" ? (lx<50?"Left Groin":"Right Groin"):(lx<50?"Left SIJ":"Right SIJ"), view };
    if (y < 68) return { region: view==="anterior" ? (lx<50?"Left Hip":"Right Hip"):"Gluteal / Sacrum", view };
    if (y < 78) return { region: lx<50 ? "Left Thigh":"Right Thigh", view };
    if (y < 85) return { region: lx<50 ? "Left Knee":"Right Knee",   view };
    if (y < 93) return { region: lx<50 ? "Left Calf":"Right Calf",   view };
    return        { region: lx<50 ? "Left Ankle / Foot":"Right Ankle / Foot", view };
  }

  // Lateral views (single side — figure faces right for left-lateral, left for right-lateral)
  const side = view === "left" ? "Left" : "Right";
  if (y < 24) return { region:`${side} Shoulder`, view };
  if (y < 34) return { region:`${side} Upper Arm`, view };
  if (y < 44) return { region: lx < 55 ? "Chest / Thoracic Spine" : `${side} Forearm`, view };
  if (y < 56) return { region: lx < 55 ? "Lumbar Spine / Abdomen" : `${side} Hand / Wrist`, view };
  if (y < 63) return { region:`${side} Hip`, view };
  if (y < 72) return { region:`${side} Thigh (${view==="left"?"L":"R"})`, view };
  if (y < 80) return { region:`${side} Knee`,  view };
  if (y < 90) return { region:`${side} Calf`,  view };
  return        { region:`${side} Ankle / Foot`, view };
}

export function BodyChartInteractive({ data, set, compact = false }) {
  const { useState, useRef, useCallback } = React;
  const markers    = Array.isArray(data.body_chart) ? data.body_chart : [];
  const [active, setActive]   = useState("pain");
  const [tooltip, setTooltip] = useState(null); // { x, y, region, view }
  const [imgLoaded, setImgLoaded] = useState(false);
  const containerRef = useRef(null);

  const handleClick = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const xPct = ((e.clientX - rect.left) / rect.width)  * 100;
    const yPct = ((e.clientY - rect.top)  / rect.height) * 100;
    const { region, view } = getBodyRegionFromChart(xPct, yPct);

    // Toggle off existing marker of same region+type
    const existing = markers.find(m => m.region === region && m.type === active);
    if (existing) {
      set("body_chart", markers.filter(m => m.id !== existing.id));
      setTooltip(null);
      return;
    }

    const newMarker = {
      id: Date.now().toString(36),
      x: xPct, y: yPct,
      view, region,
      type: active,
      timestamp: new Date().toISOString(),
    };
    set("body_chart", [...markers, newMarker]);
    setTooltip({ x: xPct, y: yPct, region, view });
    setTimeout(() => setTooltip(null), 2000);
  }, [markers, active, set]);

  const activeType = SYMPTOM_TYPES.find(t => t.id === active);

  if (compact) {
    // Compact read-only view for patient profile
    return (
      <div style={{ position:"relative", width:"100%", userSelect:"none" }}>
        <img src={BODY_CHART_IMG} alt="Body Chart" style={{ width:"100%", display:"block", borderRadius:8 }}
          onError={e=>{ e.target.style.opacity="0.3"; }} />
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          {markers.map(m => {
            const t = SYMPTOM_TYPES.find(x => x.id === m.type) || SYMPTOM_TYPES[0];
            return (
              <g key={m.id}>
                <circle cx={m.x} cy={m.y} r="2.5" fill={t.color} opacity="0.9"/>
                <text x={m.x} y={m.y + 0.8} textAnchor="middle" fontSize="2.5"
                  fontWeight="bold" fill="white">{t.symbol}</text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  }

  return (
    <div style={{ fontFamily:"inherit" }}>
      {/* Symptom type selector */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginBottom:10 }}>
        {SYMPTOM_TYPES.map(t => (
          <button key={t.id} onClick={() => setActive(t.id)}
            style={{
              padding:"5px 11px", borderRadius:20, border:`2px solid ${active===t.id ? t.color : "#E5E7EB"}`,
              background: active===t.id ? t.bg : "#F9FAFB",
              color: active===t.id ? t.color : "#6B7280",
              fontWeight: active===t.id ? 800 : 500,
              fontSize:"0.82rem", cursor:"pointer", display:"flex", alignItems:"center", gap:5,
              transition:"all 0.15s",
            }}>
            <span style={{ fontSize:"1rem", lineHeight:1 }}>{t.symbol}</span>
            {t.label}
          </button>
        ))}
        {markers.length > 0 && (
          <button onClick={() => set("body_chart", [])}
            style={{ padding:"5px 11px", borderRadius:20, border:"1px solid #FCA5A5",
              background:"#FEF2F2", color:"#EF4444", fontSize:"0.82rem", cursor:"pointer", marginLeft:"auto" }}>
            Clear all
          </button>
        )}
      </div>

      {/* Instruction */}
      <div style={{ fontSize:"0.75rem", color:"#9CA3AF", marginBottom:7, textAlign:"center" }}>
        Tap body area to mark <strong style={{color:activeType?.color}}>{activeType?.label}</strong> · Tap again to remove
      </div>

      {/* Chart container */}
      <div ref={containerRef} onClick={handleClick}
        style={{ position:"relative", width:"100%", cursor:"crosshair",
          borderRadius:12, overflow:"hidden", background:"#FFFFFF",
          border:"1.5px solid #E0E0E2", userSelect:"none" }}>

        {/* Clinical body chart — smooth bezier paths, full 220px height */}
        <svg viewBox="0 0 400 220" width="100%" style={{display:"block",background:"#FFFFFF"}}>
          <g transform="translate(0,0)"><ellipse cx="50" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M41 5.5 C38.5 7.5 38.5 11 41 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M59 5.5 C61.5 7.5 61.5 11 59 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><line x1="50" y1="9" x2="50" y2="12" stroke="#7c3aed" strokeWidth="0.6" opacity="0.4"/><path d="M45 17 L44 31 L56 31 L55 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M44 31 Q38 27 27 34" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M56 31 Q62 27 73 34" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M44 31 C37 31 27 34 25 41 C23 50 24 65 25 78 C26 88 27 100 29 113 C30 123 31 130 32 136 L44 136 L44 119 L56 119 L56 136 L68 136 C69 130 70 123 71 113 C73 100 74 88 75 78 C76 65 77 50 75 41 C73 34 63 31 56 31 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1.3"/><line x1="50" y1="32" x2="50" y2="95" stroke="#7c3aed" strokeWidth="0.7" strokeDasharray="2.5,2" opacity="0.5"/><circle cx="50" cy="99" r="1.4" fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"/><path d="M25 41 C20 45 17 57 17 70 L17 75 Q17 79 20 80 L25 80 Q27 79 27 75 L26 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M17 75 C15 80 14 88 14 97 Q14 100 17 101 L24 101 Q27 100 27 97 L27 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M14 97 C12 103 12 112 14 119 Q15 121 19 121 L24 121 Q27 120 27 117 L27 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><line x1="11" y1="119" x2="10" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><line x1="14" y1="119" x2="13" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><line x1="17" y1="119" x2="16" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><line x1="20" y1="119" x2="19" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><path d="M75 41 C80 45 83 57 83 70 L83 75 Q83 79 80 80 L75 80 Q73 79 73 75 L74 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M83 75 C85 80 86 88 86 97 Q86 100 83 101 L76 101 Q73 100 73 97 L73 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M86 97 C88 103 88 112 86 119 Q85 121 81 121 L76 121 Q73 120 73 117 L73 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 136 C31 141 32 149 37 150 L44 150 L56 150 L63 150 C68 149 69 141 68 136 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1"/><path d="M32 149 C30 154 30 163 31 172 Q32 174 37 174 L44 174 Q46 173 46 171 L44 149 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="39" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 187 C31 193 31 200 32 205 Q33 207 38 207 L44 207 Q46 206 46 204 L46 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 205 L32 212 Q31 219 40 219 L47 219 Q48 218 47 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 215 Q30 219 35 219" fill="none" stroke="#7c3aed" strokeWidth="0.7"/><path d="M68 149 C70 154 70 163 69 172 Q68 174 63 174 L56 174 Q54 173 54 171 L56 149 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="61" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 187 C69 193 69 200 68 205 Q67 207 62 207 L56 207 Q54 206 54 204 L54 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 205 L68 212 Q69 219 60 219 L53 219 Q52 218 53 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 215 Q70 219 65 219" fill="none" stroke="#7c3aed" strokeWidth="0.7"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">ANTERIOR</text>
          </g>
          <g transform="translate(100,0)"><ellipse cx="48" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M57 5.5 C59.5 7.5 59.5 11 57 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M57 7 Q60 9 57 11" fill="none" stroke="#7c3aed" strokeWidth="0.8"/><path d="M47 17 L46 31 L54 31 L52 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M46 31 C42 31 36 34 34 42 C32 52 33 68 34 82 C35 95 36 108 37 120 C38 130 39 136 40 145 L60 145 C61 136 62 128 63 118 C64 106 65 92 66 80 C67 66 67 50 65 41 C63 34 56 31 52 31 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1.3"/><path d="M34 46 C31 52 31 60 34 66" fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"/><path d="M65 41 C70 45 72 57 72 70 L72 75 Q72 79 69 80 L66 79 Q65 78 65 75 L64 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M72 75 C73 81 74 88 74 97 Q74 100 71 101 L66 101 Q65 100 65 97 L65 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M74 97 C75 103 75 112 73 119 Q72 121 69 121 L65 121 Q64 120 64 117 L65 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M40 140 C35 144 32 152 33 160 Q35 165 40 164 L48 162 L48 140 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1"/><path d="M40 162 C38 167 37 175 38 180 Q39 175 48 174 L50 149 L44 148 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="44" cy="180" rx="7" ry="7.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M38 187 C37 193 38 201 39 205 Q41 207 46 207 L52 207 Q54 206 54 204 L52 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M39 205 L37 212 Q36 219 46 219 L57 219 Q60 219 58 215 L54 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M37 212 Q35 219 38 219" fill="none" stroke="#7c3aed" strokeWidth="0.8"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">LEFT LAT</text>
          </g>
          <g transform="translate(200,0)"><ellipse cx="52" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M43 5.5 C40.5 7.5 40.5 11 43 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M43 7 Q40 9 43 11" fill="none" stroke="#7c3aed" strokeWidth="0.8"/><path d="M53 17 L54 31 L46 31 L48 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M54 31 C58 31 64 34 66 42 C68 52 67 68 66 82 C65 95 64 108 63 120 C62 130 61 136 60 145 L40 145 C39 136 38 128 37 118 C36 106 35 92 34 80 C33 66 33 50 35 41 C37 34 44 31 48 31 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1.3"/><path d="M66 46 C69 52 69 60 66 66" fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"/><path d="M35 41 C30 45 28 57 28 70 L28 75 Q28 79 31 80 L34 79 Q35 78 35 75 L36 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M28 75 C27 81 26 88 26 97 Q26 100 29 101 L34 101 Q35 100 35 97 L35 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M26 97 C25 103 25 112 27 119 Q28 121 31 121 L35 121 Q36 120 36 117 L35 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M60 140 C65 144 68 152 67 160 Q65 165 60 164 L52 162 L52 140 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1"/><path d="M60 162 C62 167 63 175 62 180 Q61 175 52 174 L50 149 L56 148 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="56" cy="180" rx="7" ry="7.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M62 187 C63 193 62 201 61 205 Q59 207 54 207 L48 207 Q46 206 46 204 L48 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M61 205 L63 212 Q64 219 54 219 L43 219 Q40 219 42 215 L46 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M63 212 Q65 219 62 219" fill="none" stroke="#7c3aed" strokeWidth="0.8"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">RIGHT LAT</text>
          </g>
          <g transform="translate(300,0)"><ellipse cx="50" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M41 5.5 C38.5 7.5 38.5 11 41 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M59 5.5 C61.5 7.5 61.5 11 59 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><line x1="50" y1="9" x2="50" y2="12" stroke="#7c3aed" strokeWidth="0.6" opacity="0.4"/><path d="M45 17 L44 31 L56 31 L55 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M44 31 Q38 27 28 33 Q24 37 26 40" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M56 31 Q62 27 72 33 Q76 37 74 40" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M44 31 C37 31 27 34 25 41 C23 50 24 65 25 78 C26 88 27 100 29 113 C30 123 31 130 32 136 L44 136 L44 119 L56 119 L56 136 L68 136 C69 130 70 123 71 113 C73 100 74 88 75 78 C76 65 77 50 75 41 C73 34 63 31 56 31 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1.3"/><line x1="50" y1="32" x2="50" y2="136" stroke="#7c3aed" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6"/><path d="M30 38 Q27 50 30 57 Q34 60 38 57 Q41 51 39 39 Z" fill="transparent" stroke="#7c3aed" strokeWidth="0.9"/><path d="M70 38 Q73 50 70 57 Q66 60 62 57 Q59 51 61 39 Z" fill="transparent" stroke="#7c3aed" strokeWidth="0.9"/><path d="M25 41 C20 45 17 57 17 70 L17 75 Q17 79 20 80 L25 80 Q27 79 27 75 L26 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M17 75 C15 80 14 88 14 97 Q14 100 17 101 L24 101 Q27 100 27 97 L27 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M14 97 C12 103 12 112 14 119 Q15 121 19 121 L24 121 Q27 120 27 117 L27 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M75 41 C80 45 83 57 83 70 L83 75 Q83 79 80 80 L75 80 Q73 79 73 75 L74 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M83 75 C85 80 86 88 86 97 Q86 100 83 101 L76 101 Q73 100 73 97 L73 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M86 97 C88 103 88 112 86 119 Q85 121 81 121 L76 121 Q73 120 73 117 L73 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 130 C28 138 27 148 31 155 Q35 160 42 158 L50 156 L58 158 Q65 160 69 155 C73 148 72 138 68 130 Z" fill="transparent" stroke="#7c3aed" strokeWidth="1.1"/><line x1="50" y1="136" x2="50" y2="156" stroke="#7c3aed" strokeWidth="0.7" opacity="0.5"/><path d="M31 155 C29 161 29 168 30 172 Q31 174 37 174 L44 174 Q46 173 46 171 L44 149 C41 148 35 150 31 155 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="39" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 187 C31 193 31 200 32 205 Q33 207 38 207 L44 207 Q46 206 46 204 L46 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 205 L32 212 Q31 219 40 219 L47 219 Q48 218 47 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M69 155 C71 161 71 168 70 172 Q69 174 63 174 L56 174 Q54 173 54 171 L56 149 C59 148 65 150 69 155 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="61" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 187 C69 193 69 200 68 205 Q67 207 62 207 L56 207 Q54 206 54 204 L54 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 205 L68 212 Q69 219 60 219 L53 219 Q52 218 53 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">POSTERIOR</text>
          </g>
          <line x1="100" y1="0" x2="100" y2="218" stroke="#E0E0E2" strokeWidth="0.5"/>
          <line x1="200" y1="0" x2="200" y2="218" stroke="#E0E0E2" strokeWidth="0.5"/>
          <line x1="300" y1="0" x2="300" y2="218" stroke="#E0E0E2" strokeWidth="0.5"/>
        </svg>



        {/* Markers SVG overlay */}
        <svg style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }}
          viewBox="0 0 100 100" preserveAspectRatio="none">
          {markers.map(m => {
            const t = SYMPTOM_TYPES.find(x => x.id === m.type) || SYMPTOM_TYPES[0];
            return (
              <g key={m.id}>
                <circle cx={m.x} cy={m.y} r="2.2" fill={t.color} opacity="0.92"
                  stroke="white" strokeWidth="0.5"/>
                <text x={m.x} y={m.y+0.9} textAnchor="middle" fontSize="2.2"
                  fontWeight="bold" fill="white" style={{pointerEvents:"none"}}>{t.symbol}</text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip on click */}
        {tooltip && (
          <div style={{
            position:"absolute",
            left:`${Math.min(tooltip.x, 75)}%`,
            top:`${Math.max(tooltip.y - 12, 2)}%`,
            background:"rgba(0,0,0,0.85)",
            color:"#fff", padding:"4px 9px", borderRadius:8,
            fontSize:"0.75rem", fontWeight:700, whiteSpace:"nowrap",
            pointerEvents:"none", zIndex:10,
            border:`1px solid ${activeType?.color}`,
          }}>
            {activeType?.symbol} {tooltip.region}
          </div>
        )}
      </div>

      {/* Marker list */}
      {markers.length > 0 && (
        <div style={{ marginTop:10 }}>
          <div style={{ fontSize:"0.82rem", fontWeight:700, color:"#6B7280",
            textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>
            Marked areas ({markers.length})
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {markers.map(m => {
              const t = SYMPTOM_TYPES.find(x => x.id === m.type) || SYMPTOM_TYPES[0];
              return (
                <div key={m.id}
                  onClick={() => set("body_chart", markers.filter(x => x.id !== m.id))}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px",
                    borderRadius:20, background:t.bg, border:`1px solid ${t.color}40`,
                    fontSize:"0.78rem", fontWeight:600, color:t.color, cursor:"pointer" }}>
                  <span>{t.symbol}</span>
                  <span style={{color:"#374151"}}>{m.region}</span>
                  <span style={{color:"#9CA3AF",fontSize:"0.75rem"}}>✕</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}



function getBodyRegion(xPct, yPct, view) {
  // 260-wide layout: arms at x≈20-34% and 65-80%, legs at x≈34-50% and 50-65%
  const isLeftArm  = xPct < 34;
  const isRightArm = xPct > 66;
  const isLeftBody = xPct >= 34 && xPct < 50;
  const isRightBody= xPct >= 50 && xPct <= 66;
  const isLeft     = xPct < 50;
  const isRight    = xPct > 50;
  if (yPct < 11) return "Head";
  if (yPct < 20) return "Neck";
  if (yPct < 29) {
    if (isLeftArm)  return "Left Shoulder";
    if (isRightArm) return "Right Shoulder";
    return view === "anterior" ? "Upper Chest" : "Upper Thoracic Spine";
  }
  if (yPct < 36) {
    if (isLeftArm)  return "Left Upper Arm";
    if (isRightArm) return "Right Upper Arm";
    return view === "anterior" ? "Chest / Ribs" : "Mid Thoracic Spine";
  }
  if (yPct < 42) {
    if (isLeftArm)  return "Left Upper Arm";
    if (isRightArm) return "Right Upper Arm";
    return view === "anterior" ? "Lower Chest / Ribs" : "Lower Thoracic Spine";
  }
  if (yPct < 55) {
    if (isLeftArm)  return "Left Forearm";
    if (isRightArm) return "Right Forearm";
    return view === "anterior" ? "Abdomen" : "Lumbar Spine";
  }
  if (yPct < 60) {
    if (isLeftArm)  return "Left Hand / Wrist";
    if (isRightArm) return "Right Hand / Wrist";
    if (isLeftBody)  return view === "anterior" ? "Left Groin" : "Left SIJ / Sacrum";
    if (isRightBody) return view === "anterior" ? "Right Groin" : "Right SIJ / Sacrum";
    return view === "anterior" ? "Lower Abdomen" : "Sacrum";
  }
  if (yPct < 66) {
    if (isLeft)  return "Left Hip";
    if (isRight) return "Right Hip";
    return view === "anterior" ? "Pelvis" : "Gluteal";
  }
  if (yPct < 78) return isLeft ? "Left Thigh" : "Right Thigh";
  if (yPct < 84) return isLeft ? "Left Knee"  : "Right Knee";
  if (yPct < 94) return isLeft ? "Left Calf"  : "Right Calf";
  return isLeft ? "Left Ankle / Foot" : "Right Ankle / Foot";
}

const BODY_SVG_PATHS = {
  anterior: '<g fill="#F2E4D5" stroke="#C09070" stroke-width="1.5" stroke-linejoin="round"><ellipse cx="130" cy="32" rx="24" ry="27"/><rect x="119" y="57" width="22" height="20" rx="4"/><path d="M100,78 C76,80 60,96 56,110 L100,110Z"/><path d="M160,78 C184,80 200,96 204,110 L160,110Z"/><rect x="100" y="78" width="60" height="88" rx="8"/><rect x="52" y="86" width="28" height="58" rx="12"/><rect x="54" y="146" width="24" height="55" rx="10"/><ellipse cx="66" cy="213" rx="13" ry="13"/><rect x="180" y="86" width="28" height="58" rx="12"/><rect x="182" y="146" width="24" height="55" rx="10"/><ellipse cx="194" cy="213" rx="13" ry="13"/><path d="M100,166 C92,184 90,206 91,212 L169,212 C170,206 168,184 160,166Z"/><rect x="89" y="212" width="34" height="72" rx="14"/><ellipse cx="106" cy="288" rx="16" ry="9"/><rect x="91" y="295" width="28" height="62" rx="11"/><path d="M89,357 C87,365 91,370 96,372 L112,370 C115,366 113,360 111,357Z"/><rect x="137" y="212" width="34" height="72" rx="14"/><ellipse cx="154" cy="288" rx="16" ry="9"/><rect x="141" y="295" width="28" height="62" rx="11"/><path d="M171,357 C169,360 167,366 170,370 L186,372 C191,370 193,365 171,357Z"/></g>',
  posterior: '<g fill="#E8D5C4" stroke="#C09070" stroke-width="1.5" stroke-linejoin="round"><ellipse cx="130" cy="32" rx="24" ry="27"/><rect x="119" y="57" width="22" height="20" rx="4"/><path d="M100,78 C76,80 60,96 56,110 L100,110Z"/><path d="M160,78 C184,80 200,96 204,110 L160,110Z"/><rect x="100" y="78" width="60" height="88" rx="8"/><line x1="130" y1="80" x2="130" y2="163" stroke="#A07050" stroke-width="1.2" stroke-dasharray="3,2.5"/><rect x="52" y="86" width="28" height="58" rx="12"/><rect x="54" y="146" width="24" height="55" rx="10"/><ellipse cx="66" cy="213" rx="13" ry="13"/><rect x="180" y="86" width="28" height="58" rx="12"/><rect x="182" y="146" width="24" height="55" rx="10"/><ellipse cx="194" cy="213" rx="13" ry="13"/><path d="M100,166 C92,184 90,206 91,212 L169,212 C170,206 168,184 160,166Z"/><rect x="89" y="212" width="34" height="72" rx="14"/><ellipse cx="106" cy="288" rx="16" ry="9"/><rect x="91" y="295" width="28" height="62" rx="11"/><path d="M89,357 C87,365 91,370 96,372 L112,370 C115,366 113,360 111,357Z"/><rect x="137" y="212" width="34" height="72" rx="14"/><ellipse cx="154" cy="288" rx="16" ry="9"/><rect x="141" y="295" width="28" height="62" rx="11"/><path d="M171,357 C169,360 167,366 170,370 L186,372 C191,370 193,365 171,357Z"/></g>',
};

function BodyChartWidget({ data, set, compact = false }) {
  const PC = typeof getC === "function" ? getC() : { surface:"#ffffff", s2:"#FFFFFF", border:"#E0E0E2", accent:"#7c3aed", text:"#0D0D0D", muted:"#6B6B6B", isDark:false };
  const { useState, useRef, useCallback } = React;
  const markers = Array.isArray(data.body_chart) ? data.body_chart : [];
  const [view, setView] = useState("anterior");
  const [activeType, setActiveType] = useState("pain");
  const [hovered, setHovered] = useState(null);
  const svgRef = useRef(null);
  const SVG_W = 260, SVG_H = 390;
  const DISPLAY_W = compact ? 90 : 148;
  const DISPLAY_H = DISPLAY_W * (SVG_H / SVG_W);

  const handleClick = useCallback((e) => {
    if (compact) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * SVG_W;
    const y = ((e.clientY - rect.top) / rect.height) * SVG_H;
    const existing = markers.find(m => m.view === view && Math.abs(m.x - x) < 12 && Math.abs(m.y - y) < 12);
    if (existing) { set("body_chart", markers.filter(m => m.id !== existing.id)); return; }
    const xPct = (x / SVG_W) * 100, yPct = (y / SVG_H) * 100;
    const region = getBodyRegion(xPct, yPct, view);
    set("body_chart", [...markers, { id: Date.now().toString(36), x, y, view, type: activeType, region, timestamp: new Date().toISOString() }]);
  }, [markers, view, activeType, compact, set]);

  const currentMarkers = markers.filter(m => m.view === view);

  const BodySVG = ({ v, w, h, interactive }) => (
    <div style={{ position:"relative", width:w, height:h, flexShrink:0 }}>
      <svg ref={interactive ? svgRef : null} viewBox={`0 0 ${SVG_W} ${SVG_H}`} width={w} height={h}
        style={{ display:"block", cursor: interactive ? "crosshair" : "default" }}
        onClick={interactive ? handleClick : undefined}
        dangerouslySetInnerHTML={{ __html: BODY_SVG_PATHS[v] }}/>
      {markers.filter(m => m.view === v).map(m => {
        const pt = BODY_PAIN_TYPES.find(p => p.id === m.type) || BODY_PAIN_TYPES[0];
        const cx = (m.x / SVG_W) * w, cy = (m.y / SVG_H) * h;
        return (
          <div key={m.id}
            onMouseEnter={() => setHovered(m.id)} onMouseLeave={() => setHovered(null)}
            onClick={interactive ? (e) => { e.stopPropagation(); set("body_chart", markers.filter(x => x.id !== m.id)); } : undefined}
            style={{ position:"absolute", left:cx, top:cy,
              width: compact ? 9 : 18, height: compact ? 9 : 18, borderRadius:"50%",
              background:pt.color, border:`${compact?1.5:2}px solid white`,
              boxShadow:`0 0 ${compact?4:8}px ${pt.color}90`,
              display:"flex", alignItems:"center", justifyContent:"center",
              cursor: interactive ? "pointer" : "default", zIndex:10,
              transition:"transform 0.15s",
              transform: hovered === m.id ? "translate(-50%,-50%) scale(1.4)" : "translate(-50%,-50%)" }}>
            {!compact && <span style={{ fontSize:7, color:"white", fontWeight:900, lineHeight:1 }}>{pt.symbol}</span>}
          </div>
        );
      })}
    </div>
  );

  if (compact) {
    if (markers.length === 0) return (
      <div style={{ padding:"10px 0", color:PC.muted, fontSize:"0.78rem", textAlign:"center" }}>No pain areas marked</div>
    );
    return (
      <div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          {["anterior","posterior"].map(v => (
            <div key={v} style={{ textAlign:"center" }}>
              <div style={{ fontSize:"0.78rem", color:PC.muted, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:3 }}>{v==="anterior"?"Front":"Back"}</div>
              <BodySVG v={v} w={DISPLAY_W} h={DISPLAY_H} interactive={false}/>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:8, justifyContent:"center" }}>
          {[...new Set(markers.map(m => JSON.stringify({r:m.region, t:m.type})))].map((key,i) => {
            const { r, t } = JSON.parse(key);
            const pt = BODY_PAIN_TYPES.find(p => p.id === t) || BODY_PAIN_TYPES[0];
            return <span key={i} style={{ padding:"2px 8px", borderRadius:20, background:pt.bg, border:`1px solid ${pt.color}40`, fontSize:"0.8rem", fontWeight:700, color:pt.color }}>{pt.label}: {r}</span>;
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{ background:PC.surface, border:`1px solid ${PC.border}`, borderRadius:16, overflow:"hidden", marginBottom:16 }}>
      <div style={{ padding:"14px 16px 10px", background:`${PC.accent}08`, borderBottom:`1px solid ${PC.border}` }}>
        <div style={{ fontSize:"0.8rem", fontWeight:800, color:PC.text, marginBottom:2 }}>🗺️ Body Chart</div>
        <div style={{ fontSize:"0.82rem", color:PC.muted }}>Select a pain type, then tap the body to mark location. Tap an existing marker to remove it.</div>
      </div>
      <div style={{ display:"flex" }}>
        <div style={{ padding:"14px 10px 14px 14px", borderRight:`1px solid ${PC.border}` }}>
          <div style={{ display:"flex", gap:5, marginBottom:10 }}>
            {["anterior","posterior"].map(v => (
              <button key={v} onClick={() => setView(v)} style={{ flex:1, padding:"5px 8px", borderRadius:7, border:`1.5px solid ${view===v?PC.accent:PC.border}`, background:view===v?`${PC.accent}15`:"transparent", color:view===v?PC.accent:PC.muted, fontSize:"0.8rem", fontWeight:800, cursor:"pointer", textTransform:"uppercase", letterSpacing:"0.5px" }}>
                {v === "anterior" ? "Front" : "Back"}
              </button>
            ))}
          </div>
          <BodySVG v={view} w={DISPLAY_W} h={DISPLAY_H} interactive={true}/>
        </div>
        <div style={{ flex:1, padding:"14px 14px 14px 12px", display:"flex", flexDirection:"column", gap:10 }}>
          <div>
            <div style={{ fontSize:"0.8rem", fontWeight:700, color:PC.muted, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:7 }}>Mark type</div>
            <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
              {BODY_PAIN_TYPES.map(pt => (
                <button key={pt.id} onClick={() => setActiveType(pt.id)} style={{ display:"flex", alignItems:"center", gap:9, padding:"7px 10px", borderRadius:9, border:`1.5px solid ${activeType===pt.id?pt.color:PC.border}`, background:activeType===pt.id?pt.bg:"transparent", cursor:"pointer" }}>
                  <div style={{ width:20, height:20, borderRadius:"50%", background:pt.color, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                    <span style={{ fontSize:8, color:"white", fontWeight:900 }}>{pt.symbol}</span>
                  </div>
                  <span style={{ fontSize:"0.8rem", fontWeight:activeType===pt.id?800:500, color:activeType===pt.id?pt.color:PC.muted }}>{pt.label}</span>
                  {activeType===pt.id && <span style={{ marginLeft:"auto", fontSize:"0.78rem", color:pt.color, fontWeight:700 }}>● Active</span>}
                </button>
              ))}
            </div>
          </div>
          {currentMarkers.length > 0 && (
            <div style={{ flex:1 }}>
              <div style={{ fontSize:"0.8rem", fontWeight:700, color:PC.muted, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>Marked — {view==="anterior"?"Front":"Back"} ({currentMarkers.length})</div>
              <div style={{ display:"flex", flexDirection:"column", gap:4, maxHeight:160, overflowY:"auto" }}>
                {currentMarkers.map(m => {
                  const pt = BODY_PAIN_TYPES.find(p => p.id === m.type) || BODY_PAIN_TYPES[0];
                  return (
                    <div key={m.id} style={{ display:"flex", alignItems:"center", gap:6, padding:"5px 9px", background:pt.bg, borderRadius:8, border:`1px solid ${pt.color}35` }}>
                      <div style={{ width:10, height:10, borderRadius:"50%", background:pt.color, flexShrink:0 }}/>
                      <span style={{ fontSize:"0.64rem", color:PC.text, flex:1, lineHeight:1.3 }}>{m.region}</span>
                      <button onClick={() => set("body_chart", markers.filter(x => x.id !== m.id))}
                        style={{ background:"none", border:"none", color:PC.muted, cursor:"pointer", fontSize:11, padding:0, flexShrink:0, lineHeight:1 }}>✕</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {currentMarkers.length === 0 && (
            <div style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ textAlign:"center", color:PC.muted, fontSize:"0.78rem", lineHeight:1.7 }}>
                No areas marked<br/>
                <span style={{ fontSize:"0.8rem" }}>Select a type then tap the body diagram</span>
              </div>
            </div>
          )}
        </div>
      </div>
      {markers.length > 0 && (
        <div style={{ borderTop:`1px solid ${PC.border}`, padding:"10px 14px", background:PC.s2||"#FFFFFF" }}>
          <div style={{ fontSize:"0.8rem", fontWeight:700, color:PC.muted, textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6 }}>All marked regions</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {markers.map(m => {
              const pt = BODY_PAIN_TYPES.find(p => p.id === m.type) || BODY_PAIN_TYPES[0];
              return <span key={m.id} style={{ padding:"3px 10px", borderRadius:20, background:pt.bg, border:`1px solid ${pt.color}45`, fontSize:"0.82rem", fontWeight:700, color:pt.color }}>{pt.label}: {m.region}</span>;
            })}
            <button onClick={() => set("body_chart", [])} style={{ padding:"3px 10px", borderRadius:20, background:"transparent", border:`1px solid ${PC.border}`, fontSize:"0.82rem", color:PC.muted, cursor:"pointer" }}>Clear all</button>
          </div>
        </div>
      )}
    </div>
  );
}


// Special test ID → proper clinical name lookup
const SPECIAL_TEST_NAMES = {
  st_spurling:"Spurling's Test",st_distraction:"Cervical Distraction",st_sharp_purser:"Sharp-Purser Test",
  st_vbi:"VBI / 3-Part Test",st_alar:"Alar Ligament Test",st_flex_rot:"Flexion-Rotation Test",
  st_jackson:"Jackson's Compression",st_cervical_rotation_lt:"Cervical Rotation-Lateral Flexion",
  st_axial_loading:"Axial Loading Test",st_neer:"Neer's Test",st_hawkins:"Hawkins-Kennedy Test",
  st_empty_can:"Empty Can / Jobe Test",st_full_can:"Full Can Test",st_lift_off:"Lift-Off Test",
  st_belly_press:"Belly Press Test",st_bear_hug:"Bear Hug Test",st_er_lag:"ER Lag Sign",
  st_hornblower:"Hornblower's Sign",st_obrien:"O'Brien's Test",st_speeds:"Speed's Test",
  st_yergason:"Yergason's Test",st_apprehension:"Apprehension Test",st_relocation:"Relocation Test",
  st_sulcus:"Sulcus Sign",st_acromioclavicular:"AC Paxinos Test",st_cross_arm:"Cross-Arm Test",
  st_scapular_dyskinesis:"Scapular Dyskinesis",st_kibler_slide:"Lateral Scapular Slide",
  st_cozens:"Cozen's Test",st_mills:"Mill's Test",st_golfers:"Golfer's Elbow Test",
  st_valgus_stress_elbow:"Elbow Valgus Stress",st_tinel_elbow:"Tinel's — Elbow",
  st_phalen:"Phalen's Test",st_tinel_wrist:"Tinel's — Wrist",st_finkelstein:"Finkelstein's Test",
  st_watson:"Watson Scaphoid Shift",st_grind:"Grind Test",st_slr_test:"SLR Test",
  st_prone_instab:"Prone Instability Test",st_stork:"Stork Test",st_kemp:"Kemp's Test",
  st_adams:"Adam's Forward Bend",st_si_distraction:"SI Distraction",st_si_compression:"SI Compression",
  st_gaenslen:"Gaenslen's Test",st_thigh_thrust:"Thigh Thrust",st_lateral_shift:"Lateral Shift Test",
  st_faber_test:"FABER / Patrick's",st_fadir_test:"FADIR Test",st_hip_scour:"Hip Scour",
  st_trendelenburg_test:"Trendelenburg Test",st_thomas_test:"Thomas Test",st_ober_test:"Ober's Test",
  st_piriformis_test:"Piriformis Test",st_90_90:"90-90 Hamstring",st_lachmans:"Lachman's Test",
  st_anterior_drawer:"Anterior Drawer",st_posterior_drawer:"Posterior Drawer",st_pivot_shift:"Pivot Shift",
  st_valgus_stress_knee:"Knee Valgus Stress",st_varus_stress_knee:"Knee Varus Stress",
  st_mcmurray_test:"McMurray's Test",st_apley:"Apley's Grind",st_thessaly:"Thessaly Test",
  st_clarkes:"Clarke's Sign",st_patellar_grind:"Patellar Grind",st_effusion:"Sweep / Ballottement",
  st_noble:"Noble Compression",st_ant_drawer_ankle:"Ankle Anterior Drawer",st_talar_tilt:"Talar Tilt",
  st_squeeze_ankle:"Squeeze / Mortise Test",st_thompson_test:"Thompson's Test",
  st_windlass_test:"Windlass Test",st_navicular_drop:"Navicular Drop",st_tinel_ankle:"Tinel's — Ankle",
  st_royal_london:"Royal London Test",st_slump_test:"Slump Test",
  st_ultt1:"ULTT1 — Median Nerve",st_ultt2:"ULTT2 — Radial Nerve",
};
function stName(key) {
  const base = key.replace(/_L$|_R$|_left$|_right$/i,"");
  const side = key.match(/_L$|_left$/i) ? " (L)" : key.match(/_R$|_right$/i) ? " (R)" : "";
  // ST_DATA_LABELS (real source, same as SOAP) checked first -- SPECIAL_TEST_NAMES
  // is a separate hand-copied map with the same staleness risk already found
  // and fixed once for the SOAP builder (57 of 89 real tests were missing).
  return (ST_DATA_LABELS[base] || SPECIAL_TEST_NAMES[base] || base.replace(/^st_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())) + side;
}

function QuickNotesWidget({ d, patient, onSaveField, C }) {
  const [noteText, setNoteText] = React.useState("");
  const notes = Array.isArray(d.quick_notes) ? d.quick_notes : [];
  const addNote = () => {
    if (!noteText.trim()) return;
    const entry = {
      id: Date.now().toString(36),
      text: noteText.trim(),
      ts: new Date().toISOString(),
      display: new Date().toLocaleString("en-AU", {day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}),
    };
    if (typeof onSaveField === "function") onSaveField(patient.id, { quick_notes: [...notes, entry] });
    setNoteText("");
  };
  return (
    <div>
      <div style={{display:"flex",gap:8,marginBottom:10}}>
        <input value={noteText} onChange={e=>setNoteText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&addNote()}
          placeholder="Add a note, reminder or observation…"
          style={{flex:1,padding:"9px 12px",borderRadius:9,border:`1px solid ${C.border2}`,fontSize:12,fontFamily:"inherit",outline:"none",color:C.text,background:"#F9FAFB"}}/>
        <button onClick={addNote} style={{padding:"9px 16px",background:C.primary,border:"none",borderRadius:9,color:"white",fontWeight:800,fontSize:12,cursor:"pointer",flexShrink:0}}>+ Add</button>
      </div>
      {notes.length > 0 ? [...notes].reverse().slice(0,6).map((n,i) => (
        <div key={n.id||i} style={{display:"flex",gap:10,padding:"8px 10px",background:"#F9FAFB",borderRadius:9,border:`1px solid ${C.border}`,marginBottom:5}}>
          <div style={{flex:1}}>
            <div style={{fontSize:10,color:C.muted,marginBottom:2}}>{n.display}</div>
            <div style={{fontSize:12,color:C.text,lineHeight:1.5}}>{n.text}</div>
          </div>
          <button onClick={()=>typeof onSaveField==="function"&&onSaveField(patient.id,{quick_notes:notes.filter(x=>x.id!==n.id)})}
            style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:13,flexShrink:0,padding:0,alignSelf:"flex-start"}}>✕</button>
        </div>
      )) : (
        <div style={{textAlign:"center",padding:"10px 0",color:C.muted,fontSize:12}}>No notes yet — type above and press Enter</div>
      )}
    </div>
  );
}

// ─── PATIENT PROFILE MODAL ─────────────────────────────────────────────────────

// ROM key → {label, normal}
// ROM normals — updated 2026-06-21
const ROM_LABEL_MAP = {
  "rom_cflex":{l:"Cervical Flexion",n:45},"rom_cext":{l:"Cervical Extension",n:45},
  "rom_clatl":{l:"Cervical Lat Flex L",n:45},"rom_clatr":{l:"Cervical Lat Flex R",n:45},
  "rom_crotl":{l:"Cervical Rotation L",n:60},"rom_crotr":{l:"Cervical Rotation R",n:60},
  "rom_thflex":{l:"Thoracic Flexion",n:50},"rom_thext":{l:"Thoracic Extension",n:25},
  "rom_throtl":{l:"Thoracic Rotation L",n:35},"rom_throtr":{l:"Thoracic Rotation R",n:35},
  "rom_lflex":{l:"Lumbar Flexion",n:60},"rom_lext":{l:"Lumbar Extension",n:25},
  "rom_llfl":{l:"Lumbar Lat Flex L",n:25},"rom_llfr":{l:"Lumbar Lat Flex R",n:25},
  "rom_lrotl":{l:"Lumbar Rotation L",n:30},"rom_lrotr":{l:"Lumbar Rotation R",n:30},
  "rom_sflex":{l:"Shoulder Flexion",n:180},"rom_sext":{l:"Shoulder Extension",n:60},
  "rom_sabd":{l:"Shoulder Abduction",n:180},"rom_sadd":{l:"Shoulder Adduction",n:30},
  "rom_ser":{l:"Shoulder ER",n:90},"rom_sir":{l:"Shoulder IR",n:70},
  "rom_eflex":{l:"Elbow Flexion",n:145},"rom_eext":{l:"Elbow Extension",n:0},
  "rom_esup":{l:"Supination",n:90},"rom_epro":{l:"Pronation",n:90},
  "rom_wflex":{l:"Wrist Flexion",n:80},"rom_wext":{l:"Wrist Extension",n:70},
  "rom_wrad":{l:"Radial Deviation",n:20},"rom_wuln":{l:"Ulnar Deviation",n:30},
  "rom_hflex":{l:"Hip Flexion",n:120},"rom_hext":{l:"Hip Extension",n:20},
  "rom_habd":{l:"Hip Abduction",n:45},"rom_hadd":{l:"Hip Adduction",n:30},
  "rom_her":{l:"Hip ER",n:45},"rom_hir":{l:"Hip IR",n:45},
  "rom_kflex":{l:"Knee Flexion",n:140},"rom_kext":{l:"Knee Extension",n:0},
  "rom_adf":{l:"Dorsiflexion",n:20},"rom_apf":{l:"Plantarflexion",n:50},
  "rom_ainv":{l:"Inversion",n:35},"rom_aev":{l:"Eversion",n:15},
  "rom_topen":{l:"Mouth Opening",n:45},
};
// MMT key → muscle name
const MMT_LABEL_MAP = {
  "mmt_scm":"SCM","mmt_dnf":"Deep Neck Flexors","mmt_trap_u":"Upper Trapezius","mmt_trap_m":"Mid Trapezius","mmt_trap_l":"Lower Trapezius",
  "mmt_levsc":"Levator Scapulae","mmt_scalenes":"Scalenes","mmt_rhomb":"Rhomboids",
  "mmt_deltA":"Ant Deltoid","mmt_deltM":"Mid Deltoid","mmt_deltP":"Post Deltoid",
  "mmt_supra":"Supraspinatus","mmt_infra":"Infraspinatus","mmt_subscap":"Subscapularis","mmt_tmin":"Teres Minor","mmt_tmaj":"Teres Major",
  "mmt_lat":"Lat Dorsi","mmt_pec_maj_c":"Pec Major (clav)","mmt_pec_maj_s":"Pec Major (stern)","mmt_pec_min":"Pec Minor","mmt_serrant":"Serratus Anterior",
  "mmt_bicep":"Biceps","mmt_tricep":"Triceps","mmt_brach":"Brachialis","mmt_brachio":"Brachioradialis",
  "mmt_corbrach":"Coracobrachialis","mmt_supinator":"Supinator","mmt_pt":"Pronator Teres",
  "mmt_glmax":"Glute Max","mmt_glmed":"Glute Med","mmt_glmin":"Glute Min","mmt_tfl":"TFL",
  "mmt_iliop":"Iliopsoas","mmt_rectfem":"Rectus Femoris","mmt_hams":"Hamstrings",
  "mmt_quads":"Quadriceps","mmt_adduct":"Adductors","mmt_ta":"Tibialis Anterior",
  "mmt_gastroc":"Gastrocnemius","mmt_soleus":"Soleus","mmt_pero":"Peroneals",
  "mmt_multif":"Multifidus","mmt_erect":"Erector Spinae","mmt_transab":"Transversus Abdominis",
  "mmt_rectab":"Rectus Abdominis","mmt_obliq":"Obliques",
};
// Kinetic chain test id → label (mirrors KC_IDS in ClinicalModules)
const KC_LABELS={kc_ankle_df:"Ankle DF Lunge Test",kc_subtalar:"Subtalar Mobility",kc_great_toe:"1st MTP Extension",kc_knee_stability:"Knee Valgus Stress",kc_patellar_mobility:"Patellar Mobility",kc_tibiofemoral_rot:"Tibial Rotation",kc_hip_ir_mob:"Hip IR Mobility",kc_hip_ext_mob:"Hip Ext — Thomas Test",kc_hip_er_mob:"Hip ER Mobility",kc_hip_abd_mob:"Hip Abd Mobility",kc_lumbar_stability:"Lumbar Stability",kc_lumbar_flexion_ctrl:"Lumbar Flex Control",kc_lumbar_rotation_ctrl:"Lumbar Rot Control",kc_thoracic_rotation:"Thoracic Rotation",kc_thoracic_extension:"Thoracic Extension",kc_rib_mobility:"Rib Cage Mobility",kc_scapulohumeral_rhythm:"Scapulohumeral Rhythm",kc_gh_ir_mob:"GH IR — GIRD",kc_cervical_thoracic_jct:"CT Junction",kc_cervical_rot_mob:"Cervical Rotation",kc_cervical_flex_ext:"Cervical Flex/Ext"};
// Authoritative MMT id → {name, root} built from the MMT module's own database
const MMT_INFO={};
try{ Object.values(MMT_DATA).forEach(arr=>arr.forEach(m=>{ if(m&&m.id) MMT_INFO[m.id]={name:String(m.muscle||"").replace(/\s*\(.*\)\s*$/,""),root:m.root||""}; })); }catch(e){}

// ── ClinicalImpressionTab — proper component to avoid hooks-in-IIFE violation ──
const PHYSIO_DX_LIST = {
  "Cervical spine": [
    {label:"Cervical facet joint dysfunction",icd:"M47.812"},
    {label:"Cervical disc herniation (specify level)",icd:"M50.1"},
    {label:"Cervical radiculopathy (specify root)",icd:"M54.2"},
    {label:"Cervicogenic headache",icd:"G44.841"},
    {label:"Cervical myofascial pain syndrome",icd:"M79.1"},
    {label:"Whiplash-associated disorder (WAD II)",icd:"S13.4"},
    {label:"Cervical spondylosis",icd:"M47.812"},
    {label:"Upper cervical instability (suspected)",icd:"M53.2"},
    {label:"Thoracic outlet syndrome (suspected)",icd:"G54.0"},
    {label:"Cervical canal stenosis",icd:"M48.02"},
  ],
  "Lumbar / SI": [
    {label:"Lumbar facet joint dysfunction",icd:"M47.816"},
    {label:"Lumbar disc herniation (specify level)",icd:"M51.1"},
    {label:"Lumbar radiculopathy (specify root)",icd:"M54.4"},
    {label:"Sacroiliac joint dysfunction",icd:"M53.3"},
    {label:"Non-specific low back pain",icd:"M54.5"},
    {label:"Lumbar spondylosis",icd:"M47.816"},
    {label:"Lumbar spinal stenosis",icd:"M48.06"},
    {label:"Piriformis syndrome",icd:"G57.0"},
    {label:"Spondylolisthesis (Grade I/II)",icd:"M43.1"},
    {label:"Lumbar myofascial pain syndrome",icd:"M79.1"},
  ],
  "Hip / Groin": [
    {label:"Hip osteoarthritis",icd:"M16.9"},
    {label:"Femoroacetabular impingement (FAI)",icd:"M24.85"},
    {label:"Hip labral tear (suspected)",icd:"M24.05"},
    {label:"Greater trochanteric pain syndrome",icd:"M70.60"},
    {label:"Iliopsoas tendinopathy",icd:"M76.1"},
    {label:"Adductor-related groin pain",icd:"M76.0"},
    {label:"Snapping hip syndrome",icd:"M76.3"},
    {label:"Avascular necrosis (suspected — refer)",icd:"M87.05"},
    {label:"Hip bursitis (trochanteric)",icd:"M70.60"},
    {label:"Athletic pubalgia",icd:"M76.8"},
  ],
  "Knee (L)": [
    {label:"Patellofemoral pain syndrome",icd:"M22.2"},
    {label:"Knee osteoarthritis (medial compartment)",icd:"M17.11"},
    {label:"Patellar tendinopathy",icd:"M76.5"},
    {label:"ACL sprain / tear (suspected)",icd:"M23.61"},
    {label:"Meniscal injury (suspected)",icd:"M23.2"},
    {label:"Iliotibial band syndrome",icd:"M76.3"},
    {label:"Pes anserine bursitis",icd:"M70.5"},
    {label:"MCL sprain (Grade I/II)",icd:"M23.64"},
    {label:"Post-operative knee — rehabilitation",icd:"Z96.65"},
    {label:"Fat pad impingement",icd:"M79.4"},
  ],
  "Knee (R)": [
    {label:"Patellofemoral pain syndrome",icd:"M22.2"},
    {label:"Knee osteoarthritis (medial compartment)",icd:"M17.11"},
    {label:"Patellar tendinopathy",icd:"M76.5"},
    {label:"ACL sprain / tear (suspected)",icd:"M23.61"},
    {label:"Meniscal injury (suspected)",icd:"M23.2"},
    {label:"Iliotibial band syndrome",icd:"M76.3"},
    {label:"Pes anserine bursitis",icd:"M70.5"},
    {label:"MCL sprain (Grade I/II)",icd:"M23.64"},
    {label:"Post-operative knee — rehabilitation",icd:"Z96.65"},
    {label:"Fat pad impingement",icd:"M79.4"},
  ],
  "Shoulder (L)": [
    {label:"Rotator cuff tendinopathy",icd:"M75.1"},
    {label:"Subacromial impingement syndrome",icd:"M75.1"},
    {label:"Rotator cuff tear (partial / full — suspected)",icd:"M75.1"},
    {label:"Frozen shoulder (adhesive capsulitis)",icd:"M75.0"},
    {label:"AC joint sprain / OA",icd:"M19.11"},
    {label:"Glenohumeral instability (anterior)",icd:"M24.31"},
    {label:"Biceps tendinopathy / SLAP (suspected)",icd:"M75.2"},
    {label:"Shoulder OA (glenohumeral)",icd:"M19.11"},
    {label:"Post-op shoulder rehabilitation",icd:"Z96.61"},
    {label:"Cervical-referred shoulder pain (C4/C5)",icd:"M54.2"},
  ],
  "Shoulder (R)": [
    {label:"Rotator cuff tendinopathy",icd:"M75.1"},
    {label:"Subacromial impingement syndrome",icd:"M75.1"},
    {label:"Rotator cuff tear (partial / full — suspected)",icd:"M75.1"},
    {label:"Frozen shoulder (adhesive capsulitis)",icd:"M75.0"},
    {label:"AC joint sprain / OA",icd:"M19.11"},
    {label:"Glenohumeral instability (anterior)",icd:"M24.31"},
    {label:"Biceps tendinopathy / SLAP (suspected)",icd:"M75.2"},
    {label:"Shoulder OA (glenohumeral)",icd:"M19.11"},
    {label:"Post-op shoulder rehabilitation",icd:"Z96.61"},
    {label:"Cervical-referred shoulder pain (C4/C5)",icd:"M54.2"},
  ],
  "Ankle / Foot": [
    {label:"Lateral ankle sprain (Grade I/II/III)",icd:"S93.4"},
    {label:"Achilles tendinopathy (mid-portion)",icd:"M76.6"},
    {label:"Achilles tendinopathy (insertional)",icd:"M76.6"},
    {label:"Plantar fasciitis",icd:"M72.2"},
    {label:"Ankle OA",icd:"M19.071"},
    {label:"Peroneal tendinopathy",icd:"M76.7"},
    {label:"Posterior tibial tendon dysfunction",icd:"M76.82"},
    {label:"Sinus tarsi syndrome",icd:"M79.1"},
    {label:"Hallux valgus (conservative management)",icd:"M20.1"},
    {label:"Syndesmosis sprain",icd:"S93.4"},
  ],
  "Elbow/Wrist/Hand": [
    {label:"Lateral epicondylalgia (Tennis elbow)",icd:"M77.1"},
    {label:"Medial epicondylalgia (Golfer's elbow)",icd:"M77.0"},
    {label:"De Quervain's tenosynovitis",icd:"M65.4"},
    {label:"Carpal tunnel syndrome",icd:"G56.0"},
    {label:"Wrist tendinopathy",icd:"M65.3"},
    {label:"TFCC injury (suspected)",icd:"M25.331"},
    {label:"Cubital tunnel syndrome",icd:"G56.2"},
    {label:"Trigger finger",icd:"M65.3"},
    {label:"Dupuytren's contracture (conservative)",icd:"M72.0"},
    {label:"Elbow OA",icd:"M19.021"},
  ],
  "Thoracic spine": [
    {label:"Thoracic facet joint dysfunction",icd:"M47.814"},
    {label:"Thoracic myofascial pain",icd:"M79.1"},
    {label:"Costochondral / rib dysfunction",icd:"M94.0"},
    {label:"Thoracic disc herniation",icd:"M51.14"},
    {label:"Scheuermann's disease",icd:"M42.0"},
    {label:"Thoracic kyphosis (postural)",icd:"M40.04"},
    {label:"T4 syndrome",icd:"M54.6"},
    {label:"Intercostal neuralgia",icd:"G58.0"},
    {label:"Thoracic outlet syndrome (suspected)",icd:"G54.0"},
    {label:"Post-fracture thoracic rehabilitation",icd:"S22.9"},
  ],
  "General": [
    {label:"Fibromyalgia",icd:"M79.7"},
    {label:"Chronic widespread pain",icd:"M79.3"},
    {label:"Post-surgical rehabilitation (specify)",icd:"Z96.9"},
    {label:"Chronic pain syndrome (central sensitisation)",icd:"G89.4"},
    {label:"Post-COVID musculoskeletal symptoms",icd:"U09.9"},
    {label:"Hypermobility syndrome / hEDS",icd:"Q79.6"},
    {label:"Osteoporosis (fracture prevention)",icd:"M81.0"},
    {label:"Postural dysfunction",icd:"M40.3"},
    {label:"Deconditioning / functional decline",icd:"Z73.6"},
    {label:"Falls prevention programme",icd:"Z91.81"},
  ],
};
const CI_TAG_CONFIG = {
  primary:      {label:"Primary working diagnosis",   col:"#4C1D95", bg:"#EDE9FE", border:"#C4B5FD"},
  differential: {label:"Differential — considering",  col:"#92400E", bg:"#FEF3C7", border:"#FCD34D"},
  ruledout:     {label:"Ruled out",                   col:"#374151", bg:"#F3F4F6", border:"#D1D5DB"},
};

function ClinicalImpressionTab({ d, C, onSaveField, onNav }) {
  const [ciItems,     setCiItems]     = useState(() => Array.isArray(d.clinical_impression) ? d.clinical_impression : []);
  const [showPicker,  setShowPicker]  = useState(false);
  const [pickerRegion,setPickerRegion]= useState("General");
  const [pickerSearch,setPickerSearch]= useState("");
  const [pendingDx,   setPendingDx]   = useState(null);
  const [pendingTag,  setPendingTag]  = useState("primary");
  const [pendingNote, setPendingNote] = useState("");
  const [customDx,    setCustomDx]    = useState("");

  const selRegions = (()=>{ try{ return JSON.parse(d.cx_selected_regions||"[]"); }catch{ return []; } })();
  const pickerRegions = ["General", ...selRegions.filter(r => PHYSIO_DX_LIST[r])];

  const saveCi = (newItems) => {
    setCiItems(newItems);
    onSaveField && onSaveField("clinical_impression", newItems);
  };

  const confirmAdd = () => {
    const lbl = pendingDx?.label || customDx.trim();
    if (!lbl) return;
    const newItem = { id:`ci_${Date.now()}`, label:lbl, icdCode:pendingDx?.icd||"", tag:pendingTag, notes:pendingNote, addedAt:new Date().toLocaleDateString("en-GB") };
    const updated = pendingTag==="primary"
      ? ciItems.map(x => x.tag==="primary" ? {...x, tag:"differential"} : x)
      : [...ciItems];
    saveCi([...updated, newItem]);
    setPendingDx(null); setCustomDx(""); setPendingTag("primary"); setPendingNote(""); setShowPicker(false);
  };

  const removeItem  = (id) => saveCi(ciItems.filter(x => x.id !== id));
  const changeTag   = (id, newTag) => {
    let updated = ciItems.map(x => x.id===id ? {...x, tag:newTag} : x);
    if (newTag==="primary") updated = updated.map(x => x.id!==id && x.tag==="primary" ? {...x, tag:"differential"} : x);
    saveCi(updated);
  };

  const searchResults = (()=>{
    const pool = pickerSearch.trim()
      ? Object.values(PHYSIO_DX_LIST).flat().filter(x => x.label.toLowerCase().includes(pickerSearch.toLowerCase()))
      : (PHYSIO_DX_LIST[pickerRegion] || []);
    return pool.filter(x => !ciItems.some(ci => ci.label===x.label));
  })();

  const inp = { width:"100%", boxSizing:"border-box", padding:"7px 10px", border:`1px solid ${C.border}`, borderRadius:8, fontSize:11.5, fontFamily:"inherit", outline:"none" };

  return (
    <div>
      {/* Disclaimer */}
      <div style={{background:"#FEF3C7",border:"1px solid #FCD34D",borderRadius:10,padding:"9px 12px",marginBottom:12,fontSize:11,color:"#92400E",lineHeight:1.5}}>
        <strong>Clinical Impression</strong> — Working hypotheses based on your assessment. These are physiotherapy clinical impressions, not confirmed medical diagnoses. Document your reasoning. Refer if red flags present or diagnosis is uncertain.
      </div>

      {/* Existing items */}
      {ciItems.length===0 && !showPicker && (
        <div style={{textAlign:"center",padding:"24px 0",color:C.muted,fontSize:12}}>
          No clinical impression recorded yet.<br/>
          <span style={{fontSize:11}}>Add one after completing your subjective and objective assessment.</span>
        </div>
      )}
      {ciItems.map((item) => {
        const tc = CI_TAG_CONFIG[item.tag] || CI_TAG_CONFIG.differential;
        return (
          <div key={item.id} style={{background:tc.bg,border:`1.5px solid ${tc.border}`,borderRadius:12,padding:"11px 13px",marginBottom:9}}>
            <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:800,color:tc.col,lineHeight:1.3}}>{item.label}</div>
                <div style={{display:"flex",gap:5,marginTop:5,flexWrap:"wrap",alignItems:"center"}}>
                  {["primary","differential","ruledout"].map(t=>(
                    <button key={t} onClick={()=>changeTag(item.id,t)}
                      style={{padding:"2px 8px",borderRadius:99,border:`1px solid ${t===item.tag?tc.border:"#D1D5DB"}`,background:t===item.tag?tc.bg:"transparent",color:t===item.tag?tc.col:"#9CA3AF",fontSize:9.5,fontWeight:700,cursor:"pointer"}}>
                      {CI_TAG_CONFIG[t].label}
                    </button>
                  ))}
                  {item.icdCode && <span style={{fontSize:9.5,color:C.muted,fontWeight:600}}>ICD: {item.icdCode}</span>}
                </div>
                {item.notes && <div style={{fontSize:11,color:tc.col,marginTop:5,fontStyle:"italic",opacity:0.85}}>{item.notes}</div>}
              </div>
              <button onClick={()=>removeItem(item.id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:"#9CA3AF",padding:2,flexShrink:0}}>✕</button>
            </div>
          </div>
        );
      })}

      {/* Add button */}
      {!showPicker && (
        <button onClick={()=>setShowPicker(true)} style={{width:"100%",padding:"11px",border:`2px dashed ${C.primary}50`,borderRadius:12,background:"transparent",color:C.primary,fontWeight:700,fontSize:12,cursor:"pointer",marginTop:4}}>
          ＋ Add clinical impression
        </button>
      )}

      {/* Picker — search/browse step */}
      {showPicker && !pendingDx && (
        <div style={{background:"#F8F7FF",border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 14px",marginTop:4}}>
          <div style={{fontWeight:800,fontSize:12,color:C.text,marginBottom:10}}>Select from list or type custom</div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
            {pickerRegions.map(r=>(
              <button key={r} onClick={()=>{setPickerRegion(r);setPickerSearch("");}}
                style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${pickerRegion===r?C.primary:C.border}`,background:pickerRegion===r?`${C.primary}12`:"transparent",color:pickerRegion===r?C.primary:C.muted,fontSize:10.5,fontWeight:700,cursor:"pointer"}}>
                {r}
              </button>
            ))}
          </div>
          <input placeholder="Search all diagnoses…" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)} style={inp}/>
          <div style={{maxHeight:180,overflowY:"auto",display:"flex",flexDirection:"column",gap:4,marginTop:8}}>
            {searchResults.map((dx,i)=>(
              <div key={i} onClick={()=>setPendingDx(dx)}
                style={{padding:"8px 10px",borderRadius:8,background:"white",border:`1px solid ${C.border}`,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:11.5,color:C.text,fontWeight:500}}>{dx.label}</span>
                <span style={{fontSize:9.5,color:C.muted,flexShrink:0,marginLeft:8}}>{dx.icd}</span>
              </div>
            ))}
            {searchResults.length===0 && <div style={{fontSize:11,color:C.muted,padding:"6px 0"}}>No matches — use custom below</div>}
          </div>
          <div style={{marginTop:8,display:"flex",gap:6}}>
            <input placeholder="Custom diagnosis (free text)…" value={customDx} onChange={e=>setCustomDx(e.target.value)} style={{...inp,flex:1}}/>
            {customDx.trim() && <button onClick={()=>setPendingDx({label:customDx.trim(),icd:""})} style={{padding:"7px 12px",borderRadius:8,background:C.primary,border:"none",color:"white",fontSize:11,fontWeight:700,cursor:"pointer"}}>Use →</button>}
          </div>
          <button onClick={()=>setShowPicker(false)} style={{marginTop:8,fontSize:11,color:C.muted,background:"none",border:"none",cursor:"pointer"}}>Cancel</button>
        </div>
      )}

      {/* Tag + notes step */}
      {pendingDx && (
        <div style={{background:"#F8F7FF",border:`1px solid ${C.border}`,borderRadius:14,padding:"13px 14px",marginTop:4}}>
          <div style={{fontWeight:800,fontSize:12,color:C.text,marginBottom:4}}>{pendingDx.label}</div>
          {pendingDx.icd && <div style={{fontSize:10,color:C.muted,marginBottom:10}}>ICD-10: {pendingDx.icd}</div>}
          <div style={{fontSize:10.5,fontWeight:700,color:C.muted,marginBottom:6}}>How certain are you?</div>
          <div style={{display:"flex",gap:6,marginBottom:10}}>
            {[
              {t:"primary",      emoji:"🎯", desc:"Primary — most likely"},
              {t:"differential", emoji:"🔍", desc:"Differential — considering"},
              {t:"ruledout",     emoji:"✗",  desc:"Ruled out"},
            ].map(({t,emoji,desc})=>(
              <button key={t} onClick={()=>setPendingTag(t)}
                style={{flex:1,padding:"8px 4px",borderRadius:10,border:`2px solid ${pendingTag===t?CI_TAG_CONFIG[t].border:"#E5E7EB"}`,background:pendingTag===t?CI_TAG_CONFIG[t].bg:"white",color:pendingTag===t?CI_TAG_CONFIG[t].col:"#6B7280",fontSize:10,fontWeight:700,cursor:"pointer",lineHeight:1.4,textAlign:"center"}}>
                {emoji}<br/>{desc}
              </button>
            ))}
          </div>
          <textarea placeholder="Clinical reasoning notes (optional)…" value={pendingNote} onChange={e=>setPendingNote(e.target.value)} rows={2}
            style={{...inp,resize:"vertical",marginBottom:8}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={confirmAdd} style={{flex:1,padding:"9px",background:C.primary,border:"none",borderRadius:9,color:"white",fontWeight:800,fontSize:12,cursor:"pointer"}}>Save impression</button>
            <button onClick={()=>{setPendingDx(null);setPendingNote("");}} style={{padding:"9px 14px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:9,color:C.muted,fontSize:11,cursor:"pointer"}}>Back</button>
          </div>
        </div>
      )}

      {/* SOAP hint */}
      {ciItems.some(x=>x.tag==="primary") && (
        <div style={{marginTop:12,padding:"9px 12px",background:"#ECFDF5",border:"1px solid #BBF7D0",borderRadius:10,fontSize:11,color:"#065F46",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>Working diagnosis appears in your SOAP Assessment field.</span>
          <span onClick={()=>onNav&&onNav("soap")} style={{fontWeight:700,cursor:"pointer",color:"#059669"}}>Open SOAP →</span>
        </div>
      )}
    </div>
  );
}

function PatientProfileModal({ patient, onClose, onLoadAssessment, onSaveField, onNav, initialTab }) {
  const { useState, useEffect, useMemo } = React;
  const [tab, setTab] = useState(initialTab||"overview");
  const [assessView, setAssessView]     = useState("latest");
  const [treatCat, setTreatCat]         = useState("exercises");
  const [expanded, setExpanded]         = useState(null);
  const [exDone,     setExDone]     = useState({});
  const [mounted,    setMounted]    = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  // Was: a completely separate localStorage-only array
  // ("physio_docs_<patientId>"), never part of the patient's synced `data` —
  // so uploaded documents never reached Supabase at all and wouldn't follow
  // a student to a different device, unlike everything else in this app.
  // Now stored as data.uploaded_docs and saved through onSaveField, the same
  // local+cloud path as every other field.
  // NOTE for later: these are stored as base64 data URLs directly inside the
  // patient's jsonb record. Fine at small scale, but for real production
  // volume (many students, many attached files) this would be better moved
  // to actual Supabase Storage (separate file objects + a URL reference)
  // rather than growing the jsonb blob that gets re-uploaded on every
  // autosave — flagging this rather than silently picking that heavier
  // change here.
  const uploadedDocs = patient?.data?.uploaded_docs || [];
  const setUploadedDocs = (docs) => {
    if (typeof onSaveField === "function" && patient?.id) onSaveField(patient.id, { uploaded_docs: docs });
  };
  const [uploading, setUploading] = useState(false);
  const [assessSub, setAssessSub] = useState("subjective");
  const fileInputRef = React.useRef(null);

  const saveDocs = (docs) => setUploadedDocs(docs); // kept as an alias — callers below already read as saveDocs(updated)

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("File too large. Maximum size is 5MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newDoc = {
        id: Date.now().toString(),
        name: file.name,
        date: new Date().toLocaleDateString("en-GB", {day:"2-digit",month:"short",year:"numeric"}),
        size: file.size > 1024*1024
          ? (file.size/(1024*1024)).toFixed(1)+" MB"
          : Math.round(file.size/1024)+" KB",
        type: file.type,
        icon: file.type.includes("pdf") ? "📋"
            : file.type.includes("image") ? "🖼"
            : file.type.includes("video") ? "🎥"
            : "📄",
        dataUrl: ev.target.result,
        uploadedAt: new Date().toISOString(),
      };
      const updated = [newDoc, ...uploadedDocs];
      setUploadedDocs(updated); // now persists directly (see note above) — saveDocs() is just an alias
      setUploading(false);
    };
    reader.onerror = () => { setUploading(false); alert("Failed to read file."); };
    reader.readAsDataURL(file);
    e.target.value = ""; // reset input
  };

  const handleDeleteDoc = (id) => {
    const updated = uploadedDocs.filter(d => d.id !== id);
    setUploadedDocs(updated);
  };

  const handleDownloadDoc = (doc) => {
    const a = document.createElement("a");
    a.href = doc.dataUrl;
    a.download = doc.name;
    a.click();
  };

  const handlePreviewDoc = (doc) => {
    const w = window.open();
    if (doc.type.includes("image")) {
      w.document.write(`<img src="${doc.dataUrl}" style="max-width:100%;"/>`);
    } else {
      w.document.write(`<iframe src="${doc.dataUrl}" style="width:100%;height:100vh;border:none;"></iframe>`);
    }
  };

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const d   = patient?.data || {};
  const name = d.dem_name || patient?.name || "";
  const pid  = patient?.id ? "PT-" + patient.id.slice(0,10).toUpperCase() : "";
  const age  = d.dem_age || "";
  const sex  = d.dem_sex || "";
  const phone= d.dem_phone || "";
  const email= d.dem_email || "";
  const dob  = d.dem_dob   || "";
  const mrn  = d.dem_mrn   || patient?.mrn || "";
  const dx   = patient?.lastDx || d.soap_assessment?.split('\n')[0]?.slice(0,60) || d.cc_dx || "";
  const chiefComplaint = d.cc_main || "";
  const _cm = (d.cc_main||"").toLowerCase();
  const _loc = Array.isArray(d.cc_location) ? d.cc_location.join(", ") : (d.cc_location||"");
  const region = _cm.includes("neck")||_cm.includes("cerv") ? "Cervical Spine"
    : _cm.includes("lumb")||_cm.includes("lower back") ? "Lumbar Spine"
    : _cm.includes("thorac")||_cm.includes("mid back")||_cm.includes("upper back") ? "Thoracic Spine"
    : _cm.includes("shoulder") ? "Shoulder"
    : _cm.includes("knee") ? "Knee"
    : _cm.includes("hip") ? "Hip"
    : _cm.includes("ankle")||_cm.includes("foot") ? "Ankle / Foot"
    : _cm.includes("wrist")||_cm.includes("hand") ? "Wrist / Hand"
    : _cm.includes("elbow") ? "Elbow"
    : _cm.includes("headache")||_cm.includes("head") ? "Headache / Cranial"
    : _loc ? _loc.split(",")[0] : d.cc_main ? "Musculoskeletal" : "Not recorded";
  const nrsNow   = parseFloat(d.cc_vas_now  || "0");
  const nrsWorst = parseFloat(d.cc_vas_worst|| "0");
  const sessions = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
  const sessCount= sessions.length;
  const plannedSess = parseInt(d.tx_plan_sessions||d.plan_sessions||"0")||0;
  const sessPct  = plannedSess>0 ? Math.round((sessCount/plannedSess)*100) : 0;
  const nrsImprove= nrsWorst>0 ? Math.round(((nrsWorst-nrsNow)/nrsWorst)*100) : 0;
  // Use real outcome measure if available, else NRS improvement, else 0
  const omScore = parseFloat(d.om_psfs1_now||d.om_psfs_avg||"0");
  const omGoal  = parseFloat(d.om_psfs1_goal||"10")||10;
  const omPct   = omScore>0 ? Math.round((omScore/omGoal)*100) : 0;
  const overallPct = omPct>0 ? Math.min(omPct,100) : nrsImprove>0 ? Math.min(nrsImprove,100) : 0;
  const progressLabel = omPct>0 ? `PSFS ${omScore}/${omGoal}` : nrsImprove>0 ? `↓${nrsImprove}% pain` : "Not measured";
  const onset    = d.cc_onset_date || d.cx_onset_date || (Array.isArray(d.cc_onset)?d.cc_onset[0]:d.cc_onset) || "";
  const agg      = d.cc_agg || (Array.isArray(d.cx_agg_mov)?d.cx_agg_mov.join(", "):d.cx_agg_mov) || "";
  const rel      = d.cc_rel || (Array.isArray(d.cx_rel_mov)?d.cx_rel_mov.join(", "):d.cx_rel_mov) || "";

  // ROM — real values only, no fallbacks
  // ROM: detect which region has data and show that
  const ROM_REGIONS_PROFILE = [
    { name:"Cervical", fields:[
      {label:"Flex",  key:"rom_cflex_arom"}, {label:"Ext",   key:"rom_cext_arom"},
      {label:"R Rot", key:"rom_crotr_arom"}, {label:"L Rot", key:"rom_crotl_arom"},
      {label:"R SB",  key:"rom_clatr_arom"}, {label:"L SB",  key:"rom_clatl_arom"},
    ]},
    { name:"Thoracic", fields:[
      {label:"Flex",  key:"rom_thflex_arom"},{label:"Ext",   key:"rom_thext_arom"},
      {label:"R Rot", key:"rom_throtr_arom"},{label:"L Rot", key:"rom_throtl_arom"},
    ]},
    { name:"Lumbar", fields:[
      {label:"Flex",  key:"rom_lflex_arom"}, {label:"Ext",   key:"rom_lext_arom"},
      {label:"R SB",  key:"rom_llfr_arom"},  {label:"L SB",  key:"rom_llfl_arom"},
      {label:"R Rot", key:"rom_lrotr_arom"}, {label:"L Rot", key:"rom_lrotl_arom"},
    ]},
    { name:"Shoulder", bilateral:true, fields:[
      {label:"Flex R",key:"rom_sflex_R_arom"},{label:"Flex L",key:"rom_sflex_L_arom"},
      {label:"Abd R", key:"rom_sabd_R_arom"}, {label:"Abd L", key:"rom_sabd_L_arom"},
      {label:"ER R",  key:"rom_ser_R_arom"},  {label:"IR R",  key:"rom_sir_R_arom"},
    ]},
    { name:"Hip", bilateral:true, fields:[
      {label:"Flex R",key:"rom_hflex_R_arom"},{label:"Flex L",key:"rom_hflex_L_arom"},
      {label:"Abd R", key:"rom_habd_R_arom"}, {label:"ER R",  key:"rom_her_R_arom"},
    ]},
    { name:"Knee", bilateral:true, fields:[
      {label:"Flex R",key:"rom_kflex_R_arom"},{label:"Flex L",key:"rom_kflex_L_arom"},
      {label:"Ext R", key:"rom_kext_R_arom"}, {label:"Ext L", key:"rom_kext_L_arom"},
    ]},
    { name:"Ankle", bilateral:true, fields:[
      {label:"DF R",  key:"rom_adf_R_arom"},  {label:"DF L",  key:"rom_adf_L_arom"},
      {label:"PF R",  key:"rom_apf_R_arom"},  {label:"PF L",  key:"rom_apf_L_arom"},
    ]},
    { name:"Elbow", bilateral:true, fields:[
      {label:"Flex R",key:"rom_eflex_R_arom"},{label:"Flex L",key:"rom_eflex_L_arom"},
      {label:"Sup R", key:"rom_esup_R_arom"}, {label:"Pro R", key:"rom_epro_R_arom"},
    ]},
  ];
  const activeROMRegion = ROM_REGIONS_PROFILE.find(r => r.fields.some(f => d[f.key])) || null;
  const hasROM = !!activeROMRegion;
  const ROM = {
    flex: d.rom_cflex_arom || d.rom_cflex || "",
    ext:  d.rom_cext_arom  || d.rom_cext  || "",
    rrot: d.rom_crotr_arom || d.rom_crotr || "",
    lrot: d.rom_crotl_arom || d.rom_crotl || "",
    rsb:  d.rom_clatr_arom || d.rom_clatr || "",
    lsb:  d.rom_clatl_arom || d.rom_clatl || "",
  };
  const romImproving = parseFloat(ROM.flex||"0") >= 40;

  // Trend from real sessions
  const TREND = sessions.length > 0
    ? sessions.slice(-12).map(s => parseFloat(s.vasEnd||s.vasStart||"0"))
    : [];
  const DATES = sessions.slice(-6).map(s => s.date || "");

  // Exercises — real data if available, else show template
  const hepExercises = Array.isArray(d.hep_exercises) ? d.hep_exercises
    : Array.isArray(d.hep_programme) ? d.hep_programme.map(e=>({...e,emoji:"🏋"}))
    : [];
  const EXERCISES = hepExercises;

  // Manual therapy — real data only, no fake fallback
  const rawManual = Array.isArray(d.manual_therapy) ? d.manual_therapy : [];
  const MANUAL = rawManual;

  // Modalities — real data only, no fake fallback
  const rawModalities = Array.isArray(d.modalities) ? d.modalities : [];
  const MODALITIES = rawModalities;

  // Color system
  const C = {
    bg:"#F8FAFC", white:"#FFFFFF", primary:"#6D28D9", secondary:"#8B5CF6",
    text:"#111827", muted:"#6B7280", border:"#F1F5F9", border2:"#E5E7EB",
    green:"#10B981", red:"#EF4444", orange:"#F59E0B", blue:"#3B82F6",
    primaryBg:"#EDE9FE", greenBg:"#ECFDF5", redBg:"#FEF2F2",
  };

  const TABS = [
    { k:"overview",    icon:"🏠",  label:"Overview"         },
    { k:"demographics",icon:"👤",  label:"Demographics"     },
    { k:"subjective",  icon:"📝",  label:"Subjective"       },
    { k:"assessment",  icon:"📋",  label:"Assessment"       },
    { k:"posture",     icon:"🧍",  label:"Posture"          },
    { k:"treatment",   icon:"💊",  label:"Treatment"        },
    { k:"progress",    icon:"📈",  label:"Progress"         },
    { k:"documents",   icon:"📄",  label:"Docs"             },
  ];

  // Donut component
  const Donut = ({ pct, size=72, stroke=8, color, label, sub }) => {
    // Use pct directly — avoid useState(0) which resets on re-render (nested component issue)
    const safe = isNaN(pct) ? 0 : Math.min(100, Math.max(0, pct));
    const r=(size-stroke)/2, circ=2*Math.PI*r, off=circ-(safe/100)*circ;
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
        <div style={{position:"relative",width:size,height:size}}>
          <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke}/>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center"}}>
            <div style={{fontSize:size>60?18:13,fontWeight:800,color:C.text,lineHeight:1}}>{safe}</div>
            {sub&&<div style={{fontSize:10,color:C.muted,marginTop:1,fontWeight:600}}>{sub}</div>}
          </div>
        </div>
        {label&&<div style={{fontSize:11,color:C.muted,textAlign:"center",fontWeight:600}}>{label}</div>}
      </div>
    );
  };

  // Progress line chart
  const LineChart = () => {
    const [anim,setAnim]=useState(false);
    useEffect(()=>{const t=setTimeout(()=>setAnim(true),500);return()=>clearTimeout(t);},[]);
    // Guard: need at least 2 points to draw a line
    if(!TREND||TREND.length<2) return (
      <div style={{height:80,display:"flex",alignItems:"center",justifyContent:"center",
        color:"#9CA3AF",fontSize:12}}>
        No trend data yet — complete sessions to see progress
      </div>
    );
    const w=300,h=80,max=10,min=0;
    const safeTREND=TREND.map(v=>isNaN(v)?0:v);
    const pts=safeTREND.map((v,i)=>({
      x:(i/(safeTREND.length-1))*w,
      y:h-((v-min)/(max-min||1))*(h-12)-6,
    }));
    const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
    const areaD=`${pathD} L${w},${h} L0,${h} Z`;
    const gridLines=[0,2.5,5,7.5,10];
    return (
      <div style={{overflowX:"auto"}}>
        <svg width={w+40} height={h+40} style={{display:"block"}}>
          <defs>
            <linearGradient id="lg1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.02"/>
            </linearGradient>
            <clipPath id="cp1">
              <rect x="30" y="0" width={anim?w:0} height={h+20} style={{transition:"width 1.3s ease"}}/>
            </clipPath>
          </defs>
          {/* Grid lines */}
          {gridLines.map(g=>{
            const y=h-((g-min)/(max-min))*(h-12)-6;
            return (
              <g key={g}>
                <line x1="30" y1={y} x2={w+30} y2={y} stroke="#F3F4F6" strokeWidth="1"/>
                <text x="24" y={y+4} textAnchor="end" fontSize="9" fill="#9CA3AF">{g}</text>
              </g>
            );
          })}
          {/* Area + line */}
          <g transform="translate(30,0)">
            <path d={areaD} fill="url(#lg1)" clipPath="url(#cp1)"/>
            <path d={pathD} fill="none" stroke="#8B5CF6" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" clipPath="url(#cp1)"/>
            {pts.map((p,i)=>(
              <circle key={i} cx={p.x} cy={p.y} r="3" fill="#8B5CF6" stroke="white" strokeWidth="1.5"/>
            ))}
            {/* Last point label */}
            {pts.length>0&&(
              <>
                <rect x={(pts[pts.length-1]?.x||0)-10} y={(pts[pts.length-1]?.y||0)-22}
                  width={34} height={18} rx={9} fill="#6D28D9"/>
                <text x={(pts[pts.length-1]?.x||0)+7} y={(pts[pts.length-1]?.y||0)-9}
                  textAnchor="middle" fontSize="10" fill="white" fontWeight="700">
                  {safeTREND[safeTREND.length-1]}/10
                </text>
              </>
            )}
          </g>
          {/* X labels */}
          {DATES.length>1&&DATES.map((d2,i)=>(
            <text key={i} x={30+(i/(DATES.length-1))*w} y={h+34}
              textAnchor="middle" fontSize="9" fill="#9CA3AF">{d2}</text>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div data-testid="patient-profile-modal" style={{
      position:"fixed",inset:0,zIndex:9000,background:C.bg,
      display:"flex",flexDirection:"column",
      fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",
      overflowY:"auto",
      animation:mounted?"none":"fadeUp 0.3s ease",
    }}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.4}}
        .tab-content{animation:slideIn 0.25s ease both}
        ::-webkit-scrollbar{display:none}
      `}</style>



      {/* ── TOP NAV BAR ── */}
      <div style={{background:C.white,padding:"12px 20px",display:"flex",
        alignItems:"center",justifyContent:"space-between",
        borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
        <button onClick={onClose} style={{
          width:36,height:36,borderRadius:"50%",border:`1px solid ${C.border2}`,
          background:C.white,cursor:"pointer",display:"flex",alignItems:"center",
          justifyContent:"center",fontSize:18,color:C.primary,
        }}>←</button>
        <div style={{fontSize:15,fontWeight:700,color:C.text}}>Patient Profile</div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setTab("subjective")} title="Edit subjective" style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>✏️</button>
          <button onClick={()=>setShowDetails(v=>!v)} title="Toggle details" style={{background:"none",border:"none",cursor:"pointer",fontSize:18,color:C.muted}}>⋮</button>
        </div>
      </div>

      {/* ── PATIENT HEADER CARD ── */}
      <div style={{background:"#F5F3FF",padding:"20px 20px 18px",flexShrink:0}}>
        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
          {/* Avatar */}
          <div style={{width:76,height:76,borderRadius:"50%",
            background:"linear-gradient(135deg,#C4B5FD,#7C3AED)",
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:28,fontWeight:800,color:"white",flexShrink:0,
            border:"3px solid white",boxShadow:"0 4px 12px rgba(109,40,217,0.2)"}}>
            {name.split(" ").map(w=>w[0]).join("").slice(0,2)}
          </div>
          {/* Info */}
          <div style={{flex:1}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:20,fontWeight:800,color:C.text,letterSpacing:"-0.5px",lineHeight:1.1}}>
                  {name}
                  <span style={{fontSize:14,marginLeft:6}}>{sex==="Male"||sex==="M"?"♂":sex==="Female"||sex==="F"?"♀":"⚧"}</span>
                </div>
                <div style={{fontSize:11.5,color:C.muted,marginTop:3}}>PID: {pid}</div>
                {(()=>{
                  const ci = Array.isArray(d.clinical_impression)?d.clinical_impression:[];
                  const primary = ci.find(x=>x.tag==="primary");
                  if(!primary) return null;
                  return (
                    <div style={{marginTop:5,display:"inline-flex",alignItems:"center",gap:5,background:"#EDE9FE",border:"1px solid #C4B5FD",borderRadius:99,padding:"3px 10px"}}>
                      <span style={{fontSize:9,fontWeight:800,color:"#5B21B6",textTransform:"uppercase",letterSpacing:"0.5px"}}>Working Dx</span>
                      <span style={{fontSize:11,fontWeight:700,color:"#4C1D95"}}>{primary.label}</span>
                      {primary.icdCode&&<span style={{fontSize:9,color:"#7C3AED",fontWeight:600}}>{primary.icdCode}</span>}
                    </div>
                  );
                })()}
              </div>
              <div style={{display:"flex",alignItems:"center",gap:5,
                background:"#ECFDF5",border:"1px solid #BBF7D0",
                padding:"4px 10px",borderRadius:99}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.green,
                  animation:"pulseDot 1.5s infinite"}}/>
                <span style={{fontSize:11,fontWeight:700,color:C.green}}>Active</span>
              </div>
            </div>
            <div style={{display:"flex",gap:12,marginTop:10,alignItems:"center",flexWrap:"wrap"}}>
              {age&&<span style={{fontSize:12,color:C.muted,background:"#F3F4F6",padding:"3px 9px",borderRadius:99}}>{age} yrs</span>}
              {d.dem_occupation&&<span style={{fontSize:12,color:C.muted,background:"#F3F4F6",padding:"3px 9px",borderRadius:99,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.dem_occupation}</span>}
              <button onClick={()=>setShowDetails(v=>!v)} style={{fontSize:11,color:C.primary,fontWeight:700,background:"none",border:"none",cursor:"pointer",padding:"3px 0"}}>
                {showDetails?"▲ Less":"▼ Details"}
              </button>
            </div>
            {showDetails&&(
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4,padding:"10px 12px",background:"transparent",borderRadius:10}}>
                {phone&&<div style={{fontSize:11.5,color:C.text}}>📞 {phone}</div>}
                {email&&<div style={{fontSize:11.5,color:C.text}}>✉️ {email}</div>}
                {dob&&<div style={{fontSize:11.5,color:C.text}}>🎂 {dob}</div>}
                {mrn&&<div style={{fontSize:11.5,color:C.text}}>🪪 MRN: {mrn}</div>}
                {d.dem_gp&&<div style={{fontSize:11.5,color:C.text}}>🏥 GP: {d.dem_gp}</div>}
                {d.dem_referral&&<div style={{fontSize:11.5,color:C.text}}>📋 Ref: {d.dem_referral}</div>}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* ── TABS ── */}
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,flexShrink:0,
        display:"flex",overflowX:"auto",padding:"0 8px"}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{
            flex:"1 0 auto",padding:"14px 12px 12px",border:"none",background:"none",
            cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,
            borderBottom:`2.5px solid ${tab===t.k?C.primary:"transparent"}`,
            transition:"all 0.2s",whiteSpace:"nowrap",minWidth:76,
          }}>
            <span style={{fontSize:15,filter:tab===t.k?"none":"grayscale(1)",opacity:tab===t.k?1:0.5}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:700,color:tab===t.k?C.primary:C.muted,
              letterSpacing:"0.1px"}}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB CONTENT ── */}
      <div style={{flex:1,overflowY:"auto",paddingBottom:100}}>

        {/* ════════════════════════════════════════
            OVERVIEW TAB
        ════════════════════════════════════════ */}
        {tab==="overview" && (
          <div className="tab-content" style={{padding:"16px 16px"}}>

            {/* ── CARD 1: AT A GLANCE — 3 stat chips ── */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
              <div style={{background:C.white,borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Pain Now</div>
                <div style={{fontSize:28,fontWeight:900,color:nrsNow>=7?C.red:nrsNow>=4?C.orange:nrsNow>0?C.green:"#9CA3AF",lineHeight:1}}>{nrsNow||"—"}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>{nrsNow===0?"No Pain":nrsNow<=3?"Mild":nrsNow<=6?"Moderate":"Severe"}</div>
              </div>
              <div style={{background:C.white,borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Sessions</div>
                <div style={{fontSize:28,fontWeight:900,color:C.primary,lineHeight:1}}>{sessCount||"0"}</div>
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>{plannedSess>0?`of ${plannedSess} planned`:"attended"}</div>
              </div>
              <div style={{background:C.white,borderRadius:14,padding:"14px 10px",textAlign:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>Last Seen</div>
                <div style={{fontSize:13,fontWeight:800,color:C.text,lineHeight:1.2,marginTop:4}}>
                  {sessions.length>0?(sessions[sessions.length-1].date||"—"):"—"}
                </div>
                <div style={{fontSize:10,color:C.muted,marginTop:4}}>{sessions.length>0?"session "+sessions[sessions.length-1].sessionNo:"no sessions"}</div>
              </div>
            </div>

            {/* ── CARD 2: CLINICAL SNAPSHOT ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:12,letterSpacing:"-0.3px"}}>Clinical Snapshot</div>
              {[
                {icon:"🏃",label:"Diagnosis",      value:dx||"Pending assessment",     color:"#EDE9FE"},
                {icon:"📝",label:"Chief Complaint", value:chiefComplaint?.slice(0,90)||(chiefComplaint?.length>90?"…":"")+"Not recorded", color:"#F0F9FF"},
                {icon:"🚦",label:"Red Flags",       value:patient?.hasRedFlags?"⚠️ Documented — refer to referral log":"✅ None identified", color:patient?.hasRedFlags?"#FEF2F2":"#ECFDF5"},
              ].map((row,i)=>(
                <div key={i} style={{display:"flex",gap:10,padding:"9px 0",borderBottom:i<2?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                  <div style={{width:30,height:30,borderRadius:8,background:row.color,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>{row.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:10,color:C.muted,fontWeight:600}}>{row.label}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text,marginTop:2,lineHeight:1.4}}>{row.value}</div>
                  </div>
                </div>
              ))}
              {Array.isArray(d.body_chart)&&d.body_chart.length>0&&(
                <div style={{marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.muted,fontWeight:600,marginBottom:6}}>PAIN LOCATIONS</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {[...new Set(d.body_chart.map(m=>JSON.stringify({r:m.region,t:m.type})))].map((key,i)=>{
                      const {r,t}=JSON.parse(key);
                      const colors={"pain":"#EF4444","referred":"#F97316","numb":"#3B82F6","tingling":"#EAB308","stiff":"#8B5CF6"};
                      const bgs={"pain":"#FEF2F2","referred":"#FFF7ED","numb":"#EFF6FF","tingling":"#FEFCE8","stiff":"#F5F3FF"};
                      return <span key={i} style={{padding:"2px 8px",borderRadius:20,background:bgs[t]||"#f3f4f6",border:`1px solid ${colors[t]||"#ccc"}40`,fontSize:"0.8rem",fontWeight:700,color:colors[t]||"#666"}}>{t}: {r}</span>;
                    })}
                  </div>
                </div>
              )}
              {(d.meds_current||d.medications)&&(
                <div style={{marginTop:10,padding:"8px 12px",background:"#FFF7ED",borderRadius:8,border:"1px solid #FDE68A",display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:14}}>💊</span>
                  <div>
                    <div style={{fontSize:10,color:"#92400E",fontWeight:700}}>MEDICATIONS</div>
                    <div style={{fontSize:12,color:C.text,marginTop:1}}>{d.meds_current||d.medications}</div>
                  </div>
                </div>
              )}
            </div>

            {/* ── CARD 3: LAST SESSION ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:"-0.3px"}}>Last Session</div>
                {sessions.length>0&&<span onClick={()=>setTab("treatment")} style={{fontSize:11,color:C.primary,fontWeight:700,cursor:"pointer"}}>All sessions →</span>}
              </div>
              {sessions.length>0 ? (()=>{
                const last = sessions[sessions.length-1];
                return (
                  <div>
                    <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:10}}>
                      <div style={{padding:"4px 10px",background:C.primaryBg,borderRadius:99,fontSize:11,fontWeight:700,color:C.primary}}>Session {last.sessionNo||sessCount}</div>
                      <div style={{fontSize:12,color:C.muted}}>{last.date||last.savedAt?.slice(0,10)||"—"}</div>
                      {last.vasStart&&last.vasEnd&&<div style={{marginLeft:"auto",fontSize:12,fontWeight:800,color:parseFloat(last.vasEnd)<parseFloat(last.vasStart)?C.green:C.orange}}>
                        NRS {last.vasStart}→{last.vasEnd}
                      </div>}
                    </div>
                    {last.treatmentGiven&&<div style={{fontSize:12,color:C.text,lineHeight:1.5,background:"#F9FAFB",borderRadius:8,padding:"8px 10px"}}>{last.treatmentGiven.slice(0,120)}{last.treatmentGiven.length>120?"…":""}</div>}
                    {last.nextPlan&&<div style={{fontSize:11,color:C.primary,marginTop:8,fontWeight:600}}>→ Next: {last.nextPlan.slice(0,80)}{last.nextPlan.length>80?"…":""}</div>}
                  </div>
                );
              })() : (
                <div style={{textAlign:"center",padding:"20px 0",color:C.muted,fontSize:12}}>No sessions recorded yet — add the first session in the Treatment tab.</div>
              )}
            </div>

            {/* ── CARD 4: ASSESSMENT COMPLETENESS ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:12,letterSpacing:"-0.3px"}}>Assessment Status</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[
                  {label:"Subjective",  done:!!(chiefComplaint||d.cc_main),                                  nav:"subjective"},
                  {label:"ROM",         done:Object.keys(d).some(k=>k.includes("_arom")&&d[k]),              nav:"rom"},
                  {label:"MMT",         done:Object.keys(d).some(k=>k.startsWith("mmt_")&&d[k]),             nav:"mmt"},
                  {label:"Special Tests",done:Object.keys(d).some(k=>k.startsWith("st_")&&d[k]),             nav:"special"},
                  {label:"Posture",     done:Object.keys(d).some(k=>k.startsWith("posture_")&&d[k]),         nav:"posture"},
                  {label:"SOAP Signed", done:Array.isArray(d.soap_signed_notes)&&d.soap_signed_notes.length>0,nav:"soap"},
                ].map((item,i)=>(
                  <div key={i} onClick={()=>onNav&&onNav(item.nav)}
                    style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:10,cursor:"pointer",
                      background:item.done?"#ECFDF5":"#F9FAFB",border:`1px solid ${item.done?"#BBF7D0":"#E5E7EB"}`}}>
                    <div style={{width:20,height:20,borderRadius:"50%",background:item.done?C.green:"#D1D5DB",
                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      <span style={{fontSize:11,color:"white",fontWeight:800}}>{item.done?"✓":"!"}</span>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:item.done?C.green:C.muted}}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CARD 5: QUICK ACTIONS ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:12,letterSpacing:"-0.3px"}}>Quick Actions</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                {[
                  {icon:"📋",label:"Start Assessment",  sub:"Subjective + history",  color:"#EDE9FE",icolor:C.primary, action:()=>onNav&&onNav("subjective")},
                  {icon:"📝",label:"Open SOAP Note",    sub:"Sign & lock note",       color:"#ECFDF5",icolor:C.green,   action:()=>onNav&&onNav("soap")},
                  {icon:"➕",label:"Log Session",       sub:"Treatment record",       color:"#FEF3C7",icolor:C.orange,  action:()=>onNav&&onNav("treatment")},
                  {icon:"📐",label:"ROM Assessment",    sub:"Range of motion",        color:"#EDE9FE",icolor:C.primary, action:()=>onNav&&onNav("rom")},
                  {icon:"📈",label:"View Progress",     sub:"Outcomes & trends",      color:"#F0FDF4",icolor:C.green,   action:()=>setTab("progress")},
                  {icon:"📄",label:"Upload Document",   sub:"Files & reports",        color:"#F0F9FF",icolor:C.blue,    action:()=>setTab("documents")},
                ].map((a,i)=>(
                  <button key={i} onClick={a.action} style={{
                    display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:12,
                    background:a.color,border:"none",cursor:"pointer",textAlign:"left",
                  }}>
                    <span style={{fontSize:24,flexShrink:0}}>{a.icon}</span>
                    <div>
                      <div style={{fontSize:13,fontWeight:800,color:C.text}}>{a.label}</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:1}}>{a.sub}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── CARD 6: SIGNED NOTES ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:"-0.3px"}}>
                  Signed Notes ({(Array.isArray(d.soap_signed_notes)?d.soap_signed_notes:[]).length})
                </div>
                <span onClick={()=>onNav&&onNav("soap")} style={{fontSize:11,color:C.primary,fontWeight:700,cursor:"pointer"}}>View all →</span>
              </div>
              {(Array.isArray(d.soap_signed_notes)&&d.soap_signed_notes.length>0) ? (
                [...d.soap_signed_notes].reverse().slice(0,3).map((n,i,arr)=>(
                  <div key={n.id||i} style={{display:"flex",gap:12,padding:"10px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                    <div style={{width:36,height:36,borderRadius:9,background:"#FEF2F2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>🔒</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:700,color:C.text}}>{n.session} — {n.lockedAtDisplay}</div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(n.A||n.S||"—").slice(0,70)}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:10,color:"#dc2626",padding:"2px 7px",background:"#FEF2F2",borderRadius:99}}>LOCKED</div>
                      <div style={{fontSize:10,color:C.muted,marginTop:3}}>{n.clinician}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{textAlign:"center",padding:"20px 0",color:C.muted,fontSize:12}}>
                  No signed notes yet — open SOAP + AI to sign a note
                </div>
              )}
              {Array.isArray(d.rf_referral_log)&&d.rf_referral_log.length>0&&(
                <div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
                  <div style={{fontSize:12,fontWeight:700,color:"#dc2626",marginBottom:8}}>🚨 Referral Log ({d.rf_referral_log.length})</div>
                  {[...d.rf_referral_log].reverse().slice(0,2).map((r,i)=>(
                    <div key={r.id||i} style={{fontSize:11,color:C.text,padding:"5px 0",borderBottom:i===0&&d.rf_referral_log.length>1?`1px solid ${C.border}`:"none"}}>
                      <span style={{fontWeight:700}}>{r.documentedAtDisplay}</span> — {r.action}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── QUICK CLINICAL NOTES ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginTop:14,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:12,letterSpacing:"-0.3px"}}>📌 Clinical Notes</div>
              <QuickNotesWidget d={d} patient={patient} onSaveField={onSaveField} C={C}/>
            </div>
          </div>
        )}
        {/* ════════════════════════════════════════
            DEMOGRAPHICS TAB
        ════════════════════════════════════════ */}
        {tab==="demographics" && (
          <div className="tab-content" style={{padding:"16px",display:"flex",flexDirection:"column",gap:12}}>

            {/* ── PERSONAL DETAILS ── */}
            <div style={{background:C.white,borderRadius:16,padding:18,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <span style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:"-0.3px"}}>👤 Personal Details</span>
              </div>
              {[
                {l:"Full Name",       v:d.dem_name},
                {l:"Date of Birth",   v:d.dem_dob},
                {l:"Age",             v:d.dem_age?`${d.dem_age} years`:null},
                {l:"Sex",             v:d.dem_sex||d.dem_gender},
                {l:"Dominant Hand",   v:d.dem_hand},
                {l:"Occupation",      v:d.dem_occupation},
                {l:"Work Status",     v:Array.isArray(d.dem_work_status)?d.dem_work_status.join(", "):d.dem_work_status},
              ].filter(r=>r.v).map((row,i,arr)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                  <span style={{fontSize:11.5,color:C.muted,minWidth:120,flexShrink:0,paddingTop:1,fontWeight:500}}>{row.l}</span>
                  <span style={{fontSize:13,fontWeight:600,color:C.text,flex:1,lineHeight:1.4}}>{row.v}</span>
                </div>
              ))}
              {!(d.dem_name||d.dem_age||d.dem_sex) && (
                <div style={{textAlign:"center",padding:"16px 0",color:C.muted,fontSize:12}}>No personal details recorded yet.</div>
              )}
            </div>

            {/* ── CONTACT DETAILS ── */}
            {(d.dem_phone||d.dem_email||d.dem_address||d.dem_ec_name) && (
              <div style={{background:C.white,borderRadius:16,padding:18,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:14,letterSpacing:"-0.3px"}}>📞 Contact Details</div>
                {[
                  {l:"Phone",              v:d.dem_phone||d.dem_contact},
                  {l:"Email",              v:d.dem_email},
                  {l:"Address",            v:d.dem_address},
                  {l:"Emergency Contact",  v:d.dem_ec_name},
                  {l:"Emergency Phone",    v:d.dem_ec_phone},
                ].filter(r=>r.v).map((row,i,arr)=>(
                  <div key={i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                    <span style={{fontSize:11.5,color:C.muted,minWidth:120,flexShrink:0,paddingTop:1,fontWeight:500}}>{row.l}</span>
                    <span style={{fontSize:13,fontWeight:600,color:C.text,flex:1,lineHeight:1.4}}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── CLINICAL / REFERRAL ── */}
            {(d.dem_referral_dr||d.dem_referral||d.dem_referral_source||d.dem_insurance||d.dem_policy_no||d.dem_medical_hx||d.dem_medications||d.dem_gp) && (
              <div style={{background:C.white,borderRadius:16,padding:18,boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text,marginBottom:14,letterSpacing:"-0.3px"}}>📋 Clinical & Referral</div>
                {[
                  {l:"Referring Doctor",  v:d.dem_referral_dr||d.dem_gp||d.dem_referral},
                  {l:"Referral Source",   v:d.dem_referral_source},
                  {l:"Insurance / Fund",  v:d.dem_insurance},
                  {l:"Policy No.",        v:d.dem_policy_no},
                  {l:"Medical History",   v:d.dem_medical_hx},
                  {l:"Medications",       v:d.dem_medications||d.dem_medication},
                ].filter(r=>r.v).map((row,i,arr)=>(
                  <div key={i} style={{display:"flex",gap:12,padding:"9px 0",borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                    <span style={{fontSize:11.5,color:C.muted,minWidth:120,flexShrink:0,paddingTop:1,fontWeight:500}}>{row.l}</span>
                    <span style={{fontSize:13,fontWeight:600,color:C.text,flex:1,lineHeight:1.4}}>{row.v}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── CONSENT ── */}
            <div style={{background:d.consent_treat?"#ECFDF5":"#FFF7ED",border:`1px solid ${d.consent_treat?"#BBF7D0":"#FDE68A"}`,borderRadius:12,padding:"12px 16px",display:"flex",gap:10,alignItems:"center"}}>
              <span style={{fontSize:20}}>{d.consent_treat?"✅":"⚠️"}</span>
              <div>
                <div style={{fontSize:12,fontWeight:800,color:d.consent_treat?"#065F46":"#92400E"}}>Consent to Treatment</div>
                <div style={{fontSize:11,color:d.consent_treat?"#047857":"#B45309",marginTop:2}}>{d.consent_treat?"Consent obtained":"Consent not yet recorded"}</div>
              </div>
            </div>
          </div>
        )}
        {/* ════════════════════════════════════════
            ASSESSMENT TAB
        ════════════════════════════════════════ */}
        {tab==="subjective" && (
          <div className="tab-content" style={{padding:"16px",display:"flex",flexDirection:"column",gap:10}}>

            {/* ── PAIN MAP — from BodyChartPro (body_chart_pro) ── */}
            {(()=>{
              let entries=[],arrows=[];
              try{const cp=JSON.parse(d.body_chart_pro||"{}");entries=Array.isArray(cp.entries)?cp.entries:[];arrows=Array.isArray(cp.arrows)?cp.arrows:[];}catch{}
              const legacyMarkers=Array.isArray(d.body_chart)?d.body_chart:[];
              const SYM_COLOR={pain:"#ef4444",tingling:"#eab308",numbness:"#8b5cf6",burning:"#f97316",stiffness:"#3b82f6",weakness:"#22c55e",radiation:"#ec4899",swelling:"#06b6d4"};
              const SYM_BG={pain:"#FEF2F2",tingling:"#FEFCE8",numbness:"#F5F3FF",burning:"#FFF7ED",stiffness:"#EFF6FF",weakness:"#F0FDF4",radiation:"#FDF2F8",swelling:"#ECFEFF"};
              const SYM_TEXT={pain:"#991B1B",tingling:"#92400E",numbness:"#5B21B6",burning:"#9A3412",stiffness:"#1E40AF",weakness:"#166534",radiation:"#9D174D",swelling:"#164E63"};
              if(entries.length===0&&legacyMarkers.length===0) return null;
              const pills=entries.flatMap(e=>{const rl=(e.regionId||"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()).replace(/^Ant |^Post |^Left Lat |^Right Lat /,"").trim();return(e.symptoms||[]).map(sym=>({label:`${rl} — ${sym}`,sym,intensity:e.intensity}));});
              const legPills=legacyMarkers.map(m=>({label:`${(m.region||"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())} — ${m.type||"pain"}`,sym:m.type||"pain",intensity:null}));
              const allPills=[...pills,...legPills].slice(0,8);
              const BODY_IMG="https://res.cloudinary.com/dr15y1pwj/image/upload/f_auto,q_auto/body-chart-4view";
              // Use stored centroid if available (saved by BodyChartPro since latest version)
              const getXY=(e2)=>{
                if(e2.cx!=null&&e2.cy!=null) return {cx2:e2.cx,cy2:e2.cy};
                // fallback keyword estimate for older entries
                const rid=e2.regionId||"";
                let cx2=16,cy2=40;
                if(rid.startsWith("left_lat")) cx2=40; else if(rid.startsWith("right_lat")) cx2=60; else if(rid.startsWith("posterior")) cx2=82; else cx2=16;
                if(rid.includes("head")) cy2=5; else if(rid.includes("face")) cy2=8; else if(rid.includes("neck")) cy2=13; else if(rid.includes("shoulder")) cy2=20; else if(rid.includes("chest")||rid.includes("upper_back")) cy2=25; else if(rid.includes("arm")&&!rid.includes("forearm")) cy2=30; else if(rid.includes("mid_back")||rid.includes("lateral_thoracic")) cy2=30; else if(rid.includes("elbow")) cy2=36; else if(rid.includes("forearm")) cy2=42; else if(rid.includes("low_back")||rid.includes("abdomen")) cy2=40; else if(rid.includes("wrist")) cy2=48; else if(rid.includes("hand")) cy2=54; else if(rid.includes("hip")||rid.includes("gluteal")||rid.includes("groin")||rid.includes("si_joint")||rid.includes("sacrum")) cy2=50; else if(rid.includes("thigh")||rid.includes("hamstring")) cy2=60; else if(rid.includes("knee")) cy2=68; else if(rid.includes("lower_leg")||rid.includes("calf")) cy2=78; else if(rid.includes("ankle")) cy2=88; else if(rid.includes("foot")) cy2=95;
                return {cx2,cy2};
              };
              return(
                <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,overflow:"hidden",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 14px 10px"}}>
                    <span style={{fontSize:13,fontWeight:800,color:C.text}}>🗺️ Pain map</span>
                    <span onClick={()=>onNav&&onNav("subjective")} style={{fontSize:11.5,color:C.primary,fontWeight:700,cursor:"pointer"}}>Edit →</span>
                  </div>
                  <div style={{borderTop:`1px solid ${C.border}`}}>
                    <div style={{position:"relative",width:"100%",background:"#000",cursor:"pointer"}}
                      onClick={()=>onNav&&onNav("subjective")}>
                      <img src={BODY_IMG} alt="Body chart" style={{width:"100%",display:"block",opacity:0.92}}
                        onError={e=>e.target.style.display="none"}/>
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
                        style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}>
                        <defs><marker id="pf-arr" markerWidth="5" markerHeight="4" refX="3" refY="2" orient="auto"><path d="M0,0 L5,2 L0,4 Z" fill="#ec4899" opacity="0.8"/></marker></defs>
                        {arrows.map((a,i2)=>(<line key={i2} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="#ec4899" strokeWidth="0.5" strokeDasharray="1.5,1" opacity="0.8" markerEnd="url(#pf-arr)"/>))}
                        {entries.map((e,i2)=>{
                          const col=SYM_COLOR[e.symptoms?.[0]]||"#ef4444";
                          const {cx2,cy2}=getXY(e);
                          return(<g key={i2}><circle cx={cx2} cy={cy2} r="1.8" fill={col} opacity="0.95"/><circle cx={cx2} cy={cy2} r="3.2" fill={col} opacity="0.2"/>{e.symptoms&&e.symptoms.length>1&&<text x={cx2+2.2} y={cy2-2} fontSize="1.5" fontWeight="bold" fill="#fff">+{e.symptoms.length-1}</text>}</g>);
                        })}
                        {legacyMarkers.map((m,i2)=>{const col=SYM_COLOR[m.type]||"#ef4444";const cx2=m.x!=null?m.x:16,cy2=m.y!=null?m.y:40;return <circle key={"l"+i2} cx={cx2} cy={cy2} r="1.8" fill={col} opacity="0.9"/>;})}
                      </svg>
                      <div style={{position:"absolute",bottom:6,right:8,fontSize:9,color:"rgba(255,255,255,0.6)"}}>Tap to edit</div>
                    </div>
                    <div style={{padding:"10px 12px"}}>
                      <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                        {allPills.map((p2,i2)=>(<span key={i2} style={{padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,background:SYM_BG[p2.sym]||"#F9FAFB",color:SYM_TEXT[p2.sym]||C.muted}}>{p2.label}{p2.intensity?` · ${p2.intensity}/10`:""}</span>))}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
                        <div style={{background:"#FFFFFF",borderRadius:9,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Pain now</div>
                          <div style={{fontSize:20,fontWeight:900,lineHeight:1,color:parseFloat(d.cc_vas_now)>=7?"#dc2626":parseFloat(d.cc_vas_now)>=4?C.orange:C.green}}>{d.cc_vas_now||"—"}<span style={{fontSize:10,color:C.muted,fontWeight:400}}>/10</span></div>
                        </div>
                        <div style={{background:"#FFFFFF",borderRadius:9,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Worst</div>
                          <div style={{fontSize:20,fontWeight:900,lineHeight:1,color:"#dc2626"}}>{d.cc_vas_worst||d.pa_vas_worst||"—"}<span style={{fontSize:10,color:C.muted,fontWeight:400}}>/10</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* ── CLINICAL HISTORY — region-specific cards ── */}
            {(()=>{
              const PREFIX_MAP = {"Cervical spine":"cx","Lumbar / SI":"lx","Shoulder (L)":"shl","Shoulder (R)":"shr","Knee (L)":"knl","Knee (R)":"knr","Hip / Groin":"hp","Ankle / Foot":"af","Elbow/Wrist/Hand":"ew","Thoracic spine":"tx"};
              const RC_PROF   = {"Cervical spine":"#7c3aed","Lumbar / SI":"#dc2626","Shoulder (L)":"#0891b2","Shoulder (R)":"#06b6d4","Hip / Groin":"#d946ef","Knee (L)":"#f59e0b","Knee (R)":"#eab308","Ankle / Foot":"#16a34a","Elbow/Wrist/Hand":"#059669","Thoracic spine":"#d97706"};
              const selRegions = (()=>{ try{ return JSON.parse(d.cx_selected_regions||"[]"); }catch{ return []; } })();
              const multiVal = v => (typeof v==="string"?v.split("|").filter(Boolean):Array.isArray(v)?v:[]).join(", ");
              const anyRF = selRegions.some(r=>{ const px=PREFIX_MAP[r]; return px&&(d[`${px}_rf_action`]||d[`${px}_rf_review`]); }) || d.cc_red_flags || d.grf_action;
              return (
                <div>
                  {/* Red flag banner */}
                  {anyRF&&(
                    <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:12,padding:"10px 14px",marginBottom:10,display:"flex",gap:10,alignItems:"center"}}>
                      <span style={{fontSize:18}}>🚨</span>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:"#A32D2D"}}>Red Flag Documented</div>
                        <div style={{fontSize:11,color:"#A32D2D",marginTop:2}}>
                          {selRegions.filter(r=>{ const px=PREFIX_MAP[r]; return px&&(d[`${px}_rf_action`]||d[`${px}_rf_review`]); }).map(r=>{
                            const px=PREFIX_MAP[r]; return `${r}: ${d[`${px}_rf_action`]||d[`${px}_rf_review`]||""}`;
                          }).join(" · ") || d.cc_red_flags || d.grf_action || "Review required"}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Core card */}
                  <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 14px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)",marginBottom:10}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:13,fontWeight:800,color:C.text}}>📋 Clinical history</span>
                      <span onClick={()=>onNav&&onNav("subjective")} style={{fontSize:11.5,color:C.primary,fontWeight:700,cursor:"pointer"}}>Edit →</span>
                    </div>
                    {[
                      {l:"Chief complaint", v:d.cc_main||d.cc_dx||""},
                      {l:"Onset", v:[d.cc_onset_date||d.cx_onset_date||(Array.isArray(d.cc_onset)?d.cc_onset[0]:d.cc_onset),d.cc_mechanism||d.cc_mech_type].filter(Boolean).join(" · ")},
                      {l:"Duration", v:d.cc_duration||""},
                      {l:"24-hr pattern", v:d.cc_24hr||d.cc_behaviour||""},
                      {l:"Goals", v:[d.ar_goal_function,d.ar_goal_pain,d.ar_goal_return].filter(Boolean).join("; ")||d.sub_goals||""},
                      {l:"Past history", v:d.phx_conditions||d.sub_past_history||d.hx_past||""},
                      // medications shown below as pills
                    ].filter(row=>row.v).map((row,i2)=>(
                      <div key={i2} style={{display:"flex",gap:10,padding:"7px 0",borderBottom:`1px solid ${C.border}`,alignItems:"flex-start"}}>
                        <span style={{fontSize:11.5,color:C.muted,minWidth:110,flexShrink:0,paddingTop:1}}>{row.l}</span>
                        <span style={{fontSize:12,fontWeight:500,color:C.text,lineHeight:1.5,flex:1}}>{row.v}</span>
                      </div>
                    ))}
                    {/* Medications as pills */}
                    {(d.med_current||d.sub_medications)&&(
                      <div style={{paddingTop:6}}>
                        <span style={{fontSize:11.5,color:C.muted}}>Medications</span>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:5}}>
                          {(Array.isArray(d.med_current||d.sub_medications)?(d.med_current||d.sub_medications):(d.med_current||d.sub_medications||"").split("|")).filter(Boolean).map((m,mi)=>(
                            <span key={mi} style={{fontSize:11,padding:"3px 9px",background:"#EDE9FE",color:"#5B21B6",borderRadius:99,fontWeight:600}}>{m.trim()}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Per-region subjective cards */}
                  {selRegions.length>0 ? selRegions.map((region,ri)=>{
                    const px=PREFIX_MAP[region]; if(!px) return null;
                    const col=RC_PROF[region]||C.primary;
                    const aggMovs  = multiVal(d[`${px}_agg_mov`]||d[`${px}_agg`]);
                    const aggPosts = multiVal(d[`${px}_agg_post`]);
                    const aggActs  = multiVal(d[`${px}_agg_act`]);
                    const relMovs  = multiVal(d[`${px}_rel_mov`]||d[`${px}_rel`]);
                    const relPosts = multiVal(d[`${px}_rel_post`]);
                    const pattern24= d[`${px}_24hr`]||d[`${px}_behaviour`]||"";
                    const trajectory= d[`${px}_trajectory`]||"";
                    const irritability= d[`${px}_irritability`]||d[`${px}_sin`]||"";
                    const fnAdl    = multiVal(d[`${px}_fn_adl`]);
                    const fnWork   = d[`${px}_fn_work`]||"";
                    const rfAction = d[`${px}_rf_action`]||d[`${px}_rf_review`]||"";
                    const rows = [
                      aggMovs&&{l:"Aggravating movements",v:aggMovs,col:"#A32D2D",bg:"#FEF2F2"},
                      aggPosts&&{l:"Aggravating postures",v:aggPosts,col:"#A32D2D",bg:"#FEF2F2"},
                      aggActs&&{l:"Aggravating activities",v:aggActs,col:"#A32D2D",bg:"#FEF2F2"},
                      relMovs&&{l:"Easing movements",v:relMovs,col:"#085041",bg:"#ECFDF5"},
                      relPosts&&{l:"Easing postures",v:relPosts,col:"#085041",bg:"#ECFDF5"},
                      pattern24&&{l:"24-hr pattern",v:pattern24},
                      trajectory&&{l:"Trajectory",v:trajectory},
                      irritability&&{l:"Irritability (Maitland)",v:irritability},
                      fnAdl&&{l:"ADL limitations",v:fnAdl},
                      fnWork&&{l:"Work impact",v:fnWork},
                      rfAction&&{l:"⚠️ Red flag action",v:rfAction,col:"#A32D2D",bg:"#FEF2F2"},
                    ].filter(Boolean);
                    if(rows.length===0) return null;
                    return (
                      <div key={ri} style={{background:"#fff",borderRadius:14,border:`2px solid ${col}30`,padding:"12px 14px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)",marginBottom:10}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                          <div style={{width:10,height:10,borderRadius:"50%",background:col,flexShrink:0}}/>
                          <span style={{fontSize:13,fontWeight:800,color:col}}>{region}</span>
                          <span style={{fontSize:10,color:C.muted,marginLeft:"auto",fontWeight:600}}>Subjective assessment</span>
                        </div>
                        {rows.map((row,i2)=>(
                          <div key={i2} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:i2<rows.length-1?`1px solid ${C.border}`:"none",alignItems:"flex-start"}}>
                            <span style={{fontSize:11,color:C.muted,minWidth:130,flexShrink:0,paddingTop:1}}>{row.l}</span>
                            <span style={{fontSize:11.5,fontWeight:500,color:row.col||C.text,background:row.bg,borderRadius:row.bg?99:0,padding:row.bg?"2px 8px":0,lineHeight:1.5,flex:1}}>
                              {row.v}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }) : (
                    <div style={{background:"#FFFFFF",borderRadius:12,padding:"12px 14px",border:`1px dashed ${C.border}`,textAlign:"center",marginBottom:10}}>
                      <div style={{fontSize:11.5,color:C.muted}}>No regions selected in subjective assessment.</div>
                      <span onClick={()=>onNav&&onNav("subjective")} style={{fontSize:11,color:C.primary,fontWeight:700,cursor:"pointer"}}>Add →</span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ── SOAP SUBJECTIVE ── */}
            {(d.soap_s||d.soap_extra_s)&&(
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 14px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>📝 SOAP — Subjective</span>
                  <span onClick={()=>onNav&&onNav("soap")} style={{fontSize:11.5,color:C.primary,fontWeight:700,cursor:"pointer"}}>Open →</span>
                </div>
                <div style={{fontSize:12,color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap",borderLeft:`3px solid ${C.primary}`,paddingLeft:10}}>
                  {(d.soap_s||d.soap_extra_s||"").slice(0,400)}{(d.soap_s||d.soap_extra_s||"").length>400?"…":""}
                </div>
              </div>
            )}

            {/* ── OBSERVATION (from obs_ fields) ── */}
            {Object.keys(d).some(k=>k.startsWith("obs_")&&k!=="obs_snapshots"&&d[k])&&(
              <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.border}`,padding:"12px 14px",boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:13,fontWeight:800,color:C.text}}>👁️ Observation</span>
                  <span onClick={()=>onNav&&onNav("observation")} style={{fontSize:11.5,color:C.primary,fontWeight:700,cursor:"pointer"}}>Edit →</span>
                </div>
                {d.obs_summary&&<div style={{fontSize:12,color:C.text,lineHeight:1.65,marginBottom:8,fontStyle:"italic",borderLeft:`3px solid ${C.secondary}`,paddingLeft:10}}>{d.obs_summary}</div>}
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[
                    // Was missing entirely -- the "General Observation" section
                    // (appearance/consciousness/attitude/build/nutrition) is a
                    // real part of ObservationModule's own UI (the section
                    // shown open by default), but this list only ever included
                    // the Posture/Physical Exam fields below it. Confirmed via
                    // a real E2E test that recorded "obs_appearance" and found
                    // it never appeared here despite the section header showing.
                    d.obs_appearance&&{l:"Appearance",v:d.obs_appearance,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_consciousness&&d.obs_consciousness!=="Alert"&&{l:"Consciousness",v:d.obs_consciousness,col:"#92400E",bg:"#FEF3C7",bdr:"#EF9F27"},
                    d.obs_attitude&&d.obs_attitude!=="Cooperative"&&{l:"Attitude",v:d.obs_attitude,col:"#92400E",bg:"#FEF3C7",bdr:"#EF9F27"},
                    d.obs_build&&{l:"Build",v:d.obs_build,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_nutrition&&d.obs_nutrition!=="Normal"&&{l:"Nutrition",v:d.obs_nutrition,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_general_notes&&{l:"General notes",v:d.obs_general_notes,col:C.text,bg:"#F9FAFB",bdr:C.border},
                    d.obs_swelling_present==="Present"&&{l:"Swelling",v:`${d.obs_swelling_severity||""} ${d.obs_swelling_type||""}${d.obs_swelling_location?" · "+d.obs_swelling_location:""}`.trim(),col:"#A32D2D",bg:"#FEF2F2",bdr:"#E24B4A"},
                    d.obs_muscle_bulk&&d.obs_muscle_bulk!=="Symmetrical"&&{l:"Muscle bulk",v:`${d.obs_muscle_bulk}${d.obs_muscle_location?" · "+d.obs_muscle_location:""}`,col:"#92400E",bg:"#FEF3C7",bdr:"#EF9F27"},
                    d.obs_deformity&&d.obs_deformity!=="None"&&{l:"Deformity",v:`${d.obs_deformity}${d.obs_deformity_location?" · "+d.obs_deformity_location:""}`,col:"#A32D2D",bg:"#FEF2F2",bdr:"#E24B4A"},
                    d.obs_skin&&d.obs_skin!=="Normal"&&{l:"Skin",v:`${d.obs_skin}${d.obs_skin_location?" · "+d.obs_skin_location:""}`,col:"#085041",bg:"#ECFDF5",bdr:"#1D9E75"},
                    d.obs_posture_head&&d.obs_posture_head!=="Neutral"&&{l:"Head/Neck",v:d.obs_posture_head,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_shoulders&&d.obs_posture_shoulders!=="Symmetrical"&&{l:"Shoulders",v:d.obs_posture_shoulders,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_scapula&&d.obs_posture_scapula!=="Normal"&&{l:"Scapula",v:d.obs_posture_scapula,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_thoracic&&d.obs_posture_thoracic!=="Normal"&&{l:"Thoracic",v:d.obs_posture_thoracic,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_lumbar&&d.obs_posture_lumbar!=="Normal"&&{l:"Lumbar",v:d.obs_posture_lumbar,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_pelvis&&d.obs_posture_pelvis!=="Neutral"&&{l:"Pelvis",v:d.obs_posture_pelvis,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_lower&&d.obs_posture_lower!=="Normal"&&{l:"Knees",v:d.obs_posture_lower,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_feet&&d.obs_posture_feet!=="Neutral"&&{l:"Feet",v:d.obs_posture_feet,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_assistive&&d.obs_assistive!=="None"&&{l:"Assistive device",v:d.obs_assistive,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_gait&&d.obs_gait!=="Normal"&&{l:"Gait",v:d.obs_gait,col:"#92400E",bg:"#FEF3C7",bdr:"#EF9F27"},
                    d.obs_posture_notes&&{l:"Notes",v:d.obs_posture_notes,col:C.text,bg:"#F9FAFB",bdr:C.border},
                  ].filter(Boolean).map((r2,i2)=>(
                    <div key={i2} style={{padding:"7px 10px",background:r2.bg,borderLeft:`3px solid ${r2.bdr}`,borderRadius:"0 8px 8px 0"}}>
                      <span style={{fontSize:10.5,fontWeight:700,color:r2.col,marginRight:6}}>{r2.l}</span>
                      <span style={{fontSize:12,color:r2.col}}>{r2.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="assessment" && (
          <div className="tab-content" style={{padding:"16px 16px"}}>

            {/* ── Completeness strip ── */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14,padding:"10px 12px",background:"#F8F7FF",borderRadius:12,border:`1px solid ${C.border}`}}>
              {[
                {label:"ROM",          done:Object.keys(d).some(k=>k.startsWith("rom_")&&k!=="rom_snapshots"&&d[k]),  nav:"rom"},
                {label:"MMT",          done:Object.keys(d).some(k=>k.startsWith("mmt_")&&d[k]),                         nav:"mmt"},
                {label:"Special Tests",done:Object.keys(d).some(k=>k.startsWith("st_")&&d[k]),                          nav:"special"},
                {label:"Neuro",        done:Object.keys(d).some(k=>(k.startsWith("n_ref_")||k.startsWith("n_der_")||k.startsWith("n_myot_")||k.startsWith("nt_")||/^myo_/.test(k)||/^n_(c|t|l|s)/.test(k))&&typeof d[k]==="string"&&d[k]), nav:"neuro"},
                {label:"Kinetic Chain",done:Object.keys(d).some(k=>k.startsWith("kc_")&&d[k]),                          nav:"kinetic"},
                {label:"Fascia",       done:Object.keys(d).some(k=>k.startsWith("fa_")&&d[k]),                          nav:"fascia"},
                {label:"Outcomes",     done:Object.keys(d).some(k=>k.startsWith("om_history_")&&d[k]),                  nav:"outcome"},
              ].map((item,i)=>(
                <div key={i} onClick={()=>onNav&&onNav(item.nav)}
                  style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,cursor:"pointer",
                    background:item.done?`${C.green}15`:"#F3F4F6",border:`1px solid ${item.done?C.green+"40":C.border2}`}}>
                  <div style={{width:14,height:14,borderRadius:"50%",background:item.done?C.green:"#D1D5DB",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{fontSize:8,color:"white",fontWeight:900,lineHeight:1}}>{item.done?"✓":"·"}</span>
                  </div>
                  <span style={{fontSize:10.5,fontWeight:700,color:item.done?C.green:C.muted}}>{item.label}</span>
                </div>
              ))}
              <div style={{marginLeft:"auto"}}>
                <button onClick={()=>onNav&&onNav("soap")} style={{padding:"4px 12px",background:C.primary,border:"none",borderRadius:20,color:"white",fontSize:10.5,fontWeight:800,cursor:"pointer"}}>📝 SOAP</button>
              </div>
            </div>

            {/* helper: clickable section card */}
            {(()=>{
              const Sec=({icon,title,navKey,hasData,children,emptyMsg,emptyNav})=>(
                <div onClick={()=>onNav&&onNav(navKey)}
                  style={{background:C.white,borderRadius:14,padding:14,marginBottom:10,
                    boxShadow:"0 1px 6px rgba(0,0,0,0.05)",cursor:"pointer",
                    border:`1px solid ${C.border}`,transition:"box-shadow 0.15s"}}
                  onMouseEnter={e=>e.currentTarget.style.boxShadow="0 3px 12px rgba(124,58,237,0.12)"}
                  onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,0.05)"}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:hasData?10:0}}>
                    <span style={{fontSize:12,fontWeight:800,color:C.text}}>{icon} {title}</span>
                    <span style={{fontSize:11,color:C.primary,fontWeight:700}}>
                      {hasData?"Open →":"Add →"}
                    </span>
                  </div>
                  {hasData ? children : (
                    <div style={{textAlign:"center",padding:"8px 0",color:C.muted,fontSize:11}}>
                      {emptyMsg||"Not recorded yet — tap to add"}
                    </div>
                  )}
                </div>
              );

              // Neuro label helpers — imported from PhysioNeuro.jsx
              const romKeys = Object.keys(d).filter(k=>k.startsWith("rom_")&&k!=="rom_snapshots"&&d[k]);
              const mmtKeys = Object.keys(d).filter(k=>k.startsWith("mmt_")&&d[k]&&!k.endsWith("_pain")&&!k.endsWith("_ef"));
              // Special tests: st_* AND regional keys (cx_spurling, lx_slr_*, shr_stt_*, knl_stt_*, af_stt_*)
              const stKeys  = Object.keys(d).filter(k=>d[k]&&(k.startsWith("st_")||/^(cx|lx|shr|shl|knl|knr|af|hp|ew)_stt_/.test(k)||/^(cx_spurling|cx_distraction|cx_rf_vbi|lx_slr_l|lx_slr_r|lx_slump|lx_femoral|shr_stt|knl_stt|af_stt)/.test(k)));
              // Neuro: n_* dermatome/myotome/reflex fields from Neuro module
              const neuroKeys = Object.keys(d).filter(k=>typeof d[k]==="string"&&d[k]&&(
                /^n_(c|t|l|s)\d/.test(k)||k.startsWith("n_ref_")||k.startsWith("n_der_")||
                k.startsWith("n_myot_")||/^myo_/.test(k)||/^nt_/.test(k)||
                /^(n_biceps|n_triceps|n_patella|n_achilles|n_babinski|n_brachio)$/.test(k)||
                k.startsWith("neuro_")||k.startsWith("nrf_")
              ));
              const kcKeys  = Object.keys(d).filter(k=>k.startsWith("kc_")&&d[k]);
              const faKeys  = Object.keys(d).filter(k=>(k.startsWith("fa_")||k.startsWith("fascia_"))&&d[k]);
              // Was cy_ only -- missed every real cyriax_<region>_<fieldtype>_<testid>
              // key entirely (the actual format CyriaxModule writes), so STTT
              // data recorded via the real per-region exam never appeared here.
              const cyKeys  = Object.keys(d).filter(k=>(k.startsWith("cy_")||k.startsWith("cyriax_"))&&d[k]);
              const nktKeys = Object.keys(d).filter(k=>k.startsWith("nkt_")&&d[k]);
              const obsKeys = Object.keys(d).filter(k=>k.startsWith("obs_")&&k!=="obs_snapshots"&&d[k]);
              // Outcome measures: om_history_* OR om_psfs_* / om_ndi_* / ndi_score / psfs_score etc
              const omKeys  = Object.keys(d).filter(k=>d[k]&&(k.startsWith("om_history_")||k.startsWith("om_psfs_")||k.startsWith("om_ndi_")||k.startsWith("om_koos_")||k.startsWith("om_dash_")||k.startsWith("om_lefs_")||/^(ndi_score|psfs_score|koos_score|dash_score|lefs_score|om_odi_score|om_report)$/.test(k)));
              const hasGait = !!(d.ag_antalgic||d.gait_pattern||d.g_rom_findings);
              // Palpation pins are already self-describing (label/structures/
              // tenderness/temp/texture/notes/side set by PalpationModule
              // itself) -- no separate label map needed, just parse and render.
              let palpPins=[];try{palpPins=JSON.parse(d.palp_pins||"[]");}catch{}
              const hasErgo = !!(d.ergo_total_score||d.ergo_cervical_risk);

              return (
                <div>

                  {/* ── ROM ── */}
                  <Sec icon="📐" title="Range of Motion" navKey="rom" hasData={romKeys.length>0}>
                    {(()=>{
                      const filtered=romKeys.filter(k=>!k.endsWith("_pain")&&!k.endsWith("_ef"));
                      return(
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                          {filtered.slice(0,8).map(k=>{
                            const val=parseFloat(d[k])||0;
                            // Strip mode/suffix first, then detect+strip side
                            const noSuffix=k.replace(/_arom|_prom|_active|_passive/,"");
                            const sideMt=noSuffix.match(/_(L|R|left|right)$/);
                            const baseKey=sideMt?noSuffix.slice(0,noSuffix.length-sideMt[0].length):noSuffix;
                            const side=sideMt?(/_(L|left)$/.test(noSuffix)?" (L)":" (R)"):"";
                            const mode=k.includes("_passive")?" passive":"";
                            const entry=ROM_LABEL_MAP[baseKey];
                            const labelText=(entry?entry.l:baseKey.replace(/^rom_/,"").replace(/_/g," "))+side+mode;
                            const normalVal=entry?entry.n:null;
                            const pct=normalVal?Math.min(100,(val/normalVal)*100):null;
                            const numCol=pct===null?"#7c3aed":pct>=85?"#1D9E75":pct>=66?"#EF9F27":"#E24B4A";
                            return(
                              <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 14px",background:"#F9FAFB",border:`1px solid ${C.border}`,borderRadius:8}}>
                                <div style={{flex:1,minWidth:0,paddingRight:8}}>
                                  <div style={{fontSize:12,fontWeight:500,color:C.text,lineHeight:1.3}}>{labelText}</div>

                                </div>
                                <div style={{flexShrink:0,textAlign:"right"}}>
                                  <span style={{fontSize:18,fontWeight:500,color:"#7c3aed"}}>{val>0?val:parseFloat(d[k])||"—"}</span><span style={{fontSize:10,color:C.muted}}>°</span>
                                </div>
                              </div>
                            );
                          })}
                          {filtered.length>8&&(
                            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:10,background:"#F9FAFB",border:`1px solid ${C.border}`,borderRadius:8}}>
                              <span style={{fontSize:11,color:C.muted}}>+{filtered.length-8} more</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── MMT ── */}
                  <Sec icon="💪" title="Manual Muscle Testing" navKey="mmt" hasData={mmtKeys.length>0}>
                    {(()=>{
                      // Pair L and R for each muscle. Keys are stored as mmt_<id>_L / mmt_<id>_R
                      // (capital, from MMTModule) — legacy _left/_right also supported.
                      const seen=new Set(), rows=[];
                      mmtKeys.forEach(k=>{
                        const sideMatch=k.match(/_(L|R|left|right)$/);
                        const base=sideMatch?k.slice(0,k.length-sideMatch[0].length):k;
                        if(seen.has(base)) return; seen.add(base);
                        const lGrade=d[base+"_L"]||d[base+"_left"]||(sideMatch?null:d[base]);
                        const rGrade=d[base+"_R"]||d[base+"_right"]||null;
                        const labelBase=base.replace(/^mmt_mmt_/,"mmt_");
                        const info=MMT_INFO[labelBase];
                        // Same real source SOAP already uses (MMT_DATA_LABELS,
                        // derived straight from MMT_DATA) instead of the
                        // separate hand-copied MMT_LABEL_MAP that produced
                        // raw, barely-capitalized fragments like "Ecrb" for
                        // any muscle it didn't happen to list.
                        const muscle=(info&&info.name)||MMT_DATA_LABELS[labelBase]||MMT_LABEL_MAP[labelBase]||mmtFallbackLabel(labelBase.replace(/^mmt_/,""));
                        rows.push({base,muscle,root:(info&&info.root)||"",lGrade,rGrade});
                      });
                      const gradeCol=g=>{const n=parseFloat(g)||0;return n>=5?C.green:n>=4?"#d97706":"#dc2626";};
                      const gradeBg =g=>{const n=parseFloat(g)||0;return n>=5?"#ECFDF5":n>=4?"#FEF3C7":"#FEF2F2";};
                      const Pill=({g})=>g
                        ?(<span style={{display:"inline-block",minWidth:46,padding:"3px 8px",borderRadius:99,background:gradeBg(g),fontSize:14,fontWeight:800,color:gradeCol(g)}}>{g}<span style={{fontSize:9.5,fontWeight:600,opacity:0.65}}>/5</span></span>)
                        :(<span style={{fontSize:13,color:"#D1D5DB"}}>—</span>);
                      return(
                        <div style={{display:"flex",flexDirection:"column",gap:0}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 72px 72px",gap:4,padding:"4px 8px 6px",marginBottom:2,borderBottom:`1px solid ${C.border}`}}>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Muscle</div>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.5px"}}>Left</div>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.5px"}}>Right</div>
                          </div>
                          {rows.slice(0,10).map((r,i)=>(
                            <div key={r.base} style={{display:"grid",gridTemplateColumns:"1fr 72px 72px",gap:4,padding:"8px",background:i%2===0?"#F9FAFB":"#fff",borderRadius:6,alignItems:"center"}}>
                              <div>
                                <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.25}}>{r.muscle}</div>
                                {r.root&&<div style={{fontSize:10,color:C.muted,marginTop:1}}>{r.root}</div>}
                              </div>
                              <div style={{textAlign:"center"}}><Pill g={r.lGrade}/></div>
                              <div style={{textAlign:"center"}}><Pill g={r.rGrade}/></div>
                            </div>
                          ))}
                          {rows.length>10&&<div style={{fontSize:11,color:C.muted,padding:"4px 8px"}}>+{rows.length-10} more muscles</div>}
                          <div style={{display:"flex",gap:14,padding:"8px 8px 0",borderTop:`1px solid ${C.border}`,marginTop:6}}>
                            {[["#10B981","5 Normal"],["#d97706","4 Good"],["#dc2626","≤3 Weak"]].map(([c2,t2])=>(
                              <span key={t2} style={{fontSize:10.5,color:C.muted,display:"flex",alignItems:"center",gap:4}}>
                                <span style={{width:8,height:8,borderRadius:"50%",background:c2,display:"inline-block"}}/>{t2}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── Special Tests ── */}
                  <Sec icon="🔬" title="Special Tests" navKey="special" hasData={stKeys.length>0}>
                    {(()=>{
                      const seen=new Set(), rows=[];
                      stKeys.forEach(k=>{
                        const sideMatch=k.match(/_(left|right)$/);
                        const base=sideMatch?k.slice(0,k.length-sideMatch[0].length):k;
                        if(seen.has(base)) return; seen.add(base);
                        const lRaw=d[base+"_left"]||null, rRaw=d[base+"_right"]||null, cRaw=sideMatch?null:d[base];
                        const name=ST_DATA_LABELS[base]||SPECIAL_TEST_NAMES[base]||base.replace(/^st_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
                        rows.push({base,name,lRaw,rRaw,cRaw});
                      });
                      const isP=v=>!!v&&v.includes("Positive");
                      rows.sort((a,b)=>([a.lRaw,a.rRaw,a.cRaw].some(isP)?0:1)-([b.lRaw,b.rRaw,b.cRaw].some(isP)?0:1));
                      const STPill=({v,wide})=>{
                        if(!v||typeof v!=="string") return <span style={{fontSize:12,color:"#D1D5DB"}}>—</span>;
                        const pos=v.includes("Positive"), neg=v.includes("Negative");
                        const txt=wide?(v.split(" — ")[0].split(" (")[0]):(pos?"+ve":neg?"−ve":v.split(" — ")[0].slice(0,10));
                        return <span style={{display:"inline-block",padding:"2px 10px",borderRadius:99,fontSize:11,fontWeight:800,
                          background:pos?"#FEF2F2":neg?"#ECFDF5":"#F3F4F6",color:pos?"#dc2626":neg?C.green:C.muted}}>{txt}</span>;
                      };
                      return(
                        <div style={{display:"flex",flexDirection:"column",gap:0}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 72px 72px",gap:4,padding:"4px 8px 6px",marginBottom:2,borderBottom:`1px solid ${C.border}`}}>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Test</div>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.5px"}}>Left</div>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.5px"}}>Right</div>
                          </div>
                          {rows.slice(0,10).map((r,i2)=>(
                            <div key={r.base} style={{display:"grid",gridTemplateColumns:r.cRaw?"1fr 148px":"1fr 72px 72px",gap:4,padding:"8px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:6,alignItems:"center"}}>
                              <div style={{fontSize:13,fontWeight:700,color:C.text,lineHeight:1.25}}>{r.name}</div>
                              {r.cRaw
                                ?<div style={{textAlign:"center"}}><STPill v={r.cRaw} wide/></div>
                                :<><div style={{textAlign:"center"}}><STPill v={r.lRaw}/></div>
                                  <div style={{textAlign:"center"}}><STPill v={r.rRaw}/></div></>}
                            </div>
                          ))}
                          {rows.length>10&&<div style={{fontSize:11,color:C.muted,padding:"4px 8px"}}>+{rows.length-10} more tests</div>}
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── Palpation ── */}
                  {/* Previously had NO section anywhere in Patient Profile at
                      all -- palp_pins data (structured findings from
                      PalpationModule's body-map pins) never appeared here,
                      even though it's fully recorded and already used
                      elsewhere (SOAP note). Each pin is self-describing
                      already (label/structures/tenderness/temp/texture/side),
                      so no separate label lookup is needed here. */}
                  <Sec icon="🖐️" title="Palpation" navKey="palpation" hasData={palpPins.length>0}>
                    {(()=>{
                      if(!palpPins.length) return null;
                      const abnTemp=t=>t&&/warm|hot|cold/i.test(t);
                      const abnTend=t=>t&&/severe|moderate|tender/i.test(t);
                      return(
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {palpPins.slice(0,10).map((p,i2)=>{
                            const abn=abnTend(p.tenderness)||abnTemp(p.temp);
                            return(
                              <div key={p.id||i2} style={{padding:"8px 10px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,marginBottom:3}}>
                                  <span style={{fontSize:12.5,fontWeight:700,color:C.text}}>{p.label||"Palpation site"}</span>
                                  {p.side&&<span style={{fontSize:9.5,fontWeight:700,padding:"1px 7px",borderRadius:99,background:"#EDE9FE",color:C.primary,flexShrink:0}}>{p.side}</span>}
                                </div>
                                {p.structures&&<div style={{fontSize:10.5,color:C.muted,marginBottom:4}}>{p.structures}</div>}
                                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                                  {p.tenderness&&<span style={{fontSize:10.5,fontWeight:700,padding:"2px 8px",borderRadius:99,background:abnTend(p.tenderness)?"#FEF2F2":"#ECFDF5",color:abnTend(p.tenderness)?"#dc2626":C.green}}>{p.tenderness}</span>}
                                  {p.temp&&<span style={{fontSize:10.5,fontWeight:700,padding:"2px 8px",borderRadius:99,background:abnTemp(p.temp)?"#FEF3C7":"#ECFDF5",color:abnTemp(p.temp)?"#92400E":C.green}}>{p.temp}</span>}
                                  {(p.texture||[]).map((tx,ti)=><span key={ti} style={{fontSize:10.5,fontWeight:700,padding:"2px 8px",borderRadius:99,background:"#F3F4F6",color:C.muted}}>{tx}</span>)}
                                </div>
                                {p.notes&&<div style={{fontSize:11,color:C.text,marginTop:5,lineHeight:1.4}}>{p.notes}</div>}
                              </div>
                            );
                          })}
                          {palpPins.length>10&&<div style={{fontSize:10.5,color:C.muted,padding:"2px 8px"}}>+{palpPins.length-10} more sites</div>}
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── Neurological ── */}
                  <Sec icon="⚡" title="Neurological" navKey="neuro" hasData={neuroKeys.length>0||!!d.neuro_clinician_notes||!!d.gcs_eye}>
                    {(()=>{
                      // Group into Reflexes / Dermatomes / Myotomes / Neural
                      // Tension with L/R pairing. Neural Tension (nt_ keys)
                      // was previously NOT one of the explicit branches below
                      // -- the catch-all "else" branch dumped every
                      // unrecognized key into Dermatomes, which is exactly
                      // why a real Neural Tension test (e.g. "NT SLR") showed
                      // up under the DERMATOMES heading in a live screenshot.
                      const seen=new Set(); const groups={Dermatomes:[],Myotomes:[],Reflexes:[],"Neural Tension":[]};
                      neuroKeys.forEach(k=>{
                        const sideMatch=k.match(/_(left|right)$/);
                        const base=sideMatch?k.slice(0,k.length-sideMatch[0].length):k;
                        if(seen.has(base)) return; seen.add(base);
                        const lVal=d[base+"_left"]||null, rVal=d[base+"_right"]||null, cVal=sideMatch?null:d[base];
                        let group,label,sub="";
                        if(base.startsWith("n_ref_")){
                          group="Reflexes";
                          const rf=(REFLEXES||[]).find(r=>r.id===base);
                          label=rf?rf.label:base.replace(/^n_ref_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
                          sub=rf?rf.level:"";
                        } else if(base.startsWith("myo_")){
                          group="Myotomes";
                          const my=(MYOTOMES||[]).find(m=>("myo_"+m.level.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase())===base);
                          label=my?`${my.level} — ${my.action}`:base.replace(/^myo_/,"").replace(/_/g,"–").toUpperCase();
                          sub=my?my.test:"";
                        } else if(base.startsWith("nt_")){
                          group="Neural Tension";
                          const nt=(NEURAL_TENSION||[]).find(n=>n.id===base);
                          label=nt?nt.label:base.replace(/^nt_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
                          sub=nt&&nt.nerve?nt.nerve:"";
                        } else {
                          group="Dermatomes";
                          const de=(DERMATOMES||[]).find(dd=>dd.id===base);
                          label=de?`${de.level} — ${de.region}`:base.replace(/^n_/,"").replace(/_/g," ").toUpperCase();
                          sub=de&&de.disc&&de.disc!=="—"?`Disc ${de.disc}`:"";
                        }
                        groups[group].push({base,label,sub,lVal,rVal,cVal});
                      });
                      const sev=v=>!v?0:/Absent|Positive|UMN|Spastic|Flaccid/i.test(v)?3:/Reduced|Diminished|Brisk|Hyper/i.test(v)?2:/Normal|Intact|Negative/i.test(v)?1:2;
                      Object.values(groups).forEach(arr=>arr.sort((a,b)=>Math.max(sev(b.lVal),sev(b.rVal),sev(b.cVal))-Math.max(sev(a.lVal),sev(a.rVal),sev(a.cVal))));
                      const NPill=({v})=>{
                        if(!v||typeof v!=="string") return <span style={{fontSize:12,color:"#D1D5DB"}}>—</span>;
                        const sv=sev(v);
                        const c2=sv===3?"#dc2626":sv===2?"#d97706":C.green;
                        const bg=sv===3?"#FEF2F2":sv===2?"#FEF3C7":"#ECFDF5";
                        return <span style={{display:"inline-block",padding:"2px 8px",borderRadius:99,fontSize:10.5,fontWeight:800,background:bg,color:c2}}>{v.split(" — ")[0].split(" (")[0].slice(0,14)}</span>;
                      };
                      const hasRows=Object.values(groups).some(a=>a.length>0);
                      // GCS (Glasgow Coma Scale) -- real fields are gcs_eye/
                      // gcs_verbal/gcs_motor (+ pupils), which never matched
                      // the neuroKeys regex at all, so GCS never appeared
                      // anywhere in Patient Profile regardless of whether it
                      // was recorded.
                      const gEye=parseInt(d.gcs_eye)||0, gVerbal=parseInt(d.gcs_verbal)||0, gMotor=parseInt(d.gcs_motor)||0;
                      const gTotal=gEye+gVerbal+gMotor;
                      const hasGcs=!!(d.gcs_eye||d.gcs_verbal||d.gcs_motor);
                      const gcsCol=gTotal<=8?"#dc2626":gTotal<=12?"#d97706":C.green;
                      return(
                        <div>
                          {hasGcs&&(
                            <div style={{padding:"9px 11px",background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.border}`,marginBottom:hasRows?10:0}}>
                              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                                <span style={{fontSize:11,fontWeight:800,color:C.primary,textTransform:"uppercase",letterSpacing:"0.5px",flex:1}}>Glasgow Coma Scale</span>
                                <span style={{fontSize:16,fontWeight:900,color:gcsCol}}>{gTotal}<span style={{fontSize:9.5,color:C.muted,fontWeight:600}}>/15</span></span>
                              </div>
                              <div style={{display:"flex",gap:10,fontSize:11,color:C.text}}>
                                <span>E {gEye||"—"}</span><span>V {gVerbal||"—"}</span><span>M {gMotor||"—"}</span>
                              </div>
                              {(d.gcs_pupil_l||d.gcs_pupil_r)&&<div style={{fontSize:10.5,color:C.muted,marginTop:4}}>Pupils: L {d.gcs_pupil_l||"—"} · R {d.gcs_pupil_r||"—"}</div>}
                            </div>
                          )}
                          {hasRows&&(
                            <div style={{display:"grid",gridTemplateColumns:"1fr 84px 84px",gap:4,padding:"4px 8px 6px",marginBottom:2,borderBottom:`1px solid ${C.border}`}}>
                              <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Test</div>
                              <div style={{fontSize:11,color:C.muted,fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.5px"}}>Left</div>
                              <div style={{fontSize:11,color:C.muted,fontWeight:700,textAlign:"center",textTransform:"uppercase",letterSpacing:"0.5px"}}>Right</div>
                            </div>
                          )}
                          {Object.entries(groups).map(([gName,arr])=>arr.length===0?null:(
                            <div key={gName}>
                              <div style={{fontSize:10.5,color:C.primary,fontWeight:800,padding:"7px 8px 2px",textTransform:"uppercase",letterSpacing:"0.5px"}}>{gName}</div>
                              {arr.slice(0,5).map((r,i2)=>(
                                <div key={r.base} style={{display:"grid",gridTemplateColumns:r.cVal?"1fr 172px":"1fr 84px 84px",gap:4,padding:"7px 8px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:6,alignItems:"center"}}>
                                  <div>
                                    <div style={{fontSize:12.5,fontWeight:700,color:C.text,lineHeight:1.25}}>{r.label}</div>
                                    {r.sub&&<div style={{fontSize:9.5,color:C.muted,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.sub}</div>}
                                  </div>
                                  {r.cVal
                                    ?<div style={{textAlign:"center"}}><NPill v={r.cVal}/></div>
                                    :<><div style={{textAlign:"center"}}><NPill v={r.lVal}/></div>
                                      <div style={{textAlign:"center"}}><NPill v={r.rVal}/></div></>}
                                </div>
                              ))}
                              {arr.length>5&&<div style={{fontSize:10.5,color:C.muted,padding:"2px 8px"}}>+{arr.length-5} more</div>}
                            </div>
                          ))}
                          {d.neuro_clinician_notes&&(
                            <div style={{fontSize:11,color:C.text,lineHeight:1.5,padding:"7px 10px",background:"#F9FAFB",borderRadius:8,marginTop:8}}>
                              {d.neuro_clinician_notes.slice(0,120)}{d.neuro_clinician_notes.length>120?"…":""}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── Outcome Measures ── */}
                  <Sec icon="📊" title="Outcome Measures" navKey="outcome" hasData={omKeys.length>0}>
                    {(()=>{
                      const OM_MAX={odi:100,ndi:100,dash:100,quickdash:100,lefs:80,vas:10,nprs:10,psfs1:10,psfs2:10,psfs3:10,psfs:10,tsk:44,fabq:96,fabqpa:24,pcs:52,womac:96,koos:100,koosjr:28,spadi:100,hoos:100,hoosjr:24,faam:100,dgi:24,tug:60,bbs:56,abc:100,sf36:100,eq5d:100,pdi:70,rmdq:24,mwt10:3,fac:5,asia:100};
                      const OM_NAMES={odi:"ODI — Oswestry Disability",ndi:"NDI — Neck Disability",dash:"DASH — Arm/Shoulder/Hand",quickdash:"QuickDASH",lefs:"LEFS — Lower Extremity",vas:"VAS — Pain",nprs:"NPRS — Pain Rating",psfs:"PSFS — Patient-Specific",tsk:"TSK-11 — Kinesiophobia",fabq:"FABQ — Fear Avoidance",fabqpa:"FABQ-PA — Fear Avoidance",pcs:"PCS — Catastrophising",womac:"WOMAC",koos:"KOOS",koosjr:"KOOS-JR — Knee",spadi:"SPADI — Shoulder Pain",hoos:"HOOS",hoosjr:"HOOS-JR — Hip",faam:"FAAM — Foot & Ankle",dgi:"DGI — Dynamic Gait",tug:"TUG — Timed Up & Go",bbs:"BBS — Berg Balance",abc:"ABC — Balance Confidence",rmdq:"RMDQ — Roland-Morris"};
                      return(
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {omKeys.map(k=>{
                            const scaleId=k.replace("om_history_","");
                            let hist=[];try{hist=JSON.parse(d[k]||"[]");}catch{}
                            if(hist.length===0) return null;
                            const curr=parseFloat(hist[hist.length-1]?.score);
                            const prev=hist.length>=2?parseFloat(hist[hist.length-2]?.score):null;
                            const diff=prev!=null?curr-prev:null;
                            // SCALE_DATA_LABELS (real source, same as SOAP) checked
                            // first -- OM_NAMES is a separate hand-copied map missing
                            // many real scales (all Stroke/TBI scales, 10MWT, etc.),
                            // same gap already fixed once for the SOAP builder.
                            const label=SCALE_DATA_LABELS[scaleId]||OM_NAMES[scaleId]||scaleId.toUpperCase();
                            const max=OM_MAX[scaleId]||100;
                            const pct=isNaN(curr)?0:Math.min(100,Math.max(0,(curr/max)*100));
                            const lowIsBetter=["odi","ndi","dash","quickdash","vas","nprs","tsk","fabq","fabqpa","pcs","womac","spadi","pdi","rmdq","tug","koosjr","hoosjr"].includes(scaleId);
                            const isBetter=diff!=null?(lowIsBetter?diff<0:diff>0):null;
                            const sevCol=lowIsBetter?(pct>=60?"#dc2626":pct>=30?"#d97706":C.green):(pct>=70?C.green:pct>=40?"#d97706":"#dc2626");
                            return(
                              <div key={k} style={{padding:"9px 11px",background:"#F9FAFB",borderRadius:10,border:`1px solid ${C.border}`}}>
                                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                                  <span style={{flex:1,fontSize:12,fontWeight:800,color:C.text}}>{label}</span>
                                  <span style={{fontSize:17,fontWeight:900,color:sevCol}}>{isNaN(curr)?"—":curr}<span style={{fontSize:9.5,color:C.muted,fontWeight:600}}>/{max}</span></span>
                                  {diff!=null&&!isNaN(diff)&&(
                                    <span style={{flexShrink:0,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:800,background:isBetter?"#ECFDF5":"#FEF2F2",color:isBetter?C.green:"#dc2626"}}>
                                      {diff>0?"▲":"▼"} {Math.abs(Math.round(diff*10)/10)}
                                    </span>
                                  )}
                                </div>
                                <div style={{display:"flex",alignItems:"center",gap:8}}>
                                  <div style={{flex:1,height:4,background:"#E5E7EB",borderRadius:3,position:"relative",overflow:"hidden"}}>
                                    <div style={{position:"absolute",left:0,top:0,height:"100%",background:sevCol,width:`${pct}%`,borderRadius:3,transition:"width 0.8s"}}/>
                                  </div>
                                  <span style={{fontSize:9,color:C.muted,flexShrink:0}}>{hist.length} session{hist.length>1?"s":""}</span>
                                </div>
                              </div>
                            );
                          }).filter(Boolean)}
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── Kinetic Chain ── */}
                  <Sec icon="⛓️" title="Kinetic Chain" navKey="kinetic" hasData={kcKeys.length>0||!!d.kinetic_chain}>
                    {d.kinetic_chain&&(
                      <div style={{padding:"8px 10px",background:"#F0FDF4",borderRadius:8,borderLeft:"3px solid #059669",marginBottom:kcKeys.length?8:0}}>
                        <div style={{fontSize:10,color:"#059669",fontWeight:800,marginBottom:3}}>POSTURE ANALYSIS PATTERN</div>
                        <div style={{fontSize:11,color:C.text,lineHeight:1.5,fontStyle:"italic"}}>{d.kinetic_chain}</div>
                      </div>
                    )}
                    {kcKeys.length>0&&(()=>{
                      const isAbn=v=>{const t=String(v||"").toLowerCase();return t.includes("restricted")||t.includes("fail")||t.includes("limited")||t.includes("dysfunc")||t.includes("unstable")||t.includes("abnormal")||t.includes("positive");};
                      const isOk=v=>{const t=String(v||"").toLowerCase();return t.includes("normal")||t.includes("full")||t.includes("pass")||t.includes("negative")||t.includes("stable");};
                      const rows=kcKeys.map(k=>({k,label:KC_LABELS[k]||k.replace("kc_","").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),val:d[k]}));
                      rows.sort((a,b)=>(isAbn(b.val)?1:0)-(isAbn(a.val)?1:0));
                      return(
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:5}}>
                          {rows.slice(0,12).map(r=>{
                            const abn=isAbn(r.val), ok=isOk(r.val);
                            const c2=abn?"#92400E":ok?C.green:C.muted;
                            const bg=abn?"#FEF3C7":ok?"#ECFDF5":"#F3F4F6";
                            return(
                              <div key={r.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,padding:"7px 10px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                                <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.2}}>{r.label}</span>
                                <span style={{flexShrink:0,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:bg,color:c2}}>{String(r.val).split(" — ")[0]}</span>
                              </div>
                            );
                          })}
                          {rows.length>12&&<div style={{fontSize:10.5,color:C.muted,padding:"4px 8px"}}>+{rows.length-12} more</div>}
                        </div>
                      );
                    })()}
                  </Sec>

                  {/* ── Fascia ── */}
                  {faKeys.length>0&&(
                    <Sec icon="🕸️" title="Fascia Integration" navKey="fascia" hasData={true}>
                      {(()=>{
                        const FA_LBL={fa_sbl:"Superficial Back Line",fa_sfl:"Superficial Front Line",fa_ll:"Lateral Line",fa_spl:"Spiral Line",fa_dfl:"Deep Front Line",fa_abl:"Arm Back Line",fa_afl:"Arm Front Line",fa_fl:"Functional Line"};
                        const rows=faKeys.map(k=>({k,label:FA_LBL[k]||k.replace("fa_","").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),val:d[k]}));
                        const isAbn=v=>{const t=String(v||"").toLowerCase();return !(t.includes("normal")||t.includes("negative"));};
                        rows.sort((a,b)=>(isAbn(b.val)?1:0)-(isAbn(a.val)?1:0));
                        return(
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:5}}>
                            {rows.slice(0,8).map(r=>{
                              const abn=isAbn(r.val);
                              return(
                                <div key={r.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,padding:"7px 10px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                                  <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.2}}>{r.label}</span>
                                  <span style={{flexShrink:0,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:abn?"#FEF3C7":"#ECFDF5",color:abn?"#92400E":C.green}}>{String(r.val).split(" — ")[0]}</span>
                                </div>
                              );
                            })}
                            {rows.length>8&&<div style={{fontSize:10.5,color:C.muted,padding:"4px 8px"}}>+{rows.length-8} more</div>}
                          </div>
                        );
                      })()}
                    </Sec>
                  )}

                  {/* ── Functional Screens ── */}
                  {(()=>{
                    const FS_REGIONS=[
                      {key:"lfs_data",label:"Lumbar Functional Screen",nav:"lumbar_screen"},
                      {key:"kfs_data",label:"Knee Functional Screen",nav:"knee_screen"},
                      {key:"sfs_data",label:"Shoulder Functional Screen",nav:"shoulder_screen"},
                      {key:"hfs_data",label:"Hip Functional Screen",nav:"hip_screen"},
                      {key:"afs_data",label:"Ankle Functional Screen",nav:"ankle_screen"},
                      {key:"thfs_data",label:"Thoracic Functional Screen",nav:"thoracic_screen"},
                      {key:"elfs_data",label:"Elbow Functional Screen",nav:"elbow_screen"},
                      {key:"cfs_data",label:"Cervical Functional Screen",nav:"cervical_screen"},
                    ];
                    const FS_LBL={
                      lfs_sts:"Sit-to-Stand",lfs_fwd:"Forward Bend",lfs_sls:"Single Leg Stance",
                      lfs_squat:"Squat Pattern",lfs_step:"Step-Up",
                      fms_sq:"Deep Squat",fms_hs:"Hurdle Step",fms_il:"Inline Lunge",
                      fms_sm:"Shoulder Mob",fms_aslr:"ASLR",fms_tspu:"Trunk Stab Push-Up",fms_rs:"Rotary Stability",
                      kfs_squat:"Dbl Leg Squat",kfs_lunge:"Lunge",kfs_step:"Step Down",kfs_single_leg:"SL Squat",
                      sfs_overhead:"Overhead Reach",sfs_push_up:"Push-Up",sfs_irt:"Int Rotation",sfs_ert:"Ext Rotation",
                      hfs_squat:"SL Squat",hfs_bridge:"Hip Bridge",hfs_clam:"Clamshell",hfs_step:"Step Down",
                      afs_df:"Dorsiflexion",afs_calf:"Calf Raise",afs_hop:"Hop & Stick",
                    };
                    const fsLbl=id=>FS_LBL[id]||id.replace(/^[a-z]+fs_/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());
                    const rendered=FS_REGIONS.map(({key,label,nav})=>{
                      const raw=d[key]; if(!raw) return null;
                      let parsed; try{parsed=typeof raw==="string"?JSON.parse(raw):raw;}catch{return null;}
                      const{grades={},findings={}}=parsed;
                      const ge=Object.entries(grades);
                      const fe=Object.entries(findings).filter(([,v])=>v);
                      if(!ge.length && !fe.length) return null;
                      const abnormal=ge.filter(([,g])=>Number(g)===2).map(([id])=>fsLbl(id));
                      const compensated=ge.filter(([,g])=>Number(g)===1).map(([id])=>fsLbl(id));
                      const normal=ge.filter(([,g])=>Number(g)===0).map(([id])=>fsLbl(id));
                      return(
                        <div key={key} style={{marginBottom:6}}>
                          <div style={{fontSize:10,fontWeight:800,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:4}}>{label}</div>
                          {abnormal.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:3}}>
                            <span style={{fontSize:10,fontWeight:700,color:"#dc2626",marginRight:2}}>🔴</span>
                            {abnormal.map((t,i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#FEF2F2",color:"#dc2626",fontSize:11,fontWeight:700}}>{t}</span>)}
                          </div>}
                          {compensated.length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:3}}>
                            <span style={{fontSize:10,fontWeight:700,color:"#92400E",marginRight:2}}>⚠️</span>
                            {compensated.map((t,i)=><span key={i} style={{padding:"2px 8px",borderRadius:99,background:"#FEF3C7",color:"#92400E",fontSize:11,fontWeight:700}}>{t}</span>)}
                          </div>}
                          {normal.length>0&&(
                            <div style={{fontSize:10.5,color:C.green}}>✅ Normal: {normal.join(", ")}</div>
                          )}
                        </div>
                      );
                    }).filter(Boolean);
                    if(!rendered.length) return null;
                    const hasAny=FS_REGIONS.some(({key})=>d[key]);
                    return(
                      <Sec icon="🏃" title="Functional Screens" navKey="functional" hasData={true}>
                        <div>{rendered}</div>
                      </Sec>
                    );
                  })()}

                  {/* ── STTT ── */}
                  {nktKeys.length>0&&(()=>{
                    // Real label lookup built from NKT_REGIONS (same source
                    // the CPA module's own UI and the diagnosis engine use)
                    // instead of title-casing the raw key -- that's exactly
                    // why muscles like "dnf"/"ta" showed as bare codes
                    // instead of "Deep Neck Flexors"/"Tibialis Anterior".
                    const NKT_TEST_LABEL={};Object.values(NKT_REGIONS).forEach(reg=>(reg.tests||[]).forEach(t=>{NKT_TEST_LABEL[t.id]=t.label;}));
                    const nktRows=nktKeys.map(k=>({k,label:NKT_TEST_LABEL[k]||k.replace("nkt_","").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),val:d[k]}));
                    nktRows.sort((a,b)=>{const aw=a.val&&(a.val.includes("Inhibited")||a.val.includes("Weak"))?0:1;const bw=b.val&&(b.val.includes("Inhibited")||b.val.includes("Weak"))?0:1;return aw-bw;});
                    const CpaPill=({v2})=>{if(!v2)return<span style={{fontSize:11,color:"#D1D5DB"}}>—</span>;const abn=v2.includes("Inhibited")||v2.includes("Weak");return<span style={{maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",display:"inline-block",padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:abn?"#FEF3C7":"#ECFDF5",color:abn?"#92400E":C.green}}>{v2.split(" — ")[0]}</span>;};
                    return(
                      <Sec icon="🧠" title="CPA — Compensation Pattern Analysis" navKey="nkt" hasData={true}>
                        <div style={{display:"flex",flexDirection:"column",gap:0}}>
                          <div style={{display:"grid",gridTemplateColumns:"1fr 130px",gap:4,padding:"4px 8px 6px",borderBottom:`1px solid ${C.border}`}}>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Muscle</div>
                            <div style={{fontSize:11,color:C.muted,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.5px"}}>Status</div>
                          </div>
                          {nktRows.slice(0,8).map((r,i2)=>(
                            <div key={r.k} style={{display:"grid",gridTemplateColumns:"1fr 130px",gap:4,padding:"7px 8px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:6,alignItems:"center"}}>
                              <div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{r.label}</div>
                              <CpaPill v2={r.val}/>
                            </div>
                          ))}
                          {nktRows.length>8&&<div style={{fontSize:10.5,color:C.muted,padding:"4px 8px"}}>+{nktRows.length-8} more</div>}
                        </div>
                      </Sec>
                    );
                  })()}
                  {cyKeys.length>0&&(
                    <Sec icon="🦴" title="STTT / Orthopaedic" navKey="cyriax_full" hasData={true}>
                      {(()=>{
                        // Uses the shared resolveCyriaxKey() resolver (also
                        // used by the SOAP note and Live SOAP text) instead of
                        // a third hand-rolled raw-key label -- and merges
                        // ROM/Pain/Limited/etc. for the SAME test into one row
                        // instead of one row per field.
                        const merged={};const order=[];
                        cyKeys.forEach(k=>{
                          const val=d[k];if(!val)return;
                          const resolved=resolveCyriaxKey(k);if(!resolved)return;
                          const {region,regionKey,word,testId,label}=resolved;
                          const gk=regionKey?`${regionKey}|${testId}`:`_legacy_${k}`;
                          if(!merged[gk]){merged[gk]={region,label,vals:[]};order.push(gk);}
                          merged[gk].vals.push(`${word}${val}`);
                        });
                        const isAbn=v=>{const t=String(v||"").toLowerCase();return !(t.includes("normal")||t.includes("full")||t.includes("negative"));};
                        // Keep the individual field-type values (Pain / ROM /
                        // End-feel / etc.) separate instead of joining them
                        // into one string and truncating -- a joined-then-
                        // sliced string silently swallowed whichever field
                        // came later (ROM was usually appended after Pain,
                        // so it never survived a 20-char cut).
                        const rows=order.map(gk=>{const it=merged[gk];const combined=it.vals.join(" · ");return{gk,label:it.label,region:it.region,vals:it.vals,abn:isAbn(combined)};});
                        rows.sort((a,b)=>(b.abn?1:0)-(a.abn?1:0));
                        return(
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:5}}>
                            {rows.slice(0,8).map(r=>(
                              <div key={r.gk} style={{display:"flex",flexDirection:"column",gap:4,padding:"7px 10px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                                <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.2}}>{r.label}{r.region&&<span style={{fontSize:9.5,fontWeight:700,color:C.muted,marginLeft:5}}>({r.region})</span>}</span>
                                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                                  {r.vals.map((v2,vi)=>{
                                    const vAbn=isAbn(v2);
                                    return <span key={vi} style={{maxWidth:220,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:vAbn?"#FEF2F2":"#ECFDF5",color:vAbn?"#dc2626":C.green}}>{v2}</span>;
                                  })}
                                </div>
                              </div>
                            ))}
                            {rows.length>8&&<div style={{fontSize:10.5,color:C.muted,padding:"4px 8px"}}>+{rows.length-8} more</div>}
                          </div>
                        );
                      })()}
                    </Sec>
                  )}

                  {/* ── Gait & Functional ── */}
                  {(hasGait||hasErgo)&&(
                    <Sec icon="🚶" title="Gait & Functional" navKey="gait" hasData={true}>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:5}}>
                        {[
                          d.ag_antalgic&&{label:"Gait",val:"Antalgic pattern",abn:true},
                          d.gait_pattern&&{label:"Pattern",val:d.gait_pattern,abn:String(d.gait_pattern).toLowerCase()!=="normal"},
                          d.g_rom_findings&&{label:"Gait ROM",val:d.g_rom_findings,abn:true},
                          d.ergo_cervical_risk&&{label:"Cervical ergonomic risk",val:d.ergo_cervical_risk,abn:/high|mod/i.test(d.ergo_cervical_risk)},
                          d.ergo_lumbar_risk&&{label:"Lumbar ergonomic risk",val:d.ergo_lumbar_risk,abn:/high|mod/i.test(d.ergo_lumbar_risk)},
                          d.ergo_total_score&&{label:"Ergonomic score",val:d.ergo_total_score,abn:false},
                        ].filter(Boolean).map((r,i2)=>(
                          <div key={i2} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,padding:"7px 10px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                            <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.2}}>{r.label}</span>
                            <span style={{flexShrink:0,maxWidth:130,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:r.abn?"#FEF3C7":"#ECFDF5",color:r.abn?"#92400E":C.green}}>{String(r.val).slice(0,24)}</span>
                          </div>
                        ))}
                      </div>
                    </Sec>
                  )}

                  {/* ── SOAP Assessment & Plan (from signed SOAP or live extra notes) ── */}
                  {(()=>{
                    const sA=d.soap_a||d.soap_extra_a||d.soap_assessment||d.assessment||"";
                    const sP=d.soap_p||d.soap_extra_p||d.soap_plan||d.plan||"";
                    const sS=d.soap_s||d.soap_extra_s||"";
                    const sO=d.soap_o||d.soap_extra_o||"";
                    const lastSigned=d.soap_last_signed?new Date(d.soap_last_signed).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"}):"";
                    const clinician=d.soap_last_clinician||"";
                    if(!sA&&!sP&&!sS&&!sO) return null;
                    return(
                      <div onClick={()=>onNav&&onNav("soap")}
                        style={{background:C.white,borderRadius:14,padding:14,marginBottom:10,
                          boxShadow:"0 1px 6px rgba(0,0,0,0.05)",cursor:"pointer",border:`1px solid ${C.border}`}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                          <span style={{fontSize:12,fontWeight:800,color:C.text}}>📋 SOAP Note</span>
                          <div style={{textAlign:"right"}}>
                            {lastSigned&&<div style={{fontSize:9,color:C.muted}}>Signed {lastSigned}{clinician?` · ${clinician}`:""}</div>}
                            <span style={{fontSize:11,color:C.primary,fontWeight:700}}>Open →</span>
                          </div>
                        </div>
                        {[
                          {key:"S",text:sS,bg:"#F0F9FF",border:"#0EA5E9",label:"S — Subjective"},
                          {key:"O",text:sO,bg:"#F0FDF4",border:"#059669",label:"O — Objective"},
                          {key:"A",text:sA,bg:C.primaryBg,border:C.primary,label:"A — Assessment"},
                          {key:"P",text:sP,bg:"#FFFBEB",border:"#D97706",label:"P — Plan"},
                        ].filter(s=>s.text).map(s=>(
                          <div key={s.key} style={{padding:"8px 10px",background:s.bg,
                            borderLeft:`3px solid ${s.border}`,borderRadius:8,marginBottom:6}}>
                            <div style={{fontSize:9,color:s.border,fontWeight:800,marginBottom:3}}>{s.label}</div>
                            <div style={{fontSize:11.5,color:C.text,lineHeight:1.55,whiteSpace:"pre-wrap"}}>
                              {s.text.length>300?s.text.slice(0,300)+"…":s.text}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* empty state */}
                  {romKeys.length===0&&mmtKeys.length===0&&stKeys.length===0&&neuroKeys.length===0&&omKeys.length===0&&kcKeys.length===0&&!d.soap_assessment&&(
                    <div style={{textAlign:"center",padding:"40px 20px",color:C.muted}}>
                      <div style={{fontSize:32,marginBottom:10}}>📋</div>
                      <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:4}}>No assessment data yet</div>
                      <div style={{fontSize:12,marginBottom:16}}>Fill in ROM, MMT, special tests, neurological, outcome measures or kinetic chain in the SOAP and it will appear here automatically.</div>
                      <button onClick={e=>{e.stopPropagation();onNav&&onNav("rom");}} style={{padding:"8px 18px",background:C.primary,border:"none",borderRadius:20,color:"white",fontSize:12,fontWeight:700,cursor:"pointer",marginRight:8}}>Start ROM →</button>
                      <button onClick={e=>{e.stopPropagation();onNav&&onNav("soap");}} style={{padding:"8px 18px",background:"transparent",border:`1px solid ${C.primary}`,borderRadius:20,color:C.primary,fontSize:12,fontWeight:700,cursor:"pointer"}}>Open SOAP →</button>
                    </div>
                  )}

                </div>
              );
            })()}

          </div>
        )}
        {tab==="posture" && (
          <div className="tab-content" style={{padding:"16px 16px"}}>
            <PostureSessionsView d={d} C={C} onNav={onNav}/>
          </div>
        )}
        {tab==="treatment" && (
          <div className="tab-content" style={{padding:"16px 16px"}}>
            {(()=>{
              const sess=Array.isArray(d.tx_sessions)?d.tx_sessions:[];          // newest first
              const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
              const rxProg=Array.isArray(d.tx_exercise_prescription)?d.tx_exercise_prescription:[];
              const hepLog=Array.isArray(d.hep_log)?d.hep_log:[];
              const hepV=parseInt(d.hep_version)||1;
              const firstS=sess[sess.length-1], lastS=sess[0];
              const painFirst=parseFloat(firstS?.vasStart);
              const painLast=parseFloat(lastS?.vasEnd||lastS?.vasStart);
              const phases=[...rxProg,...prog].map(e=>e.phase).filter(Boolean);
              const phase=phases.length?phases.sort((a,b)=>phases.filter(x=>x===b).length-phases.filter(x=>x===a).length)[0]:"—";
              const startStr=d.tx_plan_start||firstS?.savedAt;
              let week="—";
              if(startStr){const t=new Date(startStr).getTime(); if(!isNaN(t)) week=String(Math.max(1,Math.ceil((Date.now()-t)/(7*864e5))));}
              const durWeeks=(String(d.tx_plan_duration||"").match(/\d+/)||[])[0];
              const dxLabel=(d.cc_main||d.soap_a||"").split(/[.\n]/)[0].slice(0,34)||"Not set";
              const txChips=[...new Set(sess.slice(0,3).map(s2=>s2.treatmentGiven).filter(Boolean))];
              const badge=(e)=>{
                if(e.progressedSession) return {txt:`↑ S${e.progressedSession}`,bg:"#ECFDF5",col:"#047857"};
                if(e.addedSession&&e.addedSession>1) return {txt:`＋ S${e.addedSession}`,bg:C.primaryBg,col:C.primary};
                return {txt:`S${e.addedSession||1}`,bg:"transparent",col:C.muted};
              };
              return(
                <div>
                  {/* ── Strip: dx · phase · week · pain ── */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:14}}>
                    {[
                      {l:"Diagnosis",v:dxLabel,col:C.text},
                      {l:"Phase",v:phase,col:C.primary},
                      {l:"Week",v:durWeeks?`${week} of ${durWeeks}`:week,col:C.text},
                      {l:"Pain",v:!isNaN(painFirst)&&!isNaN(painLast)?`${painFirst} → ${painLast}`:"—",col:!isNaN(painFirst)&&!isNaN(painLast)?(painLast<painFirst?C.green:"#dc2626"):C.muted,bg:!isNaN(painLast)&&painLast<painFirst?"#ECFDF5":undefined},
                    ].map((c2,i2)=>(
                      <div key={i2} style={{textAlign:"center",padding:"8px 4px",background:c2.bg||"#F9FAFB",borderRadius:10,border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>{c2.l}</div>
                        <div style={{fontSize:11.5,fontWeight:800,color:c2.col,lineHeight:1.25,overflow:"hidden",textOverflow:"ellipsis"}}>{c2.v}</div>
                      </div>
                    ))}
                  </div>

                  {/* ── Home protocol ── */}
                  <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:13.5,fontWeight:800,color:C.text}}>🏠 Home protocol <span style={{color:C.primary}}>v{hepV} · {prog.length} exercise{prog.length!==1?"s":""}</span></span>
                      {prog.length>0&&(
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>sendHepWhatsApp(d)} style={{padding:"5px 11px",borderRadius:99,border:"none",background:"#ECFDF5",color:"#047857",fontWeight:800,fontSize:10.5,cursor:"pointer"}}>📲 WhatsApp</button>
                          <button onClick={()=>downloadHepPdf(d)} style={{padding:"5px 11px",borderRadius:99,border:"none",background:C.primaryBg,color:C.primary,fontWeight:800,fontSize:10.5,cursor:"pointer"}}>📄 PDF</button>
                        </div>
                      )}
                    </div>
                    {prog.length===0&&(
                      <div style={{textAlign:"center",padding:"14px 0",color:C.muted,fontSize:12}}>No protocol yet — build it in Quick Visit or Home Protocol.</div>
                    )}
                    {prog.map((e,i2)=>{
                      const hepDose=e2=>{const st=e2.customSets||e2.sets,rp=e2.customReps||e2.reps,hd=e2.customHold||e2.hold,fq=e2.customFreq||e2.freq;return `${st}×${rp}${hd?` · hold ${hd}s`:""}${fq?` · ${fq}`:""}`};
                      const b=badge(e);
                      return(
                        <div key={e.id||i2} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{e.name}</div>
                            <div style={{fontSize:10.5,color:C.muted}}>{hepDose(e)}</div>
                          </div>
                          <span style={{flexShrink:0,padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:800,background:b.bg,color:b.col}}>{b.txt}</span>
                        </div>
                      );
                    })}
                    <div style={{marginTop:8,fontSize:10,color:C.muted,textAlign:"center"}}>Edit the protocol in <span onClick={()=>onNav&&onNav("tx_sessions")} style={{color:C.primary,fontWeight:700,cursor:"pointer"}}>Quick Visit →</span></div>
                  </div>

                  {/* ── Exercise prescription (clinical library picks, kept separate from the home protocol above) ── */}
                  <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                      <span style={{fontSize:13.5,fontWeight:800,color:C.text}}>💪 Exercise prescription <span style={{color:"#7c3aed"}}>{rxProg.length} exercise{rxProg.length!==1?"s":""}</span></span>
                    </div>
                    {rxProg.length===0&&(
                      <div style={{textAlign:"center",padding:"14px 0",color:C.muted,fontSize:12}}>No prescription yet — build it in Exercise Prescription.</div>
                    )}
                    {rxProg.map((e,i2)=>{
                      const hepDose=e2=>{const st=e2.customSets||e2.sets,rp=e2.customReps||e2.reps,hd=e2.customHold||e2.hold,fq=e2.customFreq||e2.freq;return `${st}×${rp}${hd?` · hold ${hd}s`:""}${fq?` · ${fq}`:""}`};
                      return(
                        <div key={e.id||i2} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:12.5,fontWeight:700,color:C.text}}>{e.name}</div>
                            <div style={{fontSize:10.5,color:C.muted}}>{hepDose(e)}{e.target?` · ${e.target}`:""}</div>
                          </div>
                          {e.phase&&<span style={{flexShrink:0,padding:"2px 9px",borderRadius:99,fontSize:10,fontWeight:800,background:"#EDE9FE",color:"#6D28D9"}}>{e.phase}</span>}
                        </div>
                      );
                    })}
                    {rxProg.length>0&&(
                      <div style={{marginTop:8,fontSize:10,color:C.muted,textAlign:"center"}}>Edit in <span onClick={()=>onNav&&onNav("exercise")} style={{color:"#7c3aed",fontWeight:700,cursor:"pointer"}}>Exercise Prescription →</span></div>
                    )}
                  </div>

                  {/* ── Techniques applied (manual therapy / modalities) --
                       was written correctly by both the Tx Techniques tab and
                       the quick-template chips, but Patient Profile never
                       actually read data.tx_techniques anywhere, so it was
                       invisible here regardless of how it was added. Uses the
                       same type-branching label resolver already used by
                       SOAPNoteModule / buildRealtimeSOAP for consistency. ── */}
                  {(()=>{
                    const txList=Array.isArray(d.tx_techniques)?d.tx_techniques:[];
                    if(!txList.length) return null;
                    const txLabel=t=>t.type==="manual"?`${t.technique||"Joint mob"}${t.grade?` Grade ${t.grade}`:""}${t.region?` — ${t.region}`:""}${t.laterality?` (${t.laterality})`:""}`
                      :t.type==="dn"?`Dry Needling — ${t.dn_muscle||"unknown muscle"}`
                      :t.type==="st"?`${t.st_technique||"Soft tissue"}${t.st_region?` — ${t.st_region}`:""}`
                      :t.type==="taping"?`${t.tape_type||"Taping"}`
                      :t.type==="us"?`Ultrasound${t.us_freq?` — ${t.us_freq}`:""}`
                      :t.type==="electro"?`${t.electro_type||"Electrotherapy"}`
                      :(t.technique||"Technique");
                    return(
                      <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:10}}>🤲 Techniques applied <span style={{color:"#0369A1"}}>{txList.length}</span></div>
                        {txList.map((t,i2)=>(
                          <div key={t.id||i2} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:8}}>
                            <span style={{width:20,height:20,borderRadius:"50%",background:"#DBEAFE",color:"#1E40AF",fontSize:10,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{i2+1}</span>
                            <span style={{fontSize:12.5,fontWeight:700,color:C.text}}>{txLabel(t)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* ── In-clinic treatment ── */}
                  <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:8}}>🏥 In-clinic treatment {lastS&&<span style={{fontSize:10,color:C.muted,fontWeight:500}}>· latest S{lastS.sessionNo||sess.length}</span>}</div>
                    {txChips.length===0?(
                      prog.length>0?(
                        <div>
                          <div style={{fontSize:10.5,color:C.muted,marginBottom:5}}>No visits logged yet — current exercise plan:</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                            {prog.slice(0,5).map((e,i2)=>(
                              <span key={i2} style={{padding:"3px 11px",borderRadius:99,fontSize:11,fontWeight:700,background:"#F0FDF4",color:"#047857"}}>{e.name}</span>
                            ))}
                            {prog.length>5&&<span style={{padding:"3px 11px",borderRadius:99,fontSize:11,fontWeight:700,background:"#F3F4F6",color:C.muted}}>+{prog.length-5} more</span>}
                          </div>
                        </div>
                      ):(
                        <div style={{fontSize:11.5,color:C.muted}}>No sessions logged yet — log the first visit in Quick Visit.</div>
                      )
                    ):(
                      <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                        {txChips.map((t2,i2)=>(
                          <span key={i2} style={{padding:"3px 11px",borderRadius:99,fontSize:11,fontWeight:700,background:C.primaryBg,color:C.primary}}>{t2}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── Change log ── */}
                  {hepLog.length>0&&(
                    <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:8}}>🕘 Change log</div>
                      <div style={{borderLeft:`2px solid ${C.secondary}55`,paddingLeft:10}}>
                        {hepLog.slice(0,8).map((lg,i2)=>(
                          <div key={i2} style={{fontSize:11,color:C.text,lineHeight:1.55,marginBottom:6}}>
                            <span style={{fontWeight:800,color:C.primary}}>S{lg.session} · {lg.date}</span>
                            <span style={{color:C.muted}}> — </span>{(lg.changes||[]).join(" · ")}
                            {lg.version&&<span style={{marginLeft:5,fontSize:9.5,fontWeight:800,color:C.muted}}>v{lg.version}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Sessions ── */}
                  <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:8}}>📅 Sessions ({sess.length})</div>
                    {sess.length===0&&<div style={{fontSize:11.5,color:C.muted}}>No sessions yet — log the first one in Quick Visit.</div>}
                    {sess.slice(0,8).map((s2,i2)=>{
                      const vs=parseFloat(s2.vasStart),ve=parseFloat(s2.vasEnd||s2.vasStart);
                      const better=!isNaN(vs)&&!isNaN(ve)&&ve<vs;
                      return(
                        <div key={s2.id||i2} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",background:i2%2===0?"#F9FAFB":"#fff",borderRadius:8}}>
                          <span style={{fontSize:10,color:C.muted,minWidth:54,flexShrink:0}}>{s2.date}</span>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:11.5,fontWeight:700,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>S{s2.sessionNo||sess.length-i2} · {s2.treatmentGiven||s2.type||"Session"}</div>
                            {s2.response&&<div style={{fontSize:10,color:C.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>"{s2.response}"</div>}
                          </div>
                          {!isNaN(vs)&&(
                            <span style={{flexShrink:0,padding:"2px 8px",borderRadius:99,fontSize:10,fontWeight:800,background:better?"#ECFDF5":"#FEF3C7",color:better?"#047857":"#92400E"}}>
                              {vs}{!isNaN(ve)&&ve!==vs?`→${ve}`:""}
                            </span>
                          )}
                        </div>
                      );
                    })}
                    {sess.length>8&&<div style={{fontSize:10.5,color:C.muted,padding:"4px 8px"}}>+{sess.length-8} more sessions</div>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab==="progress" && (
          <div className="tab-content" style={{padding:"16px 16px"}}>
            {/* Progress rings row */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,
              boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:16,letterSpacing:"-0.3px"}}>
                Overall Progress
              </div>
              <div style={{display:"flex",justifyContent:"space-around"}}>
                <Donut pct={overallPct} size={72} stroke={8} color={C.green}  label="Overall"  sub="%"/>
                <Donut pct={nrsWorst>0&&nrsNow<nrsWorst?Math.round(((nrsWorst-nrsNow)/nrsWorst)*100):0} size={72} stroke={8} color={C.primary} label="Pain Relief" sub="%"/>
                <Donut pct={sessPct}    size={72} stroke={8} color={C.blue}   label="Sessions"  sub="%"/>
              </div>
            </div>

            {/* Baseline vs Current */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,
              boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:14,letterSpacing:"-0.3px"}}>
                Baseline vs Current
              </div>
              {[
                nrsWorst>0&&{label:"Pain (NRS)", baseline:`${nrsWorst}/10`, current:`${nrsNow}/10`, pct:nrsWorst>0?Math.round(((nrsWorst-nrsNow)/nrsWorst)*100):0, up:false},
                (d.om_odi_score||d.om_odi_initial)&&{label:"ODI Score", baseline:d.om_odi_initial?(d.om_odi_initial+"%"):"—", current:d.om_odi_score?(d.om_odi_score+"%"):"—", pct:d.om_odi_initial&&d.om_odi_score?Math.round(((parseFloat(d.om_odi_initial)-parseFloat(d.om_odi_score))/parseFloat(d.om_odi_initial))*100):0, up:false},
                (d.om_dash_score||d.om_dash_initial)&&{label:"DASH Score", baseline:d.om_dash_initial||"—", current:d.om_dash_score||"—", pct:d.om_dash_initial&&d.om_dash_score?Math.round(((parseFloat(d.om_dash_initial)-parseFloat(d.om_dash_score))/parseFloat(d.om_dash_initial))*100):0, up:false},
                (d.om_psfs1_now&&d.om_psfs1_initial)&&{label:"PSFS", baseline:`${d.om_psfs1_initial}/10`, current:`${d.om_psfs1_now}/10`, pct:Math.round(((parseFloat(d.om_psfs1_now)-parseFloat(d.om_psfs1_initial))/parseFloat(d.om_psfs1_initial))*100), up:true},
              ].filter(Boolean).map((row,i,arr)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"10px 0",borderBottom:i<3?`1px solid ${C.border}`:"none"}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{row.label}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                      Baseline: <span style={{fontWeight:600}}>{row.baseline}</span>
                      {" → "}Current: <span style={{fontWeight:600,color:C.primary}}>{row.current}</span>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:15,fontWeight:800,color:row.pct>0?C.green:row.pct<0?"#dc2626":C.muted}}>
                      {row.pct>0?"↑":row.pct<0?"↓":"→"} {Math.abs(row.pct)}%
                    </div>
                    <div style={{fontSize:10,color:C.muted}}>{row.pct>0?"improvement":row.pct<0?"worsened":"no change"}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pain trend chart */}
            <div style={{background:C.white,borderRadius:16,padding:18,marginBottom:14,
              boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:14,letterSpacing:"-0.3px"}}>
                Pain Trend
              </div>
              <LineChart/>
            </div>

            {/* Session timeline */}
            <div style={{background:C.white,borderRadius:16,padding:18,
              boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:16,fontWeight:800,color:C.text,marginBottom:14,letterSpacing:"-0.3px"}}>
                Session Timeline
              </div>
              {sessions.length>0 ? sessions.slice(-5).reverse().map((sess,i)=>(
                <div key={i} style={{display:"flex",gap:12,padding:"10px 0",
                  borderBottom:i<4?`1px solid ${C.border}`:"none"}}>
                  <div style={{width:34,height:34,borderRadius:"50%",
                    background:C.primaryBg,border:`2px solid ${C.primary}30`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:800,color:C.primary,flexShrink:0}}>
                    {sess.sessionNo}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:700,color:C.text}}>{sess.date}</div>
                    <div style={{fontSize:11,color:C.muted,marginTop:1,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                      {sess.treatmentGiven||"Session completed"}
                    </div>
                  </div>
                  {sess.vasStart&&sess.vasEnd&&(
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:11,fontWeight:700,color:C.green}}>
                        NRS: {sess.vasStart}→{sess.vasEnd}
                      </div>
                    </div>
                  )}
                </div>
              )) : (
                  <div style={{textAlign:"center",padding:"24px 0",color:"#9CA3AF",fontSize:12}}>
                    No sessions recorded yet — log sessions in the Treatment tab to see your timeline.
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            DOCUMENTS TAB
        ════════════════════════════════════════ */}
        {tab==="documents" && (
          <div className="tab-content" style={{padding:"16px 16px"}}>

            {/* Hidden real file input */}
            <input ref={fileInputRef} type="file" style={{display:"none"}}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4"
              onChange={handleFileUpload}/>

            {/* Upload zone — tapping opens file picker */}
            <div onClick={()=>fileInputRef.current?.click()}
              style={{background:"#F5F3FF",border:`2px dashed ${C.secondary}`,borderRadius:16,
              padding:"28px 20px",textAlign:"center",marginBottom:16,cursor:"pointer",
              transition:"background 0.2s",
              opacity: uploading ? 0.6 : 1}}>
              {uploading ? (
                <>
                  <div style={{fontSize:36,marginBottom:8}}>⏳</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.primary}}>Uploading…</div>
                </>
              ) : (
                <>
                  <div style={{fontSize:36,marginBottom:8}}>📤</div>
                  <div style={{fontSize:14,fontWeight:700,color:C.primary}}>Upload Document</div>
                  <div style={{fontSize:12,color:C.muted,marginTop:4}}>
                    PDF, Image, MRI, X-Ray — max 5MB
                  </div>
                </>
              )}
            </div>

            {/* Uploaded documents list */}
            <div style={{background:C.white,borderRadius:16,padding:18,
              boxShadow:"0 1px 8px rgba(0,0,0,0.05)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                marginBottom:14}}>
                <div style={{fontSize:15,fontWeight:800,color:C.text,letterSpacing:"-0.3px"}}>
                  Documents
                </div>
                <div style={{fontSize:11,color:C.muted,fontWeight:500}}>
                  {uploadedDocs.length} file{uploadedDocs.length!==1?"s":""}
                </div>
              </div>

              {uploadedDocs.length === 0 ? (
                <div style={{textAlign:"center",padding:"24px 0"}}>
                  <div style={{fontSize:32,marginBottom:8}}>📂</div>
                  <div style={{fontSize:13,fontWeight:600,color:C.muted}}>No documents yet</div>
                  <div style={{fontSize:11,color:C.muted,marginTop:4}}>
                    Tap the upload zone above to add files
                  </div>
                </div>
              ) : (
                uploadedDocs.map((doc,i)=>(
                  <div key={doc.id} style={{display:"flex",gap:12,alignItems:"center",
                    padding:"12px 0",
                    borderBottom:i<uploadedDocs.length-1?`1px solid ${C.border}`:"none",
                    animation:"fadeUp 0.35s ease both",
                    animationDelay:`${i*0.04}s`}}>
                    {/* Icon / preview */}
                    <div onClick={()=>handlePreviewDoc(doc)}
                      style={{width:44,height:44,borderRadius:11,background:"#EDE9FE",
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:20,flexShrink:0,cursor:"pointer",position:"relative",
                      overflow:"hidden"}}>
                      {doc.type?.includes("image") ? (
                        <img src={doc.dataUrl} alt=""
                          style={{width:"100%",height:"100%",objectFit:"cover",borderRadius:11}}/>
                      ) : (
                        <span>{doc.icon}</span>
                      )}
                    </div>
                    {/* Info */}
                    <div style={{flex:1,minWidth:0,cursor:"pointer"}}
                      onClick={()=>handlePreviewDoc(doc)}>
                      <div style={{fontSize:13,fontWeight:700,color:C.text,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                        {doc.name}
                      </div>
                      <div style={{fontSize:11,color:C.muted,marginTop:2}}>
                        {doc.date} · {doc.size}
                      </div>
                    </div>
                    {/* Actions */}
                    <div style={{display:"flex",gap:5,flexShrink:0}}>
                      <button onClick={()=>handleDownloadDoc(doc)}
                        style={{width:32,height:32,borderRadius:8,background:"#EDE9FE",
                        border:"none",cursor:"pointer",fontSize:14,
                        display:"flex",alignItems:"center",justifyContent:"center"}}
                        title="Download">⬇</button>
                      <button onClick={()=>handlePreviewDoc(doc)}
                        style={{width:32,height:32,borderRadius:8,background:"#F3F4F6",
                        border:"none",cursor:"pointer",fontSize:14,
                        display:"flex",alignItems:"center",justifyContent:"center"}}
                        title="Preview">👁</button>
                      <button onClick={()=>handleDeleteDoc(doc.id)}
                        style={{width:32,height:32,borderRadius:8,background:"#FEF2F2",
                        border:"none",cursor:"pointer",fontSize:14,
                        display:"flex",alignItems:"center",justifyContent:"center"}}
                        title="Delete">🗑</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── BOTTOM ACTION BAR ── */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:100,
        background:"rgba(255,255,255,0.97)",backdropFilter:"blur(12px)",
        borderTop:`1px solid ${C.border}`,padding:"10px 16px",
        paddingBottom:"calc(10px + env(safe-area-inset-bottom))"}}>
        {(tab==="assessment"||tab==="subjective") && (
          <button onClick={()=>{ onLoadAssessment && onLoadAssessment(patient); onClose(); }}
            style={{width:"100%",padding:"14px",borderRadius:12,border:"none",
            background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
            color:"white",fontSize:14,fontWeight:800,cursor:"pointer",letterSpacing:"-0.2px",
            boxShadow:`0 4px 16px rgba(109,40,217,0.35)`}}>
            Open in Assessment →
          </button>
        )}
        {tab==="treatment" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <button onClick={()=>{onNav&&onNav("tx_sessions");}} style={{width:"100%",padding:"13px",borderRadius:12,border:"none",
              background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
              color:"white",fontSize:13,fontWeight:800,cursor:"pointer",
              boxShadow:`0 4px 16px rgba(109,40,217,0.3)`}}>
              Update Treatment Plan
            </button>
            <button onClick={()=>{onNav&&onNav("exercise");}} style={{width:"100%",padding:"12px",borderRadius:12,
              border:`1.5px solid ${C.primary}`,background:"white",
              color:C.primary,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Add New Exercise
            </button>
          </div>
        )}
        {(tab==="overview"||tab==="posture") && (
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>{ onLoadAssessment && onLoadAssessment(patient); onClose(); }}
              style={{flex:2,padding:"13px",borderRadius:12,
              border:"none",background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
              color:"white",fontSize:13,fontWeight:700,cursor:"pointer",
              boxShadow:"0 4px 16px rgba(109,40,217,0.3)"}}>
              Open in Assessment →
            </button>
            <button onClick={()=>setTab("documents")} style={{flex:1,padding:"13px",borderRadius:12,
              border:`1.5px solid ${C.primary}`,background:"white",
              color:C.primary,fontSize:13,fontWeight:700,cursor:"pointer"}}>
              Export PDF
            </button>
          </div>
        )}
        {tab==="documents" && (
          <button onClick={()=>fileInputRef.current?.click()}
            style={{width:"100%",padding:"13px",borderRadius:12,border:"none",
            background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
            color:"white",fontSize:13,fontWeight:800,cursor:"pointer",
            boxShadow:"0 4px 16px rgba(109,40,217,0.3)"}}>
            📤 Upload Document
          </button>
        )}
      </div>
    </div>
  );
}


function PatientCard({ patient, isActive, onSelect, onDelete, onProfile }) {
  const age    = patient.data?.dem_age    ? `${patient.data.dem_age}y` : "";
  const sex    = patient.data?.dem_sex    || patient.data?.dem_gender || "";
  const occ    = patient.data?.dem_occupation || "";
  const dx     = patient.lastDx || "";
  const hasRed = patient.hasRedFlags;
  const vas    = patient.data?.pa_vas_now;
  const vasColor = vas ? (parseInt(vas)>=7?"#ff4d6d":parseInt(vas)>=4?"#ffb300":"#00c97a") : null;
  const updatedAt = patient.updatedAt ? new Date(patient.updatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"}) : null;

  return (
    <div style={{
      padding:"14px 14px 10px", borderRadius:14, marginBottom:8,
      background: isActive ? "#F0EEFF" : "#FFFFFF",
      border: `1.5px solid ${hasRed ? "#FCA5A5" : isActive ? "#7c3aed" : "#E5E7EB"}`,
      transition:"all 0.15s", position:"relative",
      boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
    }}>
      {/* Top row: avatar + info */}
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:10}}>
        <div style={{width:44,height:44,borderRadius:12,background:avatarGrad(patient.id),
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:"0.85rem",fontWeight:900,color:"#fff",flexShrink:0,
          boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}>
          {getInitials(patient.name)}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontWeight:800,fontSize:"0.9rem",color:"#111827",
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {patient.name || "Unnamed Patient"}
            {hasRed && <span style={{marginLeft:6,fontSize:"0.8rem",color:"#ef4444"}}>🚩</span>}
            {isActive && <span style={{marginLeft:6,fontSize:"0.7rem",background:"#7c3aed",color:"#fff",borderRadius:99,padding:"1px 7px",fontWeight:700,verticalAlign:"middle"}}>Active</span>}
          </div>
          <div style={{fontSize:"0.78rem",color:"#6B7280",marginTop:2,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
            {[age,sex,occ].filter(Boolean).join(" · ") || "No demographics"}
          </div>
          {dx && <div style={{fontSize:"0.75rem",color:"#059669",marginTop:2,fontWeight:600,
            whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>🩺 {dx}</div>}
        </div>
        {vas && <span style={{flexShrink:0,padding:"2px 8px",borderRadius:99,background:`${vasColor}15`,
          border:`1px solid ${vasColor}40`,fontSize:"0.72rem",fontWeight:700,color:vasColor}}>
          NRS {vas}
        </span>}
      </div>

      {/* Bottom row: two action buttons + remove */}
      <div style={{display:"flex",gap:6,alignItems:"center"}}>
        <button onClick={e=>{e.stopPropagation();onSelect();}}
          style={{flex:2,padding:"9px 0",borderRadius:10,border:"none",
            background:"linear-gradient(135deg,#7c3aed,#9333ea)",
            color:"white",fontSize:"0.78rem",fontWeight:800,cursor:"pointer",
            boxShadow:"0 2px 8px rgba(124,58,237,0.3)",letterSpacing:"0.1px"}}>
          Open Assessment
        </button>
        <button onClick={e=>{e.stopPropagation();onProfile();}}
          style={{flex:1,padding:"9px 0",borderRadius:10,
            border:"1.5px solid #7c3aed",background:"white",
            color:"#7c3aed",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
          Profile
        </button>
        <button onClick={e=>{e.stopPropagation();onDelete();}}
          style={{flexShrink:0,background:"none",border:"1px solid #E5E7EB",borderRadius:8,
            color:"#9CA3AF",cursor:"pointer",fontSize:"0.72rem",padding:"9px 10px",fontWeight:600}}>
          ✕
        </button>
      </div>
      {updatedAt&&<div style={{fontSize:"0.68rem",color:"#9CA3AF",marginTop:5,textAlign:"right"}}>Last updated {updatedAt}</div>}
    </div>
  );
}

// ─── PATIENT DATABASE PANEL ────────────────────────────────────────────────────
function PatientDatabasePanel({ patients, activeId, onSelect, onNew, onDelete, onClose: closePanel, onImport, onNav, liveData={} }) {
  const [search, setSearch]       = useState("");
  const [sortBy, setSortBy]       = useState("updated");
  const [filterFlag, setFilterFlag] = useState(false);
  const [profilePatient, setProfilePatient] = useState(null);
  const [localPatients, setLocalPatients] = useState(patients);
  const fileRef = useRef(null);

  // Keep local in sync when parent updates
  useEffect(() => { setLocalPatients(patients); }, [patients]);

  const handleSaveField = (id, newData) => {
    setLocalPatients(prev => prev.map(p => p.id===id
      ? {...p, data:{...p.data,...newData}, name:newData.dem_name||p.name, updatedAt:new Date().toISOString()}
      : p
    ));
    // Persist via the select mechanism (triggers parent save)
    try {
      const stored = JSON.parse(localStorage.getItem("physio_patient_db_v1") || "[]");
      const updated = stored.map(p => p.id===id
        ? {...p, data:{...p.data,...newData}, name:newData.dem_name||p.name, updatedAt:new Date().toISOString()}
        : p
      );
      localStorage.setItem("physio_patient_db_v1", JSON.stringify(updated));
    } catch {}
  };

  const filtered = localPatients
    .filter(p => {
      if (filterFlag && !p.hasRedFlags) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (p.name||"").toLowerCase().includes(q) ||
        (p.data?.dem_occupation||"").toLowerCase().includes(q) ||
        (p.data?.dem_sex||"").toLowerCase().includes(q) ||
        (p.lastDx||"").toLowerCase().includes(q);
    })
    .sort((a,b) => {
      if (sortBy==="name")   return (a.name||"").localeCompare(b.name||"");
      if (sortBy==="fields") return Object.keys(b.data||{}).length - Object.keys(a.data||{}).length;
      if (sortBy==="age")    return parseInt(a.data?.dem_age||0) - parseInt(b.data?.dem_age||0);
      return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { onImport(JSON.parse(ev.target.result)); } catch {} };
    reader.readAsText(file);
  };

  const redFlagCount = localPatients.filter(p=>p.hasRedFlags).length;

  return (
    <>
    {/* Profile modal */}
    {profilePatient && (
      <PatientProfileModal
        patient={(()=>{
          const fresh = patients.find(p=>p.id===profilePatient.id) || profilePatient;
          return fresh.id===activeId ? {...fresh, data:{...fresh.data,...liveData}} : fresh;
        })()}
        onClose={()=>{
          // ← back from nested profile: activate patient + close DB panel → land in main app
          if(profilePatient.id !== activeId) onSelect(profilePatient);
          setProfilePatient(null);
          closePanel();
        }}
        onLoadAssessment={(p)=>{ onSelect(p); setProfilePatient(null); closePanel(); }}
        onSaveField={handleSaveField}
        onNav={(key)=>{
          setProfilePatient(null);
          if(profilePatient.id !== activeId) onSelect(profilePatient);
          closePanel();
          setTimeout(()=>onNav&&onNav(key), 80);
        }}
      />
    )}

    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,
      display:"flex",alignItems:"stretch",justifyContent:"flex-start"}}>
      <div style={{width:"100%",maxWidth:480,background:"#F8F7FF",
        borderRight:"1px solid #E5E7EB",display:"flex",
        flexDirection:"column",height:"100%",boxShadow:"4px 0 24px rgba(0,0,0,0.15)"}}>

        {/* Header */}
        <div style={{padding:"20px 18px 14px",borderBottom:"1px solid #E5E7EB",flexShrink:0,background:"white"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div>
              <div style={{fontWeight:900,fontSize:"1.1rem",color:"#7c3aed",letterSpacing:"-0.3px"}}>
                👥 Patient Database
              </div>
              <div style={{fontSize:"0.78rem",color:"#6B7280",marginTop:2}}>
                {localPatients.length} patient{localPatients.length!==1?"s":""} · {redFlagCount} with flags
              </div>
            </div>
            <button onClick={closePanel}
              style={{background:"#F3F4F6",border:"1px solid #E5E7EB",borderRadius:10,
                color:"#374151",cursor:"pointer",padding:"9px 16px",fontSize:"0.8rem",fontWeight:700}}>✕ Close</button>
          </div>

          {/* Search */}
          <div style={{position:"relative",marginBottom:8}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",
              fontSize:"0.8rem",color:"#3a5070"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search name, diagnosis, occupation…"
              style={{width:"100%",
                border:"1px solid #E5E7EB",borderRadius:9,color:"#111827",background:"#F9FAFB",
                outline:"none",padding:"8px 12px 8px 30px",fontSize:"0.76rem",boxSizing:"border-box"}}/>
          </div>

          {/* Filters row */}
          <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
            {[["updated","🕐 Recent"],["name","A–Z"],["age","Age"],["fields","Complete"]].map(([v,l])=>(
              <button key={v} onClick={()=>setSortBy(v)}
                style={{padding:"6px 12px",borderRadius:20,
                  border:`1px solid ${sortBy===v?"#7c3aed":"#E5E7EB"}`,
                  background:sortBy===v?"#7c3aed":"white",
                  color:sortBy===v?"white":"#6B7280",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
                {l}
              </button>
            ))}
            <button onClick={()=>setFilterFlag(f=>!f)}
              style={{padding:"6px 12px",borderRadius:20,marginLeft:"auto",
                border:`1px solid ${filterFlag?"#ef4444":"#E5E7EB"}`,
                background:filterFlag?"#FEF2F2":"white",
                color:filterFlag?"#ef4444":"#6B7280",fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>
              🚩 Flags only
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div style={{display:"flex",borderBottom:"1px solid #E5E7EB",flexShrink:0,background:"white"}}>
          {[
            {label:"Total", val:localPatients.length, color:"#7c3aed"},
            {label:"Active", val:localPatients.filter(p=>activeId===p.id).length, color:"#059669"},
            {label:"🚩 Flags", val:redFlagCount, color:"#ef4444"},
            {label:"Today", val:localPatients.filter(p=>new Date(p.updatedAt).toDateString()===new Date().toDateString()).length, color:"#d97706"},
          ].map(s=>(
            <div key={s.label} style={{flex:1,padding:"10px 4px",textAlign:"center",
              borderRight:"1px solid #E5E7EB"}}>
              <div style={{fontWeight:900,fontSize:"1rem",color:s.color}}>{s.val}</div>
              <div style={{fontSize:"0.8rem",color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:2}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Patient list */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 14px",background:"#F8F7FF"}}>
          {filtered.length === 0 && (
            <div style={{textAlign:"center",padding:"40px 20px",color:"#9CA3AF"}}>
              <div style={{fontSize:"2.5rem",marginBottom:8}}>👤</div>
              <div style={{fontSize:"0.82rem",color:"#6B7280"}}>
                {search ? "No patients match your search" : "No patients — tap New Patient to start"}
              </div>
            </div>
          )}
          {filtered.map(p => (
            <PatientCard
              key={p.id}
              patient={p}
              isActive={p.id === activeId}
              onSelect={()=>onSelect(p)}
              onDelete={()=>onDelete(p.id)}
              onProfile={()=>setProfilePatient(p)}
            />
          ))}
        </div>

        {/* Footer */}
        <div style={{padding:"14px 14px",borderTop:"1px solid #E5E7EB",flexShrink:0,display:"flex",flexDirection:"column",gap:8,background:"white"}}>
          <button onClick={onNew}
            style={{width:"100%",padding:"14px",background:"linear-gradient(135deg,#7c3aed,#9333ea)",
              border:"none",borderRadius:12,color:"white",fontWeight:900,fontSize:"0.9rem",cursor:"pointer",
              boxShadow:"0 4px 12px rgba(124,58,237,0.3)"}}>
            ＋ New Patient
          </button>
          <div style={{display:"flex",gap:7}}>
            <button onClick={()=>fileRef.current?.click()}
              style={{flex:1,padding:"9px",background:"rgba(0,201,122,0.08)",
                border:"1px solid rgba(0,201,122,0.2)",borderRadius:9,
                color:"#00c97a",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
              📂 Import JSON
            </button>
            <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} style={{display:"none"}}/>
            <button onClick={()=>{
                const data = JSON.stringify(localPatients,null,2);
                const blob = new Blob([data],{type:"application/json"});
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href=url; a.download="physio_patients_backup.json"; a.click();
                URL.revokeObjectURL(url);
              }}
              style={{flex:1,padding:"9px",background:"rgba(127,90,240,0.08)",
                border:"1px solid rgba(127,90,240,0.2)",borderRadius:9,
                color:"#7f5af0",fontSize:"0.8rem",fontWeight:700,cursor:"pointer"}}>
              💾 Export All
            </button>
          </div>
        </div>
      </div>

      {/* Click outside */}
      <div style={{flex:1}} onClick={closePanel}/>
    </div>
    </>
  );
}



// ─── POSTURE DEFECTS DATA ─────────────────────────────────────────────────────

// ── PostureSessionsView (used by PatientProfileModal) ──
function PostureSessionsView({ d, C, onNav }) {
  const [lightboxImg, setLightboxImg] = useState(null);
  let postureSessions = [];
  try { postureSessions = JSON.parse(d.posture_sessions||"[]"); } catch {}
  let compositeReports = [];
  try { compositeReports = JSON.parse(d.posture_composite_reports||"[]"); } catch {}
  const VLABELS_MV = {anterior:"Frontal",posterior:"Back",left:"Sag L",right:"Sag R"};
  const defects = Object.keys(d).filter(k=>k.startsWith("posture_defect_")&&d[k]);
  const VLABELS = {anterior:"Frontal",posterior:"Posterior",left:"Left Lateral",right:"Right Lateral"};
  const viewCount = {};
  const sessions = [...postureSessions].reverse().map(ps=>{
    const v = ps.view||"anterior";
    if(!viewCount[v]) viewCount[v]=0; viewCount[v]++;
    const total = postureSessions.filter(s=>(s.view||"anterior")===v).length;
    const sessionNo = total-viewCount[v]+1;
    return{...ps,_label:ps.sessionLabel||`${VLABELS[v]||v} Session ${sessionNo}`};
  });
  return(
    <div>
      {lightboxImg&&createPortal(
        <div onClick={()=>setLightboxImg(null)}
          style={{position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.92)",
            display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
          <img src={lightboxImg} alt="posture full"
            style={{maxWidth:"95vw",maxHeight:"90vh",width:"auto",height:"auto",objectFit:"contain",borderRadius:8}}/>
          <div style={{position:"absolute",top:16,right:16,color:"#fff",fontSize:24,cursor:"pointer"}}>✕</div>
        </div>,
        document.body
      )}
      <button onClick={()=>onNav&&onNav("posture")}
        style={{width:"100%",padding:"10px",marginBottom:12,borderRadius:10,
          background:C.primaryBg,border:`1.5px solid ${C.primary}30`,
          color:C.primary,fontWeight:800,fontSize:12,cursor:"pointer"}}>
        📷 New Posture Analysis
      </button>
      {compositeReports.length>0&&(
        <div style={{marginBottom:14}}>
          <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:10}}>
            Composite Assessments ({compositeReports.length}) <span style={{fontWeight:400,color:C.muted,fontSize:10.5}}>— merged across multiple views</span>
          </div>
          {[...compositeReports].reverse().map((cr,i)=>{
            const col=(cr.compositeScore||0)>=74?C.green:(cr.compositeScore||0)>=58?C.orange:"#dc2626";
            const dt=new Date(cr.generatedAt||"");
            const dateStr=isNaN(dt.getTime())?"":dt.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
            const confirmedCount=(cr.mergedFindings||[]).filter(f=>f.confirmed).length;
            const topFindings=(cr.mergedFindings||[]).slice(0,6);
            return(
              <div key={i} style={{background:C.white,borderRadius:12,marginBottom:10,
                boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1.5px solid ${C.primary}35`,overflow:"hidden"}}>
                <div style={{padding:"10px 12px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",background:`${C.primary}08`}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:800,color:C.primary}}>⬡ Composite — {(cr.views||[]).map(v=>VLABELS_MV[v]||v).join(" + ")}</div>
                    <div style={{fontSize:10,color:C.muted,marginTop:1}}>{dateStr} · {cr.compositeBand}{confirmedCount>0?` · ${confirmedCount} confirmed across views`:""}</div>
                  </div>
                  {cr.compositeScore!=null&&<div style={{fontSize:18,fontWeight:900,color:col,lineHeight:1,flexShrink:0,marginLeft:6}}>{cr.compositeScore}<span style={{fontSize:8,color:C.muted,fontWeight:400}}>/100</span></div>}
                </div>
                {cr.thumbnails&&Object.keys(cr.thumbnails).length>0&&(
                  <div style={{display:"flex",gap:2,padding:"6px 12px 0"}}>
                    {Object.entries(cr.thumbnails).map(([vk,img])=>img&&(
                      <img key={vk} src={img} alt={VLABELS_MV[vk]||vk} onClick={()=>setLightboxImg(img)}
                        style={{width:44,height:44,objectFit:"cover",borderRadius:6,cursor:"zoom-in",border:`1px solid ${C.border}`}}/>
                    ))}
                  </div>
                )}
                {topFindings.length>0&&(
                  <div style={{padding:"8px 12px 10px"}}>
                    {topFindings.map((f,fi)=>{
                      const isH=f.severity==="high"; const isM=f.severity==="moderate"||f.severity==="medium";
                      return(<div key={fi} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:3,fontSize:10.5,color:isH?"#dc2626":isM?C.orange:"#374151",lineHeight:1.45}}>
                        <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,marginTop:3,background:isH?"#dc2626":isM?C.orange:"#9CA3AF"}}/>
                        <span>{f.text||f.findingName||f.plain||f.region} {f.confirmed&&<span style={{fontWeight:700,color:C.primary}}>· confirmed ({(f.sourceViews||[]).join("+")})</span>}</span>
                      </div>);
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {sessions.length>0?(
        <div>
          <div style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:10}}>Saved captures ({sessions.length})</div>
          {sessions.map((ps,i)=>{
            const col=(ps.score||0)>=78?C.green:(ps.score||0)>=62?C.orange:"#dc2626";
            const dt=new Date(ps.capturedAt||ps.time||"");
            const dateStr=isNaN(dt.getTime())?"":dt.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"});
            const timeStr=isNaN(dt.getTime())?"":dt.toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"});
            // Build detailed summary: show specific measurement + direction + severity
            const findingSummary=(ps.findings||[])
              .sort((a,b)=>{ const s={high:0,moderate:1,low:2}; return (s[a.severity]||2)-(s[b.severity]||2); })
              .slice(0,8)
              .map(f=>{
                const main = f.findingName || f.text || f.plain || f.region || f.label || "";
                // Use full detailed text — no arbitrary truncation
                return f.text && f.text.length > (f.plain||"").length ? f.text : (f.plain || main);
              })
              .filter(Boolean);
            const highCount=(ps.findings||[]).filter(f=>f.severity==="high").length;
            const modCount=(ps.findings||[]).filter(f=>f.severity==="moderate"||f.severity==="medium").length;
            const lowCount=(ps.findings||[]).length-highCount-modCount;
            return(
              <div key={i} style={{background:C.white,borderRadius:12,marginBottom:10,
                boxShadow:"0 1px 6px rgba(0,0,0,0.06)",border:`1px solid ${C.border}`,overflow:"hidden"}}>
                <div style={{display:"flex",gap:0}}>
                  <div onClick={()=>ps.img&&setLightboxImg(ps.img)}
                    style={{width:80,flexShrink:0,cursor:ps.img?"zoom-in":"default",background:"#F3F4F6"}}>
                    {ps.img?(<img src={ps.img} alt="posture" style={{width:80,height:80,objectFit:"cover",display:"block"}}/>):
                    (<div style={{width:80,height:80,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>🧍</div>)}
                  </div>
                  <div style={{flex:1,padding:"9px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontSize:12,fontWeight:800,color:C.text}}>{ps._label}</div>
                        <div style={{fontSize:10,color:C.muted,marginTop:1}}>{dateStr}{timeStr?` · ${timeStr}`:""}{ps.source?" · "+(ps.source==="upload"?"Upload":"Camera"):""}</div>
                      </div>
                      {ps.score!=null&&<div style={{fontSize:18,fontWeight:900,color:col,lineHeight:1,flexShrink:0,marginLeft:6}}>{ps.score}<span style={{fontSize:8,color:C.muted,fontWeight:400}}>/100</span></div>}
                    </div>
                    <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                      {highCount>0&&<span style={{fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:20,background:"#FEF2F2",color:"#dc2626"}}>🔴 {highCount} high</span>}
                      {modCount>0&&<span style={{fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:20,background:"#FFF7ED",color:C.orange}}>🟡 {modCount} moderate</span>}
                      {lowCount>0&&<span style={{fontSize:9.5,fontWeight:700,padding:"1px 6px",borderRadius:20,background:"#F3F4F6",color:C.muted}}>⚪ {lowCount} mild</span>}
                    </div>
                  </div>
                </div>
                {findingSummary.length>0&&(
                  <div style={{padding:"8px 12px",borderTop:`1px solid ${C.border}`,background:"#FAFAFA"}}>
                    <div style={{fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:5}}>Findings</div>
                    {findingSummary.map((f,fi)=>{
                      const orig=(ps.findings||[])[fi];
                      const isH=orig?.severity==="high"; const isM=orig?.severity==="moderate"||orig?.severity==="medium";
                      return(<div key={fi} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:3,fontSize:10.5,color:isH?"#dc2626":isM?C.orange:"#374151",lineHeight:1.45}}>
                        <span style={{width:7,height:7,borderRadius:"50%",flexShrink:0,marginTop:3,background:isH?"#dc2626":isM?C.orange:"#9CA3AF"}}/>
                        <span>{f}</span>
                      </div>);
                    })}
                    {(ps.findings||[]).length>8&&<div style={{fontSize:10,color:C.muted,marginLeft:11}}>+{(ps.findings||[]).length-8} more findings</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ):(
        <div style={{textAlign:"center",padding:"32px 20px",background:C.white,borderRadius:14,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
          <div style={{fontSize:36,marginBottom:10}}>🧍</div>
          <div style={{fontSize:13,fontWeight:700,color:C.text,marginBottom:4}}>No posture captures saved yet</div>
          <div style={{fontSize:11,color:C.muted,lineHeight:1.5}}>Go to Posture Analysis, analyse a photo, then tap <strong>Save to Patient Record</strong>.</div>
        </div>
      )}
      {defects.length>0&&(
        <div style={{background:C.white,borderRadius:14,padding:14,marginTop:10,boxShadow:"0 1px 6px rgba(0,0,0,0.05)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <span style={{fontSize:12,fontWeight:800,color:C.text}}>Manual Defects ({defects.length})</span>
            <span onClick={()=>onNav&&onNav("posture")} style={{fontSize:11,color:C.primary,fontWeight:700,cursor:"pointer"}}>Edit →</span>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
            {defects.map(k=>(<span key={k} style={{padding:"3px 9px",borderRadius:20,fontSize:10.5,fontWeight:700,background:"#EDE9FE",color:C.primary,border:`1px solid ${C.primary}30`}}>{k.replace("posture_defect_","").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase())}</span>))}
          </div>
        </div>
      )}
    </div>
  );
}
// ── Exports for AppFull.jsx ──────────────────────────────────────────────────
export {
  dbKey, draftKey,
  loadPatientDB, savePatientDB,
  loadTaskDB, saveTaskDB,
  genId,
  PatientDatabasePanel, PatientProfileModal,
};
