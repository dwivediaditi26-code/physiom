// PatientDatabase.jsx — Patient DB helpers, Profile modal, DB panel
// Extracted from AppFull.jsx — pure extraction, no logic changes
import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Search as SearchIcon, ChevronRight, Bone, HeartPulse, Brain, Footprints, MoreVertical } from "lucide-react";
import { supabase } from "./supabase.js";
import { hasSessionKey, encryptJSON, decryptJSON, isEncryptedEnvelope } from "./localCrypto.js";
import { MuscleImbalanceCard, ExercisePlanTab } from "./PostureEngine.jsx";
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


const DEMO_VERSION = "v2026-06c"; // bump this when demo patients change

// In-memory cache of decrypted patient lists, keyed by userId. Real AES
// decryption (Web Crypto) is unavoidably async, but `patients` state is set
// synchronously on mount (useState(() => loadPatientDB(...))) -- so
// hydrateLocalCache() below runs once, asynchronously, right after login
// (before AppInner ever renders) and populates this. Once populated,
// loadPatientDB() is a synchronous cache read. Cleared on sign-out.
const _patientCache = new Map();

function clearPatientCache(userId) {
  if (userId === undefined) _patientCache.clear();
  else _patientCache.delete(userId);
}

// Synchronous peek at what's on disk right now, without decrypting.
// Legacy (pre-encryption) caches are plain JSON arrays; new caches are a
// JSON object envelope ({__enc:1, iv, ct}) -- both parse cleanly with
// JSON.parse, so this never throws on valid data from either era.
function readDbRawSync(userId) {
  let raw;
  try { raw = localStorage.getItem(dbKey(userId)); } catch { return { kind: "empty" }; }
  if (!raw) return { kind: "empty" };
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { kind: "plaintext", value: parsed };
    if (isEncryptedEnvelope(parsed)) return { kind: "encrypted", envelope: parsed };
    return { kind: "empty" };
  } catch { return { kind: "empty" }; }
}

function loadPatientDB(userId) {
  if (_patientCache.has(userId)) return _patientCache.get(userId);
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
    const rawState = readDbRawSync(userId);
    if (rawState.kind === "encrypted") {
      // Can't decrypt synchronously. hydrateLocalCache() (called at login,
      // before AppInner renders) normally already filled _patientCache by
      // the time this runs. If it somehow hasn't, [] is a safe placeholder
      // -- the Supabase-merge effect in AppFull.jsx repopulates a moment
      // later from the server copy either way, so nothing is lost.
      return [];
    }
    const stored = rawState.kind === "plaintext" ? rawState.value : [];
    // Remove any old demo patients that were previously seeded
    const real = stored.filter(p => !p.id.startsWith("demo_"));
    if (real.length !== stored.length) {
      try { localStorage.setItem(DB_KEY, JSON.stringify(real)); } catch {}
    }
    // Seed the two demo patients ONCE, on the first ever load for this user.
    // After that we never re-add them. Previously this re-seeded whenever Priya
    // or Arjun were missing, so deleting a demo patient just brought it straight
    // back on the next load (the "deleted patients reappear" bug).
    const SEED_FLAG = "pm_seeded_" + DEMO_VERSION;
    if (!localStorage.getItem(SEED_FLAG)) {
      try { localStorage.setItem(SEED_FLAG, "1"); } catch {}
      if (real.length === 0) {
        const seeded = [SEED_PATIENT, SEED_PATIENT_2];
        try { localStorage.setItem(DB_KEY, JSON.stringify(seeded)); } catch {}
        try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: SEED_PATIENT.id, data: SEED_PATIENT.data })); } catch {}
        _patientCache.set(userId, seeded);
        return seeded;
      }
    }
    _patientCache.set(userId, real);
    return real;
  } catch { return []; }
}

// Call once, right after login (before rendering the authenticated app), to
// decrypt an existing local cache into _patientCache ahead of time -- so the
// synchronous loadPatientDB() call in AppFull.jsx's initial useState almost
// always already has real data instead of hitting the [] placeholder above.
// Also transparently upgrades a still-plaintext legacy cache to encrypted.
async function hydrateLocalCache(userId) {
  if (!userId) return;
  const rawState = readDbRawSync(userId);
  if (rawState.kind === "encrypted") {
    const decrypted = await decryptJSON(rawState.envelope);
    if (Array.isArray(decrypted)) {
      _patientCache.set(userId, decrypted);
    } else {
      // Shouldn't normally happen (wrong/missing key, corrupt data). Leave
      // the cache unset -- loadPatientDB()'s [] fallback + the Supabase
      // merge effect are the recovery path, not a crash or data loss.
      console.error("[PatientDatabase] could not decrypt local patient cache for", userId);
    }
    return;
  }
  // Plaintext or empty -- loadPatientDB() already handles this correctly
  // (including seeding/migration). Run it once to warm the cache, then
  // opportunistically re-save as encrypted so this device's cache is
  // upgraded going forward without the user doing anything.
  const patients = loadPatientDB(userId);
  if (rawState.kind === "plaintext" && hasSessionKey()) {
    savePatientDBLocalOnly(patients, userId);
  }
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
// Encrypts (when a session key is available) and writes the local cache,
// updating _patientCache synchronously first so any loadPatientDB() call in
// the same tick sees fresh data even though the actual encrypt+write is
// async. Falls back to plaintext when there's no session key (Guest Mode,
// or a save that races ahead of key derivation) -- same as the old
// behaviour in that case, never worse.
async function persistPatientsLocal(patients, userId) {
  _patientCache.set(userId, patients);
  try {
    if (hasSessionKey()) {
      const envelope = await encryptJSON(patients);
      if (envelope) { localStorage.setItem(dbKey(userId), JSON.stringify(envelope)); return; }
    }
    localStorage.setItem(dbKey(userId), JSON.stringify(patients));
  } catch {}
}

// For call sites that already have the authoritative list (e.g. just
// fetched from Supabase) and only need to update the local cache, not
// re-upload it. Fire-and-forget, matching how the old raw
// localStorage.setItem it replaces was also fire-and-forget.
function savePatientDBLocalOnly(patients, userId) {
  return persistPatientsLocal(patients, userId);
}

function savePatientDB(patients, userId) {
  persistPatientsLocal(patients, userId); // fire-and-forget local (encrypted) cache write
  return syncPatientsToSupabase(patients, userId); // unchanged return contract — callers await/.then/.catch THIS for cloud save status
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

// ── Relative day label for the Clinical landing page's Recent Patients
//    list ("Today"/"Yesterday"/"N days ago") -- real updatedAt, not a
//    fabricated timestamp. ──
function relativeDay(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const startOfDay = x => new Date(x.getFullYear(), x.getMonth(), x.getDate());
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 0) return "Today";
  return `${diffDays} days ago`;
}

// Same predicate TherapistDashboardModule's own todayCount uses internally --
// exported so the Clinical header's "N patients today" subtitle shares one
// source of truth instead of a second inline copy.
function getTodaysPatients(patients=[]) {
  const today = new Date().toDateString();
  return patients.filter(p => new Date(p.updatedAt).toDateString() === today);
}


// ─── PATIENT PROFILE MODAL ─────────────────────────────────────────────────────



// -- Compact patient row for the Patients list (2026-08-27, minimalist
//    redesign: whole row is a single tap into Profile, matching the
//    reference "Name / Care setting • Diagnosis / day ›" layout, instead
//    of two competing Edit/Profile buttons -- SpecialtyPatientProfile.jsx
//    already has its own "Continue Assessment"/edit action, so nothing is
//    lost by dropping the row-level Edit button. Delete stays on the row
//    (kept small/secondary, matching the reference's clean look) since the
//    profile screen has no patient-delete action of its own to move it to
//    -- its own 🗑 button is for deleting an uploaded document, a
//    different thing entirely. Speciality dropped from this row (2026-08-27,
//    Aditi: "no speciality showing") -- speciality now lives only on its
//    own Assessment sub-tab as square cards, not mixed into the plain
//    patient list. --
// Minimal row -- avatar, name, "Specialty • Care setting" subtitle, relative
// day, chevron (2026-09-02, Aditi: "make the patient page in clinical same
// to same" as a reference design). Edit/Delete used to sit as their own
// icon buttons in the row itself, which the reference design has no room
// for (its rows are tap-the-whole-row-for-profile, chevron only) -- both
// actions still work, just tucked behind a "⋮" so the row reads as clean
// as the reference while nothing is actually lost.
function PatientRowCompact({ patient, isActive, specialtyLabel, careSettingLabel, onDelete, onProfile, onEditAssessment }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const day = relativeDay(patient.updatedAt);
  const subtitle = [specialtyLabel, careSettingLabel].filter(Boolean).join(" • ");
  return (
    <div onClick={onProfile} role="button" tabIndex={0} style={{
      width:"100%",textAlign:"left",cursor:"pointer",position:"relative",
      padding:"12px 4px", borderBottom:"1px solid #F1F0FA",
      background: isActive ? "#F5F3FF" : "transparent", borderRadius:10,
      display:"flex",alignItems:"center",gap:12,
    }}>
      <div style={{width:44,height:44,borderRadius:"50%",background:avatarGrad(patient.id),
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:"0.8rem",fontWeight:800,color:"#fff",flexShrink:0}}>
        {getInitials(patient.name)}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontWeight:800,fontSize:"0.88rem",color:"#111827",
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {patient.name || "Unnamed patient"}
          {patient.hasRedFlags && <span style={{marginLeft:6,fontSize:"0.72rem"}}>🚩</span>}
        </div>
        <div style={{fontSize:"0.76rem",color:"#9CA3AF",marginTop:1,
          whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
          {subtitle}
        </div>
      </div>
      <div style={{flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
        <span style={{fontSize:"0.76rem",color:"#9CA3AF",whiteSpace:"nowrap",marginRight:2}}>{day}</span>
        <button onClick={e=>{e.stopPropagation();setMenuOpen(v=>!v);}} title="More" style={{
          background:"none",border:"none",padding:3,cursor:"pointer",color:"#C4C4CE",display:"flex"}}>
          <MoreVertical size={15}/>
        </button>
        <ChevronRight size={17} color="#C4C4CE"/>
      </div>
      {menuOpen && (
        <div onClick={e=>e.stopPropagation()} style={{
          position:"absolute",top:"100%",right:4,zIndex:5,marginTop:2,
          background:"#fff",border:"1px solid #EEEDF5",borderRadius:10,
          boxShadow:"0 8px 24px rgba(30,20,60,0.12)",overflow:"hidden",minWidth:150}}>
          <button onClick={()=>{setMenuOpen(false);onEditAssessment();}} style={{
            display:"block",width:"100%",textAlign:"left",padding:"9px 14px",background:"none",
            border:"none",borderBottom:"1px solid #F1F0FA",fontSize:"0.8rem",fontWeight:600,
            color:"#111827",cursor:"pointer"}}>✏️ Edit assessment</button>
          <button onClick={()=>{setMenuOpen(false);onDelete();}} style={{
            display:"block",width:"100%",textAlign:"left",padding:"9px 14px",background:"none",
            border:"none",fontSize:"0.8rem",fontWeight:600,color:"#ef4444",cursor:"pointer"}}>🗑 Delete</button>
        </div>
      )}
    </div>
  );
}

// ─── PATIENT DATABASE PANEL ────────────────────────────────────────────────────
function PatientDatabasePanel({ patients, activeId, onSelect, onNew, onDelete, onClose: onCloseProp, onImport, onNav, liveData={}, embedded=false }) {
  // embedded=true (2026-08-17): renders as a normal full-width tab page
  // (mounted from the "clinical" ALL_TESTS entry in AppFull.jsx, same
  // pattern as Home/PhysioFeed/Learn/Profile) instead of the original
  // fixed-overlay modal, which only covered part of the screen width
  // and needed an explicit Close button -- the other bottom-nav tabs
  // don't work that way. Still used as a modal by the sidebar/"Switch
  // Patient"/"Load Patient" buttons (embedded left false there), so
  // this stays backward compatible rather than a hard cutover.
  const closePanel = embedded ? (()=>{}) : onCloseProp;
  const [search, setSearch]       = useState("");
  // Search starts collapsed to just the header icon (2026-09-02, Aditi:
  // "constantly showing" the bar was the complaint) -- tapping the icon
  // reveals the bar and focuses it; the bar itself doesn't auto-hide again
  // just from losing focus, only from tapping the icon a second time (a
  // pending search term shouldn't vanish behind a stray tap elsewhere).
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const [sortBy, setSortBy]       = useState("updated");
  const [filterFlag, setFilterFlag] = useState(false);
  const [showTools, setShowTools] = useState(false);
  // Speciality sub-filter (2026-08-27, Aditi: "put speciality as here
  // subtopic") -- back as a filter, but as a second pill row nested under
  // the care-setting pills instead of the earlier full card grid, which
  // was removed from this tab per Aditi's separate "no speciality showing"
  // request. Both filters compose (AND), same as filterCareSetting below.
  const [filterSpecialty, setFilterSpecialty] = useState("all");
  // The intake form now asks outright which specialty an assessment is for
  // (2026-08-31) and stores the answer on the record, so use it when it's
  // there. "ortho_new" is the Ortho wizard's own stream id, which older
  // records may carry -- it's still Ortho as far as this filter goes. Only
  // records predating that question fall back to the old guess from
  // specialty-specific field names.
  const specialtyOf = (p) => {
    const stated = p.data?.assessment_specialty;
    if (stated) return stated === "ortho_new" ? "ortho" : stated;
    return p.data?.cardio ? "cardio" : p.data?.neuro ? "neuro" : "ortho";
  };
  const SPECIALTIES = [
    { id:"ortho",  label:"Ortho" },
    { id:"cardio", label:"Cardio" },
    { id:"neuro",  label:"Neuro" },
    { id:"sports", label:"Sports" },
    { id:"pedia",  label:"Pedia" },
  ];
  // Full names + real SVG icon/colour per specialty, for the "By Speciality"
  // card grid and each row's subtitle (2026-09-02 redesign) -- same 4
  // specialties/colours STREAMS (AppFull.jsx) already uses elsewhere, kept
  // in sync by hand since STREAMS itself isn't reachable from this file.
  const SPECIALTY_LABEL = { ortho:"Orthopaedic", cardio:"Cardiovascular", neuro:"Neurology", sports:"Sports", pedia:"Pediatric" };
  const SPECIALTY_CARD_META = [
    { id:"ortho",  label:"Orthopaedic",    Icon:Bone,       color:"#7c3aed", bg:"#F3EEFF" },
    { id:"cardio", label:"Cardiovascular", Icon:HeartPulse, color:"#dc2626", bg:"#FDEAEC" },
    { id:"neuro",  label:"Neurology",      Icon:Brain,      color:"#0d9488", bg:"#E6FBF8" },
    { id:"sports", label:"Sports",         Icon:Footprints, color:"#ea580c", bg:"#FFF1E6" },
  ];
  // Care setting (2026-08-27, Aditi: "each patient specify ipd opd
  // outpatients etc") -- every assessment wizard (Ortho IPD/Post-op/
  // Outpatient, Neuro, Cardio) now writes a real top-level
  // data.care_setting field on save, so that's read first and is
  // authoritative. Records saved before that existed have no such field,
  // so this still falls back to a best-effort guess from field names
  // unique to each pathway (Ortho's legacy IPD/Post-op field names, then
  // Neuro/Cardio's own meta.setting) before finally defaulting to
  // Outpatient -- the pathway picker's default and by far the most common
  // case -- rather than fabricating a setting with no basis at all.
  const careSettingOf = (p) => {
    const d = p.data || {};
    if (d.care_setting === "ipd" || d.care_setting === "postop" || d.care_setting === "outpatient") return d.care_setting;
    if (d.postOpDay || d.surgeryDate || d.surgeonInstructions) return "postop";
    if (d.reductionMethod || d.amputationCause || d.recordReview) return "ipd";
    const legacySetting = d.neuro?.meta?.setting || d.cardio?.meta?.setting;
    if (legacySetting === "postop") return "postop";
    if (legacySetting === "inpatient" || legacySetting === "icu") return "ipd";
    return "outpatient";
  };
  const CARE_SETTINGS = [
    { id:"outpatient", label:"Outpatient" },
    { id:"ipd",         label:"IPD" },
    { id:"postop",      label:"Post-op" },
  ];
  const [filterCareSetting, setFilterCareSetting] = useState("all");
  // "Recent Patients" shows just the newest few with a "View all" link
  // (2026-09-02 redesign, matching the reference design) unless a search/
  // filter is already active, in which case the full filtered list always
  // shows (nothing to "view all" of beyond what's already narrowed down).
  const [recentExpanded, setRecentExpanded] = useState(false);
  const RECENT_LIMIT = 4;
  const [localPatients, setLocalPatients] = useState(patients);
  const fileRef = useRef(null);

  // Keep local in sync when parent updates
  useEffect(() => { setLocalPatients(patients); }, [patients]);

  const filtered = localPatients
    .filter(p => {
      if (filterFlag && !p.hasRedFlags) return false;
      if (filterCareSetting !== "all" && careSettingOf(p) !== filterCareSetting) return false;
      if (filterSpecialty !== "all" && specialtyOf(p) !== filterSpecialty) return false;
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

  // isNarrowed controls the section title/cap: "Recent Patients" (capped to
  // RECENT_LIMIT, "View all" link) once nothing is filtered, vs "Patients"
  // showing the complete filtered list once search/a filter is active --
  // reinstating the reference design's Recent Patients pattern (2026-09-02);
  // superseded the flat "always show everything" list from 2026-08-27.
  const isNarrowed = !!search || filterCareSetting !== "all" || filterSpecialty !== "all" || filterFlag;
  const showCap = !isNarrowed && !recentExpanded;
  const displayed = showCap ? filtered.slice(0, RECENT_LIMIT) : filtered;
  const listTitle = isNarrowed ? "Patients" : recentExpanded ? "All Patients" : "Recent Patients";

  const handleImportFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { try { onImport(JSON.parse(ev.target.result)); } catch {} };
    reader.readAsText(file);
  };

  // Real, computed clinic-status counts (2026-08-17) -- not placeholders.
  // "In progress": has some real clinical content beyond a bare demographic
  // record, but SOAP hasn't been finalised yet.
  // "SOAP pending": objective testing has started (rom_/mmt_/st_ prefixed
  // fields present) but there's still no SOAP diagnosis.
  // "Home protocols today": a home exercise programme (hep_programme) was
  // set on a record last touched today.
  const isSoapDone = d => !!(d?.soap_a_diagnosis || d?.soap_a);
  const hasStarted = d => !!(d?.cc_main || d?.lx_loc || d?.cx_loc);
  const hasObjective = d => Object.keys(d||{}).some(k=>k.startsWith("rom_")||k.startsWith("mmt_")||k.startsWith("st_"));
  const isToday = dateStr => dateStr && new Date(dateStr).toDateString() === new Date().toDateString();
  const assessmentsInProgress = localPatients.filter(p => hasStarted(p.data) && !isSoapDone(p.data)).length;
  const soapPending = localPatients.filter(p => hasObjective(p.data) && !isSoapDone(p.data)).length;
  const homeProtocolsToday = localPatients.filter(p => p.data?.hep_programme && isToday(p.updatedAt)).length;

const innerBody = (
    <div style={{flex:1,overflowY:embedded?"visible":"auto"}}>

          {/* Header (2026-09-02, Aditi: "make the patient page in clinical
              same to same" as a reference design) -- title + subtitle only,
              no bell clutter (the red-flag count still surfaces via the
              "Flags only" filter in Sort, filters & backup below). The ✕
              close button stays, but only for the non-embedded Switch/Load
              Patient popup -- that's a real modal with no other explicit
              close control besides the backdrop tap; the embedded Clinical
              tab this redesign targets never rendered it anyway. */}
          <div style={{padding:"20px 18px 2px",display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <div style={{fontWeight:900,fontSize:"1.5rem",color:"#111827",letterSpacing:"-0.4px"}}>Patients</div>
              <div style={{fontSize:"0.82rem",color:"#9CA3AF",marginTop:2}}>Organize and manage your patients</div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginTop:2}}>
              <button onClick={()=>{
                  setSearchOpen(o=>{
                    const next=!o;
                    if(next) setTimeout(()=>searchInputRef.current?.focus(),0);
                    else setSearch("");
                    return next;
                  });
                }} title={searchOpen?"Hide search":"Search"}
                style={{background:searchOpen?"#EDE9FE":"#F3F4F6",border:"none",
                  borderRadius:8,color:searchOpen?"#7c3aed":"#6B7280",cursor:"pointer",
                  width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <SearchIcon size={14}/>
              </button>
              {!embedded && (
                <button onClick={closePanel} title="Close" style={{background:"#F3F4F6",border:"none",
                  borderRadius:8,color:"#6B7280",cursor:"pointer",width:26,height:26,fontSize:"0.75rem",fontWeight:700}}>✕</button>
              )}
            </div>
          </div>

          {/* Search -- collapsed behind the header magnifying-glass icon by
              default (2026-09-02, Aditi: the bar was "constantly showing");
              real SVG icon (lucide Search) in place of the emoji, same
              layout fix as before (icon and input are flex siblings so
              utils.jsx's global forced input padding never crowds it). */}
          {searchOpen && (
            <div style={{padding:"14px 18px 0"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,border:"1px solid #EEEDF5",
                borderRadius:14,background:"#F8F7FC",paddingLeft:14}}>
                <SearchIcon size={16} color="#9CA3AF" style={{flexShrink:0}}/>
                <input ref={searchInputRef} value={search} onChange={e=>setSearch(e.target.value)}
                  placeholder="Search patients…"
                  style={{flex:1,minWidth:0,border:"none",color:"#111827",background:"transparent",
                    outline:"none",padding:"12px 14px 12px 0",fontSize:"0.85rem",boxSizing:"border-box"}}/>
              </div>
            </div>
          )}

          {/* Care-setting filter pills -- All / Outpatient / IPD / Post-op,
              for which pathway a patient was assessed under. See
              careSettingOf above for why this is a best-effort derivation,
              not stored data, until the Ortho pathway wizard persists it for
              real. Speciality pills sit in the same scroll row area
              (2026-09-10, Aditi: "want specialisties in top nav bar" -- the
              standalone "By Speciality" card grid that used to be further
              down the page is gone, this row is the only speciality filter
              now). */}
          <div className="cp-scroll-x" style={{padding:"14px 18px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            {[{id:"all",label:"All"}, ...CARE_SETTINGS].map(cs => {
              const active = filterCareSetting === cs.id;
              return (
                <button key={cs.id} onClick={()=>setFilterCareSetting(cs.id)}
                  style={{flexShrink:0,padding:"8px 16px",borderRadius:99,border:"none",
                    background:active?"#7c3aed":"#F3F1FB",
                    color:active?"#fff":"#6B7280",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",
                    whiteSpace:"nowrap"}}>
                  {cs.label}
                </button>
              );
            })}
          </div>
          <div className="cp-scroll-x" style={{padding:"8px 18px 0",display:"flex",gap:8,overflowX:"auto",scrollbarWidth:"none",msOverflowStyle:"none"}}>
            {[{id:"all",label:"All specialities"}, ...SPECIALTY_CARD_META].map(sp => {
              const active = filterSpecialty === sp.id;
              return (
                <button key={sp.id} onClick={()=>setFilterSpecialty(sp.id)}
                  style={{flexShrink:0,padding:"8px 16px",borderRadius:99,
                    border:`1.5px solid ${active?(sp.color||"#7c3aed"):"#EEEDF5"}`,
                    background:active?(sp.bg||"#F3EEFF"):"#fff",
                    color:active?(sp.color||"#7c3aed"):"#6B7280",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",
                    whiteSpace:"nowrap"}}>
                  {sp.label}
                </button>
              );
            })}
          </div>

          {/* New Assessment CTA -- only shown in the non-embedded (Switch/
              Load Patient popup) context, where there's no separate
              Assessment tab to send people to (2026-08-23). */}
          {!embedded && (
            <div style={{padding:"22px 18px 0"}}>
              <button onClick={onNew}
                style={{width:"100%",padding:"15px",background:"linear-gradient(135deg,#7c3aed,#9333ea)",
                  border:"none",borderRadius:14,color:"white",fontWeight:800,fontSize:"0.92rem",cursor:"pointer",
                  boxShadow:"0 4px 14px rgba(124,58,237,0.3)"}}>
                ＋ New Assessment
              </button>
            </div>
          )}

          {/* Recent Patients -- capped to RECENT_LIMIT with a "View all"
              link (2026-09-02, matching the reference design) once nothing
              is filtered; a search/filter already narrows the list, so the
              cap and link both drop out and every match shows under
              "Patients" instead. */}
          <div style={{padding:"24px 18px 0"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <div style={{fontWeight:800,fontSize:"0.98rem",color:"#111827"}}>{listTitle}</div>
              {!isNarrowed && !recentExpanded && filtered.length > RECENT_LIMIT && (
                <button onClick={()=>setRecentExpanded(true)} style={{background:"none",border:"none",
                  padding:0,cursor:"pointer",display:"flex",alignItems:"center",gap:2,
                  color:"#7c3aed",fontSize:"0.82rem",fontWeight:700}}>
                  View all <ChevronRight size={15}/>
                </button>
              )}
            </div>

            {filtered.length === 0 ? (
              <div style={{textAlign:"center",padding:"30px 10px",color:"#9CA3AF",
                background:"#fff",border:"1.5px solid #EEEDF5",borderRadius:16}}>
                <div style={{fontSize:"2rem",marginBottom:6}}>👤</div>
                <div style={{fontSize:"0.82rem"}}>
                  {isNarrowed ? "No patients match this filter" : "No patients yet — tap New Assessment to start"}
                </div>
              </div>
            ) : (
              <div style={{background:"#fff",border:"1.5px solid #EEEDF5",borderRadius:16,padding:"4px 10px"}}>
                {displayed.map(p => (
                  <PatientRowCompact
                    key={p.id}
                    patient={p}
                    isActive={p.id === activeId}
                    specialtyLabel={SPECIALTY_LABEL[specialtyOf(p)]}
                    careSettingLabel={CARE_SETTINGS.find(cs=>cs.id===careSettingOf(p))?.label}
                    onDelete={()=>onDelete(p.id)}
                    // One profile per patient (Aditi: "just be one patient
                    // profile...not show speciality profile"). Every patient
                    // now opens the same specialty hub (SpecialtyPatientProfile.jsx,
                    // reached via Clinical/active==="specialty_profile") --
                    // the legacy PatientProfileModal it used to fall back to
                    // for patients with no Cardio/Neuro/Ortho data has been
                    // removed entirely (2026-09-02, Aditi: "remove old ortho
                    // patient profile totally"), so this is now the only
                    // profile screen in the app.
                    onProfile={()=>{ onSelect(p); if (onNav) onNav("specialty_profile"); }}
                    // Reachable directly from the row instead of needing to
                    // open Profile first (Aditi: "edit assessment and profile
                    // should be there in patient").
                    onEditAssessment={()=>{ onSelect(p); closePanel(); }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Stats cards -- same "patient list only" scoping as the CTA/
              Clinical Areas block above; kept in the non-embedded popup. */}
          {!embedded && (
          <div style={{padding:"22px 18px 18px",display:"flex",gap:10}}>
            {[
              {val:assessmentsInProgress, label:"Assessments in progress", color:"#7c3aed"},
              {val:soapPending, label:"Diagnoses pending", color:"#0d9488"},
              {val:homeProtocolsToday, label:"Home protocols today", color:"#059669"},
            ].map(s => (
              <div key={s.label} style={{flex:1,background:"#F8F7FC",borderRadius:14,padding:"14px 10px",textAlign:"center"}}>
                <div style={{fontWeight:900,fontSize:"1.4rem",color:s.color}}>{s.val}</div>
                <div style={{fontSize:"0.7rem",color:"#6B7280",marginTop:4,lineHeight:1.3}}>{s.label}</div>
              </div>
            ))}
          </div>
          )}

          {/* Secondary tools -- sort/flags/import/export. Real, kept
              functional, just tucked below the fold so the primary
              layout above matches the design as closely as possible. */}
          <div style={{padding:"0 18px 20px"}}>
            <button onClick={()=>setShowTools(s=>!s)}
              style={{background:"none",border:"none",padding:0,cursor:"pointer",fontSize:"0.76rem",fontWeight:700,color:"#9CA3AF"}}>
              {showTools ? "Hide options ↑" : "Sort, filters & backup ↓"}
            </button>
            {showTools && (
              <div style={{marginTop:10,display:"flex",flexDirection:"column",gap:8}}>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {[["updated","🕐 Recent"],["name","A–Z"],["age","Age"],["fields","Complete"]].map(([v,l])=>(
                    <button key={v} onClick={()=>setSortBy(v)}
                      style={{padding:"6px 12px",borderRadius:20,
                        border:`1px solid ${sortBy===v?"#7c3aed":"#E5E7EB"}`,
                        background:sortBy===v?"#7c3aed":"white",
                        color:sortBy===v?"white":"#6B7280",fontSize:"0.76rem",fontWeight:700,cursor:"pointer"}}>
                      {l}
                    </button>
                  ))}
                  <button onClick={()=>setFilterFlag(f=>!f)}
                    style={{padding:"6px 12px",borderRadius:20,marginLeft:"auto",
                      border:`1px solid ${filterFlag?"#ef4444":"#E5E7EB"}`,
                      background:filterFlag?"#FEF2F2":"white",
                      color:filterFlag?"#ef4444":"#6B7280",fontSize:"0.76rem",fontWeight:700,cursor:"pointer"}}>
                    🚩 Flags only
                  </button>
                </div>
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
            )}
          </div>
    </div>
);

  return (
    <>
    {embedded ? (
      <div data-testid="clinical-panel" style={{width:"100%",background:"#FFFFFF",display:"flex",flexDirection:"column"}}>
        {innerBody}
      </div>
    ) : (
      <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:300,
        display:"flex",alignItems:"stretch",justifyContent:"flex-start"}}>
        <div data-testid="clinical-panel" style={{width:"100%",maxWidth:480,background:"#FFFFFF",
          borderRight:"1px solid #E5E7EB",display:"flex",
          flexDirection:"column",height:"100%",boxShadow:"4px 0 24px rgba(0,0,0,0.15)"}}>
          {innerBody}
        </div>

        {/* Click outside */}
        <div style={{flex:1}} onClick={closePanel}/>
      </div>
    )}
    </>
  );
}

// ─── TREATMENT CASELOAD (Clinical tab's "Treatment" sub-tab, 2026-08-22) ──────
// Only patients with at least one logged tx_sessions entry -- "currently
// undergoing treatment" is derived from that real data, not a separate
// status field the app doesn't have. Session count and pain trend are read
// straight off tx_sessions (vasStart/vasEnd) rather than inventing a planned
// session target, since no such field exists anywhere in the data model.
function TreatmentCaseloadPanel({ patients=[], onContinue, onProfile, onDeleteTreatment }) {
  const C = { primary:"#6D28D9", text:"#111827", muted:"#6B7280", border:"#F1F5F9",
    green:"#10B981", red:"#EF4444", orange:"#F59E0B" };
  // Two-tap delete (2026-09-02) -- one stray tap on a caseload card can't
  // wipe someone's session history; tapping "Remove" again within the same
  // render confirms it. Tracks which patient id is mid-confirm.
  const [confirmId, setConfirmId] = useState(null);

  const caseload = patients
    .map(p => {
      const sessions = Array.isArray(p.data?.tx_sessions) ? p.data.tx_sessions : [];
      if (sessions.length === 0) return null;
      // tx_sessions is saved newest-first (see saveNew() above)
      const newest = sessions[0], oldest = sessions[sessions.length-1];
      const painStart = oldest?.vasStart ?? null;
      const painNow = newest?.vasEnd ?? newest?.vasStart ?? null;
      return {
        patient: p,
        sessionCount: sessions.length,
        lastDate: newest?.date || null,
        painStart, painNow,
        condition: p.data?.cc_main || p.lastDx || "",
      };
    })
    .filter(Boolean)
    .sort((a,b) => b.sessionCount - a.sessionCount);

  if (caseload.length === 0) {
    return (
      <div style={{padding:"40px 20px",textAlign:"center",color:C.muted}}>
        <div style={{fontSize:"2rem",marginBottom:8}}>💊</div>
        <div style={{fontWeight:700,color:C.text,marginBottom:4}}>No one's in active treatment yet</div>
        <div style={{fontSize:"0.82rem"}}>Patients show up here once their first treatment session is logged (Sessions screen).</div>
      </div>
    );
  }

  return (
    <div style={{padding:"14px 16px 24px"}}>
      <div style={{fontSize:"0.7rem",fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:10}}>
        Ongoing Treatment · {caseload.length}
      </div>
      {caseload.map(({patient,sessionCount,lastDate,painStart,painNow,condition}) => {
        const improving = painStart!=null && painNow!=null && Number(painNow) < Number(painStart);
        return (
          <div key={patient.id} style={{padding:"14px",borderRadius:12,border:`1px solid ${C.border}`,marginBottom:10,background:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
              <div>
                <div style={{fontWeight:800,fontSize:"0.92rem",color:C.text}}>{patient.name||"Unnamed Patient"}</div>
                {condition && <div style={{fontSize:"0.78rem",color:C.muted,marginTop:1}}>{condition}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"0.78rem",fontWeight:700,color:C.primary}}>Session {sessionCount}</div>
                {lastDate && <div style={{fontSize:"0.68rem",color:C.muted}}>Last: {lastDate}</div>}
              </div>
            </div>
            {(painStart!=null || painNow!=null) && (
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10,fontSize:"0.78rem",color:C.muted}}>
                Pain: <strong style={{color:C.text}}>{painStart ?? "—"}</strong> → <strong style={{color:improving?C.green:C.text}}>{painNow ?? "—"}</strong>/10
                {improving && <span style={{color:C.green,fontWeight:700}}>↓ improving</span>}
              </div>
            )}
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>onContinue&&onContinue(patient)}
                style={{flex:2,padding:"9px",borderRadius:9,border:"none",background:C.primary,color:"#fff",fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
                Continue Treatment →
              </button>
              <button onClick={()=>onProfile&&onProfile(patient)}
                style={{flex:1,padding:"9px",borderRadius:9,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
                Profile
              </button>
              {onDeleteTreatment && (
                confirmId === patient.id ? (
                  <button onClick={()=>{ onDeleteTreatment(patient); setConfirmId(null); }}
                    title="Tap again to confirm"
                    style={{flex:1,padding:"9px",borderRadius:9,border:`1px solid ${C.red}`,background:"#FEF2F2",color:C.red,fontWeight:700,fontSize:"0.78rem",cursor:"pointer",whiteSpace:"nowrap"}}>
                    Confirm?
                  </button>
                ) : (
                  <button onClick={()=>setConfirmId(patient.id)} title="Remove this patient's logged treatment sessions"
                    style={{padding:"9px 10px",borderRadius:9,border:`1px solid ${C.border}`,background:"#fff",color:C.muted,fontWeight:700,fontSize:"0.78rem",cursor:"pointer"}}>
                    🗑
                  </button>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ─── POSTURE DEFECTS DATA ─────────────────────────────────────────────────────

// ── PostureSessionsView (used by SpecialtyPatientProfile.jsx) ──
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
                {(cr.mergedFindings||[]).length>0&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 12px 4px"}}>
                    <MuscleImbalanceCard findings={cr.mergedFindings||[]} isWide={false}/>
                  </div>
                )}
                <div style={{borderTop:`1px solid ${C.border}`}}>
                  <ExercisePlanTab findings={cr.mergedFindings||[]} isWide={false}/>
                </div>
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
                {(ps.findings||[]).length>0&&(
                  <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 12px 4px"}}>
                    <MuscleImbalanceCard findings={ps.findings||[]} isWide={false}/>
                  </div>
                )}
                <div style={{borderTop:`1px solid ${C.border}`}}>
                  <ExercisePlanTab findings={ps.findings||[]} isWide={false}/>
                </div>
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
  loadPatientDB, savePatientDB, savePatientDBLocalOnly,
  hydrateLocalCache, clearPatientCache,
  loadTaskDB, saveTaskDB,
  genId,
  PatientDatabasePanel, TreatmentCaseloadPanel,
  PostureSessionsView,
  getInitials, avatarGrad, relativeDay,
  getTodaysPatients,
};
