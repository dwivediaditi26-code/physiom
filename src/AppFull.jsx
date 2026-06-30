// AppFull.jsx — Posture engine, camera, patient DB, dashboard, AppInner, App
import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense } from "react";
import { supabase } from "./supabase.js";
import { createPortal } from "react-dom";
import { r2, mid, px, C, getC, useTheme, MobileStyleInjector, ErrorBoundary, TabLoader } from "./utils.jsx";
import { SpecialTestsSection, SubjectiveModule, NKTSection, KineticChainSection, FMASection, FasciaSection,
  NKT_REGIONS, KC_REGIONS, UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S,
  ErgoModule, CyriaxModule, CyriaxRegionTests, generateDiagnosis,
  PDF_BASE_STYLES, makePDFPage, MOVEMENTS, downloadPDFFromHTML } from "./SubjectiveObjective.jsx";
import { GaitModule, OutcomeMeasuresModule, SOAPNoteModule, ExercisePrescriptionModule, LiveSOAPPanel,
  PalpationModule, TreatmentTechniquesModule, TreatmentSessionLogModule,
  buildClinicalInterpretation, Sparkline, EXERCISE_DB, ALL_EXERCISES, PROGRAMME_TEMPLATES, TEMPLATE_TX, ObservationModule } from "./ClinicalModules.jsx";
import BodyChartPro from "./BodyChartPro.jsx";
import OutcomeMeasuresPro from "./OutcomeMeasuresPro.jsx";
import AuthScreen from "./AuthScreen.jsx";
import LandingPage from "./LandingPage.jsx";
import { ALL_TESTS, ROMModule, MMTModule, NeurologicalModule,
  MMT_DATA, DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO } from "./PhysioNeuro.jsx";
import AIAssistant from "./AIAssistant.jsx";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

import { PostureAnalysisModule, PC } from "./PostureEngine.jsx";

// ── Lazy-loaded heavy modules (split into separate async chunks) ──────────────
const LazySubjective    = lazy(() => import("./lazy_subjective.jsx"));
const LazySTT           = lazy(() => import("./lazy_stt.jsx"));
const LazyCPA           = lazy(() => import("./lazy_cpa.jsx"));
const LazySOAP          = lazy(() => import("./lazy_clinical.jsx"));
const LazyExercise      = lazy(() => import("./lazy_exercise.jsx"));
const LazyOutcomes      = lazy(() => import("./lazy_outcomes.jsx"));
const LazyNeuro         = lazy(() => import("./lazy_neuro.jsx"));
const LazyBodyChart     = lazy(() => import("./lazy_bodychart.jsx"));
const LazyGait          = lazy(() => import("./lazy_gait.jsx"));
const LazyPalpation     = lazy(() => import("./lazy_palpation.jsx"));
const LazyTreatment     = lazy(() => import("./lazy_treatment.jsx"));

// Minimal Suspense fallback
const TabFallback = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:40,color:"#9ca3af",fontSize:"0.88rem",gap:10}}>
    <span style={{display:"inline-block",width:18,height:18,border:"2px solid #e5e7eb",borderTopColor:"#7c3aed",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>
    Loading module...
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

// ─── MAIN APP ────────────────────────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════════════════════
// MULTI-PATIENT DATABASE
// ═══════════════════════════════════════════════════════════════════════════
const DB_KEY = "physio_patient_db_v1";
const DRAFT_KEY = "physio_draft_v1";

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

function loadPatientDB() {
  try {
    // One-time clear: if user has old demo data from before v2026-06-21, wipe it
    const cleared = localStorage.getItem("pm_cleared_demo_v5");
    if (!cleared) {
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(DRAFT_KEY);
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
async function syncPatientsToSupabase(patients) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // not logged in — don't sync
    const rows = patients.map(p => ({
      id: p.id,
      user_id: user.id,
      name: p.name || "Unknown",
      data: p.data || {},
      created_at: p.createdAt || new Date().toISOString(),
      updated_at: p.updatedAt || new Date().toISOString(),
      has_red_flags: p.hasRedFlags || false,
      last_dx: p.lastDx || "",
    }));
    const { error } = await supabase.from("patients").upsert(rows, { onConflict: "id" });
    if (error) console.warn("[Supabase sync]", error.message);
  } catch (e) { console.warn("[Supabase sync error]", e); }
}
function savePatientDB(patients) {
  try { localStorage.setItem(DB_KEY, JSON.stringify(patients)); } catch {}
  syncPatientsToSupabase(patients);
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
          borderRadius:12, overflow:"hidden", background:"#f5f0fb",
          border:"1.5px solid #d8cce8", userSelect:"none" }}>

        {/* Clinical body chart — smooth bezier paths, full 220px height */}
        <svg viewBox="0 0 400 220" width="100%" style={{display:"block",background:"#f5f0fb"}}>
          <g transform="translate(0,0)"><ellipse cx="50" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M41 5.5 C38.5 7.5 38.5 11 41 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M59 5.5 C61.5 7.5 61.5 11 59 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><line x1="50" y1="9" x2="50" y2="12" stroke="#7c3aed" strokeWidth="0.6" opacity="0.4"/><path d="M45 17 L44 31 L56 31 L55 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M44 31 Q38 27 27 34" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M56 31 Q62 27 73 34" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M44 31 C37 31 27 34 25 41 C23 50 24 65 25 78 C26 88 27 100 29 113 C30 123 31 130 32 136 L44 136 L44 119 L56 119 L56 136 L68 136 C69 130 70 123 71 113 C73 100 74 88 75 78 C76 65 77 50 75 41 C73 34 63 31 56 31 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1.3"/><line x1="50" y1="32" x2="50" y2="95" stroke="#7c3aed" strokeWidth="0.7" strokeDasharray="2.5,2" opacity="0.5"/><circle cx="50" cy="99" r="1.4" fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"/><path d="M25 41 C20 45 17 57 17 70 L17 75 Q17 79 20 80 L25 80 Q27 79 27 75 L26 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M17 75 C15 80 14 88 14 97 Q14 100 17 101 L24 101 Q27 100 27 97 L27 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M14 97 C12 103 12 112 14 119 Q15 121 19 121 L24 121 Q27 120 27 117 L27 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><line x1="11" y1="119" x2="10" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><line x1="14" y1="119" x2="13" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><line x1="17" y1="119" x2="16" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><line x1="20" y1="119" x2="19" y2="119" stroke="#7c3aed" strokeWidth="0.7" opacity="0.6"/><path d="M75 41 C80 45 83 57 83 70 L83 75 Q83 79 80 80 L75 80 Q73 79 73 75 L74 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M83 75 C85 80 86 88 86 97 Q86 100 83 101 L76 101 Q73 100 73 97 L73 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M86 97 C88 103 88 112 86 119 Q85 121 81 121 L76 121 Q73 120 73 117 L73 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 136 C31 141 32 149 37 150 L44 150 L56 150 L63 150 C68 149 69 141 68 136 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 149 C30 154 30 163 31 172 Q32 174 37 174 L44 174 Q46 173 46 171 L44 149 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="39" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 187 C31 193 31 200 32 205 Q33 207 38 207 L44 207 Q46 206 46 204 L46 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 205 L32 212 Q31 219 40 219 L47 219 Q48 218 47 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 215 Q30 219 35 219" fill="none" stroke="#7c3aed" strokeWidth="0.7"/><path d="M68 149 C70 154 70 163 69 172 Q68 174 63 174 L56 174 Q54 173 54 171 L56 149 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="61" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 187 C69 193 69 200 68 205 Q67 207 62 207 L56 207 Q54 206 54 204 L54 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 205 L68 212 Q69 219 60 219 L53 219 Q52 218 53 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 215 Q70 219 65 219" fill="none" stroke="#7c3aed" strokeWidth="0.7"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">ANTERIOR</text>
          </g>
          <g transform="translate(100,0)"><ellipse cx="48" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M57 5.5 C59.5 7.5 59.5 11 57 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M57 7 Q60 9 57 11" fill="none" stroke="#7c3aed" strokeWidth="0.8"/><path d="M47 17 L46 31 L54 31 L52 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M46 31 C42 31 36 34 34 42 C32 52 33 68 34 82 C35 95 36 108 37 120 C38 130 39 136 40 145 L60 145 C61 136 62 128 63 118 C64 106 65 92 66 80 C67 66 67 50 65 41 C63 34 56 31 52 31 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1.3"/><path d="M34 46 C31 52 31 60 34 66" fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"/><path d="M65 41 C70 45 72 57 72 70 L72 75 Q72 79 69 80 L66 79 Q65 78 65 75 L64 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M72 75 C73 81 74 88 74 97 Q74 100 71 101 L66 101 Q65 100 65 97 L65 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M74 97 C75 103 75 112 73 119 Q72 121 69 121 L65 121 Q64 120 64 117 L65 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M40 140 C35 144 32 152 33 160 Q35 165 40 164 L48 162 L48 140 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1"/><path d="M40 162 C38 167 37 175 38 180 Q39 175 48 174 L50 149 L44 148 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="44" cy="180" rx="7" ry="7.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M38 187 C37 193 38 201 39 205 Q41 207 46 207 L52 207 Q54 206 54 204 L52 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M39 205 L37 212 Q36 219 46 219 L57 219 Q60 219 58 215 L54 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M37 212 Q35 219 38 219" fill="none" stroke="#7c3aed" strokeWidth="0.8"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">LEFT LAT</text>
          </g>
          <g transform="translate(200,0)"><ellipse cx="52" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M43 5.5 C40.5 7.5 40.5 11 43 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M43 7 Q40 9 43 11" fill="none" stroke="#7c3aed" strokeWidth="0.8"/><path d="M53 17 L54 31 L46 31 L48 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M54 31 C58 31 64 34 66 42 C68 52 67 68 66 82 C65 95 64 108 63 120 C62 130 61 136 60 145 L40 145 C39 136 38 128 37 118 C36 106 35 92 34 80 C33 66 33 50 35 41 C37 34 44 31 48 31 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1.3"/><path d="M66 46 C69 52 69 60 66 66" fill="none" stroke="#7c3aed" strokeWidth="0.8" opacity="0.5"/><path d="M35 41 C30 45 28 57 28 70 L28 75 Q28 79 31 80 L34 79 Q35 78 35 75 L36 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M28 75 C27 81 26 88 26 97 Q26 100 29 101 L34 101 Q35 100 35 97 L35 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M26 97 C25 103 25 112 27 119 Q28 121 31 121 L35 121 Q36 120 36 117 L35 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M60 140 C65 144 68 152 67 160 Q65 165 60 164 L52 162 L52 140 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1"/><path d="M60 162 C62 167 63 175 62 180 Q61 175 52 174 L50 149 L56 148 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="56" cy="180" rx="7" ry="7.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M62 187 C63 193 62 201 61 205 Q59 207 54 207 L48 207 Q46 206 46 204 L48 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M61 205 L63 212 Q64 219 54 219 L43 219 Q40 219 42 215 L46 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M63 212 Q65 219 62 219" fill="none" stroke="#7c3aed" strokeWidth="0.8"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">RIGHT LAT</text>
          </g>
          <g transform="translate(300,0)"><ellipse cx="50" cy="8.5" rx="9" ry="8.5" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.2"/><path d="M41 5.5 C38.5 7.5 38.5 11 41 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><path d="M59 5.5 C61.5 7.5 61.5 11 59 13" fill="none" stroke="#7c3aed" strokeWidth="0.9"/><line x1="50" y1="9" x2="50" y2="12" stroke="#7c3aed" strokeWidth="0.6" opacity="0.4"/><path d="M45 17 L44 31 L56 31 L55 17 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1.1"/><path d="M44 31 Q38 27 28 33 Q24 37 26 40" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M56 31 Q62 27 72 33 Q76 37 74 40" fill="none" stroke="#7c3aed" strokeWidth="1"/><path d="M44 31 C37 31 27 34 25 41 C23 50 24 65 25 78 C26 88 27 100 29 113 C30 123 31 130 32 136 L44 136 L44 119 L56 119 L56 136 L68 136 C69 130 70 123 71 113 C73 100 74 88 75 78 C76 65 77 50 75 41 C73 34 63 31 56 31 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1.3"/><line x1="50" y1="32" x2="50" y2="136" stroke="#7c3aed" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.6"/><path d="M30 38 Q27 50 30 57 Q34 60 38 57 Q41 51 39 39 Z" fill="rgba(124,58,237,0.06)" stroke="#7c3aed" strokeWidth="0.9"/><path d="M70 38 Q73 50 70 57 Q66 60 62 57 Q59 51 61 39 Z" fill="rgba(124,58,237,0.06)" stroke="#7c3aed" strokeWidth="0.9"/><path d="M25 41 C20 45 17 57 17 70 L17 75 Q17 79 20 80 L25 80 Q27 79 27 75 L26 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M17 75 C15 80 14 88 14 97 Q14 100 17 101 L24 101 Q27 100 27 97 L27 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M14 97 C12 103 12 112 14 119 Q15 121 19 121 L24 121 Q27 120 27 117 L27 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M75 41 C80 45 83 57 83 70 L83 75 Q83 79 80 80 L75 80 Q73 79 73 75 L74 52 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M83 75 C85 80 86 88 86 97 Q86 100 83 101 L76 101 Q73 100 73 97 L73 75 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M86 97 C88 103 88 112 86 119 Q85 121 81 121 L76 121 Q73 120 73 117 L73 97 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 130 C28 138 27 148 31 155 Q35 160 42 158 L50 156 L58 158 Q65 160 69 155 C73 148 72 138 68 130 Z" fill="rgba(124,58,237,0.04)" stroke="#7c3aed" strokeWidth="1.1"/><line x1="50" y1="136" x2="50" y2="156" stroke="#7c3aed" strokeWidth="0.7" opacity="0.5"/><path d="M31 155 C29 161 29 168 30 172 Q31 174 37 174 L44 174 Q46 173 46 171 L44 149 C41 148 35 150 31 155 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="39" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 187 C31 193 31 200 32 205 Q33 207 38 207 L44 207 Q46 206 46 204 L46 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M32 205 L32 212 Q31 219 40 219 L47 219 Q48 218 47 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M69 155 C71 161 71 168 70 172 Q69 174 63 174 L56 174 Q54 173 54 171 L56 149 C59 148 65 150 69 155 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><ellipse cx="61" cy="179.5" rx="7.5" ry="7" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 187 C69 193 69 200 68 205 Q67 207 62 207 L56 207 Q54 206 54 204 L54 187 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/><path d="M68 205 L68 212 Q69 219 60 219 L53 219 Q52 218 53 207 Z" fill="rgba(255,255,255,0.9)" stroke="#7c3aed" strokeWidth="1"/>
            <text x="50" y="219" fontSize="5.5" fontWeight="700" fill="#9c7bd0" letterSpacing="0.8" textAnchor="middle">POSTERIOR</text>
          </g>
          <line x1="100" y1="0" x2="100" y2="218" stroke="#d8cce8" strokeWidth="0.5"/>
          <line x1="200" y1="0" x2="200" y2="218" stroke="#d8cce8" strokeWidth="0.5"/>
          <line x1="300" y1="0" x2="300" y2="218" stroke="#d8cce8" strokeWidth="0.5"/>
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
  const PC = typeof getC === "function" ? getC() : { surface:"#ffffff", s2:"#f5f0fb", border:"#d8cce8", accent:"#7c3aed", text:"#1a1025", muted:"#7e6a9a", isDark:false };
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
        <div style={{ borderTop:`1px solid ${PC.border}`, padding:"10px 14px", background:PC.s2||"#f9f7ff" }}>
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
  return (SPECIAL_TEST_NAMES[base] || base.replace(/^st_/,"").replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase())) + side;
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
  const [uploadedDocs, setUploadedDocs] = useState(() => {
    try {
      const key = `physio_docs_${patient?.id||"demo"}`;
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch { return []; }
  });
  const [uploading, setUploading] = useState(false);
  const [assessSub, setAssessSub] = useState("subjective");
  const fileInputRef = React.useRef(null);

  const saveDocs = (docs) => {
    try {
      localStorage.setItem(`physio_docs_${patient?.id||"demo"}`, JSON.stringify(docs));
    } catch { alert("Storage full — file too large"); }
  };

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
      setUploadedDocs(updated);
      saveDocs(updated);
      setUploading(false);
    };
    reader.onerror = () => { setUploading(false); alert("Failed to read file."); };
    reader.readAsDataURL(file);
    e.target.value = ""; // reset input
  };

  const handleDeleteDoc = (id) => {
    const updated = uploadedDocs.filter(d => d.id !== id);
    setUploadedDocs(updated);
    saveDocs(updated);
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
    <div style={{
      position:"fixed",inset:0,zIndex:9000,background:C.bg,
      display:"flex",flexDirection:"column",
      fontFamily:"'DM Sans','Helvetica Neue',sans-serif",
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
              <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4,padding:"10px 12px",background:"rgba(109,40,217,0.04)",borderRadius:10}}>
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
              const pills=entries.flatMap(e=>{const rl=(e.regionId||"").replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase()).replace(/^Ant |^Post |^Left Lat |^Right Lat /,"").trim();return(e.symptoms||[]).map(sym=>({label:`${rl} — ${sym}`,sym,intensity:e.intensity}));});
              const legPills=legacyMarkers.map(m=>({label:`${(m.region||"").replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase())} — ${m.type||"pain"}`,sym:m.type||"pain",intensity:null}));
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
                        <div style={{background:"#F9F7FF",borderRadius:9,padding:"7px 10px",textAlign:"center"}}>
                          <div style={{fontSize:9.5,color:C.muted,marginBottom:2}}>Pain now</div>
                          <div style={{fontSize:20,fontWeight:900,lineHeight:1,color:parseFloat(d.cc_vas_now)>=7?"#dc2626":parseFloat(d.cc_vas_now)>=4?C.orange:C.green}}>{d.cc_vas_now||"—"}<span style={{fontSize:10,color:C.muted,fontWeight:400}}>/10</span></div>
                        </div>
                        <div style={{background:"#F9F7FF",borderRadius:9,padding:"7px 10px",textAlign:"center"}}>
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
                    <div style={{background:"#F9F7FF",borderRadius:12,padding:"12px 14px",border:`1px dashed ${C.border}`,textAlign:"center",marginBottom:10}}>
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
                    d.obs_swelling_present==="Present"&&{l:"Swelling",v:`${d.obs_swelling_severity||""} ${d.obs_swelling_type||""}${d.obs_swelling_location?" · "+d.obs_swelling_location:""}`.trim(),col:"#A32D2D",bg:"#FEF2F2",bdr:"#E24B4A"},
                    d.obs_muscle_bulk&&d.obs_muscle_bulk!=="Symmetrical"&&{l:"Muscle bulk",v:`${d.obs_muscle_bulk}${d.obs_muscle_location?" · "+d.obs_muscle_location:""}`,col:"#92400E",bg:"#FEF3C7",bdr:"#EF9F27"},
                    d.obs_deformity&&d.obs_deformity!=="None"&&{l:"Deformity",v:`${d.obs_deformity}${d.obs_deformity_location?" · "+d.obs_deformity_location:""}`,col:"#A32D2D",bg:"#FEF2F2",bdr:"#E24B4A"},
                    d.obs_skin&&d.obs_skin!=="Normal"&&{l:"Skin",v:`${d.obs_skin}${d.obs_skin_location?" · "+d.obs_skin_location:""}`,col:"#085041",bg:"#ECFDF5",bdr:"#1D9E75"},
                    d.obs_posture_head&&d.obs_posture_head!=="Neutral"&&{l:"Head/neck",v:d.obs_posture_head,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_shoulders&&d.obs_posture_shoulders!=="Symmetrical"&&{l:"Shoulders",v:d.obs_posture_shoulders,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_posture_lumbar&&d.obs_posture_lumbar!=="Normal"&&{l:"Lumbar",v:d.obs_posture_lumbar,col:C.muted,bg:"#F3F4F6",bdr:C.border},
                    d.obs_assistive&&d.obs_assistive!=="None"&&{l:"Assistive device",v:d.obs_assistive,col:C.muted,bg:"#F3F4F6",bdr:C.border},
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
              const cyKeys  = Object.keys(d).filter(k=>k.startsWith("cy_")&&d[k]);
              const nktKeys = Object.keys(d).filter(k=>k.startsWith("nkt_")&&d[k]);
              const obsKeys = Object.keys(d).filter(k=>k.startsWith("obs_")&&k!=="obs_snapshots"&&d[k]);
              // Outcome measures: om_history_* OR om_psfs_* / om_ndi_* / ndi_score / psfs_score etc
              const omKeys  = Object.keys(d).filter(k=>d[k]&&(k.startsWith("om_history_")||k.startsWith("om_psfs_")||k.startsWith("om_ndi_")||k.startsWith("om_koos_")||k.startsWith("om_dash_")||k.startsWith("om_lefs_")||/^(ndi_score|psfs_score|koos_score|dash_score|lefs_score|om_odi_score|om_report)$/.test(k)));
              const hasGait = !!(d.ag_antalgic||d.gait_pattern||d.g_rom_findings);
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
                        const muscle=(info&&info.name)||MMT_LABEL_MAP[labelBase]||(labelBase.replace("mmt_","").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()));
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
                        const name=SPECIAL_TEST_NAMES[base]||base.replace(/^st_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
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

                  {/* ── Neurological ── */}
                  <Sec icon="⚡" title="Neurological" navKey="neuro" hasData={neuroKeys.length>0||!!d.neuro_clinician_notes}>
                    {(()=>{
                      // Group into Reflexes / Dermatomes / Myotomes with L/R pairing
                      const seen=new Set(); const groups={Reflexes:[],Dermatomes:[],Myotomes:[]};
                      neuroKeys.forEach(k=>{
                        const sideMatch=k.match(/_(left|right)$/);
                        const base=sideMatch?k.slice(0,k.length-sideMatch[0].length):k;
                        if(seen.has(base)) return; seen.add(base);
                        const lVal=d[base+"_left"]||null, rVal=d[base+"_right"]||null, cVal=sideMatch?null:d[base];
                        let group,label,sub="";
                        if(base.startsWith("n_ref_")){
                          group="Reflexes";
                          const rf=REFLEXES.find(r=>r.id===base);
                          label=rf?rf.label:base.replace(/^n_ref_/,"").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase());
                          sub=rf?rf.level:"";
                        } else if(base.startsWith("myo_")){
                          group="Myotomes";
                          const my=MYOTOMES.find(m=>("myo_"+m.level.replace(/[^a-zA-Z0-9]/g,"_").toLowerCase())===base);
                          label=my?`${my.level} — ${my.action}`:base.replace(/^myo_/,"").replace(/_/g,"–").toUpperCase();
                          sub=my?my.test:"";
                        } else {
                          group="Dermatomes";
                          const de=DERMATOMES.find(dd=>dd.id===base);
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
                      return(
                        <div>
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
                            const label=OM_NAMES[scaleId]||scaleId.toUpperCase();
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
                                <span style={{flexShrink:0,padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:bg,color:c2}}>{String(r.val).split(" — ")[0].slice(0,16)}</span>
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
                                  <span style={{flexShrink:0,padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:abn?"#FEF3C7":"#ECFDF5",color:abn?"#92400E":C.green}}>{String(r.val).split(" — ")[0].slice(0,16)}</span>
                                </div>
                              );
                            })}
                            {rows.length>8&&<div style={{fontSize:10.5,color:C.muted,padding:"4px 8px"}}>+{rows.length-8} more</div>}
                          </div>
                        );
                      })()}
                    </Sec>
                  )}

                  {/* ── STTT ── */}
                  {nktKeys.length>0&&(()=>{
                    const nktRows=nktKeys.map(k=>({k,label:k.replace("nkt_","").replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase()),val:d[k]}));
                    nktRows.sort((a,b)=>{const aw=a.val&&(a.val.includes("Inhibited")||a.val.includes("Weak"))?0:1;const bw=b.val&&(b.val.includes("Inhibited")||b.val.includes("Weak"))?0:1;return aw-bw;});
                    const CpaPill=({v2})=>{if(!v2)return<span style={{fontSize:11,color:"#D1D5DB"}}>—</span>;const abn=v2.includes("Inhibited")||v2.includes("Weak");return<span style={{padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:abn?"#FEF3C7":"#ECFDF5",color:abn?"#92400E":C.green}}>{v2.split(" — ")[0].slice(0,16)}</span>;};
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
                        const rows=cyKeys.map(k=>({k,label:k.replace("cy_","").replace(/_/g," ").replace(/\b\w/g,l=>l.toUpperCase()),val:d[k]}));
                        const isAbn=v=>{const t=String(v||"").toLowerCase();return !(t.includes("normal")||t.includes("full")||t.includes("negative"));};
                        rows.sort((a,b)=>(isAbn(b.val)?1:0)-(isAbn(a.val)?1:0));
                        return(
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:5}}>
                            {rows.slice(0,8).map(r=>{
                              const abn=isAbn(r.val);
                              return(
                                <div key={r.k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6,padding:"7px 10px",background:"#F9FAFB",borderRadius:8,border:`1px solid ${C.border}`}}>
                                  <span style={{fontSize:12,fontWeight:700,color:C.text,lineHeight:1.2}}>{r.label}</span>
                                  <span style={{flexShrink:0,padding:"2px 9px",borderRadius:99,fontSize:10.5,fontWeight:800,background:abn?"#FEF2F2":"#ECFDF5",color:abn?"#dc2626":C.green}}>{String(r.val).split(" — ")[0].slice(0,16)}</span>
                                </div>
                              );
                            })}
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
              const hepLog=Array.isArray(d.hep_log)?d.hep_log:[];
              const hepV=parseInt(d.hep_version)||1;
              const firstS=sess[sess.length-1], lastS=sess[0];
              const painFirst=parseFloat(firstS?.vasStart);
              const painLast=parseFloat(lastS?.vasEnd||lastS?.vasStart);
              const phases=prog.map(e=>e.phase).filter(Boolean);
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
                      <div style={{textAlign:"center",padding:"14px 0",color:C.muted,fontSize:12}}>No protocol yet — build it in Quick Visit or Exercise Prescription.</div>
                    )}
                    {prog.map((e,i2)=>{
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

                  {/* ── In-clinic treatment ── */}
                  <div style={{background:C.white,borderRadius:14,padding:14,marginBottom:12,boxShadow:"0 1px 6px rgba(0,0,0,0.05)",border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:13.5,fontWeight:800,color:C.text,marginBottom:8}}>🏥 In-clinic treatment {lastS&&<span style={{fontSize:10,color:C.muted,fontWeight:500}}>· latest S{lastS.sessionNo||sess.length}</span>}</div>
                    {txChips.length===0?(
                      <div style={{fontSize:11.5,color:C.muted}}>No sessions logged yet.</div>
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
            <button style={{width:"100%",padding:"13px",borderRadius:12,border:"none",
              background:`linear-gradient(135deg,${C.primary},${C.secondary})`,
              color:"white",fontSize:13,fontWeight:800,cursor:"pointer",
              boxShadow:`0 4px 16px rgba(109,40,217,0.3)`}}>
              Update Treatment Plan
            </button>
            <button style={{width:"100%",padding:"12px",borderRadius:12,
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
const POSTURE_DEFECTS = {
  forward_head: {
    id:"forward_head", icon:"🫀", label:"Forward Head Posture", region:"Cervical",
    view:["anterior","lateral"],
    description:"Ear positioned anterior to the acromion process. Each 2.5cm of forward translation adds ~2.7kg per 2.5cm of estimated cervical extensor load (proxy model — confirm clinically).",
    tight_muscles:["Upper trapezius","SCM","Suboccipitals","Scalenes","Pec minor"],
    weak_muscles:["Deep neck flexors (DNF)","Lower trapezius","Serratus anterior","Rhomboids"],
    kinetic_chain:"Forward head → cervical lordosis → thoracic kyphosis → shoulder protraction → reduced lung capacity",
    exercises:["Chin tucks x15 3×","Wall angels x12 3×","DNF activation","Pec minor stretch"]
  },
  rounded_shoulders: {
    id:"rounded_shoulders", icon:"🔄", label:"Rounded/Protracted Shoulders", region:"Thoracic/Shoulder",
    view:["anterior","lateral","posterior"],
    description:"Anterior displacement of the humeral head with scapular protraction and internal rotation.",
    tight_muscles:["Pec major","Pec minor","Anterior deltoid","Subscapularis","Upper trapezius"],
    weak_muscles:["Lower trapezius","Serratus anterior","Rhomboids","Posterior rotator cuff"],
    kinetic_chain:"Protracted scapula → reduced subacromial space → impingement risk → compensatory cervical extension",
    exercises:["Band pull-apart x20","Face pulls x15","Pec doorway stretch","Scapular retraction holds"]
  },
  thoracic_kyphosis: {
    id:"thoracic_kyphosis", icon:"🪃", label:"Increased Thoracic Kyphosis", region:"Thoracic",
    view:["lateral","posterior"],
    description:"Excessive posterior convexity of the thoracic spine (>40° Cobb angle). May reduce respiratory capacity.",
    tight_muscles:["Pec major/minor","Anterior intercostals","Hip flexors"],
    weak_muscles:["Thoracic extensors","Lower trapezius","Gluteus maximus"],
    kinetic_chain:"Thoracic kyphosis → forward head → UCS → reduced hip extension → LCS compensations",
    exercises:["Thoracic extension over foam roller","T-spine rotation","Prone Y-T-W","Back extension"]
  },
  lumbar_hyperlordosis: {
    id:"lumbar_hyperlordosis", icon:"🌊", label:"Lumbar Hyperlordosis", region:"Lumbar",
    view:["lateral"],
    description:"Excessive anterior lumbar curve with anterior pelvic tilt. Increases facet joint loading.",
    tight_muscles:["Hip flexors (iliopsoas, rectus femoris)","TFL","Lumbar erectors","QL"],
    weak_muscles:["Gluteus maximus","Hamstrings","Transversus abdominis","Rectus abdominis"],
    kinetic_chain:"Anterior pelvic tilt → hip flexor tightness → glute inhibition → hamstring overload → posterior knee pain",
    exercises:["Hip flexor couch stretch","Glute bridges 3×15","Dead bug","TA activation"]
  },
  anterior_pelvic_tilt: {
    id:"anterior_pelvic_tilt", icon:"⬇", label:"Anterior Pelvic Tilt", region:"Lumbar/Pelvis",
    view:["lateral"],
    description:"ASIS positioned anterior and inferior to PSIS. Often co-exists with lumbar hyperlordosis.",
    tight_muscles:["Iliopsoas","Rectus femoris","TFL","Lumbar erectors"],
    weak_muscles:["Gluteus maximus","Hamstrings","TA","Internal obliques"],
    kinetic_chain:"APT → hip flexor tightness → glute inhibition → lumbar overload → disc stress at L4-S1",
    exercises:["Pelvic tilts","Couch stretch","Glute activation","Posterior pelvic tilt cues"]
  },
  posterior_pelvic_tilt: {
    id:"posterior_pelvic_tilt", icon:"⬆", label:"Posterior Pelvic Tilt", region:"Lumbar/Pelvis",
    view:["lateral"],
    description:"PSIS positioned inferior to ASIS. Flattens lumbar lordosis, often associated with prolonged sitting.",
    tight_muscles:["Hamstrings","Gluteus maximus","Rectus abdominis"],
    weak_muscles:["Hip flexors","Lumbar extensors","TFL"],
    kinetic_chain:"PPT → lumbar flexion bias → disc posterior loading → hamstring overuse",
    exercises:["Hip flexor stretching","Lumbar extension exercises","Prone hip extension","Cat-cow"]
  },
  lateral_pelvic_tilt: {
    id:"lateral_pelvic_tilt", icon:"↔", label:"Lateral Pelvic Tilt", region:"Lumbar/Pelvis",
    view:["anterior","posterior"],
    description:"Unilateral elevation of the iliac crest. May indicate leg length discrepancy or hip abductor weakness.",
    tight_muscles:["Ipsilateral QL","Ipsilateral TFL","Ipsilateral hip adductors"],
    weak_muscles:["Contralateral gluteus medius","Contralateral QL"],
    kinetic_chain:"Lateral pelvic tilt → scoliotic compensation → contralateral shoulder elevation → cervical lateral flexion",
    exercises:["Side-lying hip abduction","Clamshells","Standing hip abduction","QL stretch"]
  },
  genu_valgum: {
    id:"genu_valgum", icon:"🦵", label:"Knee Valgus Tendency (Observation — clinical assessment required)", region:"Knee",
    view:["anterior","posterior"],
    requiresDedicatedLandmarks: true,
    estimatedOnly: true,
    description:"OBSERVATION: Static medial knee alignment tendency observed. Cannot confirm Genu Valgum from photograph alone — single-leg squat and clinical assessment required. May be associated with medial compartment and patellofemoral loading if confirmed.",
    tight_muscles:["TFL","IT band","Hip adductors","Medial hamstrings"],
    weak_muscles:["Gluteus medius","Gluteus maximus","VMO","Hip external rotators"],
    kinetic_chain:"Knee medial tendency → hip IR → PFPS risk → medial ankle pronation → plantar fascia overload (confirm with clinical assessment)",
    exercises:["Clamshells","Monster walks","Single-leg squat with knee tracking","VMO terminal extensions"]
  },
  genu_varum: {
    id:"genu_varum", icon:"🦴", label:"Knee Varus Tendency (Observation — clinical assessment required)", region:"Knee",
    view:["anterior","posterior"],
    requiresDedicatedLandmarks: true,
    estimatedOnly: true,
    description:"OBSERVATION: Static lateral knee alignment tendency observed. Cannot confirm Genu Varum from photograph alone — clinical weight-bearing assessment required. May be associated with lateral compartment loading if confirmed.",
    tight_muscles:["IT band","Biceps femoris","Hip ER","Lateral gastrocnemius"],
    weak_muscles:["Hip adductors","VMO","Medial gastrocnemius"],
    kinetic_chain:"Knee lateral tendency → lateral knee overload → IT band syndrome → supinated foot posture (confirm with clinical assessment)",
    exercises:["IT band foam rolling","Hip adductor strengthening","Lateral step-downs","Arch support"]
  },
  foot_pronation: {
    id:"foot_pronation", icon:"🦶", label:"Foot Overpronation/Flat Arch", region:"Foot/Ankle",
    view:["anterior","posterior"],
    description:"Medial arch collapse with calcaneal eversion. The kinetic chain starting point for many lower limb issues.",
    tight_muscles:["Gastrocnemius","Soleus","Peroneals","Plantar fascia"],
    weak_muscles:["Tibialis posterior","FHL","Intrinsic foot muscles","Gluteus medius"],
    kinetic_chain:"Pronation → tibial IR → knee medial tendency (possible) → hip IR → PFPS risk → LCS pattern characteristics (clinical assessment required to confirm each link)",
    exercises:["Short foot exercise","Calf raises","Tibialis posterior strengthening","Intrinsic foot doming"]
  },
  foot_supination: {
    id:"foot_supination", icon:"🔺", label:"Foot Supination/High Arch", region:"Foot/Ankle",
    view:["anterior","posterior"],
    description:"Elevated medial arch with reduced shock absorption. Associated with lateral ankle instability.",
    tight_muscles:["IT band","Peroneals","Plantar fascia","Gastroc lateral head"],
    weak_muscles:["Peroneals (with instability)","Intrinsic foot muscles"],
    kinetic_chain:"Supination → lateral ankle instability → lateral knee overload → genu varum compensation",
    exercises:["Peroneal strengthening","Single-leg balance","Lateral band walks","Arch mobilisation"]
  },
  scoliosis: {
    id:"scoliosis", icon:"〰", label:"Lateral Spinal Curvature Tendency (clinical assessment required)", region:"Thoracic/Lumbar",
    view:["posterior"],
    description:"Lateral deviation of the spine with rotational component. Refer for Cobb angle measurement if suspected structural.",
    tight_muscles:["Ipsilateral concave paraspinals","Ipsilateral QL","Ipsilateral hip musculature"],
    weak_muscles:["Contralateral paraspinals","Convex-side core stabilisers"],
    kinetic_chain:"Scoliosis → rib cage rotation → shoulder height asymmetry → pelvic obliquity → leg length inequality",
    exercises:["Schroth breathing","Concave-side stretch","Convex-side strengthening","Pilates side-lying"]
  },
  head_tilt: {
    id:"head_tilt", icon:"↙", label:"Lateral Head Tilt", region:"Cervical",
    view:["anterior","posterior"],
    description:"Ipsilateral ear approaches ipsilateral shoulder. May indicate upper trap tightness or C-spine dysfunction.",
    tight_muscles:["Ipsilateral upper trapezius","Ipsilateral SCM","Ipsilateral scalenes","Ipsilateral levator scapulae"],
    weak_muscles:["Contralateral lateral neck flexors","Contralateral upper trapezius"],
    kinetic_chain:"Head tilt → cervical lateral flexion → ipsilateral shoulder elevation → compensatory thoracic curve",
    exercises:["Contralateral cervical lateral flexion stretch","Upper trap SMR","Levator scapulae stretch"]
  },
  scapular_winging: {
    id:"scapular_winging", icon:"🪶", label:"Scapular Winging", region:"Thoracic/Shoulder",
    view:["posterior"],
    description:"Medial border or inferior angle of scapula lifts from thoracic wall. Serratus anterior or trapezius dysfunction.",
    tight_muscles:["Pec minor","Pec major","Short head biceps"],
    weak_muscles:["Serratus anterior","Lower trapezius","Rhomboids"],
    kinetic_chain:"Scapular winging → reduced force couple → rotator cuff overload → impingement → biceps tendinopathy",
    exercises:["Serratus push-up plus","Wall slides","Lower trap Y raises","Scapular protraction resistance"]
  },
};

// ─── SEVERITY COLOUR MAPS ────────────────────────────────────────────────────
const SEVERITY_COLOR = { mild:"#ffb300", moderate:"#ff6b35", severe:"#ff4d6d" };
const SEVERITY_BG    = { mild:"rgba(255,179,0,0.1)", moderate:"rgba(255,107,53,0.1)", severe:"rgba(255,77,109,0.1)" };

// ─── POSTURE DEFECT DETAIL MODAL ─────────────────────────────────────────────
function PostureDefectDetail({ defectId, onClose }) {
  const d = POSTURE_DEFECTS[defectId];
  if (!d) return null;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:900,display:"flex",alignItems:"flex-end",justifyContent:"center"}}
      onClick={onClose}>
      <div onClick={e=>e.stopPropagation()}
        style={{width:"100%",maxWidth:560,background:"#ffffff",borderRadius:"16px 16px 0 0",border:"1px solid #d8cce8",padding:"20px 18px 32px",maxHeight:"85vh",overflowY:"auto"}}>
        {/* Handle bar */}
        <div style={{width:36,height:4,background:"#2a3f58",borderRadius:2,margin:"0 auto 16px"}}/>
        {/* Header */}
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <span style={{fontSize:"1.8rem"}}>{d.icon}</span>
          <div style={{flex:1}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:"#1a1025"}}>{d.label}</div>
            <span style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:6,background:"rgba(0,229,255,0.12)",color:"#00e5ff",fontWeight:700}}>{d.region}</span>
          </div>
          <button onClick={onClose} style={{background:"none",border:"1px solid #d8cce8",borderRadius:8,color:"#7e6a9a",cursor:"pointer",padding:"5px 10px",fontSize:"0.75rem"}}>✕</button>
        </div>
        {/* Description */}
        <div style={{padding:"10px 13px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.15)",borderRadius:10,fontSize:"0.76rem",color:"#a0c8e8",lineHeight:1.6,marginBottom:14}}>
          {d.description}
        </div>
        {/* Muscles */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
          <div style={{background:"rgba(255,77,109,0.06)",border:"1px solid rgba(255,77,109,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🔴 Tight / Overactive</div>
            {d.tight_muscles.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"#1a1025",padding:"2px 0",borderBottom:"1px solid rgba(255,77,109,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
          <div style={{background:"rgba(0,201,122,0.06)",border:"1px solid rgba(0,201,122,0.2)",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:7}}>🟢 Weak / Inhibited</div>
            {d.weak_muscles.map((m,i)=><div key={i} style={{fontSize:"0.78rem",color:"#1a1025",padding:"2px 0",borderBottom:"1px solid rgba(0,201,122,0.08)",lineHeight:1.4}}>{m}</div>)}
          </div>
        </div>
        {/* Kinetic chain */}
        <div style={{background:"rgba(127,90,240,0.07)",border:"1px solid rgba(127,90,240,0.2)",borderRadius:10,padding:"10px 13px",marginBottom:14}}>
          <div style={{fontSize:"0.8rem",fontWeight:800,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>🔗 Kinetic Chain</div>
          <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.6,fontStyle:"italic"}}>{d.kinetic_chain}</div>
        </div>
        {/* Exercises */}
        {d.exercises?.length > 0 && (
          <div>
            <div style={{fontSize:"0.8rem",fontWeight:800,color:"#00e5ff",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:8}}>💪 Corrective Exercises</div>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {d.exercises.map((ex,i)=>(
                <div key={i} style={{display:"flex",gap:8,padding:"6px 10px",background:"rgba(0,229,255,0.05)",border:"1px solid rgba(0,229,255,0.12)",borderRadius:8,alignItems:"center"}}>
                  <span style={{color:"#00e5ff",fontWeight:800,fontSize:"0.8rem",flexShrink:0}}>{i+1}.</span>
                  <span style={{fontSize:"0.82rem",color:"#1a1025"}}>{ex}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PostureDefectModule() {
  const [selectedDefects, setSelectedDefects] = useState([]);
  const [defectSeverity, setDefectSeverity]   = useState({});
  const [openDefect, setOpenDefect]           = useState(null);
  const [regionFilter, setRegionFilter]       = useState("All");
  const [patientName, setPatientName]         = useState("");
  const [clinicianName, setClinicianName]     = useState("");
  const [showExport, setShowExport]           = useState(false);
  const exportPDF = useCallback(async ({ patientName, clinicianName, selectedDefects, severity, date }) => {
    const severityLabel = { mild: "Mild", moderate: "Moderate", severe: "Severe" };
    const findingsHTML = selectedDefects.map(d => {
      const sev = severity?.[d.id] || "moderate";
      const sevColor = sev === "severe" ? "badge-red" : sev === "mild" ? "badge-green" : "badge-amber";
      return `
        <div class="section-box no-break" style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
            <strong style="font-size:12px">${d.name || d.id}</strong>
            <span class="badge ${sevColor}">${severityLabel[sev] || sev}</span>
          </div>
          ${d.region ? `<div><span class="badge badge-blue">${d.region}</span></div>` : ""}
          ${d.description ? `<p style="margin:6px 0;color:#374151">${d.description}</p>` : ""}
          ${d.tight_muscles?.length ? `<div style="margin-top:6px"><strong>Tight:</strong> ${d.tight_muscles.join(", ")}</div>` : ""}
          ${d.weak_muscles?.length ? `<div><strong>Weak:</strong> ${d.weak_muscles.join(", ")}</div>` : ""}
          ${d.kinetic_chain ? `<div style="margin-top:4px;color:#6d28d9;font-style:italic">Chain: ${d.kinetic_chain}</div>` : ""}
        </div>`;
    }).join("");

    const bodyHTML = `
      <div class="disclaimer">⚠ Manual observational assessment. For clinical use only. Not a substitute for comprehensive evaluation.</div>
      <div class="info-grid">
        <div class="info-box"><div class="info-label">Patient</div><div class="info-value">${patientName || "—"}</div></div>
        <div class="info-box"><div class="info-label">Clinician</div><div class="info-value">${clinicianName || "—"}</div></div>
        <div class="info-box"><div class="info-label">Date</div><div class="info-value">${date}</div></div>
        <div class="info-box"><div class="info-label">Findings</div><div class="info-value">${selectedDefects.length} defect${selectedDefects.length !== 1 ? "s" : ""}</div></div>
      </div>
      <h2>Postural Findings</h2>
      ${findingsHTML}
      <div class="sig-row">
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Clinician Signature</div></div>
        <div class="sig-col"><div class="sig-line"></div><div class="sig-label">Date</div></div>
      </div>`;

    const metaRight = `<strong>Patient:</strong> ${patientName || "—"}<br/><strong>Clinician:</strong> ${clinicianName || "—"}<br/><strong>Date:</strong> ${date}`;
    const html = makePDFPage("Postural Assessment Report", metaRight, bodyHTML);
    await downloadPDFFromHTML(html, `postural-report-${(patientName || "patient").replace(/\s+/g, "-").toLowerCase()}.pdf`);
  }, []);

  const regions = ["All", ...Array.from(new Set(Object.values(POSTURE_DEFECTS).map(d => d.region)))];
  const filtered = Object.values(POSTURE_DEFECTS).filter(d => regionFilter === "All" || d.region === regionFilter);

  const inputStyle = {
    width:"100%", background:"#f5f0fb", border:"1px solid #d8cce8",
    borderRadius:8, color:"#1a1025", fontFamily:"inherit",
    outline:"none", padding:"8px 10px", fontSize:"0.78rem",
  };

  const PLAN_VIEWS = [
    {key:"anterior",  label:"Anterior",   icon:"⬆", tip:"Facing camera — head, shoulders, pelvis, knees, feet"},
    {key:"posterior", label:"Posterior",  icon:"⬇", tip:"Back to camera — scapulae, spine alignment, calcanei"},
    {key:"lateral",   label:"L Lateral",  icon:"◀", tip:"Left side — ear, shoulder, hip, knee, ankle plumb line"},
    {key:"right_lateral",label:"R Lateral",icon:"▶",tip:"Right side — same as left for asymmetry comparison"},
  ];

  // Group selected defects by their relevant views
  const defectsByView = PLAN_VIEWS.reduce((acc, v) => {
    acc[v.key] = selectedDefects.filter(id => {
      const d = POSTURE_DEFECTS[id];
      return d && (d.view.includes(v.key) || (v.key==="right_lateral" && d.view.includes("lateral")));
    });
    return acc;
  }, {});

  return (
    <div>
      {/* ── STEP 1: View guidance ── */}
      <div style={{marginBottom:16}}>
        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:9}}>📋 Assessment Views — Position patient accordingly</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
          {PLAN_VIEWS.map(v => (
            <div key={v.key} style={{background:"rgba(0,229,255,0.04)",border:"1px solid rgba(0,229,255,0.14)",borderRadius:10,padding:"9px 11px"}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                <span style={{fontSize:"1rem"}}>{v.icon}</span>
                <span style={{fontSize:"0.82rem",fontWeight:800,color:"#00e5ff"}}>{v.label}</span>
                {defectsByView[v.key]?.length > 0 && (
                  <span style={{marginLeft:"auto",padding:"1px 6px",borderRadius:6,background:"rgba(0,229,255,0.15)",color:"#00e5ff",fontSize:"0.56rem",fontWeight:800}}>{defectsByView[v.key].length}</span>
                )}
              </div>
              <div style={{fontSize:"0.73rem",color:"#7e6a9a",lineHeight:1.4}}>{v.tip}</div>
              {defectsByView[v.key]?.length > 0 && (
                <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:3}}>
                  {defectsByView[v.key].map(id => (
                    <span key={id} style={{fontSize:"0.56rem",padding:"1px 5px",borderRadius:5,background:"rgba(0,229,255,0.1)",color:"#00e5ff",border:"1px solid rgba(0,229,255,0.2)"}}>
                      {POSTURE_DEFECTS[id]?.icon} {POSTURE_DEFECTS[id]?.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── STEP 2: Defect selector ── */}
      <div style={{marginBottom:14}}>
        <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
          🔍 Select Observed Defects
          {selectedDefects.length > 0 && <span style={{marginLeft:8,padding:"1px 7px",borderRadius:8,background:"rgba(255,77,109,0.15)",color:"#ff4d6d",fontSize:"0.78rem",fontWeight:800}}>{selectedDefects.length} selected</span>}
        </div>

        {/* Region filter */}
        <div style={{display:"flex",gap:4,flexWrap:"wrap",marginBottom:9}}>
          {regions.map(r => (
            <button key={r} onClick={() => setRegionFilter(r)}
              style={{padding:"3px 9px",borderRadius:8,fontSize:"0.8rem",fontWeight:700,border:`1px solid ${regionFilter===r?"rgba(0,229,255,0.5)":"#1a2d45"}`,background:regionFilter===r?"rgba(0,229,255,0.12)":"transparent",color:regionFilter===r?"#00e5ff":"#6b8399",cursor:"pointer"}}>
              {r}
            </button>
          ))}
        </div>

        {/* Defect grid */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))",gap:5}}>
          {filtered.map(d => {
            const sel = selectedDefects.includes(d.id);
            return (
              <button key={d.id} onClick={() => setSelectedDefects(sel ? selectedDefects.filter(s => s !== d.id) : [...selectedDefects, d.id])}
                style={{padding:"8px 10px",borderRadius:9,fontSize:"0.78rem",fontWeight:sel?700:500,border:`1px solid ${sel?"rgba(255,77,109,0.45)":"#1a2d45"}`,background:sel?"rgba(255,77,109,0.1)":"rgba(19,28,40,0.7)",color:sel?"#ff4d6d":"#94a3b8",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"flex-start",gap:6}}>
                <span style={{fontSize:"1rem",flexShrink:0}}>{d.icon}</span>
                <span style={{flex:1,lineHeight:1.3}}>{d.label}</span>
                {sel && <span style={{color:"#ff4d6d",fontSize:"0.8rem",flexShrink:0}}>✓</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── STEP 3: Selected findings with severity + tap-to-expand ── */}
      {selectedDefects.length > 0 && (
        <div style={{marginBottom:14}}>
          <div style={{fontSize:"0.82rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"1.2px",marginBottom:8}}>
            📌 Findings — tap card to view full clinical detail
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            {selectedDefects.map(id => {
              const d = POSTURE_DEFECTS[id];
              if (!d) return null;
              const sev = defectSeverity[id] || "mild";
              const col = SEVERITY_COLOR[sev];
              return (
                <div key={id} style={{background:"#ffffff",border:`1px solid ${col}35`,borderRadius:11,overflow:"hidden"}}>
                  {/* Card header — clickable */}
                  <div onClick={() => setOpenDefect(id)} style={{padding:"10px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:9}}>
                    <span style={{fontSize:"1.1rem"}}>{d.icon}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:"0.76rem",fontWeight:700,color:"#1a1025",lineHeight:1.3}}>{d.label}</div>
                      <div style={{fontSize:"0.8rem",color:"#7e6a9a",marginTop:1}}>{d.region}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <span style={{fontSize:"0.82rem",color:"#00e5ff",fontWeight:700}}>📋 Detail →</span>
                      <button onClick={e=>{e.stopPropagation();setSelectedDefects(p=>p.filter(s=>s!==id));}} style={{background:"none",border:"1px solid #d8cce8",borderRadius:5,color:"#7e6a9a",cursor:"pointer",fontSize:"0.8rem",padding:"1px 6px",lineHeight:1.4}}>✕</button>
                    </div>
                  </div>

                  {/* Severity selector */}
                  <div style={{padding:"0 13px 10px",display:"flex",gap:4}}>
                    {["mild","moderate","severe"].map(s => (
                      <button key={s} onClick={() => setDefectSeverity(p => ({...p,[id]:s}))}
                        style={{flex:1,padding:"5px 3px",borderRadius:7,fontSize:"0.8rem",fontWeight:sev===s?800:500,border:`1px solid ${sev===s?SEVERITY_COLOR[s]+"80":"#1a2d45"}`,background:sev===s?SEVERITY_BG[s]:"transparent",color:sev===s?SEVERITY_COLOR[s]:"#6b8399",cursor:"pointer",textTransform:"capitalize"}}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Quick summary row */}
                  <div style={{padding:"8px 13px",background:"rgba(6,9,15,0.5)",borderTop:"1px solid #d8cce8",display:"flex",gap:8,flexWrap:"wrap"}}>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#ff4d6d",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔴 Tight</div>
                      <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.4}}>{d.tight_muscles.slice(0,2).join(", ")}{d.tight_muscles.length>2?` +${d.tight_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#00c97a",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🟢 Weak</div>
                      <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.4}}>{d.weak_muscles.slice(0,2).join(", ")}{d.weak_muscles.length>2?` +${d.weak_muscles.length-2} more`:""}</div>
                    </div>
                    <div style={{flex:"1 1 120px"}}>
                      <div style={{fontSize:"0.75rem",fontWeight:700,color:"#7f5af0",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:3}}>🔗 Chain</div>
                      <div style={{fontSize:"0.82rem",color:"#1a1025",lineHeight:1.4,fontStyle:"italic"}}>{d.kinetic_chain.split("→")[0].trim()} →…</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── STEP 4: PDF Export ── */}
      {selectedDefects.length > 0 && (
        <div style={{marginBottom:12}}>
          {!showExport ? (
            <button onClick={() => setShowExport(true)}
              style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,rgba(0,201,122,0.18),rgba(0,229,255,0.1))",border:"1px solid rgba(0,201,122,0.35)",borderRadius:10,color:"#00c97a",fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>
              📄 Export PDF Report ({selectedDefects.length} finding{selectedDefects.length!==1?"s":""})
            </button>
          ) : (
            <div style={{background:"#ffffff",border:"1px solid rgba(0,201,122,0.3)",borderRadius:12,padding:"13px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:"0.82rem",fontWeight:800,color:"#00c97a"}}>📄 PDF Report Details</div>
                <button onClick={() => setShowExport(false)} style={{background:"none",border:"1px solid #d8cce8",borderRadius:6,color:"#7e6a9a",cursor:"pointer",padding:"3px 8px",fontSize:"0.75rem"}}>✕</button>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                <div>
                  <label style={{fontSize:"0.8rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:4}}>Patient Name</label>
                  <input value={patientName} onChange={e=>setPatientName(e.target.value)} placeholder="Patient name" style={inputStyle}/>
                </div>
                <div>
                  <label style={{fontSize:"0.8rem",fontWeight:700,color:"#7e6a9a",display:"block",marginBottom:4}}>Clinician</label>
                  <input value={clinicianName} onChange={e=>setClinicianName(e.target.value)} placeholder="Your name" style={inputStyle}/>
                </div>
              </div>
              <button onClick={() => exportPDF({patientName,clinicianName,selectedDefects,severity:defectSeverity,measurements:null,captures:{},date:new Date().toLocaleDateString('en-AU',{day:'2-digit',month:'long',year:'numeric'})})}
                style={{width:"100%",padding:"11px",background:"linear-gradient(135deg,#00c97a,#00e5ff)",border:"none",borderRadius:10,color:"#000",fontWeight:900,fontSize:"0.8rem",cursor:"pointer"}}>
                🖨 Generate & Print PDF
              </button>
            </div>
          )}
        </div>
      )}

      {/* Defect detail modal */}
      {openDefect && <PostureDefectDetail defectId={openDefect} onClose={() => setOpenDefect(null)}/>}

      <div style={{padding:"7px 11px",background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:8,fontSize:"0.8rem",color:"#7e6a9a",lineHeight:1.5}}>
        ⚠ Manual observational assessment. Select all defects observed across each view. Tap any finding card for full clinical detail, muscles, kinetic chain, and exercise programme.
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HOME MODULE — App Introduction & Feature Overview
// ═══════════════════════════════════════════════════════════════════════════
function HomeModule({ onNav }) {
  const PC = getC();
  const features = [
    { icon:"📝", title:"Subjective Assessment", desc:"Comprehensive history-taking with VAS pain scale, red flag screening, 24hr behaviour patterns, and patient goals.", nav:"subjective", color:"#7c3aed" },
    { icon:"🖐️", title:"Palpation", desc:"Systematic tissue assessment with tenderness grading, quality descriptors, and clinical significance.", nav:"palpation", color:"#9333ea" },
    { icon:"🧍", title:"Postural Analysis", desc:"Camera-assisted posture analysis with AI landmark detection, 30+ postural defects, kinetic chain mapping, and PDF export.", nav:"posture", color:"#7c3aed" },
    { icon:"📐", title:"Range of Motion", desc:"Full-body ROM assessment with bilateral comparison, normal values, end-feel grading, and clinical interpretation.", nav:"rom", color:"#9333ea" },
    { icon:"💪", title:"Muscle Strength (MMT)", desc:"Oxford Scale manual muscle testing across all major muscle groups with clinical grading.", nav:"mmt", color:"#7c3aed" },
    { icon:"🔬", title:"100+ Special Tests", desc:"Evidence-based special tests for cervical, shoulder, elbow, wrist, hip, knee, and ankle with sensitivity/specificity data.", nav:"special", color:"#9333ea" },
    { icon:"⚡", title:"Neurological Assessment", desc:"Dermatomes, myotomes, reflexes, neural tension tests, and red flag neurological screening.", nav:"neuro", color:"#7c3aed" },
    { icon:"🚶", title:"Gait Analysis", desc:"Observational gait analysis across stance, swing, and double support phases with clinical correlations.", nav:"gait", color:"#9333ea" },
    { icon:"🧠", title:"CPA Assessment", desc:"Compensation Pattern Analysis — functional muscle testing to identify inhibitor-facilitator relationships across regions.", nav:"nkt", color:"#7c3aed" },
    { icon:"⛓️", title:"Kinetic Chain", desc:"Joint-by-joint analysis of the kinetic chain from foot to cervical spine.", nav:"kinetic", color:"#9333ea" },
    { icon:"💊", title:"Treatment Prescription", desc:"Evidence-based exercise programming, HEP generation, treatment technique logging, and session records.", nav:"exercise", color:"#7c3aed" },
    { icon:"🤖", title:"SOAP Notes + AI", desc:"AI-powered SOAP note generation from your assessment data using Groq AI.", nav:"soap", color:"#9333ea" },
  ];

  return (
    <div style={{maxWidth:900, margin:"0 auto"}}>
      {/* Hero */}
      <div style={{
        background:`linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #c026d3 100%)`,
        borderRadius:20, padding:"40px 32px", marginBottom:32, position:"relative", overflow:"hidden",
        boxShadow:"0 8px 40px rgba(124,58,237,0.25)"
      }}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,background:"rgba(255,255,255,0.06)",borderRadius:"50%"}}/>
        <div style={{position:"absolute",bottom:-60,left:-20,width:160,height:160,background:"rgba(255,255,255,0.04)",borderRadius:"50%"}}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={{fontSize:"2.4rem",marginBottom:8}}>🩺</div>
          <h1 style={{fontSize:"clamp(1.4rem,4vw,2rem)",fontWeight:900,color:"#fff",margin:"0 0 10px",letterSpacing:"-0.5px",lineHeight:1.1}}>
            PhysioMind Pro
          </h1>
          <p style={{fontSize:"clamp(0.85rem,2vw,1rem)",color:"rgba(255,255,255,0.85)",margin:"0 0 24px",lineHeight:1.6,maxWidth:520}}>
            The complete clinical assessment platform for physiotherapists. Evidence-based tools, AI-powered SOAP notes, and comprehensive patient management — all in one place.
          </p>
          <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
            <button onClick={()=>onNav("subjective")} style={{padding:"12px 22px",background:"#fff",border:"none",borderRadius:12,color:"#7c3aed",fontWeight:800,fontSize:"0.88rem",cursor:"pointer",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
              Start Assessment →
            </button>
            <button onClick={()=>onNav("dashboard")} style={{padding:"12px 22px",background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",borderRadius:12,color:"#fff",fontWeight:700,fontSize:"0.88rem",cursor:"pointer"}}>
              View Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:12,marginBottom:32}}>
        {[
          {num:"100+",label:"Special Tests",icon:"🔬"},
          {num:"30+",label:"Postural Defects",icon:"🧍"},
          {num:"AI",label:"SOAP Generation",icon:"🤖"},
          {num:"PDF",label:"Report Export",icon:"📄"},
        ].map((s,i)=>(
          <div key={i} style={{background:"#fff",border:"1px solid #d8cce8",borderRadius:14,padding:"18px 16px",textAlign:"center",boxShadow:"0 2px 12px rgba(124,58,237,0.07)"}}>
            <div style={{fontSize:"1.5rem",marginBottom:6}}>{s.icon}</div>
            <div style={{fontSize:"1.6rem",fontWeight:900,color:"#7c3aed",lineHeight:1}}>{s.num}</div>
            <div style={{fontSize:"0.75rem",fontWeight:700,color:"#7e6a9a",textTransform:"uppercase",letterSpacing:"0.5px",marginTop:4}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Features grid */}
      <div style={{marginBottom:16}}>
        <h2 style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,color:"#1a1025",margin:"0 0 6px",letterSpacing:"-0.3px"}}>Clinical Features</h2>
        <p style={{fontSize:"0.82rem",color:"#7e6a9a",margin:"0 0 20px"}}>Tap any feature to navigate directly to that assessment tool.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:12}}>
          {features.map((f,i)=>(
            <button key={i} onClick={()=>onNav(f.nav)} style={{
              background:"#fff",border:`1px solid #d8cce8`,borderRadius:14,padding:"18px 16px",
              textAlign:"left",cursor:"pointer",transition:"all 0.18s",
              boxShadow:"0 2px 10px rgba(124,58,237,0.06)",
            }}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=f.color;e.currentTarget.style.boxShadow=`0 4px 20px rgba(124,58,237,0.14)`;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor="#d8cce8";e.currentTarget.style.boxShadow="0 2px 10px rgba(124,58,237,0.06)";}}
            >
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:36,height:36,background:`${f.color}14`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.1rem",flexShrink:0}}>
                  {f.icon}
                </div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:"#1a1025",lineHeight:1.2}}>{f.title}</div>
              </div>
              <div style={{fontSize:"0.75rem",color:"#7e6a9a",lineHeight:1.55}}>{f.desc}</div>
              <div style={{marginTop:10,fontSize:"0.78rem",fontWeight:700,color:f.color}}>Open →</div>
            </button>
          ))}
        </div>
      </div>

      {/* Workflow guide */}
      <div style={{background:"#f5f0fb",border:"1px solid #d8cce8",borderRadius:16,padding:"22px 20px",marginTop:24}}>
        <h3 style={{fontSize:"0.88rem",fontWeight:800,color:"#7c3aed",margin:"0 0 14px",letterSpacing:"-0.2px"}}>📋 Recommended Assessment Workflow</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {[
            "1. Subjective","2. Palpation","3. Posture","4. ROM","5. MMT",
            "6. Special Tests","7. Neurological","8. Gait","9. Kinetic Chain",
            "10. Treatment Plan","11. SOAP + AI"
          ].map((step,i)=>(
            <div key={i} style={{
              padding:"5px 12px",background:"#fff",border:"1px solid #d8cce8",
              borderRadius:8,fontSize:"0.82rem",fontWeight:600,color:"#1a1025"
            }}>{step}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// THERAPIST DASHBOARD MODULE
// ═══════════════════════════════════════════════════════════════════════════
function TherapistDashboardModule({ patients, data, onNav, taskDB=[], onCompleteTask, onDismissTask, onAddTask, onProfile, onQuickStart, currentUser, onSignOut }) {
  const { useState, useEffect, useMemo, useCallback } = React;
  const [activeTab,   setActiveTab]   = useState("pending");
  const [scheduleTab, setScheduleTab] = useState("all");
  const [mounted,     setMounted]     = useState(false);
  const [completing,  setCompleting]  = useState(null); // taskId being animated
  const [expanded,    setExpanded]    = useState(null); // expanded task id

  useEffect(() => { setTimeout(() => setMounted(true), 80); }, []);

  // ── AUTO-GENERATE TASKS FROM CLINICAL DATA ─────────────────────────────────
  useEffect(() => {
    if (!onAddTask || !data) return;
    const d   = data || {};
    const pt  = d["dem_name"] || "Current patient";
    const now = new Date().toISOString();
    const today = new Date().toLocaleDateString("en-GB");
    const sessions = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
    const hasROM   = Object.keys(d).some(k => k.startsWith("rom_") && d[k]);
    const hasMMT   = Object.keys(d).some(k => k.startsWith("mmt_") && d[k]);
    const hasSOAP  = !!(d.tx_techniques || sessions.length > 0);
    const hasCC    = !!d.cc_main;
    const hasGait  = !!(d.ag_antalgic || d.gait_pattern || d.g_rom_findings);
    const hasOM    = !!(d.om_psfs1 || d.om_odi_score || d.om_dash_score);
    const pendingSession = sessions.length > 0 && !sessions[sessions.length-1]?.vasEnd;
    const rfMyelopathy  = !!(d.cx_rf_myelopathy || d.lx_rf_cauda || d.cx_rf_vbi);
    const totalSessions = sessions.length;

    const AUTO_TASKS = [
      rfMyelopathy && {
        templateId:`red_flag_${pt}`, icon:"🚨", title:"Red Flag — Urgent Review",
        patient:pt, category:"Clinical Safety", priority:"high",
        dueTime:"Immediately", nav:"subjective",
        note:"Red flag indicators detected — urgent clinical review required",
      },
      hasCC && !hasSOAP && {
        templateId:`soap_${pt}`, icon:"📋", title:"SOAP Note Pending",
        patient:pt, category:"Documentation", priority:"high",
        dueTime:"End of session", nav:"soap",
        note:"Assessment documented but SOAP not finalised",
      },
      pendingSession && {
        templateId:`session_outcome_${pt}`, icon:"📝", title:"Session Outcome Missing",
        patient:pt, category:"Documentation", priority:"high",
        dueTime:"Before next patient", nav:"tx_sessions",
        note:"Session recorded without VAS outcome — complete before leaving",
      },
      hasCC && !hasROM && {
        templateId:`rom_${pt}`, icon:"📐", title:"ROM Assessment Missing",
        patient:pt, category:"Assessment", priority:"medium",
        dueTime:"Next session", nav:"rom",
        note:"Chief complaint recorded but no ROM values entered",
      },
      hasCC && !hasMMT && {
        templateId:`mmt_${pt}`, icon:"💪", title:"MMT Not Recorded",
        patient:pt, category:"Assessment", priority:"medium",
        dueTime:"Next session", nav:"mmt",
        note:"Muscle testing not performed — complete for full clinical picture",
      },
      hasCC && !hasGait && !hasOM && totalSessions > 1 && {
        templateId:`outcome_${pt}`, icon:"📊", title:"Outcome Measures Due",
        patient:pt, category:"Assessment", priority:"low",
        dueTime:"This week", nav:"subjective",
        note:"Reassessment outcome measures recommended after 2+ sessions",
      },
      totalSessions > 0 && totalSessions % 6 === 0 && {
        templateId:`reassess_${pt}_${totalSessions}`, icon:"🔄", title:"Formal Reassessment Due",
        patient:pt, category:"Reassessment", priority:"medium",
        dueTime:"Next session", nav:"subjective",
        note:`${totalSessions} sessions completed — formal reassessment recommended`,
      },
    ].filter(Boolean);

    AUTO_TASKS.forEach(task => {
      onAddTask({
        ...task,
        id: `auto_${task.templateId}_${Date.now()}`,
        status: "pending",
        createdAt: now,
        autoGenerated: true,
      });
    });
  }, [data, patients]);

  // ── DERIVED DATA ──────────────────────────────────────────────────────────
  const derived = useMemo(() => {
    const today = new Date().toDateString();
    const d = data || {}; // guard against null/undefined data

    // Merge auto-generated tasks with stored taskDB
    const pendingTasks = taskDB
      .filter(t => t.status !== "completed")
      .sort((a,b) => {
        const pOrd = {high:0,medium:1,low:2};
        return (pOrd[a.priority]||1) - (pOrd[b.priority]||1);
      });

    const completedTasks = taskDB
      .filter(t => t.status === "completed")
      .sort((a,b) => new Date(b.completedAt||0) - new Date(a.completedAt||0))
      .slice(0,20);

    const todayCompleted = completedTasks.filter(t =>
      t.completedAt && new Date(t.completedAt).toDateString() === today
    ).length;

    const overdueTasks = pendingTasks.filter(t =>
      t.dueTime === "Immediately" || t.priority === "high"
    ).length;

    // Patients
    const schedule = [...patients]
      .sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0,6)
      .map((p,i) => {
        const d2 = p.data || {};
        const sessions = Array.isArray(d2.tx_sessions) ? d2.tx_sessions : [];
        const hasTx = !!(d2.tx_techniques || sessions.length > 0);
        const isActive = p.id === patients[0]?.id;
        const colors = ["#6D28D9","#0891B2","#059669","#D97706","#DC2626","#7C3AED"];
        const name = d2.dem_name || p.name || "Patient";
        const initials = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
        const dx = d2.cc_main ? d2.cc_main.slice(0,35)+(d2.cc_main.length>35?"…":"") : p.lastDx||"Assessment pending";
        return { id:p.id, name, initials, color:colors[i%colors.length],
                 dx, status:hasTx?"completed":isActive?"in-progress":"upcoming",
                 sessionCount:sessions.length, hasRedFlags:p.hasRedFlags };
      });

    // Stats
    const todayCount  = patients.filter(p => new Date(p.updatedAt).toDateString()===today).length;
    const activeNRS   = parseFloat(d["cc_vas_now"]||"0");
    const worstNRS    = parseFloat(d["cc_vas_worst"]||"0");
    const activeSess  = Array.isArray(d.tx_sessions) ? d.tx_sessions : [];
    const nrsImprove  = worstNRS > 0 ? Math.round(((worstNRS-activeNRS)/worstNRS)*100) : 0;
    const recoveryPct = Math.min(Math.max(nrsImprove + Math.min(activeSess.length*5,30), 0), 100);
    const activeName  = d["dem_name"] || "";
    const activeCC    = (d["cc_main"]||"").slice(0,38);

    // Outcomes
    const total = Math.max(patients.length,1);
    const soapPct  = Math.round((patients.filter(p=>p.data&&(p.data.tx_techniques||(Array.isArray(p.data.tx_sessions)&&p.data.tx_sessions.length>0))).length/total)*100);
    const romPct   = Math.round((patients.filter(p=>p.data&&Object.keys(p.data).some(k=>k.startsWith("rom_")&&p.data[k])).length/total)*100);
    const assessPct= Math.round((patients.filter(p=>p.data&&p.data.cc_main).length/total)*100);
    const safetyPct= Math.round(((total-patients.filter(p=>p.hasRedFlags).length)/total)*100);

    // Trend
    let trendData = [0,0,0,0,0,0,0,0,0,0,0,0];
    if (activeSess.length > 0) {
      activeSess.slice(-12).forEach((s,i)=>{
        const vs=parseFloat(s.vasStart||"5"), ve=parseFloat(s.vasEnd||"5");
        trendData[i]=Math.max(0, vs>0?Math.round(((vs-ve)/vs)*100):0);
      });
    } else {
      patients.forEach(p=>{
        const d2=p.data||{};
        const mn=new Date(p.updatedAt).getMonth();
        const vs=parseFloat(d2.cc_vas_worst||"0"), vc=parseFloat(d2.cc_vas_now||"0");
        if(vs>0) trendData[mn]=Math.round(((vs-vc)/vs)*100);
      });
    }

    return { pendingTasks, completedTasks, todayCompleted, overdueTasks,
             schedule, todayCount, recoveryPct, activeName, activeCC,
             activeNRS, worstNRS, activeSess, soapPct, romPct, assessPct, safetyPct, trendData };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, data]); // taskDB intentionally excluded — adding it creates infinite loop

  const {
    pendingTasks, completedTasks, todayCompleted, overdueTasks,
    schedule, todayCount, recoveryPct, activeName, activeCC,
    activeNRS, worstNRS, activeSess, soapPct, romPct, assessPct, safetyPct, trendData
  } = derived;

  // ── COMPLETE TASK with animation ──────────────────────────────────────────
  const handleComplete = useCallback((taskId) => {
    setCompleting(taskId);
    setTimeout(() => {
      onCompleteTask && onCompleteTask(taskId);
      setCompleting(null);
      setExpanded(null);
    }, 600);
  }, [onCompleteTask]);

  // ── INLINE COMPONENTS ─────────────────────────────────────────────────────
  const Donut = ({ pct, color, size=62, stroke=7, label }) => {
    const [val,setVal] = useState(0);
    useEffect(()=>{const t=setTimeout(()=>setVal(pct),500);return()=>clearTimeout(t);},[pct]);
    const r=(size-stroke)/2, circ=2*Math.PI*r, offset=circ-(val/100)*circ;
    return (
      <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:5}}>
        <div style={{position:"relative",width:size,height:size}}>
          <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke}/>
            <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{transition:"stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)"}}/>
          </svg>
          <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",
            justifyContent:"center",fontSize:12,fontWeight:800,color:"#111827"}}>{val}%</div>
        </div>
        <div style={{fontSize:10,color:"#6B7280",fontWeight:600,textAlign:"center"}}>{label}</div>
      </div>
    );
  };

  const TrendChart = ({ data: d }) => {
    const [anim,setAnim] = useState(false);
    useEffect(()=>{const t=setTimeout(()=>setAnim(true),400);return()=>clearTimeout(t);},[]);
    // Guard against empty/single-point arrays
    if(!d||d.length<2) return (
      <div style={{height:72,display:"flex",alignItems:"center",justifyContent:"center",
        color:"#9CA3AF",fontSize:11}}>No trend data yet</div>
    );
    const safeD = d.map(v=>isNaN(v)?0:Number(v));
    const w=280, h=72, max=Math.max(...safeD,1);
    const pts=safeD.map((v,i)=>{
      const x=(i/(safeD.length-1))*w;
      const y=h-((v/max))*(h-10)-5;
      return [x,y];
    });
    const pathD=pts.map((p,i)=>`${i===0?"M":"L"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
    const areaD=`${pathD} L${w},${h} L0,${h} Z`;
    const months=["J","F","M","A","M","J","J","A","S","O","N","D"];
    return (
      <svg width="100%" viewBox={`0 0 ${w} ${h+16}`} style={{overflow:"visible",display:"block"}}>
        <defs>
          <linearGradient id="tg2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.2"/>
            <stop offset="100%" stopColor="#6D28D9" stopOpacity="0"/>
          </linearGradient>
          <clipPath id="tc2">
            <rect x="0" y="0" width={anim?w:0} height={h+16}
              style={{transition:"width 1.4s cubic-bezier(.4,0,.2,1)"}}/>
          </clipPath>
        </defs>
        <path d={areaD} fill="url(#tg2)" clipPath="url(#tc2)"/>
        <path d={pathD} fill="none" stroke="#6D28D9" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" clipPath="url(#tc2)"/>
        {pts.map((p,i)=>i%3===0&&p&&(
          <text key={i} x={p[0]} y={h+14} textAnchor="middle" fontSize="8" fill="#9CA3AF">{months[i]}</text>
        ))}
        {pts.length>0&&pts[pts.length-1]&&(
          <circle cx={pts[pts.length-1][0]} cy={pts[pts.length-1][1]}
            r="4" fill="#6D28D9" stroke="white" strokeWidth="2"/>
        )}
      </svg>
    );
  };

  // ── PRIORITY CONFIG ───────────────────────────────────────────────────────
  const PRI = {
    high:   { bg:"#FEF2F2", color:"#EF4444", border:"#FECACA", dot:"#EF4444", label:"High"   },
    medium: { bg:"#FFFBEB", color:"#D97706", border:"#FDE68A", dot:"#D97706", label:"Medium" },
    low:    { bg:"#F0FDF4", color:"#059669", border:"#BBF7D0", dot:"#059669", label:"Low"    },
  };
  const STATUS_CFG = {
    "in-progress":{ bg:"#ECFDF5",color:"#059669",dot:"#10B981",label:"Active"   },
    "upcoming":   { bg:"#EFF6FF",color:"#2563EB",dot:"#3B82F6",label:"Upcoming" },
    "completed":  { bg:"#F3F4F6",color:"#6B7280",dot:"#9CA3AF",label:"Done"     },
  };
  const CAT_ICONS = {
    "Clinical Safety":"🚨","Documentation":"📋","Assessment":"📐","Reassessment":"🔄","Follow-Up":"📞"
  };
  const now = new Date();
  const greeting = now.getHours()<12?"Good morning":now.getHours()<17?"Good afternoon":"Good evening";
  const dateStr  = now.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
  const STATS = [
    {label:"Today",   value:String(todayCount),             sub:"patients", icon:"👥",color:"#6D28D9",bg:"#EDE9FE",nav:"subjective"},
    {label:"Pending", value:String(pendingTasks.length),    sub:"tasks",    icon:"⏳",color:pendingTasks.some(t=>t.priority==="high")?"#EF4444":"#D97706",bg:pendingTasks.some(t=>t.priority==="high")?"#FEF2F2":"#FEF3C7",nav:"dashboard"},
    {label:"Done",    value:String(todayCompleted),         sub:"today",    icon:"✓", color:"#059669",bg:"#ECFDF5",nav:"dashboard"},
    {label:"Overdue", value:String(overdueTasks),           sub:"alerts",   icon:"⚠",color:"#EF4444",bg:"#FEF2F2",nav:"dashboard"},
  ];

  return (
    <div style={{fontFamily:"'DM Sans','Helvetica Neue',sans-serif",background:"#F8FAFC",minHeight:"100vh",padding:"0 0 24px"}}>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes slideOut{from{opacity:1;transform:translateX(0) scaleY(1);max-height:200px}to{opacity:0;transform:translateX(60px) scaleY(0);max-height:0;margin:0;padding:0}}
        @keyframes checkPop{0%{transform:scale(0)}60%{transform:scale(1.3)}100%{transform:scale(1)}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:0.35}}
        .dc{animation:fadeUp 0.45s ease both}
        .completing{animation:slideOut 0.55s cubic-bezier(.4,0,.2,1) forwards}
      `}</style>

      {/* ── HEADER ── */}
      <div style={{background:"white",padding:"20px 16px 14px",borderBottom:"1px solid #F1F5F9",
        position:"sticky",top:0,zIndex:20,boxShadow:"0 1px 6px rgba(0,0,0,0.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:"#9CA3AF",fontWeight:500,marginBottom:2}}>{dateStr}</div>
            <div style={{fontSize:16,fontWeight:800,color:"#111827",letterSpacing:"-0.4px"}}>
              {greeting}, {currentUser?.user_metadata?.full_name?.split(" ")[0] || "Doctor"} 👋
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {overdueTasks > 0 && (
              <div style={{position:"relative",cursor:"pointer",width:38,height:38,borderRadius:11,
                background:"#FEF2F2",border:"1px solid #FECACA",display:"flex",
                alignItems:"center",justifyContent:"center",fontSize:"1rem"}}
                onClick={()=>setActiveTab("pending")}>
                🔔
                <div style={{position:"absolute",top:7,right:7,width:8,height:8,background:"#EF4444",
                  borderRadius:"50%",border:"1.5px solid white",
                  animation:"pulseDot 1.2s infinite"}}/>
              </div>
            )}
            <button onClick={onSignOut}
              style={{padding:"6px 12px",borderRadius:9,border:"1px solid #d8cce8",
                background:"transparent",color:"#7e6a9a",fontSize:"0.8rem",
                fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
              Sign out
            </button>
            <div style={{width:38,height:38,borderRadius:11,
              background:"linear-gradient(135deg,#6D28D9,#8B5CF6)",
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:13,fontWeight:800,color:"white",cursor:"pointer"}}
              onClick={()=>onNav("subjective")}>DP</div>
          </div>
        </div>
      </div>

      <div style={{padding:"16px 14px",display:"flex",flexDirection:"column",gap:16}}>

        {/* ── QUICK STATS ── */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {STATS.map((st,i)=>(
            <div key={st.label} className="dc" style={{
              background:"white",borderRadius:16,padding:"14px",
              border:"1px solid #F1F5F9",boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
              animationDelay:`${i*0.07}s`,cursor:"pointer",
            }} onClick={()=>{ if(st.nav==="dashboard") setActiveTab("pending"); else onNav(st.nav); }}>
              <div style={{width:32,height:32,borderRadius:9,background:st.bg,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,marginBottom:10}}>{st.icon}</div>
              <div style={{fontSize:26,fontWeight:800,color:"#111827",letterSpacing:"-1px",lineHeight:1}}>
                {st.value}
              </div>
              <div style={{fontSize:11,color:"#6B7280",marginTop:3}}>
                {st.label} <span style={{color:st.color}}>{st.sub}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── ACTIVE PATIENT ── */}
        {activeName ? (
          <div className="dc" style={{
            background:"linear-gradient(135deg,#6D28D9 0%,#7C3AED 55%,#8B5CF6 100%)",
            borderRadius:20,padding:"18px",
            boxShadow:"0 8px 28px rgba(109,40,217,0.28)",animationDelay:"0.1s",cursor:"pointer",
          }} onClick={()=>onNav("subjective")}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div>
                <div style={{fontSize:9.5,fontWeight:700,color:"rgba(255,255,255,0.6)",
                  textTransform:"uppercase",letterSpacing:"0.9px",marginBottom:3}}>Active Patient</div>
                <div style={{fontSize:17,fontWeight:800,color:"white",letterSpacing:"-0.4px"}}>{activeName}</div>
                <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:2,
                  maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {activeCC||"Assessment pending"} · {activeSess.length} session{activeSess.length!==1?"s":""}
                </div>
              </div>
              <div style={{width:44,height:44,borderRadius:13,
                background:"rgba(255,255,255,0.18)",border:"2px solid rgba(255,255,255,0.25)",
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,fontWeight:800,color:"white",flexShrink:0}}>
                {activeName.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase()}
              </div>
            </div>
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              {[
                {l:"Pain NRS",v:activeNRS>0?`${activeNRS}/10`:"—",s:worstNRS>activeNRS?`↓ from ${worstNRS}`:"not recorded"},
                {l:"Sessions",v:String(activeSess.length),s:"completed"},
              ].map(m=>(
                <div key={m.l} style={{flex:1,background:"rgba(255,255,255,0.14)",borderRadius:11,padding:"8px 9px"}}>
                  <div style={{fontSize:14,fontWeight:800,color:"white",lineHeight:1}}>{m.v}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.6)",marginTop:2,fontWeight:600}}>{m.l}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.45)",marginTop:1}}>{m.s}</div>
                </div>
              ))}
            </div>

          </div>
        ) : (
          <div className="dc" style={{background:"white",borderRadius:20,padding:"20px",
            border:"2px dashed #E5E7EB",textAlign:"center",animationDelay:"0.1s",cursor:"pointer"}}
            onClick={()=>onNav("subjective")}>
            <div style={{fontSize:"1.5rem",marginBottom:8}}>👤</div>
            <div style={{fontSize:13,fontWeight:700,color:"#374151"}}>No active patient</div>
            <div style={{fontSize:11,color:"#9CA3AF",marginTop:4}}>Select or create a patient to begin</div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TASK MANAGEMENT SYSTEM
        ══════════════════════════════════════════════════════════════ */}
        <div className="dc" style={{animationDelay:"0.15s"}}>

          {/* Tab bar */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>
              Task Workflow
            </div>
            <div style={{display:"flex",gap:5}}>
              {[
                {k:"pending",  label:`Pending ${pendingTasks.length>0?"("+pendingTasks.length+")":""}`},
                {k:"completed",label:`Done ${todayCompleted>0?"("+todayCompleted+")":""}`},
              ].map(({k,label})=>(
                <button key={k} onClick={()=>setActiveTab(k)} style={{
                  padding:"5px 12px",borderRadius:99,border:"none",cursor:"pointer",
                  fontSize:11,fontWeight:700,
                  background:activeTab===k?"#6D28D9":"#F3F4F6",
                  color:activeTab===k?"white":"#6B7280",
                  transition:"all 0.2s",
                }}>{label}</button>
              ))}
            </div>
          </div>

          {/* ── PENDING TASKS ── */}
          {activeTab === "pending" && (
            <div>
              {pendingTasks.length === 0 ? (
                <div style={{background:"white",borderRadius:16,padding:"28px 20px",
                  border:"2px dashed #E5E7EB",textAlign:"center"}}>
                  <div style={{fontSize:"2rem",marginBottom:8}}>✅</div>
                  <div style={{fontSize:14,fontWeight:700,color:"#374151"}}>All clear!</div>
                  <div style={{fontSize:12,color:"#9CA3AF",marginTop:4}}>
                    No pending tasks — great clinical workflow
                  </div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {pendingTasks.map((task,i) => {
                    const pri = PRI[task.priority] || PRI.medium;
                    const isCompleting = completing === task.id;
                    const isExpanded   = expanded === task.id;
                    return (
                      <div key={task.id}
                        className={isCompleting ? "completing" : ""}
                        style={{
                          background:"white",
                          borderRadius:14,
                          border:`1px solid ${isExpanded?pri.border:"#F1F5F9"}`,
                          boxShadow:isExpanded?"0 4px 16px rgba(0,0,0,0.08)":"0 1px 5px rgba(0,0,0,0.04)",
                          overflow:"hidden",
                          animation:isCompleting?"":"fadeUp 0.4s ease both",
                          animationDelay:`${i*0.05}s`,
                          transition:"box-shadow 0.2s, border 0.2s",
                          transformOrigin:"top",
                        }}>

                        {/* Priority stripe */}
                        <div style={{height:3,background:pri.color,width:"100%"}}/>

                        {/* Main row */}
                        <div style={{padding:"12px 14px",display:"flex",alignItems:"center",gap:11,
                          cursor:"pointer"}} onClick={()=>setExpanded(isExpanded?null:task.id)}>
                          {/* Icon */}
                          <div style={{width:38,height:38,borderRadius:10,background:pri.bg,
                            display:"flex",alignItems:"center",justifyContent:"center",
                            fontSize:17,flexShrink:0}}>{task.icon}</div>

                          {/* Info */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:13,fontWeight:700,color:"#111827",
                              overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                              {task.title}
                            </div>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginTop:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:10.5,color:"#6B7280"}}>{task.patient}</span>
                              <span style={{color:"#D1D5DB"}}>·</span>
                              <span style={{fontSize:10,fontWeight:600,color:pri.color,
                                background:pri.bg,padding:"1px 6px",borderRadius:99}}>
                                {pri.label}
                              </span>
                              {task.dueTime && (
                                <>
                                  <span style={{color:"#D1D5DB"}}>·</span>
                                  <span style={{fontSize:10,color:"#9CA3AF"}}>⏰ {task.dueTime}</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Expand arrow */}
                          <div style={{color:"#9CA3AF",fontSize:12,flexShrink:0,
                            transition:"transform 0.2s",transform:isExpanded?"rotate(180deg)":""}}>▼</div>
                        </div>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div style={{padding:"0 14px 14px",borderTop:"1px solid #F9FAFB"}}>
                            {task.note && (
                              <div style={{background:"#F8FAFC",borderRadius:8,padding:"8px 10px",
                                marginBottom:12,fontSize:11.5,color:"#6B7280",lineHeight:1.5}}>
                                📌 {task.note}
                              </div>
                            )}
                            <div style={{display:"flex",gap:8}}>
                              {/* Open button */}
                              <button onClick={()=>onNav(task.nav||"subjective")} style={{
                                flex:1,padding:"9px",borderRadius:9,
                                background:"#F3F4F6",border:"none",cursor:"pointer",
                                fontSize:12,fontWeight:700,color:"#374151",
                                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                              }}>
                                📂 Open
                              </button>
                              {/* Complete button */}
                              <button onClick={()=>handleComplete(task.id)} style={{
                                flex:2,padding:"9px",borderRadius:9,
                                background:"linear-gradient(135deg,#059669,#10B981)",
                                border:"none",cursor:"pointer",
                                fontSize:12,fontWeight:800,color:"white",
                                display:"flex",alignItems:"center",justifyContent:"center",gap:6,
                                boxShadow:"0 2px 8px rgba(5,150,105,0.3)",
                              }}>
                                {isCompleting ? "✓ Completing…" : "✓ Mark Complete"}
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quick complete (collapsed) */}
                        {!isExpanded && (
                          <div style={{padding:"0 14px 10px",display:"flex",gap:7}}>
                            <button onClick={()=>onNav(task.nav||"subjective")} style={{
                              flex:1,padding:"6px",borderRadius:8,
                              background:"#F8FAFC",border:"1px solid #E5E7EB",
                              cursor:"pointer",fontSize:11,fontWeight:600,color:"#6B7280",
                            }}>Open →</button>
                            <button onClick={()=>handleComplete(task.id)} style={{
                              flex:2,padding:"6px",borderRadius:8,
                              background:"#ECFDF5",border:"1px solid #BBF7D0",
                              cursor:"pointer",fontSize:11,fontWeight:700,color:"#059669",
                              display:"flex",alignItems:"center",justifyContent:"center",gap:4,
                            }}>
                              {isCompleting
                                ? <span style={{animation:"checkPop 0.3s ease"}}>✓ Done!</span>
                                : "✓ Complete"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── COMPLETED HISTORY ── */}
          {activeTab === "completed" && (
            <div>
              {completedTasks.length === 0 ? (
                <div style={{background:"white",borderRadius:16,padding:"24px",
                  border:"1px solid #F1F5F9",textAlign:"center"}}>
                  <div style={{fontSize:"1.5rem",marginBottom:8}}>📋</div>
                  <div style={{fontSize:12,color:"#9CA3AF"}}>No completed tasks yet</div>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {completedTasks.map((task,i)=>(
                    <div key={task.id} style={{
                      background:"white",borderRadius:12,padding:"12px 14px",
                      border:"1px solid #F1F5F9",
                      display:"flex",alignItems:"center",gap:11,opacity:0.8,
                      animation:"fadeUp 0.35s ease both",animationDelay:`${i*0.04}s`,
                    }}>
                      <div style={{width:34,height:34,borderRadius:9,
                        background:"#ECFDF5",border:"1px solid #BBF7D0",
                        display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>
                        ✅
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:12.5,fontWeight:700,color:"#374151",
                          textDecoration:"line-through",opacity:0.7,
                          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                          {task.title}
                        </div>
                        <div style={{fontSize:10.5,color:"#9CA3AF",marginTop:2}}>
                          {task.patient} · Completed{" "}
                          {task.completedAt
                            ? new Date(task.completedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})
                            : "today"}
                        </div>
                      </div>
                      <div style={{fontSize:11,fontWeight:600,color:"#059669",
                        background:"#ECFDF5",padding:"2px 8px",borderRadius:99}}>Done</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── RECENT PATIENTS ── */}
        <div className="dc" style={{animationDelay:"0.2s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:11}}>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>
              Recent Patients <span style={{fontSize:11,fontWeight:500,color:"#9CA3AF",marginLeft:5}}>({patients.length})</span>
            </div>
            <span style={{fontSize:11,fontWeight:600,color:"#6D28D9",cursor:"pointer"}}
              onClick={()=>onNav("subjective")}>See all →</span>
          </div>
          <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",paddingBottom:2}}>
            {[["All","all"],["Active","in-progress"],["Done","completed"]].map(([l,v])=>(
              <button key={v} onClick={()=>setScheduleTab(v)} style={{
                padding:"5px 14px",borderRadius:99,border:"none",cursor:"pointer",
                fontSize:11,fontWeight:700,whiteSpace:"nowrap",
                background:scheduleTab===v?"#6D28D9":"#F3F4F6",
                color:scheduleTab===v?"white":"#6B7280",transition:"all 0.2s",
              }}>{l}</button>
            ))}
          </div>
          {schedule.length === 0 ? (
            <div style={{background:"white",borderRadius:14,padding:"20px",
              border:"1px solid #F1F5F9",textAlign:"center",color:"#9CA3AF",fontSize:12}}>
              No patients yet — create your first patient
            </div>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {schedule.filter(s2=>scheduleTab==="all"||s2.status===scheduleTab).slice(0,5).map((appt,i)=>{
                const sc = STATUS_CFG[appt.status];
                return (
                  <div key={appt.id} style={{
                    background:"white",borderRadius:14,padding:"12px 14px",
                    border:`1px solid ${appt.hasRedFlags?"#FECACA":"#F1F5F9"}`,
                    display:"flex",alignItems:"center",gap:12,
                    opacity:appt.status==="completed"?0.7:1,cursor:"pointer",
                    animation:"fadeUp 0.4s ease both",animationDelay:`${i*0.05}s`,
                  }} onClick={()=>onQuickStart ? onQuickStart(patients.find(p2=>p2.id===appt.id)||patients[i]) : onNav("subjective")}>
                    <div style={{width:40,height:40,borderRadius:11,
                      background:`${appt.color}18`,border:`1.5px solid ${appt.color}25`,
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:12,fontWeight:800,color:appt.color,flexShrink:0,
                      position:"relative"}}>
                      {appt.initials}
                      {appt.hasRedFlags&&(
                        <div style={{position:"absolute",top:-3,right:-3,width:10,height:10,
                          background:"#EF4444",borderRadius:"50%",border:"1.5px solid white",
                          fontSize:7,display:"flex",alignItems:"center",justifyContent:"center",color:"white"}}>!</div>
                      )}
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:"#111827",
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appt.name}</div>
                      <div style={{fontSize:11,color:"#6B7280",marginTop:1,
                        overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{appt.dx}</div>
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4,flexShrink:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:4,
                        padding:"3px 8px",background:sc.bg,borderRadius:99}}>
                        <div style={{width:5,height:5,borderRadius:"50%",background:sc.dot,
                          animation:appt.status==="in-progress"?"pulseDot 1.5s infinite":"none"}}/>
                        <span style={{fontSize:9.5,fontWeight:700,color:sc.color}}>{sc.label}</span>
                      </div>
                      <div style={{fontSize:10,color:"#9CA3AF"}}>{appt.sessionCount} session{appt.sessionCount!==1?"s":""}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>



        {/* ── PATIENT OUTCOMES ── */}
        <div className="dc" style={{background:"white",borderRadius:20,padding:"16px",
          border:"1px solid #F1F5F9",boxShadow:"0 1px 6px rgba(0,0,0,0.04)",
          animationDelay:"0.3s"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <div style={{fontSize:15,fontWeight:800,color:"#111827",letterSpacing:"-0.3px"}}>Patient Outcomes</div>
            <div style={{fontSize:11,color:"#9CA3AF"}}>{patients.length} total</div>
          </div>
          <div style={{display:"flex",justifyContent:"space-around"}}>
            <Donut pct={assessPct} color="#6D28D9" label="Assessed"  size={62} stroke={7}/>
            <Donut pct={romPct}    color="#0891B2" label="ROM Done"   size={62} stroke={7}/>
            <Donut pct={soapPct}   color="#059669" label="SOAP Done"  size={62} stroke={7}/>
            <Donut pct={safetyPct} color="#10B981" label="No Flags"   size={62} stroke={7}/>
          </div>
          {patients.length===0&&(
            <div style={{textAlign:"center",color:"#9CA3AF",fontSize:11,marginTop:12}}>
              Add patients to see outcome analytics
            </div>
          )}
        </div>

        {/* ── START ASSESSMENT CTA ── */}
        <div className="dc" style={{
          background:"linear-gradient(135deg,#6D28D9,#8B5CF6)",
          borderRadius:20,padding:"20px",
          boxShadow:"0 4px 20px rgba(109,40,217,0.25)",
          animationDelay:"0.35s",
          display:"flex",justifyContent:"space-between",alignItems:"center",
          cursor:"pointer",
        }} onClick={()=>onNav("subjective")}>
          <div>
            <div style={{fontSize:15,fontWeight:800,color:"white",letterSpacing:"-0.3px"}}>Start Assessment</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",marginTop:3}}>
              Subjective → ROM → MMT → Special Tests
            </div>
          </div>
          <div style={{width:44,height:44,borderRadius:13,background:"rgba(255,255,255,0.2)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem"}}>→</div>
        </div>

      </div>
    </div>
  );
}


function PdfReportsModal({ data, dx, onClose, patients=[] }) {
  const [generating, setGenerating] = useState(null);
  const [done, setDone] = useState({});

  const d = data || {};
  const patName = d.dem_name || "Patient";
  const today = new Date().toLocaleDateString("en-GB", { day:"2-digit", month:"long", year:"numeric" });
  const dob = d.dem_dob || "--";
  const age = d.dem_age || "--";
  const sex = d.dem_sex || d.dem_gender || "--";
  const occ = d.dem_occupation || "--";
  const gp = d.dem_gp || "--";
  const refNo = d.dem_ins_ref || "--";
  const insurer = d.dem_insurer || "--";
  const refSource = d.dem_referral || "--";

  const brand = { primary:"#1a3a5c", accent:"#2563eb", teal:"#0891b2", green:"#059669", red:"#dc2626", amber:"#d97706", purple:"#7c3aed", grey:"#6b7280", lightGrey:"#f1f5f9", border:"#e2e8f0", midGrey:"#94a3b8" };

  const escHtml = (s) => String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const val = (k, fallback="--") => escHtml(d[k]||fallback);
  const arr = (k) => { const v=d[k]; return Array.isArray(v)?v:(typeof v==="string"?v:"").split("|||").filter(Boolean); };

  const pdfHeader = (title, subtitle, color) => {
    const reportNo = d.report_no || ("RPT-" + today.replace(/\s/g,""));
    const inlineLogo = `<img src="/logo.svg" alt="PhysioMind" style="height:68px;width:auto;display:block;" />`;
    return `<div style="background:#fff;border-bottom:1px solid #e2e8f0;">
      <div style="padding:14px 32px 12px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:18px;">
          ${inlineLogo}
          <div style="border-left:2px solid #e2e8f0;padding-left:18px;margin-left:4px;">
            <div style="font-size:8.5px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">${title}</div>
            <div style="font-size:10px;color:#64748b;margin-top:1px;">${subtitle}</div>
          </div>
        </div>
        <div style="display:flex;gap:28px;text-align:right;">
          <div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">Patient</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${escHtml(patName)}</div>
            <div style="font-size:10px;color:#64748b;">${escHtml(sex)} &middot; ${escHtml(String(age))} yrs &middot; ${escHtml(dob)}</div>
          </div>
          <div>
            <div style="font-size:8px;text-transform:uppercase;letter-spacing:1px;color:#94a3b8;margin-bottom:3px;">Report</div>
            <div style="font-size:14px;font-weight:700;color:#1e293b;">${escHtml(reportNo)}</div>
            <div style="font-size:10px;color:#64748b;">${today}</div>
          </div>
        </div>
      </div>
      <div style="background:linear-gradient(to right,#3730a3,#7c3aed,#a855f7);padding:6px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:9px;font-weight:700;color:#fff;letter-spacing:1.5px;text-transform:uppercase;">Smarter Assessment &middot; Better Outcomes</span>
        <span style="font-size:8px;font-weight:600;color:rgba(255,255,255,0.75);letter-spacing:0.8px;text-transform:uppercase;">Confidential Medical Document</span>
      </div>
    </div>`;
  };

  const pdfFooter = (docName) => {
    const therapistName = d.therapist_name || "Your Physiotherapist";
    return '<div style="background:#1e293b;padding:10px 40px;display:flex;justify-content:space-between;align-items:center;">'
      + '<div style="color:#94a3b8;font-size:8px;">PhysioMind &middot; ' + docName + '</div>'
      + '<div style="color:#64748b;font-size:8px;text-align:center;"><span style="color:#c9a84c;font-weight:700;">CONFIDENTIAL</span> &mdash; For Authorised Healthcare Professionals Only &middot; Not for Distribution</div>'
      + '<div style="color:#94a3b8;font-size:8px;">Page 1 &middot; ' + today + '</div>'
      + '</div>';
  };

  const sectionCard = (title, icon, content, borderColor) => '<div style="background:#fff;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.04);">'
    + '<div style="padding:11px 16px;border-bottom:2px solid '+borderColor+'20;display:flex;align-items:center;gap:8px;">'
    + '<div style="width:28px;height:28px;background:'+borderColor+'12;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;border:1px solid '+borderColor+'25;">'+icon+'</div>'
    + '<span style="font-size:11px;font-weight:700;color:'+borderColor+';text-transform:uppercase;letter-spacing:1px;font-family:Georgia,serif;">'+title+'</span>'
    + '<div style="flex:1;height:1px;background:'+borderColor+'15;margin-left:4px;"></div>'
    + '</div>'
    + '<div style="padding:14px 16px;">'+content+'</div>'
    + '</div>';

  const badge = (text, color) => `<span style="display:inline-block;padding:3px 8px;background:${color}15;border:1px solid ${color}40;border-radius:5px;font-size:9px;font-weight:700;color:${color};margin:2px 3px 2px 0;">${escHtml(text)}</span>`;

  // Exercise SVG illustrations -- matches PhysioReports_4 ExerciseSVG component
  const exerciseSvgHtml = function(idx, color) {
    var svgs = [
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#f0f9ff" rx="8"/><ellipse cx="50" cy="28" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="38" y="47" width="24" height="38" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><path d="M50,38 Q42,45 44,53" stroke="'+color+'" stroke-width="2" fill="none" stroke-dasharray="3,2"/><text x="50" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Chin Tuck</text></svg>',
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fff7ed" rx="8"/><rect x="88" y="5" width="8" height="110" rx="3" fill="#e2e8f0"/><ellipse cx="48" cy="28" rx="16" ry="18" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="34" y="45" width="24" height="36" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="33" y="56" width="10" height="26" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1"/><path d="M44,60 L82,55" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2"/><path d="M44,68 L82,68" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2"/><text x="48" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Cervical Retraction</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#f0fdf4" rx="8"/><rect x="5" y="75" width="120" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="52" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="36" y="38" width="60" height="28" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="36" cy="46" rx="9" ry="9" fill="#fde8d0" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="96" cy="46" rx="9" ry="9" fill="#fde8d0" stroke="'+color+'" stroke-width="1.5"/><path d="M36,46 L20,40" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3,2"/><path d="M96,46 L112,40" stroke="'+color+'" stroke-width="1.5" stroke-dasharray="3,2"/><text x="65" y="93" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Scapular Retraction</text></svg>',
      '<svg viewBox="0 0 100 120" width="90" height="108" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fdf4ff" rx="8"/><ellipse cx="50" cy="30" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="38" y="49" width="24" height="36" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><path d="M60,22 Q75,15 78,28" stroke="'+color+'" stroke-width="2" fill="none"/><path d="M78,22 L85,15" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="2,2" fill="none"/><text x="50" y="112" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Levator Stretch</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#eff6ff" rx="8"/><rect x="50" y="60" width="30" height="12" rx="5" fill="#c7d7f0" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="65" cy="42" rx="30" ry="18" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><ellipse cx="65" cy="28" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><text x="65" y="92" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Thoracic Extension</text></svg>',
      '<svg viewBox="0 0 130 100" width="120" height="92" xmlns="http://www.w3.org/2000/svg"><rect width="130" height="100" fill="#f5f3ff" rx="8"/><rect x="118" y="5" width="8" height="90" rx="3" fill="#e2e8f0"/><ellipse cx="68" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="55" y="35" width="24" height="32" rx="7" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="57" y="65" width="10" height="25" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="69" y="65" width="10" height="25" rx="4" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><path d="M79,40 Q100,30 116,20" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2" fill="none"/><path d="M79,52 Q100,52 116,52" stroke="'+color+'" stroke-width="2" stroke-dasharray="3,2" fill="none"/><text x="65" y="97" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Wall Angels</text></svg>',
      '<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#fdf4ff" rx="8"/><ellipse cx="22" cy="50" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="34" y="42" width="50" height="30" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="50" y="68" width="50" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="50" y="55" width="65" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-25,75,62)"/><text x="60" y="95" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Clamshell</text></svg>',
      '<svg viewBox="0 0 80 120" width="80" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="120" fill="#eff6ff" rx="8"/><ellipse cx="40" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="26" y="34" width="28" height="35" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="28" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(15,34,80)"/><rect x="40" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-15,46,80)"/><text x="40" y="115" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Mini Squat</text></svg>',
      '<svg viewBox="0 0 140 110" width="120" height="94" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="110" fill="#f0fdf4" rx="8"/><rect x="5" y="85" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="35" y="42" width="55" height="22" rx="8" fill="#dde8f8" stroke="'+color+'" stroke-width="1.5"/><rect x="37" y="62" width="12" height="25" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5"/><rect x="62" y="58" width="50" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" stroke-width="1.5" transform="rotate(-8,87,64)"/><text x="60" y="100" font-size="7" fill="#1a3a5c" font-weight="700" text-anchor="middle">Hip Flexor Stretch</text></svg>',
    ];
    return svgs[idx % svgs.length];
  };

  const postureSvg = () => {
    const fhp = d.post_fhp || "";
    const sh = d.post_sh || "";
    const kyphosis = d.post_kyphosis || "";
    const lordosis = d.post_lordosis || "";
    const pelvis = d.post_pelvis || "";
    return `<svg viewBox="0 0 220 340" width="160" height="248" style="display:block;margin:0 auto;" xmlns="http://www.w3.org/2000/svg">
      <defs><marker id="arr" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#dc2626"/></marker></defs>
      <rect width="220" height="340" fill="#f8fafc" rx="10"/>
      <line x1="110" y1="10" x2="110" y2="330" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,4"/>
      <ellipse cx="${fhp&&fhp.includes("Moderate")?120:fhp&&fhp.includes("Severe")?128:110}" cy="38" rx="22" ry="26" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="${fhp&&fhp.includes("Severe")?112:106}" y="62" width="14" height="22" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <line x1="${sh&&sh.includes("elevated")?62:68}" y1="${sh&&sh.includes("elevated")?84:88}" x2="${sh&&sh.includes("elevated")?158:152}" y2="${sh&&sh.includes("elevated")?88:84}" stroke="#2563eb" strokeWidth="3" strokeLinecap="round"/>
      <ellipse cx="${sh&&sh.includes("elevated")?62:68}" cy="${sh&&sh.includes("elevated")?84:88}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="${sh&&sh.includes("elevated")?158:152}" cy="${sh&&sh.includes("elevated")?88:84}" rx="10" ry="10" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <path d="M104,84 Q${kyphosis&&kyphosis.includes("increased")?98:104},120 ${kyphosis&&kyphosis.includes("increased")?98:104},145" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M${kyphosis&&kyphosis.includes("increased")?98:104},145 Q${lordosis&&lordosis.includes("increased")?116:104},170 ${lordosis&&lordosis.includes("increased")?114:104},190" stroke="#1a3a5c" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M68,88 L74,190 L148,190 L152,88 Z" fill="#dde8f8" stroke="#2563eb" strokeWidth="1" opacity="0.5"/>
      <ellipse cx="110" cy="${pelvis&&pelvis.includes("anterior")?196:192}" rx="36" ry="20" fill="#c7d7f0" stroke="#2563eb" strokeWidth="1.5"/>
      <rect x="90" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="90" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="208" width="18" height="60" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <rect x="112" y="265" width="18" height="55" rx="8" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/>
      <ellipse cx="99" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      <ellipse cx="121" cy="322" rx="14" ry="7" fill="#c47a4a" opacity="0.7"/>
      ${fhp&&!fhp.includes("Normal")?'<text x="135" y="35" fontSize="8" fill="#dc2626" fontWeight="700">FHP</text>':""}
      ${sh&&sh.includes("elevated")?'<text x="30" y="80" fontSize="8" fill="#dc2626" fontWeight="700">Sh elev.</text>':""}
      ${kyphosis&&kyphosis.includes("increased")?'<text x="20" y="120" fontSize="8" fill="#d97706" fontWeight="700">Kyph+</text>':""}
      ${lordosis&&lordosis.includes("increased")?'<text x="140" y="170" fontSize="8" fill="#d97706" fontWeight="700">Lord+</text>':""}
      ${pelvis&&pelvis.includes("anterior")?'<text x="150" y="200" fontSize="8" fill="#7c3aed" fontWeight="700">APT</text>':""}
      <line x1="110" y1="15" x2="110" y2="325" stroke="#10b981" strokeWidth="1" strokeDasharray="3,3" opacity="0.6"/>
    </svg>`;
  };

  const exerciseSvgs = {
    bridge: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#f0f9ff" rx="8"/><rect x="5" y="75" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="30" cy="68" rx="14" ry="11" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="40" y="50" width="60" height="25" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="38" y="72" width="18" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><rect x="82" y="72" width="18" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Glute Bridge</text></svg>`,
    bird_dog: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#f0fdf4" rx="8"/><rect x="5" y="72" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="35" y="42" width="60" height="22" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="42" y="62" width="14" height="18" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><rect x="82" y="62" width="14" height="18" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1"/><path d="M35,52 L18,45 L8,42" stroke="#059669" strokeWidth="2" fill="none"/><path d="M95,52 L112,45 L122,42" stroke="#059669" strokeWidth="2" fill="none"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Bird Dog</text></svg>`,
    clam: `<svg viewBox="0 0 140 100" width="120" height="86" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="100" fill="#fdf4ff" rx="8"/><ellipse cx="22" cy="50" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="34" y="42" width="50" height="30" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="50" y="68" width="50" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="50" y="55" width="65" height="14" rx="6" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-25,75,62)"/><text x="5" y="95" fontSize="7" fill="#1a3a5c" fontWeight="700">Clamshell</text></svg>`,
    squat: `<svg viewBox="0 0 80 120" width="80" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="80" height="120" fill="#eff6ff" rx="8"/><ellipse cx="40" cy="22" rx="14" ry="14" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="26" y="34" width="28" height="35" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="28" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(15,34,80)"/><rect x="40" y="65" width="12" height="30" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-15,46,80)"/><text x="8" y="115" fontSize="7" fill="#1a3a5c" fontWeight="700">Mini Squat</text></svg>`,
    stretch: `<svg viewBox="0 0 140 110" width="120" height="94" xmlns="http://www.w3.org/2000/svg"><rect width="140" height="110" fill="#f0fdf4" rx="8"/><rect x="5" y="85" width="130" height="8" rx="3" fill="#e2e8f0"/><ellipse cx="25" cy="55" rx="12" ry="12" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="35" y="42" width="55" height="22" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><rect x="37" y="62" width="12" height="25" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="62" y="58" width="50" height="12" rx="5" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5" transform="rotate(-8,87,64)"/><text x="5" y="100" fontSize="7" fill="#1a3a5c" fontWeight="700">Hip Flexor Stretch</text></svg>`,
    chin_tuck: `<svg viewBox="0 0 100 120" width="100" height="120" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="120" fill="#fff7ed" rx="8"/><ellipse cx="50" cy="28" rx="18" ry="20" fill="#fde8d0" stroke="#c47a4a" strokeWidth="1.5"/><rect x="38" y="46" width="24" height="35" rx="8" fill="#dde8f8" stroke="#2563eb" strokeWidth="1.5"/><path d="M50,36 Q42,42 44,50" stroke="#d97706" strokeWidth="2" fill="none" strokeDasharray="3,2"/><text x="5" y="112" fontSize="7" fill="#1a3a5c" fontWeight="700">Chin Tuck (DNF)</text></svg>`,
  };

  const gatherExercises = () => {
    // ── 1. Real data: hep_programme array (Quick Visit / HEP module) ────────
    const hep = Array.isArray(d.hep_programme) ? d.hep_programme : [];
    if (hep.length > 0) {
      return hep.map(ex => ({
        name:        ex.name || "Unnamed Exercise",
        sets:        ex.customSets  || ex.sets  || "3",
        reps:        ex.customReps  || ex.reps  || "10",
        hold:        ex.customHold  || ex.hold  || "",
        rest:        ex.customRest  || ex.rest  || "60s",
        freq:        ex.customFreq  || ex.freq  || "Daily",
        phase:       ex.phase       || "Phase 1",
        notes:       ex.notes       || "",
        target:      ex.target      || ex.muscle || "",
        progression: ex.progression || "",
      }));
    }
    // ── 2. Manual entries: ex_name_1..12 ────────────────────────────────────
    const exs = [];
    for (let i = 1; i <= 12; i++) {
      const name = d[`ex_name_${i}`] || d[`exercise_${i}_name`] || "";
      if (!name) continue;
      exs.push({
        name, sets: d[`ex_sets_${i}`] || "3", reps: d[`ex_reps_${i}`] || "10",
        hold: d[`ex_hold_${i}`] || "", rest: d[`ex_rest_${i}`] || "60s",
        freq: d[`ex_freq_${i}`] || "Daily", phase: d[`ex_phase_${i}`] || "Phase 1",
        notes: d[`ex_notes_${i}`] || "", target: d[`ex_target_${i}`] || "",
        progression: d[`ex_progression_${i}`] || "",
      });
    }
    if (exs.length === 0) {
      const dxLabel = (dx?.dx?.[0]?.label||"").toLowerCase();
      const cc = (Array.isArray(d.cc_location)?d.cc_location.join(" "):(d.cc_location||"")).toLowerCase();
      const isLumbar = dxLabel.includes("lumbar")||dxLabel.includes("back")||cc.includes("back")||cc.includes("lumbar");
      const isCervical = dxLabel.includes("cervical")||dxLabel.includes("neck")||cc.includes("neck");
      const isKnee = dxLabel.includes("knee")||cc.includes("knee");
      if (isLumbar) return [
        {name:"Pelvic Tilt",sets:"3",reps:"15",hold:"3s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Motor Control",notes:"Flatten lower back against floor. Breathe normally.",target:"Lumbar stabilisers, transversus abdominis",progression:"Progress to dead bug exercise"},
        {name:"Glute Bridge",sets:"3",reps:"12",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 1 -- Motor Control",notes:"Drive through heels, squeeze glutes at top. Maintain neutral spine.",target:"Gluteus maximus, hamstrings, lumbar extensors",progression:"Single-leg bridge when pain-free"},
        {name:"Bird Dog",sets:"3",reps:"10",hold:"5s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Stability",notes:"Opposite arm and leg, maintain neutral spine. No rotation of pelvis.",target:"Multifidus, gluteus maximus, deep core",progression:"Add resistance band around wrists"},
        {name:"Cat-Cow Stretch",sets:"2",reps:"12",hold:"",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Mobility",notes:"Slow controlled movement, breathe throughout. Avoid pain range.",target:"Spinal mobility, paraspinals",progression:""},
      ];
      if (isCervical) return [
        {name:"Chin Tuck (DNF Activation)",sets:"3",reps:"10",hold:"10s",rest:"30s",freq:"3x Daily",phase:"Phase 1 -- Motor Control",notes:"Nod chin down without flexing neck. Feel length at back of neck. Do not use hands.",target:"Deep neck flexors (longus colli/capitis)",progression:"Add finger resistance on chin"},
        {name:"Cervical Rotation Stretch",sets:"3",reps:"5",hold:"20s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Mobility",notes:"Turn head to pain-free side first. Gently assist with hand at end range.",target:"Cervical rotators, SCM",progression:""},
        {name:"Scapular Retraction",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Squeeze shoulder blades together. No shrug or elevation. Keep chin tucked.",target:"Lower and middle trapezius, rhomboids",progression:"Add resistance band"},
        {name:"Levator Scapulae Stretch",sets:"3",reps:"3",hold:"30s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Flexibility",notes:"Ear to shoulder then rotate chin toward armpit. Breathe and relax into stretch.",target:"Levator scapulae, upper trapezius",progression:""},
      ];
      if (isKnee) return [
        {name:"Quad Set",sets:"3",reps:"15",hold:"5s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Activation",notes:"Flatten knee to surface, contract quad hard. Feel thigh muscle tighten.",target:"Quadriceps (VMO focus)",progression:"Straight leg raise"},
        {name:"Short Arc Quad",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 1 -- Strengthening",notes:"Pillow under knee at 90 degrees. Extend to full extension. Slow and controlled.",target:"Quadriceps, VMO",progression:"Add ankle weight (0.5kg)"},
        {name:"Mini Squat (0-45 deg)",sets:"3",reps:"12",hold:"",rest:"60s",freq:"Daily",phase:"Phase 2 -- Functional",notes:"Controlled descent, weight through heels. Stop before pain. Use wall for balance.",target:"Quadriceps, glutes, knee stabilisers",progression:"Increase depth to 60 degrees"},
        {name:"Terminal Knee Extension (TKE)",sets:"3",reps:"15",hold:"",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Band behind knee. Fully extend from 30 degrees flexion. Slow return.",target:"Quadriceps (VMO), knee joint proprioception",progression:"Increase band resistance"},
      ];
      return [
        {name:"Diaphragmatic Breathing",sets:"1",reps:"10",hold:"5s",rest:"",freq:"3x Daily",phase:"Phase 1 -- Foundation",notes:"Belly breathing. Hands on abdomen and chest. Belly should rise first. Exhale fully.",target:"Diaphragm, core activation, pain modulation",progression:""},
        {name:"Transversus Abdominis Activation",sets:"3",reps:"10",hold:"10s",rest:"30s",freq:"2x Daily",phase:"Phase 1 -- Motor Control",notes:"Draw navel gently toward spine. Breathe normally. Do not suck stomach in or hold breath.",target:"Transversus abdominis, pelvic floor",progression:"Add limb loading"},
        {name:"Hip Hinge Pattern",sets:"3",reps:"10",hold:"",rest:"60s",freq:"Daily",phase:"Phase 2 -- Functional",notes:"Hinge at hips, maintain neutral spine. Soft knees. Push hips back. Flat back.",target:"Gluteus maximus, hamstrings, spinal extensors",progression:"Add light weight or resistance band"},
        {name:"Prone Hip Extension",sets:"3",reps:"15",hold:"3s",rest:"45s",freq:"Daily",phase:"Phase 2 -- Strengthening",notes:"Squeeze glute, lift leg 10cm from surface. Maintain neutral pelvis. No rotation.",target:"Gluteus maximus, hamstrings",progression:"Add ankle weight"},
      ];
    }
    return exs;
  };

  const gatherTechniques = () => {
    // ── 1. Real data: tx_techniques array (TreatmentTechniquesModule) ───────
    const txArr = Array.isArray(d.tx_techniques) ? d.tx_techniques : [];
    if (txArr.length > 0) {
      return txArr.map(t => {
        if (t.type === "manual") return {
          name:      t.technique || "Joint Mobilisation",
          area:      [t.region, t.laterality].filter(Boolean).join(" — "),
          duration:  t.dosage || t.duration || "",
          rationale: [t.grade ? `Grade ${t.grade}` : "", t.response || ""].filter(Boolean).join(". "),
        };
        if (t.type === "dn") return {
          name:      `Dry Needling — ${t.dn_muscle || "Muscle"}`,
          area:      [t.laterality, t.dn_depth ? `depth ${t.dn_depth}mm` : ""].filter(Boolean).join(", "),
          duration:  `${t.dn_needles || "1"} needle${t.dn_needles!="1"?"s":""}${t.dn_twitch ? ` · LTR: ${t.dn_twitch}` : ""}`,
          rationale: t.response || t.notes || "Myofascial trigger point release",
        };
        if (t.type === "st") return {
          name:      t.st_technique || "Soft Tissue Therapy",
          area:      t.st_region || t.laterality || "",
          duration:  t.duration || t.dosage || "",
          rationale: t.response || "",
        };
        // fallback for unknown types
        return {
          name:      t.technique || t.name || "Manual Technique",
          area:      t.region || t.area || "",
          duration:  t.dosage || t.duration || "",
          rationale: t.rationale || t.response || "",
        };
      });
    }
    // ── 2. Manual entries: tx_name_1..10 ────────────────────────────────────
    const techs = [];
    for (let i = 1; i <= 10; i++) {
      const name = d[`tx_name_${i}`] || d[`technique_${i}`] || "";
      if (!name) continue;
      techs.push({ name, area: d[`tx_area_${i}`] || "", duration: d[`tx_duration_${i}`] || "", rationale: d[`tx_rationale_${i}`] || "" });
    }
    return techs;
  };

  const buildAssessmentPdf = () => {
    // ── helpers ──────────────────────────────────────────────────────────
    const v  = (k, fb="") => escHtml(d[k] || fb);
    const av = (k) => { const x = d[k]; return Array.isArray(x) ? x : (typeof x === "string" ? x : "").split("|||").filter(Boolean); };
    const hasAny = (...keys) => keys.some(k => d[k] && String(d[k]).trim() !== "");
    const sec = (icon, title, color, body) => `
      <div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;margin-bottom:10px;">
        <div style="background:${color};padding:6px 12px;display:flex;align-items:center;gap:7px;">
          <span style="font-size:14px;">${icon}</span>
          <span style="font-size:11px;font-weight:700;color:#fff;letter-spacing:0.3px;">${title}</span>
        </div>
        <div style="padding:10px 12px;background:#fff;">${body}</div>
      </div>`;
    const fieldRow = (label, value) => value && value !== "--" ? `
      <div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;">
        <span style="font-size:9px;font-weight:600;color:#6b7280;min-width:120px;flex-shrink:0;padding-top:1px;">${label}</span>
        <span style="font-size:10px;color:#1e293b;flex:1;">${value}</span>
      </div>` : "";
    const grid2 = (items) => `<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">${items.join("")}</div>`;
    const miniField = (label, value) => (!value || value === "--") ? "" : `
      <div style="background:#f8fafc;border-radius:6px;padding:6px 8px;border:1px solid #e2e8f0;">
        <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:2px;">${label}</div>
        <div style="font-size:10px;color:#1e293b;font-weight:500;">${value}</div>
      </div>`;
    const tagList = (items, color="#dc2626", bg="#fee2e2") => items.length ? items.map(i =>
      `<span style="display:inline-block;font-size:9px;font-weight:600;padding:2px 7px;border-radius:10px;background:${bg};color:${color};margin:2px 2px 2px 0;">${escHtml(i)}</span>`).join("") : "";
    const badge = (text, color="#dc2626", bg="#fee2e2") =>
      `<span style="font-size:8px;font-weight:700;padding:1px 6px;border-radius:8px;background:${bg};color:${color};white-space:nowrap;">${escHtml(text)}</span>`;
    const testRow = (name, result) => {
      const isPos = /positive|abnormal|restricted|present|reduced|elevated|absent|weak|impaired/i.test(result);
      const isNeg = /negative|normal|full|wn|intact|equal|bilateral/i.test(result);
      const dot = isPos ? `<span style="color:#dc2626;font-weight:800;margin-right:4px;">+</span>` :
                  isNeg ? `<span style="color:#059669;font-weight:800;margin-right:4px;">−</span>` :
                          `<span style="color:#94a3b8;font-weight:800;margin-right:4px;">·</span>`;
      return `<div style="display:flex;gap:4px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        ${dot}
        <span style="font-weight:600;color:#334155;min-width:130px;">${escHtml(name)}</span>
        <span style="color:#64748b;flex:1;">${escHtml(result)}</span>
      </div>`;
    };
    const romRow = (movement, left, right, normal, limitedSide) => {
      if (!left && !right) return "";
      const statusColor = limitedSide ? "#dc2626" : "#059669";
      const statusText  = limitedSide ? `↓ ${limitedSide}` : "WNL";
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${movement}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#1e293b;">${right||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:#94a3b8;">${normal}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;font-weight:700;color:${statusColor};">${statusText}</td>
      </tr>`;
    };
    const mmtRow = (muscle, left, right) => {
      if (!left && !right) return "";
      const low = (v) => v && parseFloat(v) < 5;
      return `<tr style="border-bottom:1px solid #f1f5f9;">
        <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${muscle}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(left)?"#dc2626":"#059669"};font-weight:${low(left)?"700":"400"};">${left||"—"}</td>
        <td style="font-size:9.5px;padding:4px 6px;text-align:center;color:${low(right)?"#dc2626":"#059669"};font-weight:${low(right)?"700":"400"};">${right||"—"}</td>
      </tr>`;
    };

    // ── patient meta ──────────────────────────────────────────────────────
    const patName   = v("dem_name", "Patient");
    const dob       = v("dem_dob");
    const sex       = v("dem_sex");
    const occ       = v("dem_occupation");
    const employer  = v("dem_employer");
    const gp        = v("dem_gp");
    const referral  = v("dem_referral");
    const consent   = v("dem_consent");
    const therapist = v("therapist_name", "___________________");
    const ahpra     = v("therapist_qual", "___________________");
    const clinicAddr = d.clinic_address || "PhysioMind Pro";

    // ── region prefix (for agg/eas) ──────────────────────────────────────
    const regionKey = (() => {
      const r = (d.cc_body_region || "").toLowerCase();
      if (r.includes("lumbar") || r.includes("lower back") || r.includes("lx")) return "lx";
      if (r.includes("cervical") || r.includes("neck") || r.includes("cx")) return "cx";
      if (r.includes("shoulder")) return "sh";
      if (r.includes("knee")) return r.includes("right") ? "knr" : "knl";
      if (r.includes("hip")) return "hip";
      if (r.includes("ankle")) return "ank";
      if (r.includes("elbow")) return "elb";
      if (r.includes("thoracic")) return "tx";
      if (r.includes("wrist")) return "wr";
      return "lx"; // default
    })();

    // ── subjective fields ─────────────────────────────────────────────────
    const cc        = v("cc_main");
    const onset     = v("cc_onset");
    const duration  = v("cc_duration");
    const mechanism = v("cc_mechanism");
    const quality   = v("cc_quality");
    const behaviour = v("cc_24h_pattern") || v("cc_behaviour");
    const vasNow    = v("cc_vas_now");
    const vasWorst  = v("cc_vas_worst");
    const vasBest   = v("cc_vas_best");
    const bodyRegion = v("cc_body_region");

    // aggravating — try region-specific then generic
    const aggMov  = av(`${regionKey}_agg_mov`);
    const aggAct  = av(`${regionKey}_agg_act`);
    const aggPost = av(`${regionKey}_agg_post`);
    const aggAll  = [...aggMov, ...aggAct, ...aggPost];
    const relMov  = av(`${regionKey}_rel_mov`);
    const relPost = av(`${regionKey}_rel_post`);
    const relMed  = av(`${regionKey}_rel_med`);
    const relAll  = [...relMov, ...relPost, ...relMed];

    // red flags
    const rfFields = ["grf_systemic","grf_cancer","grf_fracture","grf_infection","grf_neuro","grf_vascular",
                      `${regionKey}_rf_cauda`,`${regionKey}_rf_fracture`,`${regionKey}_rf_inflammatory`,`${regionKey}_rf_serious`];
    const rfItems = rfFields.flatMap(k => av(k)).filter(x => !/^no /i.test(x) && x.length > 2);
    const rfAction = v("grf_action") || v(`${regionKey}_rf_notes`);
    const yfItems = av(`${regionKey}_yf_beliefs`).concat(av(`${regionKey}_yf_emotion`));

    // PMH
    const pmhConds  = av("pmh_conditions").join(", ") || v("pmh_conditions");
    const pmhMeds   = v("pmh_medications") || v("med_allergies");
    const pmhAllerg = v("med_allergies") || v("pmh_allergies");
    const pmhSurg   = v("pmh_surgical");
    const pmhFam    = v("pmh_family");

    // goals / lifestyle
    const goal      = v("ar_goal_function") || v("goal_main");
    const goalBelief = v("goal_belief") || v("goal_concern");
    const lsExercise = v("ls_exercise");
    const lsSleep    = v("ls_sleep_quality");
    const lsStress   = v("ls_stress");
    const lsWork     = av("ls_occ_demands").join(", ");
    const lsNotes    = v("ls_notes");

    // clinician notes
    const ccNotes  = v("cc_notes");
    const hxNotes  = v("hx_notes");
    const goalNotes = v("goal_notes");

    // ── objective fields ──────────────────────────────────────────────────
    // Observation
    const obsGait    = v("obs_gait");
    const obsPosture = v("obs_posture");
    const obsSwelling = v("obs_swelling");
    const obsWasting = v("obs_muscle_wasting");
    const obsOther   = v("obs_other");

    // Palpation
    const palpTend  = v("palp_tenderness") || v("palp_tender");
    const palpTone  = v("palp_tone") || v("palp_muscle_tone");
    const palpSwel  = v("palp_swelling") || v("palp_swelling_notes");
    const palpOther = v("palp_other") || v("palp_notes");

    // ROM — collect all filled rom_ keys
    const romEntries = [];
    const romPairs = [
      ["Lumbar flexion",   "rom_lx_flex",    "", "lx_flexion",    "", "80°",  ""],
      ["Lumbar extension", "rom_lx_ext",     "", "lx_extension",  "", "25°",  ""],
      ["Lumbar lat flex",  "rom_lx_lat_l",   "rom_lx_lat_r",      "", "25°",  ""],
      ["Cervical flex",    "rom_cx_flex",     "",               "", "50°",  ""],
      ["Cervical ext",     "rom_cx_ext",      "",               "", "60°",  ""],
      ["Cervical rot L",   "rom_cx_rot_l",    "rom_cx_rot_r",   "", "80°",  ""],
      ["Shoulder flex",    "rom_sh_flex_l",   "rom_sh_flex_r",  "", "180°", ""],
      ["Shoulder abd",     "rom_sh_abd_l",    "rom_sh_abd_r",   "", "180°", ""],
      ["Shoulder ER",      "rom_sh_er_l",     "rom_sh_er_r",    "", "90°",  ""],
      ["Shoulder IR",      "rom_sh_ir_l",     "rom_sh_ir_r",    "", "70°",  ""],
      ["Elbow flex",       "rom_elb_flex_l",  "rom_elb_flex_r", "", "145°", ""],
      ["Wrist flex",       "rom_wr_flex_l",   "rom_wr_flex_r",  "", "80°",  ""],
      ["Hip flex",         "rom_hip_flex_l",  "rom_hip_flex_r", "", "120°", ""],
      ["Hip abd",          "rom_hip_abd_l",   "rom_hip_abd_r",  "", "45°",  ""],
      ["Knee flex",        "rom_knee_flex_l", "rom_knee_flex_r","", "140°", ""],
      ["Knee ext",         "rom_knee_ext_l",  "rom_knee_ext_r", "", "0°",   ""],
      ["Ankle DF",         "rom_ankle_df_l",  "rom_ankle_df_r", "", "20°",  ""],
      ["Ankle PF",         "rom_ankle_pf_l",  "rom_ankle_pf_r", "", "50°",  ""],
    ];
    const romRows = romPairs.map(([name, lk, rk, , norm]) => {
      const lv = d[lk] || ""; const rv = d[rk] || "";
      if (!lv && !rv) return "";
      const limited = (lv && /^[0-9]/.test(lv) && parseFloat(lv) < parseFloat(norm)) ? "L" :
                      (rv && /^[0-9]/.test(rv) && parseFloat(rv) < parseFloat(norm)) ? "R" :
                      (lv && /−|lag|limit|restrict/i.test(lv)) ? "L" :
                      (rv && /−|lag|limit|restrict/i.test(rv)) ? "R" : "";
      return romRow(name, lv, rv, norm, limited);
    }).filter(Boolean);

    // MMT
    const mmtPairs = [
      ["Quadriceps",        "mmt_quad_l",      "mmt_quad_r"],
      ["Hamstrings",        "mmt_hams_l",       "mmt_hams_r"],
      ["Glut maximus",      "mmt_glut_max_l",   "mmt_glut_max_r"],
      ["Glut medius",       "mmt_glut_med_l",   "mmt_glut_med_r"],
      ["Hip flexors",       "mmt_hip_flex_l",   "mmt_hip_flex_r"],
      ["Gastroc/soleus",    "mmt_gastroc_l",    "mmt_gastroc_r"],
      ["Tib anterior",      "mmt_tib_ant_l",    "mmt_tib_ant_r"],
      ["EHL (L5)",          "mmt_ehl_l",        "mmt_ehl_r"],
      ["Deltoid",           "mmt_deltoid_l",    "mmt_deltoid_r"],
      ["Rotator cuff",      "mmt_rc_l",         "mmt_rc_r"],
      ["Biceps",            "mmt_biceps_l",     "mmt_biceps_r"],
      ["Triceps",           "mmt_triceps_l",    "mmt_triceps_r"],
      ["Wrist ext",         "mmt_wr_ext_l",     "mmt_wr_ext_r"],
      ["Deep neck flex",    "mmt_dnf_l",        "mmt_dnf_r"],
    ];
    const mmtRows = mmtPairs.map(([name, lk, rk]) => mmtRow(name, d[lk]||"", d[rk]||"")).filter(Boolean);

    // Functional screen
    const fsLabels = {
      kfs_squat:"Double leg squat", kfs_lunge:"Forward lunge", kfs_step_down:"Step down",
      kfs_single_leg:"Single leg squat", kfs_hop:"Single leg hop",
      lfs_flexion:"Lumbar flexion", lfs_extension:"Lumbar extension", lfs_rot:"Lumbar rotation",
      lfs_lateral:"Lateral bend", lfs_squat:"Squat pattern",
      sfs_overhead:"Overhead reach", sfs_push:"Push-up", sfs_pull:"Pull pattern",
      hfs_squat:"Hip single leg squat", hfs_hinge:"Hip hinge", hfs_lunge:"Hip lunge",
      afs_raise:"Calf raise", afs_lunge:"Ankle lunge", afs_hop:"Hop & stick",
    };
    const fsGradeColor = (g) => g >= 2 ? "#dc2626" : g === 1 ? "#d97706" : "#059669";
    const fsGradeLabel = (g) => g >= 2 ? "Abnormal" : g === 1 ? "Compensated" : "Normal";
    const fsScreens = ["kfs_data","lfs_data","sfs_data","hfs_data","afs_data"];
    const fsRows = [];
    fsScreens.forEach(key => {
      if (!d[key]) return;
      try {
        const parsed = typeof d[key] === "string" ? JSON.parse(d[key]) : d[key];
        const grades = parsed.grades || {};
        const notes  = parsed.notes  || {};
        Object.entries(grades).forEach(([id, g]) => {
          const gn = parseInt(g) || 0;
          const label = fsLabels[id] || id.replace(/_/g," ");
          const note  = notes[id] ? escHtml(notes[id]) : "";
          fsRows.push(`<tr style="border-bottom:1px solid #f1f5f9;">
            <td style="font-size:9.5px;padding:4px 6px;color:#334155;">${escHtml(label)}</td>
            <td style="font-size:9px;padding:4px 6px;text-align:center;">
              <span style="font-weight:700;color:${fsGradeColor(gn)};">${gn} — ${fsGradeLabel(gn)}</span>
            </td>
            <td style="font-size:9px;padding:4px 6px;color:#64748b;">${note}</td>
          </tr>`);
        });
      } catch {}
    });

    // Special tests
    const stKeys = Object.keys(d).filter(k => (k.startsWith("st_") || k.startsWith("lx_slr") || k.startsWith("lx_slump") || k.startsWith("lx_kemp")) && d[k] && String(d[k]).trim());
    const stPos = stKeys.filter(k => /positive|abnormal/i.test(d[k]||""));
    const stNeg = stKeys.filter(k => /negative|normal/i.test(d[k]||"") && !/positive/i.test(d[k]||""));
    const stOth = stKeys.filter(k => !stPos.includes(k) && !stNeg.includes(k));
    const stLabel = (k) => k.replace(/^(st_|lx_)/,"").replace(/_/g," ").replace(/\b\w/g,c=>c.toUpperCase());

    // Neurological
    const neuroFields = [
      ["L3 sensation", "n_l3_right", "n_l3_left"],
      ["L4 sensation", "n_l4_right", "n_l4_left"],
      ["L5 sensation", "n_l5_right", "n_l5_left"],
      ["S1 sensation", "n_s1_right", "n_s1_left"],
      ["C5 sensation", "n_c5_right", "n_c5_left"],
      ["C6 sensation", "n_c6_right", "n_c6_left"],
      ["C7 sensation", "n_c7_right", "n_c7_left"],
      ["Patellar reflex",  "n_ref_patella_right",  "n_ref_patella_left"],
      ["Achilles reflex",  "n_ref_achilles_right", "n_ref_achilles_left"],
      ["Biceps reflex",    "n_ref_biceps_right",   "n_ref_biceps_left"],
      ["Triceps reflex",   "n_ref_triceps_right",  "n_ref_triceps_left"],
      ["Babinski",         "n_babinski_right",      "n_babinski_left"],
      ["Neural tension",   "n_slr_right",           "n_slr_left"],
      ["Upper limb tension","n_ultt_right",          "n_ultt_left"],
    ];
    const neuroRows = neuroFields.map(([name, rk, lk]) => {
      const rv = d[rk]||""; const lv = d[lk]||"";
      if (!rv && !lv) return "";
      const val = [rv&&`R: ${rv}`, lv&&`L: ${lv}`].filter(Boolean).join(" · ");
      const abnormal = /reduced|absent|impaired|weak|positive|abnormal/i.test(val);
      return `<div style="display:flex;gap:6px;padding:3px 0;border-bottom:1px solid #f1f5f9;font-size:9.5px;">
        <span style="min-width:120px;font-weight:600;color:#334155;flex-shrink:0;">${name}</span>
        <span style="color:${abnormal?"#dc2626":"#334155"};">${escHtml(val)}</span>
      </div>`;
    }).filter(Boolean);
    // Also check free-text neuro fields
    const neuroNotes = v("neuro_clinician_notes") || v("n_notes");

    // Gait
    const gaitObs   = v("gait_observation") || v("obs_gait");
    const gaitDev   = v("gait_deviations");
    const gaitTrend = v("gait_trendelenburg");
    const gaitStep  = v("gait_step_length");
    const gaitNotes = v("gait_notes");

    // Outcome measures
    const omOdi    = v("om_odi_score")  || v("om_odi");
    const omNdi    = v("om_ndi_score")  || v("om_ndi");
    const omPsfs   = v("om_psfs_score") || v("om_psfs");
    const omDash   = v("om_dash_score") || v("om_dash");
    const omLefs   = v("om_lefs_score") || v("om_lefs");
    const omKoosPain = v("om_koos_pain"); const omKoosSport = v("om_koos_sport"); const omKoosQol = v("om_koos_qol");
    const omReport = d.om_report?.scores || {};

    // Advanced assessment
    const kcNotes   = v("kc_notes");
    const fasc      = v("fa_passive_tension") || v("fa_densification");
    const fascNotes = v("fa_compensation_map") || v("fa_remote_test");
    const nktNotes  = v("nkt_notes");
    const cyriaxNotes = v("cyriax_notes") || v("sttt_notes");

    // Diagnosis
    const dxMain  = v("soap_a_diagnosis") || v("soap_a");
    const dxIcd   = v("soap_icd10");
    const dxAssess = v("soap_assessment");
    const dxList  = dx?.dx || [];

    // ── CSS ───────────────────────────────────────────────────────────────
    const css = `
      *{box-sizing:border-box;margin:0;padding:0;}
      body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
      .page{background:#fff;max-width:860px;margin:0 auto 0;box-shadow:0 4px 40px rgba(0,0,0,0.12);page-break-after:always;}
      .page:last-child{page-break-after:auto;}
      .body{padding:22px 32px 28px;}
      table{width:100%;border-collapse:collapse;}
      th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.7px;padding:6px 6px;text-align:left;border-bottom:1px solid #e2e8f0;}
      @media print{body{background:white;}.page{box-shadow:none;max-width:100%;}}
    `;

    // ── PAGE FOOTER ───────────────────────────────────────────────────────
    const pgFooter = (n, total) => `
      <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:7px 32px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:8px;color:#94a3b8;">PhysioMind Pro · CONFIDENTIAL · Patient: ${escHtml(patName)}</span>
        <span style="font-size:8px;color:#94a3b8;">${today} · Page ${n} of ${total}</span>
      </div>`;

    // ── PAGE 1: DEMOGRAPHICS + SUBJECTIVE ────────────────────────────────
    const page1 = `<div class="page">
      ${pdfHeader("Physiotherapy Assessment Report", "Initial Clinical Evaluation", "#1e3a5f")}
      <div class="body">

        ${sec("👤","Patient details","#334155", `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:6px;">
            ${miniField("Full name", v("dem_name"))}
            ${miniField("Date of birth / Age", dob + (sex ? " · " + sex : ""))}
            ${miniField("Occupation", occ)}
            ${miniField("Referring GP", gp)}
          </div>
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
            ${miniField("Date of assessment", today)}
            ${miniField("Session type", "Initial assessment")}
            ${miniField("Clinician", therapist)}
            ${miniField("AHPRA / Reg no.", ahpra)}
          </div>
        `)}

        ${sec("📋","Chief complaint","#1e3a5f", `
          ${cc && cc !== "--" ? `<div style="border-left:3px solid #1e3a5f;padding:7px 10px;background:#f0f4ff;border-radius:0 6px 6px 0;font-size:10px;font-style:italic;color:#334155;margin-bottom:9px;">"${escHtml(cc)}"</div>` : ""}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${miniField("Body region", bodyRegion)}
            ${miniField("Mechanism / onset", onset)}
            ${miniField("Duration", duration)}
            ${miniField("Pain behaviour", behaviour || quality)}
          </div>
        `)}

        ${sec("📊","Pain scores (NRS /10)","#991b1b", `
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
            <div style="background:#fef2f2;border-radius:8px;padding:10px;text-align:center;border:1px solid #fecaca;">
              <div style="font-size:26px;font-weight:700;color:#dc2626;line-height:1;">${vasNow||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Current</div>
            </div>
            <div style="background:#f5f3ff;border-radius:8px;padding:10px;text-align:center;border:1px solid #ddd6fe;">
              <div style="font-size:26px;font-weight:700;color:#7c3aed;line-height:1;">${vasWorst||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Worst</div>
            </div>
            <div style="background:#f0fdf4;border-radius:8px;padding:10px;text-align:center;border:1px solid #bbf7d0;">
              <div style="font-size:26px;font-weight:700;color:#059669;line-height:1;">${vasBest||"—"}</div>
              <div style="font-size:8.5px;color:#94a3b8;margin-top:3px;text-transform:uppercase;letter-spacing:0.5px;">Best</div>
            </div>
          </div>
        `)}

        ${(aggAll.length > 0 || relAll.length > 0) ? sec("⬆️","Aggravating & easing factors","#78350f", `
          ${aggAll.length ? `<div style="margin-bottom:8px;"><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Aggravating</div>${tagList(aggAll,"#991b1b","#fee2e2")}</div>` : ""}
          ${relAll.length ? `<div><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:5px;">Easing</div>${tagList(relAll,"#166534","#dcfce7")}</div>` : ""}
        `) : ""}

        ${sec("🚩","Red & yellow flags","#991b1b", `
          <div style="margin-bottom:6px;">
            ${rfItems.length > 0
              ? `<div style="font-size:8.5px;font-weight:700;color:#991b1b;margin-bottom:4px;">Red flags identified:</div>${tagList(rfItems,"#991b1b","#fee2e2")}`
              : `<span style="font-size:9.5px;color:#059669;font-weight:600;">✓ No red flags identified — safe to proceed</span>`
            }
          </div>
          ${yfItems.length ? `<div><div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Yellow flags</div>${tagList(yfItems,"#854d0e","#fef9c3")}</div>` : ""}
          ${rfAction && rfAction !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;">${rfAction}</div>` : ""}
        `)}

        ${sec("🏥","Past medical history & medications","#4c1d95", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${miniField("Medical history", pmhConds)}
            ${miniField("Current medications", pmhMeds)}
            ${miniField("Allergies", pmhAllerg)}
            ${miniField("Previous surgery", pmhSurg)}
            ${miniField("Family history", pmhFam)}
            ${miniField("Previous physiotherapy", v("hx_previous_injury") || v("hx_providers"))}
          </div>
          ${hxNotes && hxNotes !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;padding:5px 8px;background:#f8fafc;border-radius:5px;border:1px solid #e2e8f0;">${hxNotes}</div>` : ""}
        `)}

        ${sec("🎯","Goals & lifestyle","#0f6e56", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
            ${miniField("Patient goal", goal)}
            ${miniField("Patient belief / concern", goalBelief)}
            ${miniField("Exercise", lsExercise)}
            ${miniField("Sleep quality", lsSleep)}
            ${miniField("Stress level", lsStress)}
            ${miniField("Work demands", lsWork)}
          </div>
          ${lsNotes && lsNotes !== "--" ? `<div style="font-size:9px;color:#64748b;padding:5px 8px;background:#f0fdf4;border-radius:5px;border:1px solid #bbf7d0;">${lsNotes}</div>` : ""}
          ${goalNotes && goalNotes !== "--" ? `<div style="font-size:9px;color:#64748b;margin-top:4px;padding:5px 8px;background:#f0fdf4;border-radius:5px;border:1px solid #bbf7d0;">${goalNotes}</div>` : ""}
        `)}

        ${ccNotes && ccNotes !== "--" ? sec("📝","Clinician notes — subjective","#334155", `<div style="font-size:10px;color:#334155;line-height:1.6;">${ccNotes}</div>`) : ""}

      </div>
      ${pgFooter(1, 2)}
    </div>`;

    // ── PAGE 2: OBJECTIVE FINDINGS ────────────────────────────────────────
    const obsHasData = hasAny("obs_gait","obs_posture","obs_swelling","obs_muscle_wasting","obs_other");
    const palpHasData = hasAny("palp_tenderness","palp_tender","palp_tone","palp_muscle_tone","palp_swelling","palp_notes","palp_other");
    const romHasData  = romRows.length > 0;
    const mmtHasData  = mmtRows.length > 0;
    const fsHasData   = fsRows.length > 0;
    const stHasData   = stKeys.length > 0;
    const neuroHasData = neuroRows.length > 0 || neuroNotes !== "--";
    const gaitHasData = hasAny("gait_observation","obs_gait","gait_deviations","gait_notes");
    const omHasData   = hasAny("om_odi_score","om_odi","om_ndi_score","om_ndi","om_psfs_score","om_lefs_score","om_koos_pain","om_koos_sport");
    const advHasData  = hasAny("kc_notes","fa_passive_tension","fa_densification","fa_compensation_map","nkt_notes","cyriax_notes","sttt_notes");

    const page2 = `<div class="page">
      ${pdfHeader("Objective Findings", "Assessment & Advanced Assessment", "#0f6e56")}
      <div class="body">

        ${(obsHasData || palpHasData) ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          ${obsHasData ? sec("👁️","Observation","#334155", `
            ${obsGait    && obsGait    !== "--" ? fieldRow("Gait", obsGait) : ""}
            ${obsPosture && obsPosture !== "--" ? fieldRow("Posture", obsPosture) : ""}
            ${obsSwelling && obsSwelling !== "--" ? fieldRow("Swelling", obsSwelling) : ""}
            ${obsWasting && obsWasting !== "--" ? fieldRow("Muscle wasting", obsWasting) : ""}
            ${obsOther   && obsOther   !== "--" ? fieldRow("Other", obsOther) : ""}
          `) : ""}
          ${palpHasData ? sec("🖐️","Palpation","#334155", `
            ${palpTend  && palpTend  !== "--" ? fieldRow("Tenderness", palpTend) : ""}
            ${palpTone  && palpTone  !== "--" ? fieldRow("Muscle tone", palpTone) : ""}
            ${palpSwel  && palpSwel  !== "--" ? fieldRow("Swelling", palpSwel) : ""}
            ${palpOther && palpOther !== "--" ? fieldRow("Other", palpOther) : ""}
          `) : ""}
        </div>` : ""}

        ${romHasData ? sec("📐","Range of motion","#0f6e56", `
          <table><thead><tr>
            <th style="width:35%">Movement</th>
            <th style="width:15%;text-align:center;">Left</th>
            <th style="width:15%;text-align:center;">Right</th>
            <th style="width:15%;text-align:center;">Normal</th>
            <th style="width:20%;text-align:center;">Status</th>
          </tr></thead><tbody>${romRows.join("")}</tbody></table>
        `) : ""}

        ${(mmtHasData || fsHasData) ? `
        <div style="display:grid;grid-template-columns:${mmtHasData && fsHasData ? "1fr 1fr" : "1fr"};gap:10px;">
          ${mmtHasData ? sec("💪","Manual muscle testing (MMT)","#1e3a5f", `
            <table><thead><tr>
              <th>Muscle</th>
              <th style="text-align:center;">L</th>
              <th style="text-align:center;">R</th>
            </tr></thead><tbody>${mmtRows.join("")}</tbody></table>
          `) : ""}
          ${fsHasData ? sec("🏃","Functional movement screen","#14532d", `
            <table><thead><tr>
              <th>Test</th>
              <th style="width:120px;">Grade</th>
              <th>Notes</th>
            </tr></thead><tbody>${fsRows.join("")}</tbody></table>
          `) : ""}
        </div>` : ""}

        ${stHasData ? sec("🔬","Special tests","#78350f", `
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px;">
            <div>
              ${stPos.length ? `<div style="font-size:8.5px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Positive</div>
              ${stPos.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
              ${stOth.length ? `<div style="font-size:8.5px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;margin:6px 0 4px;">Other findings</div>
              ${stOth.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
            </div>
            <div>
              ${stNeg.length ? `<div style="font-size:8.5px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Negative</div>
              ${stNeg.map(k => testRow(stLabel(k), d[k]||"")).join("")}` : ""}
            </div>
          </div>
        `) : ""}

        ${neuroHasData ? sec("⚡","Neurological findings","#312e81", `
          ${neuroRows.join("")}
          ${neuroNotes && neuroNotes !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#64748b;padding:5px 8px;background:#eef2ff;border-radius:5px;">${neuroNotes}</div>` : ""}
        `) : ""}

        ${gaitHasData ? sec("🚶","Gait analysis","#1e3a5f", `
          ${gaitObs  && gaitObs  !== "--" ? fieldRow("Observation", gaitObs) : ""}
          ${gaitDev  && gaitDev  !== "--" ? fieldRow("Deviations", gaitDev) : ""}
          ${gaitTrend && gaitTrend !== "--" ? fieldRow("Trendelenburg", gaitTrend) : ""}
          ${gaitStep && gaitStep !== "--" ? fieldRow("Step length", gaitStep) : ""}
          ${gaitNotes && gaitNotes !== "--" ? fieldRow("Notes", gaitNotes) : ""}
        `) : ""}

        ${omHasData ? sec("📈","Outcome measures","#0f6e56", `
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">
            ${omOdi   && omOdi   !== "--" ? `<div style="text-align:center;background:#fef2f2;border-radius:8px;padding:8px 4px;border:1px solid #fecaca;"><div style="font-size:18px;font-weight:700;color:#dc2626;">${omOdi}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">ODI</div></div>` : ""}
            ${omNdi   && omNdi   !== "--" ? `<div style="text-align:center;background:#fef2f2;border-radius:8px;padding:8px 4px;border:1px solid #fecaca;"><div style="font-size:18px;font-weight:700;color:#dc2626;">${omNdi}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">NDI</div></div>` : ""}
            ${omLefs  && omLefs  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omLefs}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">LEFS</div></div>` : ""}
            ${omPsfs  && omPsfs  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omPsfs}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">PSFS</div></div>` : ""}
            ${omDash  && omDash  !== "--" ? `<div style="text-align:center;background:#fffbeb;border-radius:8px;padding:8px 4px;border:1px solid #fde68a;"><div style="font-size:18px;font-weight:700;color:#d97706;">${omDash}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">DASH</div></div>` : ""}
            ${omKoosPain && omKoosPain !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosPain}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS Pain</div></div>` : ""}
            ${omKoosSport && omKoosSport !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosSport}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS Sport</div></div>` : ""}
            ${omKoosQol && omKoosQol !== "--" ? `<div style="text-align:center;background:#f0fdf4;border-radius:8px;padding:8px 4px;border:1px solid #bbf7d0;"><div style="font-size:18px;font-weight:700;color:#059669;">${omKoosQol}</div><div style="font-size:8px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.4px;margin-top:2px;">KOOS QoL</div></div>` : ""}
          </div>
          ${Object.keys(omReport).length ? `<div style="margin-top:8px;font-size:9px;color:#64748b;">${Object.entries(omReport).map(([k,v2])=>`<b>${k.toUpperCase()}</b>: ${v2}`).join(" · ")}</div>` : ""}
        `) : ""}

        ${advHasData ? sec("🔭","Advanced assessment","#4c1d95", `
          ${kcNotes && kcNotes !== "--" ? fieldRow("Kinetic chain", kcNotes) : ""}
          ${fascNotes && fascNotes !== "--" ? fieldRow("Fascia / SBL", fascNotes) : ""}
          ${nktNotes && nktNotes !== "--" ? fieldRow("CPA / NKT pattern", nktNotes) : ""}
          ${cyriaxNotes && cyriaxNotes !== "--" ? fieldRow("STTT / Cyriax", cyriaxNotes) : ""}
        `) : ""}

        ${(dxMain && dxMain !== "--") || dxList.length > 0 ? sec("🩺","Clinical diagnosis","#1e3a5f", `
          ${dxList.length > 0 ? dxList.slice(0,4).map((dx2, i) => `
            <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-bottom:1px solid #f1f5f9;">
              <div style="width:18px;height:18px;border-radius:50%;background:${["#1e3a5f","#334155","#475569","#64748b"][i]};display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;">${i+1}</div>
              <div>
                <div style="font-size:10.5px;font-weight:700;color:#1e293b;">${escHtml(dx2.diagnosis||"")}</div>
                <div style="font-size:8.5px;color:#64748b;margin-top:1px;">${dx2.icd10||""} ${dx2.confidence ? "· Confidence: " + Math.round(dx2.confidence) + "%" : ""}</div>
              </div>
            </div>`).join("") : ""}
          ${dxMain && dxMain !== "--" ? `<div style="margin-top:8px;font-size:10px;color:#334155;line-height:1.6;padding:8px;background:#f0f4ff;border-radius:6px;">${dxMain}</div>` : ""}
          ${dxIcd  && dxIcd  !== "--" ? `<div style="margin-top:4px;font-size:9px;color:#64748b;">ICD-10: ${dxIcd}</div>` : ""}
          ${dxAssess && dxAssess !== "--" ? `<div style="margin-top:6px;font-size:9px;color:#334155;line-height:1.6;">${dxAssess}</div>` : ""}
        `) : ""}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;padding:8px 4px;margin-top:4px;">
          <div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:18px;">Physiotherapist signature:</div>
            <div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div>
            <div style="font-size:8px;color:#94a3b8;">Name · AHPRA registration no. · Date</div>
          </div>
          <div>
            <div style="font-size:9px;color:#94a3b8;margin-bottom:18px;">Next review / follow-up:</div>
            <div style="border-bottom:1px solid #334155;height:20px;margin-bottom:4px;"></div>
            <div style="font-size:8px;color:#94a3b8;">Date · Treating clinician · Location</div>
          </div>
        </div>

      </div>
      ${pgFooter(2, 2)}
    </div>`;

    return `<!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Assessment Report — ${escHtml(patName)}</title>
      <style>${css}</style>
    </head><body>${page1}${page2}</body></html>`;
  };


  const buildTreatmentPdf = () => {
    const exercises = gatherExercises();
    const techniques = gatherTechniques();
    const sessions = Array.isArray(d.tx_sessions) ? [...d.tx_sessions] : [];
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Musculoskeletal Dysfunction");
    const phaseColors = {"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const groupedExercises = exercises.reduce((acc, ex) => { const p = ex.phase || "Phase 1"; if(!acc[p]) acc[p]=[]; acc[p].push(ex); return acc; }, {});
    const svgKeys = Object.keys(exerciseSvgs);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Treatment Plan - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Physiotherapy Treatment Plan","Evidence-Based Clinical Management Program","#059669")}
<div class="body">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:20px;">
    <div style="background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#059669;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Patient Details</div>${[["Patient",escHtml(patName)],["DOB / Age",`${escHtml(dob)} / ${escHtml(String(age))}`],["Sex",escHtml(sex)],["Occupation",escHtml(occ)]].map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(5,150,105,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</span></div>`).join("")}</div>
    <div style="background:rgba(37,99,235,0.06);border:1px solid rgba(37,99,235,0.2);border-radius:10px;padding:14px 16px;"><div style="font-size:9px;font-weight:700;color:#2563eb;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Working Diagnosis &amp; Plan</div><div style="font-size:13px;font-weight:800;color:#1a3a5c;margin-bottom:8px;line-height:1.3;">${dxLabel}</div>${[["Pain (VAS Now)",(d.pa_vas_now||d.cc_vas_now||"--")+"/10"],["Treatment Frequency",d.tx_frequency||d.soap_frequency||"2&ndash;3x per week"],["Expected Duration",d.tx_duration_plan||d.tx_plan_duration||"6&ndash;8 wks"],["Sessions Planned",d.tx_plan_sessions||d.plan_sessions||"--"],["Sessions Done",String(sessions.length)||"0"],["Plan Start",d.tx_plan_start||"--"]].filter(([,v])=>v&&v!=="--").map(([l,v])=>`<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(37,99,235,0.1);"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(String(v))}</span></div>`).join("")}</div>
  </div>
  ${sectionCard("Treatment Goals","&#127919;",`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;">${[
    ["Short-Term (2&ndash;4 wks)","#0891b2",[d.ar_goal_pain||"Pain reduction &ge;30% on VAS",d.ar_goal_function||"Improve functional ROM","Reduce swelling/inflammation"]],
    ["Medium-Term (4&ndash;8 wks)","#2563eb",[d.ar_goal_str||"Restore muscle strength to 4+/5",d.ar_goal_func||"Functional task independence","Return to work/leisure activities"]],
    ["Long-Term (8&ndash;12 wks)","#059669",[d.ar_goal_return||"Full return to prior activity","Self-management strategies","Prevent recurrence"]],
  ].map(([title,color,goals])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:8px;padding:12px;"><div style="font-size:9px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;">${title}</div>${goals.map(g=>`<div style="font-size:9.5px;color:#1a3a5c;padding:4px 0;border-bottom:1px solid ${color}15;display:flex;gap:6px;align-items:flex-start;"><span style="color:${color};font-weight:700;flex-shrink:0;">&#10003;</span><span>${escHtml(String(g))}</span></div>`).join("")}</div>`).join("")}</div>`,"#059669")}
  ${sectionCard("Manual Therapy &amp; Treatment Techniques","&#129330;",`<table><thead><tr><th>Technique</th><th>Target Area</th><th>Duration / Dosage</th><th>Evidence Base</th></tr></thead><tbody>${techniques.length>0?techniques.map(t=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${escHtml(t.name)}</td><td style="font-size:10px;">${escHtml(t.area)}</td><td style="font-size:10px;">${escHtml(t.duration)}</td><td style="font-size:9.5px;color:#6b7280;">${escHtml(t.rationale)}</td></tr>`).join(""):
[["Soft Tissue Mobilisation","Hypertonic muscles / trigger points","5&ndash;10 min per area","Level 1A &mdash; Cochrane Review"],["Joint Mobilisation (Grade III&ndash;IV)","Restricted articular joint segments","3 sets PA pressure","Level 1B &mdash; RCT evidence"],["Therapeutic Ultrasound","Periarticular / tendon tissue","1MHz, 1.0 W/cm&sup2;, 5 min","Level 2B"],["Dry Needling / IMS","Myofascial trigger points","As clinically indicated","Level 1B &mdash; multiple RCTs"],["Taping (Kinesio / Rigid)","Joint support / proprioception","72 hrs per application","Level 2"],["TENS / Electrotherapy","Pain modulation (gate control)","80Hz, 20 min","Level 2B &mdash; analgesic effect"],].map(([tech,target,dose,ev])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${tech}</td><td style="font-size:10px;">${target}</td><td style="font-size:10px;">${dose}</td><td style="font-size:9px;color:#6b7280;">${ev}</td></tr>`).join("")}</tbody></table>`,"#d97706")}
  ${Object.entries(groupedExercises).map(([phase,exs])=>{const pColor=phaseColors[phase]||"#2563eb";return sectionCard(`Exercise Prescription &mdash; ${phase}`,"&#127959;",`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:12px;">${exs.map((ex,i)=>{const svgType=svgKeys[i%svgKeys.length];return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;"><div style="background:${pColor}10;border-bottom:1px solid ${pColor}20;padding:8px 12px;display:flex;align-items:center;gap:8px;"><span style="width:22px;height:22px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</span><span style="font-size:11px;font-weight:700;color:#1a3a5c;">${escHtml(ex.name)}</span></div><div style="padding:10px 12px;"><div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px;">${[["Sets",ex.sets],["Reps",ex.reps],ex.hold?["Hold",ex.hold]:null,["Rest",ex.rest],["Frequency",ex.freq]].filter(Boolean).map(([l,v])=>`<div style="background:#fff;border:1px solid #e2e8f0;border-radius:6px;padding:5px 8px;text-align:center;"><div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:700;color:${pColor};">${escHtml(v)}</div></div>`).join("")}</div>${ex.target?`<div style="font-size:8.5px;color:#0891b2;margin-bottom:4px;"><strong>Target:</strong> ${escHtml(ex.target)}</div>`:""}${ex.notes?`<div style="background:#fff;border-radius:6px;padding:6px 8px;font-size:8.5px;color:#6b7280;line-height:1.5;border:1px solid #e2e8f0;">${escHtml(ex.notes)}</div>`:""}${ex.progression?`<div style="margin-top:5px;font-size:8px;color:#059669;"><strong>&#11014; Progression:</strong> ${escHtml(ex.progression)}</div>`:""}</div></div>`;}).join("")}</div>`,pColor);}).join("")}
  ${(()=>{
    const vasBaseline = sessions.length>0 ? (parseFloat(sessions[sessions.length-1].vasStart)||0) : (parseFloat(d.pa_vas_now||d.cc_vas_now)||0);
    const vasNow      = sessions.length>0 ? (parseFloat(sessions[0].vasEnd||sessions[0].vasStart)||0) : vasBaseline;
    const targetVas   = Math.max(0, vasBaseline-3);
    const psfsNow     = d.om_psfs1_now||d.psfs_score||"";
    const psfsGoal    = d.om_psfs1_goal||"7";
    const vasDiff     = vasBaseline - vasNow;
    const vasPct      = vasBaseline>0 ? Math.round((vasDiff/vasBaseline)*100) : 0;
    const progColor   = vasDiff>0?"#059669":vasDiff<0?"#dc2626":"#6b7280";
    const sessionRows = sessions.length>0
      ? sessions.slice().reverse().map((s,i)=>{
          const vs=parseFloat(s.vasStart||"0")||0, ve=parseFloat(s.vasEnd||s.vasStart||"0")||0;
          const vc=vs-ve, vCol=vc>0?"#059669":vc<0?"#dc2626":"#6b7280";
          const arrow=vc>0?"&#9660;":vc<0?"&#9650;":"&harr;";
          const tx=String(s.treatmentGiven||s.treatment||""); const txShort=tx.slice(0,65)+(tx.length>65?"…":"");
          const resp=String(s.response||""); const respShort=resp.slice(0,60)+(resp.length>60?"…":"");
          return `<tr style="background:${i%2===0?"#fff":"#f8fafc"};border-bottom:1px solid #e2e8f0;">
            <td style="font-size:9px;font-weight:700;color:#2563eb;padding:6px 8px;white-space:nowrap;">S${escHtml(String(s.sessionNo||i+1))}</td>
            <td style="font-size:9px;color:#6b7280;padding:6px 8px;white-space:nowrap;">${escHtml(s.date||"")}</td>
            <td style="font-size:9px;padding:6px 8px;white-space:nowrap;"><span style="font-weight:700;color:#dc2626;">${vs}/10</span> <span style="color:${vCol};font-weight:700;">${arrow}</span> <span style="font-weight:700;color:${vCol};">${ve}/10</span></td>
            <td style="font-size:9px;color:#374151;padding:6px 8px;">${escHtml(txShort)}</td>
            <td style="font-size:8.5px;color:#6b7280;padding:6px 8px;">${escHtml(respShort)}</td>
          </tr>`;
        }).join("")
      : `<tr><td colspan="5" style="text-align:center;padding:16px;font-size:9px;color:#94a3b8;">No sessions logged yet — use Quick Visit to record each treatment session.</td></tr>`;
    return sectionCard("Outcome Measures &amp; Session Log","&#128200;",`
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;">
        <div>
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Baseline &amp; Target</div>
          <table><thead><tr><th>Measure</th><th>Baseline</th><th>Target</th></tr></thead><tbody>
            ${[["VAS Pain",vasBaseline?vasBaseline+"/10":"--",vasBaseline?"&le;"+targetVas+"/10":"--"],["VAS Worst",d.pa_vas_worst?d.pa_vas_worst+"/10":"--","&le;5/10"],["PSFS Score",psfsNow?psfsNow+"/10":"--",psfsNow?"&ge;"+psfsGoal+"/10":"--"],["Patient Goal",escHtml(d.ar_goal_function||d.ar_goal_pain||"--"),"Achieved"]].filter(([,b])=>b&&b!=="--").map(([m,b,t])=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;padding:5px 6px;">${m}</td><td style="font-size:9px;font-weight:700;color:#dc2626;padding:5px 6px;">${b}</td><td style="font-size:9px;font-weight:700;color:#059669;padding:5px 6px;">${t}</td></tr>`).join("")}
          </tbody></table>
        </div>
        <div>
          <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Progress Summary</div>
          <div style="background:#f8fafc;border-radius:8px;padding:10px 12px;border:1px solid #e2e8f0;">
            ${[["Sessions Completed",String(sessions.length),"#1a3a5c"],["VAS Baseline",vasBaseline?vasBaseline+"/10":"Not recorded","#dc2626"],["VAS Current",vasNow&&sessions.length?vasNow+"/10":"Not recorded",progColor],["Pain Change",sessions.length&&vasBaseline?(vasDiff>=0?"-":"+")+(Math.abs(vasPct))+"%":"--",progColor]].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid #e2e8f0;"><span style="font-size:9px;color:#6b7280;">${l}</span><span style="font-size:10px;font-weight:700;color:${c};">${v}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:8px;">Session History</div>
      <div style="overflow-x:auto;"><table style="min-width:600px;"><thead><tr><th style="width:40px;">Sess.</th><th style="width:75px;">Date</th><th style="width:110px;">Pain (Start&#8594;End)</th><th>Treatment Given</th><th style="width:160px;">Response</th></tr></thead>
        <tbody>${sessionRows}</tbody>
      </table></div>
    `,"#0891b2");
  })()}
  <div style="margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;"><div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Therapist Signature:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Name / AHPRA: ___________________</div></div><div><div style="font-size:9px;color:#6b7280;margin-bottom:24px;">Date:</div><div style="border-bottom:1px solid #1a3a5c;width:80%;margin-bottom:4px;height:24px;"></div><div style="font-size:9px;color:#6b7280;">Review Date: ___________________</div></div></div>
</div>
${pdfFooter("Treatment Plan")}
</div></body></html>`;
  };

  const buildHomeExercisePdf = () => {
    const exercises = gatherExercises();
    const dxLabel = escHtml(dx?.dx?.[0]?.label || d.cc_main || "Your Condition");
    const nextAppt = d.next_appointment || "_______________________";
    const physioName = d.therapist_name || "Your Physiotherapist";
    const clinicName = d.clinic_name || "PhysioMind Clinic";
    const clinicPhone = d.clinic_phone || "";
    const svgKeys = Object.keys(exerciseSvgs);
    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Program - ${escHtml(patName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:24px 36px;}.ex-card{background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:16px;break-inside:avoid;box-shadow:0 2px 8px rgba(0,0,0,0.05);}.ex-body{display:grid;grid-template-columns:130px 1fr;}.ex-img{background:#f8fafc;padding:12px;display:flex;align-items:center;justify-content:center;border-right:1px solid #e2e8f0;}.ex-content{padding:14px 16px;}.dosage-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(75px,1fr));gap:8px;margin-bottom:10px;}.dosage-chip{text-align:center;padding:7px 6px;border-radius:8px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:8px 10px;text-align:left;}td{padding:7px 10px;font-size:10.5px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>
</head><body><div class="page">
${pdfHeader("Home Exercise Program","Your Personalised Daily Rehabilitation Protocol","#7c3aed")}
<div class="body">
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-bottom:20px;display:flex;gap:16px;align-items:flex-start;">
    <div style="font-size:28px;flex-shrink:0;">&#127968;</div>
    <div><div style="font-size:14px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">Hello, ${escHtml(patName.split(" ")[0]||patName)}!</div><div style="font-size:10.5px;color:#6b7280;line-height:1.6;">This personalised home exercise program has been designed specifically for you by <strong style="color:#1a3a5c;">${escHtml(physioName)}</strong> to help manage <strong style="color:#7c3aed;">${dxLabel}</strong>. Performing these exercises consistently is essential for your recovery.</div><div style="margin-top:8px;display:flex;gap:10px;flex-wrap:wrap;">${[["&#128197;","Program Start",today],["&#128222;","Next Appointment",escHtml(nextAppt)],["&#127973;","Clinic",escHtml(clinicName)]].map(([icon,l,v])=>`<div style="display:flex;align-items:center;gap:6px;padding:5px 10px;background:#fff;border:1px solid #e2e8f0;border-radius:8px;"><span>${icon}</span><div><div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;">${l}</div><div style="font-size:10px;font-weight:600;color:#1a3a5c;">${v}</div></div></div>`).join("")}</div></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:20px;">${[
    ["&#128680;","Stop if you feel...","Sharp or shooting pain &bull; Numbness / tingling &bull; Sudden severe pain &bull; Dizziness or nausea","#dc2626"],
    ["&#9989;","Good pain is OK","Mild muscle ache/burn = normal. This means your muscles are working. Soreness lasting &lt;24h is acceptable.","#059669"],
    ["&#128222;","When to call us",`Contact ${escHtml(clinicName)} if symptoms worsen significantly. Do not push through severe pain.${clinicPhone?" Ph: "+escHtml(clinicPhone):""}`, "#2563eb"],
  ].map(([icon,title,text,color])=>`<div style="background:${color}06;border:1px solid ${color}25;border-radius:10px;padding:12px 14px;"><div style="font-size:18px;margin-bottom:6px;">${icon}</div><div style="font-size:10px;font-weight:700;color:${color};margin-bottom:5px;">${title}</div><div style="font-size:9px;color:#6b7280;line-height:1.5;">${text}</div></div>`).join("")}</div>
  <div style="margin-bottom:14px;font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:0.8px;border-bottom:2px solid #7c3aed;padding-bottom:8px;">Your Exercises &mdash; ${exercises.length} Total</div>
  ${exercises.map((ex,i)=>{
    const phaseColors2={"Phase 1":"#0891b2","Phase 2":"#7c3aed","Phase 3":"#059669","Phase 4":"#d97706","Phase 1 -- Motor Control":"#0891b2","Phase 1 -- Mobility":"#0891b2","Phase 1 -- Activation":"#0891b2","Phase 1 -- Flexibility":"#0891b2","Phase 2 -- Stability":"#7c3aed","Phase 2 -- Strengthening":"#7c3aed","Phase 2 -- Functional":"#7c3aed","Phase 3 -- Functional":"#059669"};
    const pColor=phaseColors2[ex.phase]||"#7c3aed";
    const svgType=svgKeys[i%svgKeys.length];
    const steps=ex.notes?[ex.notes]:["Get into the starting position as shown in the illustration.","Move slowly and in a controlled manner throughout.","Hold for the time indicated, then return to start position.","Breathe normally throughout &mdash; do not hold your breath."];
    return `<div class="ex-card">
      <div style="background:linear-gradient(135deg,${pColor}15,${pColor}05);border-bottom:1px solid ${pColor}30;padding:12px 16px;display:flex;align-items:center;gap:12px;">
        <div style="width:32px;height:32px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;flex-shrink:0;">${i+1}</div>
        <div style="flex:1;"><div style="font-size:13px;font-weight:800;color:#1a3a5c;">${escHtml(ex.name)}</div><div style="display:flex;gap:6px;margin-top:3px;flex-wrap:wrap;"><span style="display:inline-block;padding:3px 8px;background:${pColor}15;border:1px solid ${pColor}40;border-radius:5px;font-size:9px;font-weight:700;color:${pColor};">${escHtml(ex.phase||"Phase 1")}</span>${ex.target?`<span style="display:inline-block;padding:3px 8px;background:#0891b215;border:1px solid #0891b240;border-radius:5px;font-size:9px;font-weight:700;color:#0891b2;">${escHtml(ex.target)}</span>`:""}</div></div>
        <div style="text-align:right;"><div style="font-size:9px;color:#6b7280;">Frequency</div><div style="font-size:12px;font-weight:800;color:${pColor};">${escHtml(ex.freq||"Daily")}</div></div>
      </div>
      <div class="ex-body">
        <div class="ex-img">${exerciseSvgHtml(i, pColor)}</div>
        <div class="ex-content">
          <div class="dosage-grid">${[["Sets",ex.sets,pColor],["Reps",ex.reps,"#2563eb"],ex.hold?["Hold",ex.hold,"#0891b2"]:null,["Rest",ex.rest||"30s","#6b7280"]].filter(Boolean).map(([l,v,c])=>`<div class="dosage-chip" style="background:${c}10;border:1px solid ${c}30;"><div style="font-size:7.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px;">${l}</div><div style="font-size:14px;font-weight:800;color:${c};line-height:1.2;">${escHtml(v)}</div></div>`).join("")}</div>
          <div style="margin-bottom:8px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:6px;">Instructions</div>${steps.map((step,si)=>`<div style="display:flex;gap:10px;padding:6px 0;border-bottom:1px solid #e2e8f0;align-items:flex-start;font-size:10px;line-height:1.5;"><div style="width:20px;height:20px;min-width:20px;background:${pColor};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#fff;">${si+1}</div><span style="color:#1a3a5c;">${escHtml(step)}</span></div>`).join("")}</div>
          ${ex.progression?`<div style="margin-top:6px;padding:6px 10px;background:rgba(5,150,105,0.06);border:1px solid rgba(5,150,105,0.15);border-radius:6px;font-size:8.5px;"><strong style="color:#059669;">&#11014; When easier, progress to:</strong> ${escHtml(ex.progression)}</div>`:""}
        </div>
      </div>
    </div>`;
  }).join("")}
  ${sectionCard("Weekly Compliance Tracker","&#128197;",`<div style="margin-bottom:8px;font-size:10px;color:#6b7280;">Tick each day you complete your exercises. Aim for consistency!</div><table><thead><tr style="background:#f1f5f9;"><th style="width:35%;">Exercise</th>${["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(day=>`<th style="text-align:center;font-size:9px;font-weight:700;color:#6b7280;">${day}</th>`).join("")}</tr></thead><tbody>${exercises.map((ex,i)=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:10px;font-weight:600;color:#1a3a5c;">${i+1}. ${escHtml(ex.name)}</td>${Array(7).fill(0).map(()=>`<td style="text-align:center;padding:8px;"><div style="width:22px;height:22px;border:1.5px solid #e2e8f0;border-radius:4px;margin:0 auto;"></div></td>`).join("")}</tr>`).join("")}</tbody></table><div style="margin-top:12px;font-size:9px;color:#6b7280;">Pain Score Today (0&ndash;10): ___ / 10 &nbsp;&nbsp;&nbsp; Overall feeling: &#9633; Great &nbsp; &#9633; OK &nbsp; &#9633; Struggling</div>`,"#0891b2")}
  ${sectionCard("7-Day Pain Diary","&#128212;",`<div style="font-size:9px;color:#6b7280;margin-bottom:10px;">Record your pain and how you are feeling each day. Bring this to your next appointment.</div><table><thead><tr><th>Date</th><th>Morning Pain (0&ndash;10)</th><th>Evening Pain (0&ndash;10)</th><th>Exercises Done?</th><th>Notes</th></tr></thead><tbody>${Array(7).fill(0).map((_,i)=>`<tr style="border-bottom:1px solid #e2e8f0;"><td style="font-size:9px;color:#94a3b8;padding:10px;">Day ${i+1}</td><td style="padding:10px;"><div style="width:60px;border-bottom:1px solid #e2e8f0;height:18px;"></div></td><td style="padding:10px;"><div style="width:60px;border-bottom:1px solid #e2e8f0;height:18px;"></div></td><td style="padding:10px;"><div style="display:flex;gap:8px;font-size:9px;"><span>&#9633; Yes</span><span>&#9633; No</span></div></td><td style="padding:10px;"><div style="width:100%;border-bottom:1px solid #e2e8f0;height:18px;"></div></td></tr>`).join("")}</tbody></table>`,"#7c3aed")}
  ${sectionCard("Lifestyle Advice","&#128161;",`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${[["&#10052;","Ice / Heat","Apply ice (cold pack wrapped in cloth) for 15&ndash;20 min if swollen or inflamed. Apply heat for stiffness or muscle tightness. Never apply directly to skin.","#0891b2"],["&#128716;","Activity Modification","Stay as active as possible within your pain limits. Avoid complete bed rest. Short, frequent walks are beneficial.","#059669"],["&#129506;","Posture Awareness","Be mindful of your posture during daily activities, especially sitting and lifting. Apply the postural cues discussed in your session.","#7c3aed"],["&#128222;","When to Seek Help","Return to your physiotherapist or GP immediately if: symptoms significantly worsen, new symptoms develop, or you experience any new neurological symptoms.","#dc2626"],].map(([icon,title,text,color])=>`<div style="background:${color}06;border:1px solid ${color}20;border-radius:8px;padding:10px 12px;"><div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;"><span style="font-size:14px;">${icon}</span><span style="font-size:10px;font-weight:700;color:${color};">${title}</span></div><div style="font-size:9px;color:#6b7280;line-height:1.5;">${text}</div></div>`).join("")}</div>`,"#059669")}
  <div style="background:linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04));border:1px solid rgba(124,58,237,0.2);border-radius:12px;padding:16px 20px;margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:center;"><div><div style="font-size:12px;font-weight:800;color:#1a3a5c;margin-bottom:4px;">${escHtml(clinicName)}</div>${clinicPhone?`<div style="font-size:11px;font-weight:600;color:#2563eb;margin-top:4px;">&#128222; ${escHtml(clinicPhone)}</div>`:""}</div><div style="border-left:1px solid rgba(124,58,237,0.2);padding-left:16px;"><div style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:4px;">Next Appointment</div><div style="font-size:14px;font-weight:800;color:#7c3aed;">${escHtml(nextAppt)}</div><div style="font-size:9px;color:#6b7280;margin-top:4px;">Bring this program to your session</div></div></div>
</div>
${pdfFooter("Home Exercise Program &mdash; Patient Copy")}
</div></body></html>`;
  };

  const buildPostureReportPdf = () => {
    const postScore = d.posture_score || d.post_score || "N/A";
    const postBand  = d.posture_band  || d.post_band  || "N/A";
    const cva       = d.post_cva      || d.cva_angle  || "N/A";
    const fhp       = d.post_fhp_dist || d.fhp_dist   || "N/A";
    const shAngle   = d.post_shoulder_angle || d.shoulder_angle || "N/A";
    const kyph      = d.post_kyphosis_angle || d.kyphosis_angle || "N/A";
    const lord      = d.post_lordosis_angle || d.lordosis_angle || "N/A";
    const pelv      = d.post_pelvic_tilt    || d.pelvic_tilt    || "N/A";
    const reliability = d.posture_reliability || "N/A";
    const view      = d.posture_view || "Anterior";
    const DEFECT_LABELS = {
      forward_head:"Forward Head Posture (CVA reduced)",rounded_shoulders:"Rounded/Protracted Shoulders",
      thoracic_kyphosis:"Increased Thoracic Kyphosis",lumbar_hyperlordosis:"Lumbar Hyperlordosis",
      anterior_pelvic_tilt:"Anterior Pelvic Tilt",posterior_pelvic_tilt:"Posterior Pelvic Tilt",
      lateral_pelvic_tilt:"Lateral Pelvic Tilt",genu_valgum:"Knee Medial Tendency (clinical assessment required)",
      genu_varum:"Knee Lateral Tendency (clinical assessment required)",foot_pronation:"Foot Overpronation / Flat Arch",
      foot_supination:"Foot Supination / High Arch",scoliosis:"Lateral Spinal Curvature Tendency (clinical assessment required)",
      head_tilt:"Lateral Head Tilt",scapular_winging:"Scapular Winging",
    };
    const DEFECT_MUSCLES = {
      forward_head:{tight:["Upper trapezius","SCM","Suboccipitals"],weak:["Deep neck flexors","Lower trapezius"]},
      rounded_shoulders:{tight:["Pec major","Pec minor","Subscapularis"],weak:["Lower trapezius","Rhomboids"]},
      thoracic_kyphosis:{tight:["Pec major/minor","Ant intercostals"],weak:["Thoracic extensors","Lower trap"]},
      lumbar_hyperlordosis:{tight:["Iliopsoas","QL","Lumbar erectors"],weak:["Gluteus maximus","TA"]},
      anterior_pelvic_tilt:{tight:["Iliopsoas","Rectus femoris","TFL"],weak:["Gluteus maximus","Hamstrings"]},
      posterior_pelvic_tilt:{tight:["Hamstrings","Gluteus max","Rect abdominis"],weak:["Hip flexors","Lumb ext"]},
      lateral_pelvic_tilt:{tight:["Ipsilateral QL","Ipsilateral TFL"],weak:["Contralateral glut med"]},
      genu_valgum:{tight:["TFL","IT band","Hip adductors"],weak:["Glut med","VMO","Hip ext rotators"]},
      genu_varum:{tight:["IT band","Biceps femoris"],weak:["Hip adductors","VMO"]},
      foot_pronation:{tight:["Gastrocnemius","Soleus","Peroneals"],weak:["Tib posterior","Intrinsic foot"]},
      foot_supination:{tight:["IT band","Plantar fascia"],weak:["Peroneals","Intrinsic foot muscles"]},
      scoliosis:{tight:["Ipsilateral paraspinals","Ipsilateral QL"],weak:["Contralateral paraspinals"]},
      head_tilt:{tight:["Ipsilat upper trap","SCM","Levator scap"],weak:["Contralat lateral neck flexors"]},
      scapular_winging:{tight:["Pec minor","Ant shoulder"],weak:["Serratus anterior","Lower trapezius"]},
    };
    const DEFECT_RX = {
      forward_head:"Chin tucks x15 daily - DNF activation - Pec minor stretch",
      rounded_shoulders:"Band pull-apart x20 - Face pulls x15 - Pec doorway stretch",
      thoracic_kyphosis:"Foam roller extension T4-T8 - T-spine rotation - Prone Y-T-W",
      lumbar_hyperlordosis:"Hip flexor couch stretch - Glute bridges 3x15 - Dead bug",
      anterior_pelvic_tilt:"Pelvic tilts - Couch stretch - Glute activation",
      posterior_pelvic_tilt:"Hip flexor stretching - Lumbar extension - Cat-cow",
      lateral_pelvic_tilt:"Side-lying hip abduction - Clamshells - QL stretch",
      genu_valgum:"Clamshells - Monster walks - Single-leg squat with knee tracking",
      genu_varum:"IT band foam rolling - Hip adductor strengthening",
      foot_pronation:"Short foot exercise - Calf raises - Tib posterior strengthening",
      foot_supination:"Peroneal strengthening - Single-leg balance - Lateral band walks",
      scoliosis:"Schroth breathing - Concave-side stretch - Convex-side strengthening",
      head_tilt:"Contralat cervical lat flexion stretch - Upper trap SMR",
      scapular_winging:"Serratus ant wall push-ups - Lower trap Y-T-W",
    };
    const selectedDefects = Object.keys(DEFECT_LABELS).filter(function(id) { return d["posture_defect_" + id]; });
    const dxLabel = escHtml((dx && dx.dx && dx.dx[0] && dx.dx[0].label) ? dx.dx[0].label : (d.cc_main || "Postural Dysfunction"));
    const scoreNum = parseFloat(postScore) || 0;
    const scoreColor = scoreNum >= 75 ? "#059669" : scoreNum >= 50 ? "#d97706" : "#dc2626";
    const photoImg = d.posture_photo_url || d.posture_captured_img || "";

    // Pre-build all HTML sections as plain strings -- no nested template literals
    var patientCells = [
      ["Patient", escHtml(patName)],
      ["DOB / Age", escHtml(dob) + " / " + escHtml(String(age))],
      ["Occupation", escHtml(occ)],
      ["Report Date", today],
      ["Referring GP", escHtml(gp)],
      ["Insurer", escHtml(insurer)],
      ["Method", "AI Landmark Detection"],
      ["View", escHtml(view)],
    ].map(function(p) {
      return '<div><div style="font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:2px;">' + p[0] + '</div>'
           + '<div style="font-size:10px;font-weight:600;color:#1a3a5c;">' + p[1] + '</div></div>';
    }).join("");

    var circ50 = 2 * Math.PI * 50;
    var dash = (scoreNum / 100) * circ50;
    var scoreRing = '<svg viewBox="0 0 120 120" width="110" height="110" style="display:block;margin:0 auto 8px;">'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="#f1f5f9" stroke-width="10"/>'
      + '<circle cx="60" cy="60" r="50" fill="none" stroke="' + scoreColor + '" stroke-width="10" stroke-dasharray="' + dash + ' ' + circ50 + '" stroke-linecap="round" transform="rotate(-90 60 60)"/>'
      + '<text x="60" y="54" text-anchor="middle" fill="' + scoreColor + '" font-size="22" font-weight="800">' + (scoreNum || "N/A") + '</text>'
      + '<text x="60" y="68" text-anchor="middle" fill="#94a3b8" font-size="9">/100</text>'
      + '<text x="60" y="82" text-anchor="middle" fill="' + scoreColor + '" font-size="8" font-weight="700">' + escHtml(postBand) + '</text>'
      + '</svg>';

    var scoreLegend = [["75-100","Excellent","#059669"],["50-74","Moderate","#d97706"],["25-49","Poor","#dc2626"],["0-24","Critical","#7f1d1d"]]
      .map(function(r) {
        return '<div style="background:' + r[2] + '12;border-radius:5px;padding:4px 6px;border:1px solid ' + r[2] + '30;">'
             + '<div style="font-size:8px;font-weight:700;color:' + r[2] + ';">' + r[1] + '</div>'
             + '<div style="font-size:7px;color:#94a3b8;">' + r[0] + '</div></div>';
      }).join("");

    var measData = [
      // Normal values per Yip 2008 (CVA), Magee 6th ed. (kyphosis, lordosis, shoulder), Lee & Nussbaum (head tilt)
      {label:"CVA (Yip 2008 norm >55°)",value:cva,  normal:"&gt;55&deg;",bad:parseFloat(cva)<49,        warn:parseFloat(cva)<55,          bc:"#dc2626"},
      {label:"Forward Head Posture",  value:fhp,     normal:"&lt;20mm",   bad:parseFloat(fhp)>30,        warn:parseFloat(fhp)>20,          bc:"#dc2626"},
      {label:"Shoulder Asymmetry",    value:shAngle, normal:"&lt;2.5&deg;",bad:parseFloat(shAngle)>5,   warn:parseFloat(shAngle)>2.5,     bc:"#d97706"},
      {label:"Thoracic Kyphosis Est.",value:kyph,    normal:"20–45&deg;", bad:parseFloat(kyph)>50,      warn:parseFloat(kyph)>45,         bc:"#d97706"},
      {label:"Lumbar Lordosis Est.",  value:lord,    normal:"40–60&deg;", bad:parseFloat(lord)>65||parseFloat(lord)<30, warn:false,       bc:"#d97706"},
      {label:"Pelvic Tilt (proxy)",   value:pelv,    normal:"0–5&deg;",   bad:false,                     warn:false,                       bc:"#6b7280"},
    ];
    var measCards = measData.map(function(m) {
      var c = (m.bad && m.value !== "N/A") ? m.bc : (m.warn && m.value !== "N/A") ? "#d97706" : (m.value === "N/A" ? "#94a3b8" : "#059669");
      var status = m.value === "N/A" ? "N/A" : m.bad ? "Outside Normal" : m.warn ? "Borderline" : "Normal";
      return '<div style="background:' + c + '08;border:1px solid ' + c + '25;border-radius:8px;padding:9px 11px;border-left:3px solid ' + c + ';">'
           + '<div style="font-size:7.5px;color:#6b7280;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:3px;">' + m.label + '</div>'
           + '<div style="font-size:18px;font-weight:800;color:' + c + ';line-height:1;">' + escHtml(String(m.value)) + '</div>'
           + '<div style="display:flex;justify-content:space-between;margin-top:3px;">'
           + '<span style="font-size:7.5px;color:#94a3b8;">Norm: ' + m.normal + '</span>'
           + '<span style="font-size:7.5px;font-weight:700;color:' + c + ';">' + status + '</span>'
           + '</div></div>';
    }).join("");

    var defectRows = selectedDefects.map(function(id, i) {
      var label = DEFECT_LABELS[id] || id;
      var sev = d["posture_defect_" + id + "_severity"] || "mild";
      var sc = sev === "severe" ? "#dc2626" : sev === "moderate" ? "#d97706" : "#059669";
      var muscles = DEFECT_MUSCLES[id];
      var tight = muscles ? muscles.tight.slice(0,2).join(", ") : "N/A";
      var rx = DEFECT_RX[id] || "Clinical assessment required";
      return '<tr style="background:' + (i%2===0?"#fff":"#f8fafc") + ';">'
           + '<td style="font-size:9.5px;font-weight:700;color:#1a3a5c;">' + escHtml(label) + '</td>'
           + '<td><span style="padding:2px 8px;border-radius:4px;font-size:8px;font-weight:700;background:' + sc + '15;color:' + sc + ';">' + sev.charAt(0).toUpperCase() + sev.slice(1) + '</span></td>'
           + '<td style="font-size:8.5px;color:#6b7280;">' + escHtml(tight) + '</td>'
           + '<td style="font-size:8.5px;color:#1a3a5c;">' + rx + '</td></tr>';
    }).join("");

    var defectSection = selectedDefects.length > 0
      ? sectionCard("Regional Postural Findings", "&#128450;",
          '<table><thead><tr><th>Region / Defect</th><th>Severity</th><th>Tight Structures</th><th>Clinical Action</th></tr></thead>'
          + '<tbody>' + defectRows + '</tbody></table>', "#64748b")
      : sectionCard("Regional Postural Findings", "&#128450;",
          '<div style="padding:12px;text-align:center;color:#94a3b8;font-size:10px;">No postural defects recorded. Use the Posture Defect Assessment module to document findings.</div>',
          "#64748b");

    var hasUCS = selectedDefects.some(function(id) { return id==="forward_head"||id==="rounded_shoulders"||id==="thoracic_kyphosis"; });
    var hasLCS = selectedDefects.some(function(id) { return id==="anterior_pelvic_tilt"||id==="lumbar_hyperlordosis"; });
    var regionSet = {};
    selectedDefects.forEach(function(id) {
      regionSet[(id.indexOf("foot")>=0||id.indexOf("genu")>=0)?"Lower Limb":(id.indexOf("thoracic")>=0||id.indexOf("shoulder")>=0||id.indexOf("scapular")>=0)?"Thoracic":"Spinal/Pelvic"] = 1;
    });
    var regions = Object.keys(regionSet).join(", ") || "N/A";
    var scoreMsg = scoreNum < 50 ? "Priority intervention required." : scoreNum < 75 ? "Moderate dysfunction -- structured correction indicated." : "Good alignment -- maintenance program recommended.";

    var bioCards = [
      {title:"Upper Crossed Pattern Tendency", active:hasUCS, text:"Possible overactivity: upper trapezius/pectorals. Possible underactivity: deep neck flexors. May contribute to forward head and shoulder protraction tendency. Clinical muscle testing required to confirm.", color:"#dc2626"},
      {title:"Lower Crossed Pattern Tendency", active:hasLCS, text:"Possible overactivity: hip flexors/lumbar extensors. Possible underactivity: glutes/TA. May contribute to anterior pelvic tilt tendency. Clinical assessment required to confirm.", color:"#d97706"},
      {title:"Kinetic Chain Impact",   active:true,   text:"Compensatory load across the kinetic chain. " + selectedDefects.length + " defect(s) identified across " + regions + " regions.", color:"#0891b2"},
      {title:"Postural Load Index",    active:true,   text:"AI Posture Score: " + scoreNum + "/100 (" + escHtml(postBand) + "). " + scoreMsg, color:scoreColor},
    ].map(function(item) {
      return '<div style="background:' + item.color + '06;border:1px solid ' + item.color + '20;border-radius:8px;padding:10px 12px;' + (!item.active?"opacity:0.45;":"") + '">'
           + '<div style="font-size:9px;font-weight:700;color:' + item.color + ';margin-bottom:4px;">' + item.title + '</div>'
           + '<div style="font-size:9px;color:#6b7280;line-height:1.6;">' + item.text + '</div></div>';
    }).join("");

    var bioSection = selectedDefects.length > 0
      ? sectionCard("Biomechanical Correlation","&#129518;",
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' + bioCards + '</div>', "#7c3aed")
      : "";

    var firstLabel = selectedDefects.length > 0 ? (DEFECT_LABELS[selectedDefects[0]] || "primary deficit") : "";
    var immItems = selectedDefects.length > 0
      ? ["Address " + firstLabel, scoreNum < 50 ? "Refer for comprehensive postural assessment" : "Postural education and awareness", "Ergonomic review"]
      : ["Postural education","Ergonomic review","Activity modification"];

    var recoCols = [
      {priority:"Immediate",           items:immItems,                                                                                    color:"#dc2626"},
      {priority:"Short-Term (2-4 wks)",items:["Targeted muscle activation","Manual therapy - restricted segments","Daily HEP program"],  color:"#d97706"},
      {priority:"Long-Term (6-12 wks)",items:["Postural re-education","Progressive strengthening","Self-management and prevention"],      color:"#059669"},
    ].map(function(col) {
      var rows = col.items.map(function(item) {
        return '<div style="display:flex;gap:5px;margin-bottom:4px;align-items:flex-start;">'
             + '<span style="color:' + col.color + ';font-weight:700;font-size:10px;flex-shrink:0;">-&gt;</span>'
             + '<span style="font-size:8.5px;color:#475569;line-height:1.5;">' + item + '</span></div>';
      }).join("");
      return '<div style="background:' + col.color + '06;border:1px solid ' + col.color + '25;border-radius:8px;padding:9px 11px;">'
           + '<div style="font-size:8.5px;font-weight:800;color:' + col.color + ';text-transform:uppercase;letter-spacing:0.8px;margin-bottom:7px;">' + col.priority + '</div>'
           + rows + '</div>';
    }).join("");

    var recoSection = sectionCard("Clinical Recommendations","&#128203;",
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;">' + recoCols + '</div>', "#059669");

    var methodRows = [
      ["AI Engine","MediaPipe BlazePose"],
      ["View", escHtml(view)],
      ["Reliability", escHtml(reliability)],
      ["Landmarks","33 body landmarks"],
      ["Calibration", d.posture_calibration || "Auto"],
      ["Platform","PhysioMind AI"],
    ].map(function(r) {
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #e2e8f0;">'
           + '<span style="font-size:8.5px;color:#94a3b8;">' + r[0] + '</span>'
           + '<span style="font-size:8.5px;font-weight:600;color:#1a3a5c;">' + r[1] + '</span></div>';
    }).join("");

    var photoBlock = photoImg
      ? '<img src="' + photoImg + '" style="width:100%;border-radius:8px;margin-bottom:6px;object-fit:cover;max-height:220px;" alt="Postural photo"/>'
      : '<div style="background:#f1f5f9;border-radius:8px;height:160px;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px dashed #cbd5e1;margin-bottom:8px;">'
        + '<div style="font-size:9px;font-weight:700;color:#6b7280;margin-bottom:3px;">AI-Analysed Photo</div>'
        + '<div style="font-size:8px;color:#94a3b8;">with Landmark Overlay</div></div>';

    var sigRow = [["Treating Physiotherapist",""],["Signature",""],["Date / Stamp", today]].map(function(p) {
      return '<div>'
           + '<div style="font-size:8px;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:3px;">' + p[0] + '</div>'
           + '<div style="height:30px;border-bottom:1.5px solid #334155;margin-bottom:3px;display:flex;align-items:flex-end;">'
           + '<span style="font-size:10px;font-weight:600;color:#1e293b;">' + escHtml(p[1]) + '</span></div></div>';
    }).join("");

    return "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><title>Posture Analysis Report - PhysioMind</title>"
      + "<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.page{background:#fff;max-width:860px;margin:0 auto;box-shadow:0 4px 40px rgba(0,0,0,0.12);}.body{padding:28px 40px;}table{width:100%;border-collapse:collapse;}th{background:#f1f5f9;font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.8px;padding:7px 9px;text-align:left;}td{padding:6px 9px;font-size:10px;border-bottom:1px solid #e2e8f0;}@media print{body{background:white;}.page{box-shadow:none;}}</style>"
      + "</head><body><div class=\"page\">"
      + pdfHeader("Postural Analysis Report","AI-Assisted Quantitative Postural Assessment &middot; PhysioMind Platform","#0a1628")
      + "<div class=\"body\">"
      + "<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:18px;padding:13px;background:#f1f5f9;border-radius:10px;border:1px solid #e2e8f0;\">" + patientCells + "</div>"
      + "<div style=\"background:linear-gradient(135deg,#0a1628,#1a3358);border-radius:10px;padding:14px 18px;margin-bottom:18px;display:flex;gap:14px;align-items:center;border:1px solid #1a3358;\">"
      + "<div style=\"flex:1;\">"
      + "<div style=\"font-size:9px;color:#e8c96e;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;\">Clinical Diagnosis</div>"
      + "<div style=\"font-size:14px;font-weight:800;color:#fff;\">" + dxLabel + "</div>"
      + "<div style=\"font-size:8.5px;color:rgba(255,255,255,0.5);margin-top:2px;\">MediaPipe BlazePose AI &middot; 33 landmarks &middot; " + escHtml(view) + " view</div>"
      + "</div><div style=\"flex-shrink:0;text-align:center;\">" + scoreRing + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 230px;gap:18px;align-items:start;\">"
      + "<div>"
      + sectionCard("Quantitative Postural Measurements","&#128207;",
          "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:9px;margin-bottom:12px;\">" + measCards + "</div>"
          + "<div style=\"padding:8px 11px;background:rgba(37,99,235,0.05);border:1px solid rgba(37,99,235,0.15);border-radius:7px;font-size:8.5px;color:#1a3a5c;\">"
          + "<strong style=\"color:#2563eb;\">AI Reliability:</strong> " + escHtml(reliability)
          + " &nbsp;&middot;&nbsp; <strong>View:</strong> " + escHtml(view)
          + " &nbsp;&middot;&nbsp; <strong>Calibration:</strong> " + (d.posture_calibration || "Auto") + "</div>",
          "#0891b2")
      + defectSection
      + bioSection
      + recoSection
      + "</div>"
      + "<div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;\">Overall Posture Score</div>"
      + scoreRing
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:5px;\">" + scoreLegend + "</div></div>"
      + "<div style=\"background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,0.04);\">"
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;\">Postural Photo</div>"
      + photoBlock
      + "<div style=\"font-size:8.5px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;margin-top:3px;\">Assessment Method</div>"
      + methodRows + "</div>"
      + "<div style=\"background:#fef3c7;border:1px solid rgba(217,119,6,0.3);border-radius:8px;padding:9px 11px;\">"
      + "<div style=\"font-size:8px;font-weight:700;color:#92400e;margin-bottom:3px;\">Clinical Disclaimer</div>"
      + "<div style=\"font-size:8px;color:#92400e;line-height:1.6;\">AI-assisted assessment is a clinical decision support tool. All measurements require clinical correlation and must be interpreted by a qualified physiotherapist.</div></div>"
      + "</div></div>"
      + "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;margin-top:18px;padding-top:14px;border-top:1px solid #e2e8f0;\">" + sigRow + "</div>"
      + "</div>"
      + pdfFooter("Postural Analysis Report &mdash; PhysioMind AI Platform")
      + "</div></body></html>";
  };

  const openPdf = (htmlContent) => {
    const win = window.open("", "_blank");
    if (!win) { alert("Please allow popups for PDF generation"); return; }
    win.document.open(); win.document.write(htmlContent); win.document.close();
    setTimeout(() => { try { win.print(); } catch(e) {} }, 800);
  };

  const generatePdf = async (type) => {
    setGenerating(type);
    await new Promise(r => setTimeout(r, 400));
    try {
      let html = "";
      if (type === "assessment") html = buildAssessmentPdf();
      else if (type === "treatment") html = buildTreatmentPdf();
      else if (type === "hep") html = buildHomeExercisePdf();
      else if (type === "posture") html = buildPostureReportPdf();
      openPdf(html);
      setDone(p => ({...p, [type]: true}));
    } catch(e) { console.error(e); alert("Error generating PDF: " + e.message); }
    setGenerating(null);
  };

  const reports = [
    { id:"assessment", icon:"&#129321;", title:"Assessment Report", subtitle:"Initial Clinical Evaluation", desc:"Comprehensive physiotherapy assessment: demographics, pain scores, ROM table, postural analysis with anatomical diagram, special tests, clinical diagnosis, neurological & palpation findings, and signed clinical summary.", color:"#1a3a5c", gradient:"linear-gradient(135deg,#1a3a5c,#2563eb)", tags:["Demographics","VAS Scores","Posture Diagram","ROM Table","Diagnosis","Special Tests","Signature"], pages:"2-3 pages" },
    { id:"treatment", icon:"&#127959;", title:"Treatment Plan", subtitle:"Clinical Management Program", desc:"Evidence-based treatment plan with phased exercise prescription, manual therapy techniques and dosage, SMART goals timeline, outcome measures with baselines, reassessment schedule, and clinical precautions.", color:"#059669", gradient:"linear-gradient(135deg,#065f46,#059669)", tags:["Phased Exercises","Manual Therapy","SMART Goals","Outcome Measures","Precautions","Reassessment"], pages:"2-3 pages" },
  ];

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#ffffff",borderRadius:20,maxWidth:760,width:"100%",maxHeight:"92vh",overflowY:"auto",boxShadow:"0 25px 60px rgba(0,0,0,0.4)"}}>
        <div style={{background:"linear-gradient(135deg,#1a3a5c 0%,#2563eb 50%,#7c3aed 100%)",borderRadius:"20px 20px 0 0",padding:"24px 28px",color:"#fff"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <span style={{fontSize:"24px"}}>📄</span>
                <div><h2 style={{margin:0,fontSize:"1.3rem",fontWeight:800,letterSpacing:"-0.3px"}}>Clinical PDF Reports</h2><p style={{margin:"2px 0 0",fontSize:"0.75rem",opacity:0.8}}>Assessment &amp; Treatment PDF — patient-specific</p></div>
              </div>
              {patName !== "Patient" && <div style={{display:"flex",alignItems:"center",gap:8,padding:"6px 12px",background:"rgba(255,255,255,0.12)",borderRadius:8,width:"fit-content"}}><div style={{width:6,height:6,borderRadius:"50%",background:"#34d399"}}/><span style={{fontSize:"0.8rem",fontWeight:600}}>{patName}</span>{age && age !== "--" && <span style={{fontSize:"0.82rem",opacity:0.7}}>&#183; Age {age}</span>}</div>}
            </div>
            <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,color:"#fff",cursor:"pointer",padding:"8px 14px",fontSize:"0.8rem",fontWeight:600}}>✕ Close</button>
          </div>
        </div>
        <div style={{padding:"24px 28px"}}>
          <div style={{background:"rgba(37,99,235,0.06)",border:"1px solid rgba(37,99,235,0.2)",borderRadius:10,padding:"10px 14px",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
            <span style={{fontSize:"16px",flexShrink:0}}>💡</span>
            <div style={{fontSize:"0.78rem",color:"#1e40af",lineHeight:1.6}}>Each PDF opens in a new browser tab. Use <strong>Print -&gt; Save as PDF</strong> (enable Background Graphics for full colour). Data is pulled from your current patient assessment automatically.</div>
          </div>
          <div style={{display:"grid",gap:14}}>
            {reports.map(report => (
              <div key={report.id} style={{background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:14,overflow:"hidden",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:0}}>
                  <div style={{padding:"18px 20px"}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:10}}>
                      <div style={{width:44,height:44,background:report.gradient,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"20px",flexShrink:0}} dangerouslySetInnerHTML={{__html:report.icon}}/>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:2}}><h3 style={{margin:0,fontSize:"1rem",fontWeight:800,color:"#1e293b"}}>{report.title}</h3><span style={{fontSize:"0.82rem",padding:"2px 7px",borderRadius:5,background:"rgba(100,116,139,0.12)",color:"#64748b",fontWeight:600}}>{report.pages}</span></div>
                        <p style={{margin:0,fontSize:"0.75rem",color:"#64748b",fontWeight:500}}>{report.subtitle}</p>
                      </div>
                    </div>
                    <p style={{margin:"0 0 10px",fontSize:"0.78rem",color:"#475569",lineHeight:1.6}}>{report.desc}</p>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>{report.tags.map(tag=><span key={tag} style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:5,background:report.color+"12",border:`1px solid ${report.color}25`,color:report.color,fontWeight:600}}>{tag}</span>)}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"18px 20px",borderLeft:"1px solid #e2e8f0",minWidth:130,gap:10}}>
                    {done[report.id] && <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:"rgba(5,150,105,0.1)",border:"1px solid rgba(5,150,105,0.3)",borderRadius:8}}><span style={{color:"#059669",fontSize:"0.75rem",fontWeight:700}}>✓ Generated</span></div>}
                    <button data-pdf-type={report.id} onClick={()=>generatePdf(report.id)} disabled={generating!==null} style={{width:"100%",padding:"12px 16px",background:generating===report.id?"#94a3b8":report.gradient,border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:generating?"not-allowed":"pointer",opacity:generating&&generating!==report.id?0.5:1,display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                      {generating===report.id?"⏳ Generating...":"📥 Generate PDF"}
                    </button>
                    <div style={{fontSize:"0.75rem",color:"#94a3b8",textAlign:"center",lineHeight:1.4}}>Opens in new tab<br/>Print → Save as PDF</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div style={{marginTop:18,padding:"16px 20px",background:"linear-gradient(135deg,rgba(124,58,237,0.06),rgba(37,99,235,0.04))",border:"1px solid rgba(124,58,237,0.2)",borderRadius:12,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
            <div><div style={{fontWeight:700,fontSize:"0.88rem",color:"#1e293b"}}>Generate Both Reports</div><div style={{fontSize:"0.82rem",color:"#64748b",marginTop:2}}>Download Assessment &amp; Treatment PDFs for <strong>{patName}</strong></div></div>
            <button onClick={async()=>{for(const r of reports){await generatePdf(r.id);await new Promise(res=>setTimeout(res,1500));}}} disabled={generating!==null} style={{padding:"12px 22px",background:"linear-gradient(135deg,#1a3a5c,#7c3aed)",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.8rem",cursor:generating?"not-allowed":"pointer",whiteSpace:"nowrap",flexShrink:0,boxShadow:"0 2px 12px rgba(124,58,237,0.3)"}}>
              📄 Generate All
            </button>
          </div>


          <div style={{marginTop:14,padding:"12px 16px",background:"#f8fafc",border:"1px solid #e2e8f0",borderRadius:10}}>
            <div style={{fontSize:"0.8rem",fontWeight:700,color:"#64748b",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>💡 Tips for best results</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
              {["Complete patient demographics before generating","Add exercises in the Exercise Prescription module","Record ROM measurements for detailed tables","Run AI Diagnosis first for diagnostic content","Use Chrome or Edge for best PDF quality","Enable Print: Background Graphics for full colour"].map(tip=>(
                <div key={tip} style={{fontSize:"0.82rem",color:"#94a3b8",display:"flex",gap:6,alignItems:"flex-start",padding:"2px 0"}}><span style={{color:"#7c3aed",fontWeight:700,flexShrink:0}}>→</span>{tip}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}






function PostureSessionsView({ d, C, onNav }) {
  const [lightboxImg, setLightboxImg] = useState(null);
  let postureSessions = [];
  try { postureSessions = JSON.parse(d.posture_sessions||"[]"); } catch {}
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
            {defects.map(k=>(<span key={k} style={{padding:"3px 9px",borderRadius:20,fontSize:10.5,fontWeight:700,background:"#EDE9FE",color:C.primary,border:`1px solid ${C.primary}30`}}>{k.replace("posture_defect_","").replace(/_/g," ").replace(/\w/g,l=>l.toUpperCase())}</span>))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── HEP protocol helpers — versioned home programme with WhatsApp/PDF send ──
function hepDose(e){ const st=e.customSets||e.sets, rp=e.customReps||e.reps, hd=e.customHold||e.hold, fq=e.customFreq||e.freq; return `${st}×${rp}${hd?` · hold ${hd}s`:""}${fq?` · ${fq}`:""}`; }
function buildHepWhatsAppText(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length) return "";
  const v=parseInt(d.hep_version)||1;
  const lines=prog.map((e,i)=>`${i+1}. ${e.name} — ${hepDose(e)}`);
  return `🏥 ${d.clinic_name||"PhysioMind"} — Home Exercise Programme (v${v})\nPatient: ${d.dem_name||""}\nDate: ${new Date().toLocaleDateString("en-GB")}\n\n${lines.join("\n")}\n\nStop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.`;
}
function sendHepWhatsApp(d){
  const text=buildHepWhatsAppText(d);
  if(!text){alert("No exercises in the home protocol yet.");return;}
  const phone=String(d.dem_phone||d.dem_contact||"").replace(/[^0-9]/g,"");
  const url=phone.length>=10?`https://wa.me/${phone}?text=${encodeURIComponent(text)}`:`https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url,"_blank");
}
function downloadHepPdf(d){
  const prog=Array.isArray(d.hep_programme)?d.hep_programme:[];
  if(!prog.length){alert("No exercises in the home protocol yet.");return;}
  const v=parseInt(d.hep_version)||1;
  const html=`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Home Exercise Programme</title>
<style>@page{size:A4;margin:18mm}*{box-sizing:border-box;font-family:'Segoe UI',Arial,sans-serif}body{background:#fff;color:#1a1a2e;font-size:11px;line-height:1.55}.header{border-bottom:3px solid #7c3aed;padding-bottom:12px;margin-bottom:16px;display:flex;justify-content:space-between}.logo{font-size:20px;font-weight:900;color:#7c3aed}.meta{text-align:right;font-size:10px;color:#555}.ex{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:10px;overflow:hidden;break-inside:avoid}.ex-h{background:#7c3aed;color:#fff;padding:8px 12px;display:flex;justify-content:space-between}.ex-t{font-size:12px;font-weight:800}.ex-b{padding:10px 12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px}.st{background:#f5f3ff;border-radius:6px;padding:5px 8px;text-align:center}.sv{font-size:13px;font-weight:900;color:#7c3aed}.sl{font-size:8px;color:#64748b;text-transform:uppercase}.desc{font-size:10.5px;color:#334155;margin-bottom:6px}.cues{background:#fefce8;border-left:3px solid #fbbf24;padding:5px 8px;font-size:10px;color:#713f12}.footer{margin-top:16px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;text-align:center}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}</style>
</head><body>
<div class="header"><div><div class="logo">PhysioMind</div><div style="font-size:11px;color:#555;margin-top:2px">Home Exercise Programme — v${v}</div></div><div class="meta"><div><b>Patient:</b> ${d.dem_name||"—"}</div><div><b>Date:</b> ${new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"long",year:"numeric"})}</div></div></div>
<p style="font-size:10px;color:#555;margin-bottom:14px">Perform exercises as prescribed. Stop if severe pain. Mild discomfort is normal. Contact your physiotherapist if unsure.</p>
${prog.map((ex,i)=>`<div class="ex"><div class="ex-h"><span class="ex-t">${i+1}. ${ex.name}</span><span style="font-size:9px;opacity:0.85">${ex.phase||""}</span></div><div class="ex-b"><div class="grid"><div class="st"><div class="sv">${ex.customSets||ex.sets||"—"}</div><div class="sl">Sets</div></div><div class="st"><div class="sv">${ex.customReps||ex.reps||"—"}</div><div class="sl">Reps</div></div><div class="st"><div class="sv">${(ex.customHold||ex.hold)?(ex.customHold||ex.hold)+"s":"—"}</div><div class="sl">Hold</div></div><div class="st"><div class="sv" style="font-size:9px">${ex.customFreq||ex.freq||"—"}</div><div class="sl">Freq</div></div></div><div class="desc">${ex.desc||""}</div>${ex.cues?`<div class="cues">💡 ${ex.cues}</div>`:""}</div></div>`).join("")}
<div class="footer">Generated by PhysioMind · ${new Date().toLocaleString()}</div>
</body></html>`;
  try{ downloadPDFFromHTML(html, `HEP_v${v}_${d.dem_name||"Patient"}_${Date.now()}.pdf`); }
  catch(e){ const w=window.open("","_blank"); w.document.write(html); w.document.close(); setTimeout(()=>{try{w.print();}catch(_){}},500); }
}

function QuickVisitForm({ PC, data, set, navTo }) {
  const sessionsArr = Array.isArray(data.tx_sessions)?data.tx_sessions:[];
  const lastSession = sessionsArr[0];
  const sessionNo = sessionsArr.length+1;
  const [qv, setQv] = useState({pain_today:data.cc_vas_now||"",pain_after:"",treatment:lastSession?.treatmentGiven||"",response:"",next_plan:""});
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState([]);          // protocol change descriptions this visit
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState("library");   // "library" | "templates"
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerRegion, setPickerRegion] = useState("all");
  const [openTemplate, setOpenTemplate] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editDose, setEditDose] = useState({sets:"",reps:"",hold:""});
  const [removeId, setRemoveId] = useState(null);
  const txOptions = ["Joint mobilisation","Soft tissue massage","Dry needling","Exercise therapy","TENS/IFT","Neural mobilisation","Taping/strapping","Education & advice","Postural correction","Manual therapy","Other"];
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"8px 10px",fontSize:"0.8rem"};
  const lbl = {fontSize:"0.8rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};

  const prog = Array.isArray(data.hep_programme)?data.hep_programme:[];

  const addExercise = (ex) => {
    if(prog.find(p=>p.id===ex.id)) { setPickerOpen(false); return; }
    set("hep_programme",[...prog,{...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}]);
    setPending(p=>[...p,`＋ ${ex.name}`]);
    setPickerOpen(false); setPickerSearch("");
  };
  const removeExercise = (id,reason) => {
    const ex=prog.find(p=>p.id===id);
    set("hep_programme",prog.filter(p=>p.id!==id));
    setPending(p=>[...p,`− ${ex?.name||id}${reason?` (${reason.toLowerCase()})`:""}`]);
    setRemoveId(null);
  };
  const startProgress = (e) => { setEditId(e.id); setEditDose({sets:String(e.customSets||e.sets||""),reps:String(e.customReps||e.reps||""),hold:String(e.customHold||e.hold||"")}); };
  const applyProgress = () => {
    const ex=prog.find(p=>p.id===editId); if(!ex){setEditId(null);return;}
    set("hep_programme",prog.map(p=>p.id===editId?{...p,customSets:editDose.sets,customReps:editDose.reps,customHold:editDose.hold,progressedSession:sessionNo}:p));
    setPending(p=>[...p,`↑ ${ex.name} ${editDose.sets}×${editDose.reps}${editDose.hold?` · ${editDose.hold}s`:""}`]);
    setEditId(null);
  };

  const addTx = (t) => setQv(p=>({...p,treatment:p.treatment?(p.treatment.includes(t)?p.treatment:`${p.treatment}, ${t}`):t}));
  const addTemplate = (key) => {
    const t=PROGRAMME_TEMPLATES[key]; if(!t) return;
    const exs=t.exercises.map(id=>ALL_EXERCISES.find(e=>e.id===id)).filter(Boolean).filter(e=>!prog.find(p=>p.id===e.id));
    if(exs.length){
      set("hep_programme",[...prog,...exs.map(ex=>({...ex,customSets:ex.sets,customReps:ex.reps,customHold:ex.hold,customFreq:ex.freq,notes:"",addedSession:sessionNo,addedDate:new Date().toISOString()}))]);
      setPending(p=>[...p,`＋ ${t.label} template (${exs.length} exercise${exs.length!==1?"s":""})`]);
    }
  };
  const pickerResults = (()=>{
    if(!pickerOpen) return [];
    let pool = pickerRegion==="all" ? ALL_EXERCISES : (Object.values(EXERCISE_DB[pickerRegion]?.categories||{}).flat());
    const q=pickerSearch.trim().toLowerCase();
    if(q) pool=pool.filter(e=>e.name.toLowerCase().includes(q)||String(e.target||"").toLowerCase().includes(q));
    return pool.filter(e=>!prog.find(p=>p.id===e.id)).slice(0,8);
  })();

  const saveQuick = () => {
    set("cc_vas_now",qv.pain_today);
    let hepNote="";
    if(pending.length){
      const version=(parseInt(data.hep_version)||1)+1;
      set("hep_version",version);
      const log=Array.isArray(data.hep_log)?data.hep_log:[];
      set("hep_log",[{session:sessionNo,date:new Date().toLocaleDateString("en-GB"),changes:pending,version},...log]);
      hepNote=`HEP v${version}: ${pending.join(" · ")}`;
    }
    set("soap_extra_p",[qv.next_plan,hepNote].filter(Boolean).join(" | "));
    const entry = {id:(Date.now()).toString(36),date:new Date().toLocaleDateString("en-GB"),sessionNo,type:"Follow-up Treatment",vasStart:qv.pain_today,vasEnd:qv.pain_after||qv.pain_today,treatmentGiven:qv.treatment,response:qv.response,nextPlan:qv.next_plan,hepChanges:pending,savedAt:new Date().toISOString()};
    set("tx_sessions",[entry,...sessionsArr]);
    setPending([]);
    setSaved(true); setTimeout(()=>setSaved(false),3000);
    navTo("soap");
  };

  const Pill=({bg,col,children,onClick,title})=>(
    <span onClick={onClick} title={title} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:26,height:26,borderRadius:7,background:bg,color:col,fontSize:"0.8rem",fontWeight:800,cursor:"pointer",flexShrink:0,userSelect:"none"}}>{children}</span>
  );

  return(
    <div>
      <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>1 · Today — Session {sessionNo}</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
        <div><label style={lbl}>Pain — start of session (NRS 0–10)</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 5" value={qv.pain_today} onChange={e=>setQv(p=>({...p,pain_today:e.target.value}))}/></div>
        <div><label style={lbl}>Pain — end of session (NRS 0–10)</label><input style={inp} type="number" min="0" max="10" placeholder="e.g. 3" value={qv.pain_after} onChange={e=>setQv(p=>({...p,pain_after:e.target.value}))}/></div>
        <div><label style={lbl}>Treatment given {lastSession?.treatmentGiven?<span style={{textTransform:"none",fontWeight:500}}>(copied from S{lastSession.sessionNo||sessionNo-1})</span>:null}</label><input style={inp} placeholder="Tap chips below or type…" value={qv.treatment} onChange={e=>setQv(p=>({...p,treatment:e.target.value}))}/></div>
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
        {txOptions.map(t=>(
          <button key={t} onClick={()=>setQv(p=>({...p,treatment:p.treatment?(p.treatment.includes(t)?p.treatment:`${p.treatment}, ${t}`):t}))}
            style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(t)?PC.accent:PC.border}`,background:qv.treatment.includes(t)?`${PC.accent}14`:"transparent",color:qv.treatment.includes(t)?PC.accent:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{t}</button>
        ))}
      </div>
      <div style={{marginBottom:10}}><label style={lbl}>Patient response</label><input style={inp} placeholder="e.g. Good improvement, less pain on movement" value={qv.response} onChange={e=>setQv(p=>({...p,response:e.target.value}))}/></div>
      <div style={{marginBottom:12}}><label style={lbl}>Plan for next session</label><input style={inp} placeholder="e.g. Progress to single-leg squat" value={qv.next_plan} onChange={e=>setQv(p=>({...p,next_plan:e.target.value}))}/></div>

      {/* ── 2 · Home protocol — edit per session ── */}
      <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.7px",marginBottom:6}}>2 · Home protocol {prog.length>0&&<span style={{fontWeight:600,textTransform:"none"}}>· v{parseInt(data.hep_version)||1} · {prog.length} exercise{prog.length!==1?"s":""}</span>}</div>
      {prog.length===0&&(
        <div style={{padding:"10px 12px",background:PC.s2,borderRadius:9,fontSize:"0.8rem",color:PC.muted,marginBottom:8}}>No protocol yet — add exercises below or build it in the Exercise Prescription tab.</div>
      )}
      {prog.map(e=>(
        <div key={e.id} style={{marginBottom:5}}>
          <div style={{display:"flex",alignItems:"center",gap:7,padding:"8px 10px",background:e.addedSession===sessionNo?`${PC.accent}10`:PC.s2,border:`1px solid ${e.addedSession===sessionNo?PC.accent+"35":PC.border}`,borderRadius:9}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:"0.76rem",fontWeight:700,color:PC.text}}>{e.name}
                {e.addedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.accent}}>＋ just added</span>}
                {e.progressedSession===sessionNo&&<span style={{marginLeft:6,fontSize:"0.75rem",fontWeight:800,color:PC.a3}}>↑ progressed</span>}
              </div>
              <div style={{fontSize:"0.82rem",color:PC.muted}}>{hepDose(e)}</div>
            </div>
            <Pill bg={`${PC.a3}18`} col={PC.a3} title="Progress dosage" onClick={()=>startProgress(e)}>↑</Pill>
            <Pill bg="rgba(220,38,38,0.1)" col="#dc2626" title="Remove" onClick={()=>setRemoveId(removeId===e.id?null:e.id)}>−</Pill>
          </div>
          {editId===e.id&&(
            <div style={{display:"flex",gap:6,alignItems:"center",padding:"7px 10px",background:`${PC.a3}08`,border:`1px dashed ${PC.a3}40`,borderRadius:9,marginTop:3}}>
              {["sets","reps","hold"].map(f=>(
                <input key={f} style={{...inp,width:62,padding:"5px 7px",fontSize:"0.82rem"}} placeholder={f} value={editDose[f]} onChange={ev=>setEditDose(p=>({...p,[f]:ev.target.value}))}/>
              ))}
              <span style={{fontSize:"0.78rem",color:PC.muted}}>sets × reps · hold s</span>
              <button onClick={applyProgress} style={{marginLeft:"auto",padding:"5px 12px",borderRadius:7,border:"none",background:PC.a3,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer"}}>✓ Apply</button>
            </div>
          )}
          {removeId===e.id&&(
            <div style={{display:"flex",gap:5,flexWrap:"wrap",padding:"7px 10px",background:"rgba(220,38,38,0.05)",border:"1px dashed rgba(220,38,38,0.35)",borderRadius:9,marginTop:3,alignItems:"center"}}>
              <span style={{fontSize:"0.8rem",color:"#dc2626",fontWeight:700}}>Why?</span>
              {["Mastered","Aggravating","Replaced","Other"].map(r=>(
                <button key={r} onClick={()=>removeExercise(e.id,r)} style={{padding:"4px 10px",borderRadius:7,border:"1px solid rgba(220,38,38,0.3)",background:"transparent",color:"#dc2626",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>{r}</button>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Add exercise — library picker */}
      {!pickerOpen?(
        <div onClick={()=>setPickerOpen(true)} style={{padding:"9px",border:`1.5px dashed ${PC.accent}50`,borderRadius:9,textAlign:"center",fontSize:"0.82rem",fontWeight:700,color:PC.accent,cursor:"pointer",marginBottom:10}}>＋ Add exercise from library</div>
      ):(
        <div style={{border:`1.5px solid ${PC.accent}35`,borderRadius:11,padding:"10px",marginBottom:10,background:`${PC.accent}06`}}>
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            {[["library","📚 Library"],["templates","📦 Templates"]].map(([m,l])=>(
              <button key={m} onClick={()=>setPickerMode(m)} style={{flex:1,padding:"7px",borderRadius:8,border:`1px solid ${pickerMode===m?PC.accent:PC.border}`,background:pickerMode===m?`${PC.accent}15`:"transparent",color:pickerMode===m?PC.accent:PC.muted,fontWeight:800,fontSize:"0.78rem",cursor:"pointer"}}>{l}</button>
            ))}
            <button onClick={()=>setPickerOpen(false)} style={{padding:"0 10px",borderRadius:8,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,cursor:"pointer",fontWeight:700}}>✕</button>
          </div>
          {pickerMode==="templates"&&(
            <div>
              {Object.entries(PROGRAMME_TEMPLATES).map(([key,t])=>{
                const tx=TEMPLATE_TX[key];
                const isOpen=openTemplate===key;
                return(
                  <div key={key} style={{marginBottom:4}}>
                    <div onClick={()=>setOpenTemplate(isOpen?null:key)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${isOpen?PC.accent+"45":PC.border}`}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{t.label}</div>
                        <div style={{fontSize:"0.78rem",color:PC.muted}}>{t.exercises.length} exercises{tx?` · ${(tx.manual||[]).length} manual · ${(tx.machine||[]).length} machine`:""}</div>
                      </div>
                      <span style={{fontSize:"0.75rem",color:PC.accent,fontWeight:800}}>{isOpen?"▲":"▼"}</span>
                    </div>
                    {isOpen&&(
                      <div style={{padding:"8px 10px",border:`1px dashed ${PC.accent}35`,borderTop:"none",borderRadius:"0 0 8px 8px",background:`${PC.accent}05`}}>
                        <button onClick={()=>{addTemplate(key);setOpenTemplate(null);}} style={{width:"100%",padding:"8px",borderRadius:8,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.78rem",cursor:"pointer",marginBottom:7}}>＋ Add {t.exercises.length} exercises to protocol</button>
                        {tx&&(tx.manual||[]).length>0&&(
                          <div style={{marginBottom:5}}>
                            <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>🤲 Manual — tap to add to treatment</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {tx.manual.map(m=><button key={m} onClick={()=>addTx(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(m)?PC.accent:PC.border}`,background:qv.treatment.includes(m)?`${PC.accent}14`:PC.surface,color:qv.treatment.includes(m)?PC.accent:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{qv.treatment.includes(m)?"✓ ":""}{m}</button>)}
                            </div>
                          </div>
                        )}
                        {tx&&(tx.machine||[]).length>0&&(
                          <div>
                            <div style={{fontSize:"0.75rem",fontWeight:800,color:PC.muted,textTransform:"uppercase",letterSpacing:"0.5px",marginBottom:3}}>⚡ Machine — tap to add to treatment</div>
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {tx.machine.map(m=><button key={m} onClick={()=>addTx(m)} style={{padding:"3px 9px",borderRadius:99,border:`1px solid ${qv.treatment.includes(m)?PC.a2:PC.border}`,background:qv.treatment.includes(m)?`${PC.a2}14`:PC.surface,color:qv.treatment.includes(m)?PC.a2:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>{qv.treatment.includes(m)?"✓ ":""}{m}</button>)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {pickerMode==="library"&&(
          <div style={{display:"flex",gap:6,marginBottom:7}}>
            <input autoFocus style={{...inp,flex:1}} placeholder="Search exercises… e.g. plank, chin tuck" value={pickerSearch} onChange={e=>setPickerSearch(e.target.value)}/>
            <select style={{...inp,width:120}} value={pickerRegion} onChange={e=>setPickerRegion(e.target.value)}>
              <option value="all">All regions</option>
              {Object.entries(EXERCISE_DB).map(([k,r])=><option key={k} value={k}>{r.label}</option>)}
            </select>
          </div>
          )}
          {pickerMode==="library"&&pickerResults.length===0&&<div style={{fontSize:"0.66rem",color:PC.muted,padding:"4px 2px"}}>No matches — try another term or region.</div>}
          {pickerMode==="library"&&pickerResults.map(ex=>(
            <div key={ex.id} onClick={()=>addExercise(ex)} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 9px",borderRadius:8,cursor:"pointer",background:PC.surface,border:`1px solid ${PC.border}`,marginBottom:4}}>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.text}}>{ex.name}</div>
                <div style={{fontSize:"0.78rem",color:PC.muted,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ex.sets}×{ex.reps}{ex.hold?` · ${ex.hold}s`:""} · {ex.freq} · {ex.target}</div>
              </div>
              <span style={{fontSize:"0.82rem",fontWeight:800,color:PC.accent,flexShrink:0}}>＋ Add</span>
            </div>
          ))}
        </div>
      )}

      {pending.length>0&&(
        <div style={{padding:"8px 11px",background:`${PC.accent}0a`,border:`1px solid ${PC.accent}25`,borderRadius:9,fontSize:"0.75rem",color:PC.text,marginBottom:10,lineHeight:1.6}}>
          <span style={{fontWeight:800,color:PC.accent}}>This session:</span> {pending.join(" · ")} <span style={{color:PC.muted}}>(will be logged as v{(parseInt(data.hep_version)||1)+1} on save)</span>
        </div>
      )}

      <button onClick={saveQuick} style={{width:"100%",padding:"12px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,color:"#fff",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",marginBottom:8}}>
        {saved?"✅ Saved — opening SOAP to sign…":"Save & Go to SOAP →"}
      </button>
      <div style={{display:"flex",gap:8}}>
        <button onClick={()=>sendHepWhatsApp(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a3}40`,background:`${PC.a3}10`,color:PC.a3,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📲 Send protocol — WhatsApp</button>
        <button onClick={()=>downloadHepPdf(data)} style={{flex:1,padding:"10px",borderRadius:9,border:`1px solid ${PC.a2}40`,background:`${PC.a2}10`,color:PC.a2,fontWeight:800,fontSize:"0.82rem",cursor:"pointer"}}>📄 PDF handout</button>
      </div>
    </div>
  );
}

function IntakeForm({ PC, onCancel, onSubmit }) {
  const [fd, setFd] = useState({});
  const [tab, setTab] = React.useState("essential");
  const set = (k,v) => setFd(p=>({...p,[k]:v}));
  const inp = {width:"100%",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.82rem",marginBottom:0};
  const lbl = {fontSize:"0.78rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.6px"};
  const field = (label, node) => (
    <div style={{marginBottom:12}}>
      <label style={lbl}>{label}</label>
      {node}
    </div>
  );
  const sel = (k, opts) => (
    <select style={inp} value={fd[k]||""} onChange={e=>set(k,e.target.value)}>
      <option value="">—</option>
      {opts.map(o=><option key={o}>{o}</option>)}
    </select>
  );
  const tabs = [{id:"essential",label:"Essential"},{id:"contact",label:"Contact"},{id:"clinical",label:"Clinical"},{id:"consent",label:"Consent"}];
  const tabStyle = (id) => ({
    padding:"6px 14px", borderRadius:8, border:"none", cursor:"pointer", fontSize:"0.8rem", fontWeight:tab===id?700:500,
    background: tab===id ? PC.accent : PC.s2,
    color: tab===id ? "#fff" : PC.muted,
  });
  const canSubmit = fd.dem_name?.trim() && fd.consent_treat;
  return (
    <div>
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {tabs.map(t=><button key={t.id} style={tabStyle(t.id)} onClick={()=>setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* Essential */}
      {tab==="essential" && (
        <div>
          {field("Full name *", <input style={inp} placeholder="e.g. Riya Sharma" value={fd.dem_name||""} onChange={e=>set("dem_name",e.target.value)} autoFocus/>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>{field("Date of birth", <input type="date" style={inp} value={fd.dem_dob||""} onChange={e=>set("dem_dob",e.target.value)}/>)}</div>
            <div>{field("Age", <input style={inp} type="number" placeholder="e.g. 34" value={fd.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>)}</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
            <div>{field("Sex", sel("dem_sex",["Female","Male","Non-binary","Prefer not to say"]))}</div>
            <div>{field("Dominant hand", sel("dem_hand",["Right","Left","Ambidextrous"]))}</div>
          </div>
          {field("Occupation", <input style={inp} placeholder="e.g. Teacher, Desk worker" value={fd.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>)}
          {field("Chief complaint *", <input style={inp} placeholder="e.g. Lower back pain, knee injury" value={fd.cc_main||""} onChange={e=>set("cc_main",e.target.value)}/>)}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div>{field("Pain now (0–10)", <input style={inp} type="number" min="0" max="10" placeholder="0–10" value={fd.cc_vas_now||""} onChange={e=>set("cc_vas_now",e.target.value)}/>)}</div>
            <div>{field("Duration", <input style={inp} placeholder="e.g. 3 weeks, 6 months" value={fd.cc_duration||""} onChange={e=>set("cc_duration",e.target.value)}/>)}</div>
          </div>
        </div>
      )}

      {/* Contact */}
      {tab==="contact" && (
        <div>
          {field("Phone number", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>)}
          {field("Email address", <input style={inp} type="email" placeholder="patient@email.com" value={fd.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
          {field("Address", <input style={inp} placeholder="Street, City, Postcode" value={fd.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>)}
          {field("Emergency contact name", <input style={inp} placeholder="Full name" value={fd.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}
          {field("Emergency contact phone", <input style={inp} type="tel" placeholder="+91 98765 43210" value={fd.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}
        </div>
      )}

      {/* Clinical */}
      {tab==="clinical" && (
        <div>
          {field("Referring doctor / GP", <input style={inp} placeholder="Dr. Name, Hospital" value={fd.dem_referral_dr||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
          {field("Referral source", sel("dem_referral_source",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
          {field("Insurance / Fund", <input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={fd.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
          {field("Policy / Member number", <input style={inp} placeholder="Optional" value={fd.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
          {field("Relevant medical history", <textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={fd.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
          {field("Current medications", <input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={fd.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
        </div>
      )}

      {/* Consent */}
      {tab==="consent" && (
        <div>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:14,marginBottom:14,fontSize:"0.82rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Consent to Treatment</strong><br/>
            I consent to physiotherapy assessment and treatment. I understand I may withdraw consent at any time. Treatment goals and procedures have been explained to me.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:14}}>
            <input type="checkbox" checked={!!fd.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>I consent to physiotherapy assessment and treatment <span style={{color:"#ef4444"}}>*</span></span>
          </label>
          <div style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,padding:14,marginBottom:14,fontSize:"0.82rem",color:PC.muted,lineHeight:1.6}}>
            <strong style={{color:PC.text}}>Data Storage Consent</strong><br/>
            Your clinical data is stored locally on this device only. It is not shared with third parties. You may request deletion at any time.
          </div>
          <label style={{display:"flex",alignItems:"flex-start",gap:10,cursor:"pointer",marginBottom:14}}>
            <input type="checkbox" checked={!!fd.consent_data} onChange={e=>set("consent_data",e.target.checked)} style={{marginTop:3,width:16,height:16,flexShrink:0}}/>
            <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:500}}>I consent to storage of my clinical data on this device</span>
          </label>
          {!fd.consent_treat && (
            <div style={{padding:"8px 12px",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.3)",borderRadius:8,fontSize:"0.78rem",color:"#ef4444",fontWeight:600}}>
              ⚠ Treatment consent is required to create a patient record.
            </div>
          )}
          <div style={{marginTop:12,padding:"8px 12px",background:PC.s3,borderRadius:8,fontSize:"0.75rem",color:PC.muted}}>
            Consent date: {new Date().toLocaleDateString("en-GB")} · Clinician: Dr. Demo
          </div>
        </div>
      )}

      <div style={{display:"flex",gap:10,marginTop:20}}>
        <button onClick={onCancel} style={{flex:1,padding:"10px",borderRadius:10,border:`1px solid ${PC.border}`,background:"transparent",color:PC.muted,fontWeight:700,cursor:"pointer",fontSize:"0.82rem"}}>Cancel</button>
        <button disabled={!canSubmit} onClick={()=>onSubmit(fd)} style={{flex:2,padding:"10px",borderRadius:10,border:"none",background:canSubmit?`linear-gradient(135deg,${PC.accent},${PC.a2})`:"#ccc",color:"#fff",fontWeight:800,cursor:canSubmit?"pointer":"not-allowed",fontSize:"0.82rem"}}>
          {canSubmit ? "Start Assessment →" : "Complete Consent tab first"}
        </button>
      </div>
    </div>
  );
}

function OnboardingModal({ PC, onDismiss }) {
  const STEPS = [
    { icon:"🩺", title:"Welcome to PhysioMind Pro", desc:"Your complete clinical assessment platform. AI-powered SOAP notes, posture analysis, outcome measures, and exercise prescription — all in one place.", color:"#7c3aed" },
    { icon:"👤", title:"Start with a Patient",        desc:'Tap "New Patient" on the dashboard to create a record. Fill in the name and chief complaint — everything else can be added as you go.',           color:"#0891b2" },
    { icon:"📋", title:"Assess Step by Step",          desc:"Work through the left-hand menu: Subjective → Posture → ROM → Special Tests → SOAP. Each module saves automatically as you type.",             color:"#059669" },
    { icon:"✨", title:"Generate SOAP & Send HEP",     desc:"Once assessed, use the SOAP module to generate an AI clinical note, then build a Home Exercise Programme and send it via WhatsApp or PDF.",   color:"#d97706" },
  ];
  const [step, setStep] = React.useState(0);
  const s = STEPS[step];
  return (
    <div onClick={onDismiss} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div onClick={e=>e.stopPropagation()} style={{background:PC.surface,borderRadius:20,padding:"28px 24px 22px",maxWidth:400,width:"100%",boxShadow:"0 24px 80px rgba(0,0,0,0.45)",border:`1px solid ${s.color}44`,textAlign:"center"}}>
        {/* Step dots */}
        <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:20}}>
          {STEPS.map((_,i)=>(<div key={i} style={{width:i===step?20:7,height:7,borderRadius:99,background:i===step?s.color:PC.border,transition:"all 0.3s"}}/>))}
        </div>
        <div style={{fontSize:"2.8rem",marginBottom:14,lineHeight:1}}>{s.icon}</div>
        <div style={{fontWeight:900,fontSize:"1.15rem",color:PC.text,marginBottom:10,letterSpacing:"-0.3px"}}>{s.title}</div>
        <div style={{fontSize:"0.88rem",color:PC.muted,lineHeight:1.65,marginBottom:24}}>{s.desc}</div>
        <div style={{display:"flex",gap:10,justifyContent:"center",alignItems:"center"}}>
          {step > 0 && (
            <button onClick={()=>setStep(n=>n-1)} style={{padding:"10px 18px",borderRadius:10,border:`1px solid ${PC.border}`,background:PC.s2,color:PC.muted,fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>← Back</button>
          )}
          {step < STEPS.length-1 ? (
            <button onClick={()=>setStep(n=>n+1)} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Next →</button>
          ) : (
            <button onClick={onDismiss} style={{flex:1,padding:"12px 20px",borderRadius:10,border:"none",background:s.color,color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer"}}>Let's go 🚀</button>
          )}
        </div>
        <button onClick={onDismiss} style={{marginTop:14,background:"none",border:"none",color:PC.muted,fontSize:"0.75rem",cursor:"pointer",textDecoration:"underline"}}>Skip tour</button>
      </div>
    </div>
  );
}

function AppInner({ currentUser, onSignOut }) {
  const { theme, toggle: toggleTheme, C: TC } = useTheme();

  // Apply theme to document root for CSS var support
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    // Apply background to body so no white flash
    document.body.style.background = TC.bg;
    document.body.style.color = TC.text;
  }, [theme, TC]);

  // Override module-level C with live theme colors for this render
  Object.assign(C, TC);

  const [active, setActive] = useState("home");
  const [navContext, setNavContext] = useState({});
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('pm_onboarded'));
  const [lastSaved, setLastSaved] = useState(null);

  // ── Deferred mounting: heavy tabs only render after first visit ──────────
  // This cuts initial render time dramatically
  // Once mounted, component stays mounted (data preserved)
  const [mountedTabs, setMountedTabs] = useState(new Set(["home", "demographics", "subjective"]));
  const [subjBodyChartTab, setSubjBodyChartTab] = useState(false);
  const [txTab, setTxTab] = useState("exercise");  // "exercise" | "tx" | "hep"
  // Heavy tabs — only mount on first visit
  const HEAVY_TABS = new Set([
    "posture", "ddx", "fms", "nkt", "cyriax",
    "fascia", "kinetic", "soap", "treatment", "exercise",
    "outcome", "special", "gait", "neuro", "palpation",
    "mmt", "rom", "dashboard", "reports",
  ]);

  // Wrapper: renders placeholder until tab first visited
  const DeferredMount = useCallback(({ tabKey, children }) => {
    const isMounted = mountedTabs.has(tabKey);
    const isActive = active === tabKey;
    if (!isMounted) return null;
    return (
      <div style={{ display: isActive ? "block" : "none" }}>
        {children}
      </div>
    );
  }, [mountedTabs, active]);

  // ── Hypothetical demo patient: Sarah Mitchell, 34F, chronic LBP ──────────
  const DEMO_DATA = {
    dem_name:"Sarah Mitchell", dem_age:"34", dem_gender:"Female", dem_occupation:"Graphic designer (desk-based, 8–10h/day)",
    dem_hand:"Right", dem_contact:"0412 345 678", dem_referral:"GP",

    // Subjective
    sub_complaint:"Chronic lower back pain, right worse than left, radiating into right buttock and posterior thigh to knee",
    sub_onset:"Gradual onset 18 months ago after new standing desk poorly adjusted. Worsened significantly 3 months ago after long-haul flight.",
    sub_mechanism:"Prolonged sitting/standing at workstation; exacerbated by forward bending, prolonged static postures",
    sub_behaviour:"Worse: sitting >30 min, morning stiffness for ~45 min, forward bending, end of workday. Better: walking, lying prone, heat pack. Constant dull ache 3–4/10 at rest; 7/10 with prolonged sitting.",
    sub_24hr:"Morning stiffness 30–45 min. Improves mid-morning. Worsens through afternoon. Difficulty sleeping in positions other than side-lying with pillow between knees.",
    sub_aggravating:"Prolonged sitting, driving >20 min, forward flexion, transitioning from sit to stand",
    sub_easing:"Short walks, heat, lying supine with knees bent",
    sub_vas:"5",
    sub_previous:"Episode 4 years ago resolved with physio. GP prescribed anti-inflammatories — minimal relief.",
    sub_medical:"No significant medical history. No bladder/bowel changes. No saddle anaesthesia. No unexplained weight loss.",
    sub_medications:"Ibuprofen 400mg PRN, oral magnesium",
    sub_goals:"Return to recreational running (5km x3/week), sit pain-free at work, reduce reliance on NSAIDs",

    // Red flags — all clear
    rf_malignancy:"No malignancy red flags",
    rf_cauda:"No cauda equina flags",
    rf_vascular:"No vascular red flags",
    rf_inflammatory:"No inflammatory red flags",
    rf_fracture:"No fracture red flags",
    rf_neuro:"No red flags — proceed with assessment",

    // Lumbar ROM
    lx_flex:"50", lx_ext:"15", lx_lat_left:"25", lx_lat_right:"18", lx_rot_left:"30", lx_rot_right:"22",
    lx_slr_left:"75", lx_slr_right:"52",

    // Special tests — lumbar
    lx_kemp_left:"Negative", lx_kemp_right:"Positive — reproduces right buttock pain",
    lx_slump_left:"Negative", lx_slump_right:"Positive — neural tension R",
    lx_prone_instability:"Negative",
    lx_psoas_left:"Normal", lx_psoas_right:"Tight",

    // Palpation
    lx_palpation:"L4/L5 R paraspinal tenderness +++. L5/S1 central PA stiff Grade IV+. Right SIJ posterior ligament tenderness ++. Right piriformis hypertonic.",

    // Neurological
    neuro_l4_reflex_left:"2+", neuro_l4_reflex_right:"2+",
    neuro_l5_motor_left:"5/5", neuro_l5_motor_right:"4+/5 — mild weakness great toe extension",
    neuro_s1_reflex_left:"2+", neuro_s1_reflex_right:"2+",
    neuro_dermatomal:"Mild paraesthesia right S1 distribution (lateral foot) on prolonged sitting — intermittent",

    // Posture
    posture_defect_anterior_pelvic_tilt: true,
    posture_defect_lumbar_hyperlordosis: true,
    posture_defect_forward_head: true,

    // Outcome measures
    om_psfs1:"Sitting at workstation for >30 min", om_psfs1_now:"3", om_psfs1_goal:"9",
    om_psfs2:"Recreational running 5km", om_psfs2_now:"1", om_psfs2_goal:"10",
    om_psfs3:"Long car journeys >20 min", om_psfs3_now:"2", om_psfs3_goal:"8",

    // Tx Techniques — Session 1
    tx_techniques: [
      { id:"t1", type:"manual", region:"Lumbar", technique:"PA Central", grade:"III", laterality:"Central", dosage:"3×60s oscillations", duration:"5 min", response:"ROM improved flexion from 50° to 62°. Pain eased from 5/10 to 3/10 during technique.", notes:"Performed at L4/L5 prone. Patient comfortable throughout.", savedAt:"2025-05-07T09:15:00Z" },
      { id:"t2", type:"manual", region:"Lumbar", technique:"PA Unilateral", grade:"III", laterality:"Right", dosage:"3×30s", duration:"3 min", response:"Reproduction of right buttock pain at Grade II — eased by Grade III. Good movement gain.", savedAt:"2025-05-07T09:22:00Z" },
      { id:"t3", type:"dn", dn_muscle:"Piriformis", laterality:"Right", dn_needles:"2", dn_depth:"40mm", dn_twitch:"Yes — elicited", notes:"Pistoning technique, needles retained 8 min, significant LTR on insertion. Post-needling stretch applied.", response:"Deep ache during LTR. Post-needling right buttock significantly less tender on palpation.", savedAt:"2025-05-07T09:35:00Z" },
      { id:"t4", type:"st", st_technique:"Deep tissue massage", st_region:"Right paraspinals L3–S1, right QL", laterality:"Right", duration:"6 min", dosage:"Moderate-deep pressure, longitudinal and cross-fibre strokes", response:"Palpation tenderness reduced from +++ to ++. Patient reported warmth and easing.", savedAt:"2025-05-07T09:45:00Z" },
    ],

    // HEP — Exercise Programme
    hep_programme: [
      { id:"knee_to_chest", name:"Knee-to-Chest Stretch", region:"lumbar", phase:"Phase 1", sets:"1", reps:"10", hold:"30", freq:"Daily", evidence:"A", customSets:"1", customReps:"10", customHold:"30", customFreq:"Daily", notes:"Gently pull both knees. Stop if sharp pain." },
      { id:"dead_bug", name:"Dead Bug", region:"lumbar", phase:"Phase 1", sets:"3", reps:"8", hold:"3", freq:"Daily", evidence:"A", customSets:"3", customReps:"8", customHold:"3", customFreq:"Daily", notes:"Keep lower back flat on floor throughout." },
      { id:"glute_bridge", name:"Glute Bridge", region:"lumbar", phase:"Phase 2", sets:"3", reps:"15", hold:"2", freq:"Daily", evidence:"A", customSets:"3", customReps:"15", customHold:"2", customFreq:"Daily", notes:"Squeeze glutes at top. Do not hyperextend lumbar." },
      { id:"hip_flexor_stretch", name:"Hip Flexor Couch Stretch", region:"lumbar", phase:"Phase 1", sets:"2", reps:"1", hold:"45", freq:"Daily", evidence:"B", customSets:"2", customReps:"1", customHold:"45", customFreq:"Daily", notes:"Both sides. Posteriorly tilt pelvis before stretching." },
    ],

    // Session Log — Session 1
    tx_sessions: [
      {
        id:"sess1", date:"07/05/2025", sessionNo:"1", type:"Initial Assessment",
        vasStart:"5", vasEnd:"3",
        treatmentGiven:"L4/L5 PA mobilisation Grade III (central + right unilateral). Dry needling right piriformis x2 needles — LTR elicited. Deep tissue massage right paraspinals and QL. HEP prescribed (Phase 1).",
        techniques:"Joint Mobilisation Grade III (PA Central, Lumbar, Central); Joint Mobilisation Grade III (PA Unilateral, Lumbar, Right); Dry Needling — Piriformis (Right), 2 needles, 40mm, LTR yes; Soft Tissue — Deep tissue massage — Right paraspinals L3–S1, right QL",
        hep:"Knee-to-Chest Stretch — 1×10, hold 30s, Daily; Dead Bug — 3×8, hold 3s, Daily; Glute Bridge — 3×15, hold 2s, Daily; Hip Flexor Couch Stretch — 2×1, hold 45s, Daily",
        response:"ROM improved L flexion 50°→62°, lateral flexion R improved 18°→24°. Pain reduced 5/10→3/10 post-treatment. Neural tension remains positive right slump — continue to monitor. Piriformis tenderness reduced significantly post-DN. Patient tolerated all techniques well.",
        nextPlan:"Reassess lumbar ROM and neural tension. Progress to Grade III/IV if pain settling. Add thoracic extension mobilisation. Progress to Phase 2 HEP (loading) if pain <3/10 sustained. Review sitting posture and workstation setup — consider ergonomic referral.",
        goals:"ST goal: Sit pain-free >30 min within 4 weeks. MT goal: Return to running 3 months. Patient motivated and engaged.",
        clinician:"Dr. J. Thompson (APAM)", notes:"Consent obtained. Informed of DN risks. Next appointment in 1 week.",
        savedAt:"2025-05-07T10:10:00Z"
      }
    ],
  };

  const [data, setData] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const draft = raw && raw.pid ? raw.data : (raw && !raw.pid ? raw : null);
      if (draft && Object.keys(draft).length > 5) return draft;
    } catch {}
    return {};
  });
  const [draftRestored, setDraftRestored] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const draft = raw && raw.pid ? raw.data : (raw && !raw.pid ? raw : null);
      return !!(draft && Object.keys(draft).length > 5);
    } catch { return false; }
  });
  const [showDx, setShowDx] = useState(false);
  const [dx, setDx] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [expandedDx, setExpandedDx] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  // bnavHidden removed — bottom nav is now always visible
  const [bnavTab, setBnavTab] = useState(null); // null=no panel open, or "assessment"|"advanced"|"treatment"|"documentation"|"top"
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileSearchQ, setMobileSearchQ] = useState("");
  const [showJsonPanel, setShowJsonPanel] = useState(false);
  const [jsonImportText, setJsonImportText] = useState("");
  const [jsonMsg, setJsonMsg] = useState(null);
  const importRef = useRef(null);

  // ── Multi-Patient Database ─────────────────────────────────────────────
  const [patients, setPatients] = useState(() => loadPatientDB());
  const [taskDB, setTaskDB] = useState(() => loadTaskDB());

  // ── Supabase: load patients on mount and merge with localStorage ──────────
  useEffect(() => {
    supabase.from("patients").select("*")
      .eq("user_id", currentUser?.id || "")
      .order("updated_at", { ascending: false })
      .then(({ data: rows, error }) => {
        if (error || !rows || rows.length === 0) return;
        const remote = rows.map(r => ({
          id: r.id,
          name: r.name,
          data: r.data || {},
          createdAt: r.created_at,
          updatedAt: r.updated_at,
          hasRedFlags: r.has_red_flags || false,
          lastDx: r.last_dx || "",
        }));
        setPatients(prev => {
          const localMap = new Map(prev.map(p => [p.id, p]));
          const remoteMap = new Map(remote.map(p => [p.id, p]));
          const allIds = new Set([...localMap.keys(), ...remoteMap.keys()]);
          const merged = [];
          for (const id of allIds) {
            const loc = localMap.get(id);
            const rem = remoteMap.get(id);
            if (!loc) { merged.push(rem); continue; }
            if (!rem) { merged.push(loc); continue; }
            const lt = new Date(loc.updatedAt || 0).getTime();
            const rt = new Date(rem.updatedAt || 0).getTime();
            merged.push(rt >= lt ? rem : loc);
          }
          merged.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
          try { localStorage.setItem(DB_KEY, JSON.stringify(merged)); } catch {}
          return merged;
        });
      });
  }, []);

  // ── Auto-save draft to localStorage (2s debounce) ─────────────────────
  // activePatientId captured via closure — NOT in deps to avoid Rollup TDZ bug
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;
    const pid = activePatientId;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: pid || null, data }));
        setLastSaved(new Date());
      } catch {}
    }, 2000);
    return () => clearTimeout(timer);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Task helpers ─────────────────────────────────────────────────────────
  const saveTasks = (tasks) => { setTaskDB(tasks); saveTaskDB(tasks); };

  const completeTask = (taskId) => {
    setTaskDB(prev => {
      const updated = prev.map(t =>
        t.id === taskId
          ? { ...t, status:"completed", completedAt: new Date().toISOString() }
          : t
      );
      saveTaskDB(updated);
      return updated;
    });
  };

  const dismissTask = (taskId) => {
    setTaskDB(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      saveTaskDB(updated);
      return updated;
    });
  };

  const addOrUpdateTask = (task) => {
    setTaskDB(prev => {
      // Don't duplicate — check by templateId
      const exists = prev.find(t => t.templateId === task.templateId && t.status !== "completed");
      if (exists) return prev;
      const updated = [task, ...prev];
      saveTaskDB(updated);
      return updated;
    });
  };
  const [activePatientId, setActivePatientId] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      return (raw && raw.pid) ? raw.pid : null;
    } catch { return null; }
  });
  const [showPatientDb, setShowPatientDb] = useState(false);
  const [showUnsaved, setShowUnsaved] = useState(false);
  const [pendingPatient, setPendingPatient] = useState(null);
  const [showPdfReports, setShowPdfReports] = useState(false);
  const [profilePatient, setProfilePatient] = useState(null);
  const [profileTab, setProfileTab] = useState(null);
  const [showIntake, setShowIntake] = useState(false);
  const [intakeData, setIntakeData] = useState({});

  // Auto-save current data to active patient whenever data changes
  useEffect(() => {
    if (!activePatientId) return;
    setPatients(prev => {
      const updated = prev.map(p => p.id === activePatientId ? {
        ...p,
        data,
        name: data["dem_name"] || p.name || "Unnamed Patient",
        updatedAt: new Date().toISOString(),
        hasRedFlags: (()=>{
          // Check both old rf_* fields and new grf_* fields used in SubjectiveModule
          const oldFields = ["rf_malignancy","rf_cauda","rf_vascular","rf_inflammatory","rf_fracture","rf_neuro"];
          const oldSafe = ["No malignancy red flags","No cauda equina flags","No vascular red flags","No inflammatory red flags","No fracture red flags","No neurological red flags","No red flags — proceed with assessment"];
          const oldHit = oldFields.flatMap(fid=>(typeof data[fid]==="string"?data[fid]:"").split("|||")).filter(v=>v&&!oldSafe.includes(v)).length>0;
          // grf_action: if not "No red flags — proceed with assessment", a flag is present
          const grfAction = data.grf_action||"";
          const grfHit = grfAction && grfAction !== "No red flags — proceed with assessment";
          // Any region rf_action set to something other than safe
          const regionRfHit = ["cx","lx","hp","shl","shr","knl","knr","af","ew","tx"].some(px=>{
            const v = data[`${px}_rf_action`]||"";
            return v && v !== "No red flags — proceed" && v !== "No red flags — proceed with assessment" && v !== "No concerns — proceed";
          });
          return oldHit || grfHit || regionRfHit;
        })()
      } : p);
      savePatientDB(updated);
      return updated;
    });
  }, [data, activePatientId]);

  const createNewPatient = () => {
    setIntakeData({});
    setShowIntake(true);
    setShowPatientDb(false);
  };
  const finaliseNewPatient = (intake) => {
    const name = intake.dem_name || "New Patient";
    const newP = { id: genId(), name, data: intake, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: intake.cc_main||"" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated);
    setData(intake);
    setActivePatientId(newP.id);
    setShowIntake(false);
    navTo("subjective");
    setJsonMsg({ type:"success", text:`✅ Patient created: ${name}` });
    setTimeout(() => setJsonMsg(null), 2500);
  };

  const selectPatient = (p) => {
    const hasChanges = Object.keys(data).length > 0 && activePatientId !== p.id;
    if (hasChanges) { setPendingPatient(p); setShowUnsaved(true); return; }
    // Load patient data; ignore any draft that belongs to a different patient
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      const draftPid = raw && raw.pid ? raw.pid : null;
      const draftData = raw && raw.pid ? raw.data : null;
      if (draftPid === p.id && draftData && Object.keys(draftData).length > 5) {
        setData(draftData); // restore draft for THIS patient only
      } else {
        setData(p.data || {}); // use saved data, ignore other patient's draft
        try { if (draftPid && draftPid !== p.id) localStorage.removeItem(DRAFT_KEY); } catch {}
      }
    } catch {
      setData(p.data || {});
    }
    setActivePatientId(p.id);
    setShowPatientDb(false);
    setJsonMsg({ type:"success", text:`✅ Loaded: ${p.name || "Patient"}` });
    setTimeout(() => setJsonMsg(null), 2500);
  };

  const confirmSwitchPatient = (save) => {
    if (save && activePatientId) {
      setPatients(prev => {
        const updated = prev.map(p => p.id === activePatientId ? { ...p, data, name: data["dem_name"] || p.name, updatedAt: new Date().toISOString() } : p);
        savePatientDB(updated);
        return updated;
      });
    }
    if (pendingPatient) {
      setData(pendingPatient.data || {});
      setActivePatientId(pendingPatient.id);
      setShowPatientDb(false);
    }
    setPendingPatient(null);
    setShowUnsaved(false);
  };

  const deletePatient = (id) => {
    if (!window.confirm("Delete this patient? This cannot be undone.")) return;
    const updated = patients.filter(p => p.id !== id);
    setPatients(updated);
    savePatientDB(updated);
    if (activePatientId === id) { setData({}); setActivePatientId(null); }
    setJsonMsg({ type:"success", text:"Patient deleted" });
    setTimeout(() => setJsonMsg(null), 2000);
  };

  const importPatientFromJSON = (parsed) => {
    if (!parsed.data) return;
    const newP = { id: genId(), name: parsed.patientName || parsed.data?.dem_name || "Imported Patient", data: parsed.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: parsed.lastDx || "" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated);
    setData(newP.data);
    setActivePatientId(newP.id);
    setShowPatientDb(false);
    setJsonMsg({ type:"success", text:`✅ Imported: ${newP.name}` });
    setTimeout(() => setJsonMsg(null), 3000);
  };

  const activePatient = patients.find(p => p.id === activePatientId) || null;

  // ── Optimised set function ──────────────────────────────────────────────
  // set(obj) — SubjectiveModule style (passes whole data object)
  // set(id, val) — legacy field-by-field style
  const set = useCallback((idOrObj, val) => {
    if (typeof idOrObj === "object" && idOrObj !== null) {
      // New style: set({ ...data, field: value }) — merge over current state to avoid stale overwrites
      setData(prev => ({ ...prev, ...idOrObj }));
    } else {
      // Legacy style: set("field_id", value)
      setData(prev => ({ ...prev, [idOrObj]: val }));
    }
  }, []);
  const sections = Object.entries(ALL_TESTS);
  const currentSection = ALL_TESTS[active];
  const completedCount = Object.keys(data).filter(k=>data[k]&&data[k]!=="").length;

  // ── Red flag detection ─────────────────────────────────────────────────
  const RED_FLAG_FIELDS = ["rf_malignancy","rf_cauda","rf_vascular","rf_inflammatory","rf_fracture","rf_neuro"];
  const SAFE_VALUES = ["No malignancy red flags","No cauda equina flags","No vascular red flags","No inflammatory red flags","No fracture red flags","No neurological red flags","No red flags — proceed with assessment"];
  const activeRedFlags = RED_FLAG_FIELDS.flatMap(fid => {
    const val = data[fid] || "";
    if (!val) return [];
    return (typeof val==="string"?val:"").split("|||").filter(v => v && !SAFE_VALUES.includes(v));
  });
  const hasRedFlags = activeRedFlags.length > 0;

  // Cauda equina = urgent
  const urgentFlags = activeRedFlags.filter(f =>
    f.includes("Bladder") || f.includes("Bowel") || f.includes("Saddle") ||
    f.includes("Bilateral leg weakness") || f.includes("cauda") || f.includes("Cauda")
  );

  // ── JSON export ────────────────────────────────────────────────────────
  const exportJSON = () => {
    const payload = {
      version: "PostureApp_v4",
      exportedAt: new Date().toISOString(),
      patientName: data["dem_name"] || "Unknown",
      data
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assessment_${(data["dem_name"]||"patient").replace(/\s+/g,"_")}_${new Date().toLocaleDateString("en-GB").replace(/\//g,"-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    // Also update lastDx on patient record
    if (activePatientId && dx) {
      setPatients(prev => {
        const updated = prev.map(p => p.id === activePatientId ? {...p, lastDx: dx.dx?.[0]?.label || ""} : p);
        savePatientDB(updated);
        return updated;
      });
    }
    setJsonMsg({type:"success", text:"✅ Assessment exported successfully!"});
    setTimeout(()=>setJsonMsg(null), 3000);
  };

  const importJSON = () => {
    try {
      const parsed = JSON.parse(jsonImportText);
      if (!parsed.data) throw new Error("Invalid file — missing data field");
      setData(parsed.data);
      setJsonImportText("");
      setShowJsonPanel(false);
      setJsonMsg({type:"success", text:`✅ Assessment loaded: ${parsed.patientName || "Patient"}`});
      setTimeout(()=>setJsonMsg(null), 4000);
    } catch(e) {
      setJsonMsg({type:"error", text:`❌ Import failed: ${e.message}`});
      setTimeout(()=>setJsonMsg(null), 4000);
    }
  };

  const importFromFile = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { setJsonImportText(ev.target.result); importJSON(); };
    reader.readAsText(file);
  };

  const runDx = () => { setDx(generateDiagnosis(data)); setShowDx(true); };
  const navTo = useCallback((key, ctx = {}) => {
    setActive(key);
    setNavContext(ctx);
    setNavOpen(false);
    // Mount tab on first visit
    setMountedTabs(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  }, []);

  const Field = useCallback(({t})=>{
    const base = { width:"100%", background:PC.s3, border:`1px solid ${PC.border}`, borderRadius:8, color:PC.text, fontFamily:"inherit", outline:"none", padding:"8px 10px", fontSize:"0.8rem" };
    const val = data[t.id]||"";

    if(t.type==="bilateral_num"){
      return (
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["_left","LEFT"],["_right","RIGHT"]].map(([sfx,side])=>{
            const sv=data[t.id+sfx]||"",num=parseFloat(sv);
            const col=isNaN(num)?PC.muted:num<(t.normal||0)*0.8?PC.red:num<(t.normal||0)*0.9?PC.yellow:PC.green;
            return(
              <div key={sfx}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:col,marginBottom:3}}>{side} {!isNaN(num)&&num<(t.normal||0)*0.8?"⚠ LIMITED":""}</div>
                <input type="number" value={sv} onChange={e=>set(t.id+sfx,e.target.value)} placeholder={`N=${t.normal||""}°`} style={{...base,borderColor:!isNaN(num)&&num<(t.normal||0)*0.8?PC.red:PC.border}} />
              </div>
            );
          })}
        </div>
      );
    }
    if(t.type==="bilateral_select"){
      const isProb=v=>v&&(v.includes("Positive")||v.includes("Inhibited")||v.includes("tightness")||v.includes("Significant")||v.includes("Abnormal"));
      return(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          {[["_left","LEFT"],["_right","RIGHT"]].map(([sfx,side])=>{
            const sv=data[t.id+sfx]||"",prob=isProb(sv);
            return(
              <div key={sfx}>
                <div style={{fontSize:"0.82rem",fontWeight:700,color:prob?PC.red:PC.muted,marginBottom:3}}>{side} {prob?"⚠":""}</div>
                <select value={sv} onChange={e=>set(t.id+sfx,e.target.value)} style={{...base,borderColor:prob?PC.red:PC.border}}>
                  <option value="">— select —</option>
                  {t.options.map(o=><option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      );
    }
    if(t.type==="select"||t.type==="select3"){
      const prob=val&&(val.includes("Positive")||val.includes("REFER")||val.includes("Inhibited")||val.includes("Absent")||val.includes("Severe")||val.includes("Moderate")||val.includes("Significant"));
      return(<select value={val} onChange={e=>set(t.id,e.target.value)} style={{...base,borderColor:prob?PC.red:PC.border}}><option value="">— select —</option>{t.options.map(o=><option key={o} value={o}>{o}</option>)}</select>);
    }
    if(t.type==="textarea") return(<textarea value={val} onChange={e=>set(t.id,e.target.value)} placeholder={t.placeholder||""} style={{...base,resize:"vertical",minHeight:64,display:"block"}}/>);
    if(t.type==="num") return(<input type="number" value={val} onChange={e=>set(t.id,e.target.value)} placeholder={t.placeholder||""} style={base}/>);
    return(<input type={t.type||"text"} value={val} onChange={e=>set(t.id,e.target.value)} placeholder={t.placeholder||""} style={base}/>);
  },[data,set]);

  const sysColors={CPA:C.blue,STTT:PC.yellow,FMS:PC.green,Posture:PC.purple,"Kinetic Chain":PC.accent,Fascia:"#f97316","Muscle Activation":PC.purple,Structural:PC.red};

  // shared sidebar list renderer used by both desktop sidebar and mobile drawer
  // ── Collapsible sidebar state ──
  const [sidebarOpen, setSidebarOpen] = React.useState({ assessment:true, advanced:false, treatment:false, documentation:false });
  const toggleSidebar = (key) => setSidebarOpen(p=>({...p,[key]:!p[key]}));

  // Helper: get completion % for a nav key
  const getSectionPct = (key) => {
    const sec = ALL_TESTS[key];
    if(!sec) return 0;
    const allT=Object.values(sec.groups||{}).flat().filter(t=>typeof t==="object"&&t.id);
    const nktT=key==="nkt"?Object.values(NKT_REGIONS||{}).flatMap(r=>r.tests||[]).map(t=>t.id):[];
    const kcT=key==="kinetic"?Object.values(KC_REGIONS||{}).flatMap(r=>r.tests||[]).map(t=>t.id):[];
    const fmaKeys=key==="fma"?Object.keys(MOVEMENTS||{}).map(m=>`fma_${m}`):[];
    const subjKeys=key==="subjective"?[
      ...Object.values(UNIV_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
      ...Object.values(REG_MOD_S||{}).flatMap(mod=>Object.values(mod.sections||mod||{}).flatMap(s=>s.fields?s.fields.map(f=>f.id):[])),
      ...Object.values(BPS_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
      ...Object.values(SLEEP_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
      ...Object.values(SPORT_S||{}).flatMap(s=>s.fields.map(f=>f.id)),
    ]:[];
    const neuroKeys=key==="neuro"?[...( DERMATOMES||[]).flatMap(d=>[d.id+"_left",d.id+"_right"]),...(REFLEXES||[]).flatMap(r=>[r.id+"_left",r.id+"_right"]),...(NEURAL_TENSION||[]).flatMap(nt=>[nt.id+"_left",nt.id+"_right"]),...(RED_FLAGS_NEURO||[]).map(rf=>rf.id)]:[];
    const allKeys=[...allT.map(t=>t.id),...nktT,...kcT,...fmaKeys,...subjKeys,...neuroKeys];
    const filled=allKeys.filter(id=>data[id]&&data[id]!=="").length;
    const total=allT.length+nktT.length+kcT.length+fmaKeys.length+subjKeys.length+neuroKeys.length;
    return total>0?Math.round(filled/total*100):0;
  };

  // Sidebar nav item renderer
  const SidebarItem = ({ navKey, icon, label }) => {
    const isAct = active === navKey;
    const pct = getSectionPct(navKey);
    return (
      <div onClick={()=>navTo(navKey)} style={{
        padding:"8px 12px 8px 28px", cursor:"pointer", margin:"1px 6px",
        borderRadius:8,
        background: isAct ? "rgba(124,58,237,0.10)" : "transparent",
        borderLeft: isAct ? "3px solid #7c3aed" : "3px solid transparent",
        transition:"all 0.15s",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <span style={{fontSize:"0.82rem",opacity:isAct?1:0.65,flexShrink:0}}>{icon}</span>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:"0.74rem",fontWeight:isAct?700:500,color:isAct?"#7c3aed":PC.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
              {label}
            </div>
            {pct>0&&(
              <div style={{marginTop:3,height:2,borderRadius:2,background:PC.border}}>
                <div style={{height:"100%",width:`${pct}%`,background:pct===100?PC.green:pct>60?PC.yellow:"#7c3aed",borderRadius:2,transition:"width 0.4s"}}/>
              </div>
            )}
          </div>
          {pct===100&&<span style={{fontSize:"0.75rem",color:PC.green,flexShrink:0,fontWeight:800}}>✓</span>}
          {pct>0&&pct<100&&<span style={{fontSize:"0.75rem",color:PC.muted,flexShrink:0,fontWeight:600,background:PC.s2,padding:"1px 4px",borderRadius:4}}>{pct}%</span>}
        </div>
      </div>
    );
  };

  // Collapsible group header
  const SidebarGroup = ({ groupKey, icon, label, children, accentColor="#7c3aed" }) => {
    const isOpen = sidebarOpen[groupKey];
    return (
      <div style={{marginBottom:2}}>
        <div onClick={()=>toggleSidebar(groupKey)} style={{
          display:"flex",alignItems:"center",gap:7,
          padding:"9px 12px",margin:"2px 6px",cursor:"pointer",borderRadius:8,
          background: isOpen ? `${accentColor}0d` : "transparent",
          border:`1px solid ${isOpen ? accentColor+"28" : "transparent"}`,
          transition:"all 0.15s",
        }}>
          <span style={{fontSize:"0.85rem",flexShrink:0}}>{icon}</span>
          <div style={{flex:1,fontSize:"0.82rem",fontWeight:700,color:isOpen?accentColor:PC.text,textTransform:"uppercase",letterSpacing:"0.5px"}}>{label}</div>
          <span style={{fontSize:"0.75rem",color:isOpen?accentColor:PC.muted,transition:"transform 0.2s",display:"inline-block",transform:isOpen?"rotate(0deg)":"rotate(-90deg)"}}>▾</span>
        </div>
        {isOpen && (
          <div style={{paddingBottom:4}}>
            {children}
          </div>
        )}
      </div>
    );
  };

  // Top-level nav item (no indent)
  const SidebarTopItem = ({ navKey, icon, label }) => {
    const isAct = active === navKey;
    return (
      <div onClick={()=>navTo(navKey)} style={{
        display:"flex",alignItems:"center",gap:8,
        padding:"9px 14px",margin:"1px 6px",cursor:"pointer",borderRadius:9,
        background:isAct?"rgba(124,58,237,0.10)":"transparent",
        border:`1px solid ${isAct?"rgba(124,58,237,0.25)":"transparent"}`,
        transition:"all 0.15s",
      }}>
        <span style={{fontSize:"0.9rem",opacity:isAct?1:0.7}}>{icon}</span>
        <div style={{fontSize:"0.76rem",fontWeight:isAct?700:600,color:isAct?"#7c3aed":PC.text}}>{label}</div>
      </div>
    );
  };

  const SidebarItems = ({ onNav }) => (
    <>
      {/* Greeting */}
      <div style={{padding:"10px 12px 8px",display:"flex",alignItems:"center",gap:8}}>
        <span style={{fontSize:"1.05rem"}}>👋</span>
        <div>
          <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.text,lineHeight:1.2}}>Hello, Dr {currentUser?.user_metadata?.full_name?.split(" ")[0]||currentUser?.email?.split("@")[0]||"Doctor"}</div>
          <div style={{fontSize:"0.78rem",color:PC.muted}}>{new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"})}</div>
        </div>
      </div>

      {/* Patient controls */}
      <div style={{padding:"4px 8px 12px",borderBottom:`1px solid ${PC.border}`,marginBottom:8}}>
        <button onClick={()=>setShowPatientDb(true)} style={{width:"100%",padding:"9px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:"#9333ea",fontWeight:600,fontSize:"0.8rem",cursor:"pointer",marginBottom:5,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          👥 {patients.length} Patient{patients.length!==1?"s":""}
        </button>
        <button onClick={createNewPatient} style={{width:"100%",padding:"8px 10px",background:"rgba(5,150,105,0.06)",border:`1px solid ${PC.a3}25`,borderRadius:8,color:PC.a3,fontWeight:600,fontSize:"0.78rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
          ＋ New Patient
        </button>

        {/* ── Active patient + PDF buttons ── */}
        {data.dem_name && (
          <div style={{marginTop:8,background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.18)",borderRadius:9,padding:"8px 10px"}}>
            {/* Patient name pill */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0,display:"inline-block"}}/>
              <span style={{fontSize:"0.78rem",fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{data.dem_name}</span>
              {data.dem_age && <span style={{fontSize:"0.72rem",color:"#64748b",flexShrink:0}}>{data.dem_age}y</span>}
            </div>
            {/* PDF download buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
              <button
                onClick={()=>{ setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="assessment"]'); if(el) el.click(); },300); }}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#1a3a5c,#2563eb)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(37,99,235,0.3)"}}>
                📋 Assessment
              </button>
              <button
                onClick={()=>{ setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="treatment"]'); if(el) el.click(); },300); }}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#065f46,#059669)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(5,150,105,0.3)"}}>
                🗒️ Treatment
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 1. Home */}
      <SidebarTopItem navKey="home" icon="🏠" label="Home"/>

      {/* 2. Dashboard */}
      <SidebarTopItem navKey="dashboard" icon="📊" label="Dashboard"/>

      <div style={{height:1,background:PC.border,margin:"6px 12px"}}/>

      {/* 3. Assessment (collapsible) */}
      <SidebarGroup groupKey="assessment" icon="🩺" label="Assessment" accentColor="#7c3aed">
        <SidebarItem navKey="demographics"   icon="👤" label="Demographics"/>
        <SidebarItem navKey="subjective"    icon="📝" label="Subjective Assessment"/>
        <SidebarItem navKey="posture"       icon="🧍" label="Posture Analysis"/>
        <SidebarItem navKey="observation"   icon="👁️" label="Observation"/>
        <SidebarItem navKey="palpation"     icon="🖐️" label="Palpation"/>
        <SidebarItem navKey="rom"           icon="📐" label="Range of Motion"/>
        <SidebarItem navKey="mmt"           icon="💪" label="MMT"/>
        <SidebarItem navKey="special"       icon="🔬" label="Special Tests (100+)"/>
        <SidebarItem navKey="neuro"         icon="⚡" label="Neurological"/>
        <SidebarItem navKey="outcome"       icon="📈" label="Outcome Measures"/>
      </SidebarGroup>

      {/* 4. Advanced Clinical Assessment (collapsible) */}
      <SidebarGroup groupKey="advanced" icon="🔭" label="Advanced Assessment" accentColor="#9333ea">
        <SidebarItem navKey="fma"          icon="🏃" label="Functional Assessment"/>
        <SidebarItem navKey="gait"         icon="🚶" label="Gait Analysis"/>
        <SidebarItem navKey="cyriax_full"  icon="🦴" label="STTT — Selective Tissue Tension"/>
        <SidebarItem navKey="kinetic"      icon="⛓️" label="Kinetic Chain"/>
        <SidebarItem navKey="nkt"          icon="🧠" label="CPA — Compensation Pattern Analysis"/>
        <SidebarItem navKey="fascia"       icon="🕸️" label="Fascia Integration"/>
      </SidebarGroup>

      {/* 5. Treatment (collapsible) */}
      <SidebarGroup groupKey="treatment" icon="💊" label="Treatment" accentColor="#059669">
        <SidebarItem navKey="treatment"    icon="💊" label="Treatment"/>
      </SidebarGroup>

      {/* 6. Documentation (collapsible) */}
      <SidebarGroup groupKey="documentation" icon="📋" label="Documentation" accentColor="#b45309">
        <SidebarItem navKey="tx_sessions"  icon="⚡" label="Quick Visit"/>
        <SidebarItem navKey="soap"         icon="📋" label="SOAP Notes"/>
        <SidebarItem navKey="ai_assistant" icon="🤖" label="AI Assistant"/>
      </SidebarGroup>



    </>
  );

  return(
    <div className="pm-shell" style={{background:PC.bg,color:PC.text,fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",transition:"background 0.2s,color 0.15s"}}>
      <MobileStyleInjector/>

      {/* ── Onboarding Modal — fires once on first visit ─────────────────── */}
      {showOnboarding&&<OnboardingModal PC={PC} onDismiss={()=>{ localStorage.setItem("pm_onboarded","1"); setShowOnboarding(false); }}/>}

      {/* Info Modal */}
      {infoModal&&(
        <div onClick={()=>setInfoModal(null)} className="pm-modal-wrap" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:999,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} className="pm-modal-box" style={{background:PC.surface,border:`1px solid ${PC.accent}40`,borderRadius:14,padding:24,maxWidth:500,width:"100%",maxHeight:"82vh",overflowY:"auto"}}>
            <div style={{fontWeight:800,color:PC.accent,marginBottom:14,fontSize:"1rem"}}>{infoModal.label}</div>
            {infoModal.sig&&<div style={{marginBottom:12}}><div style={{fontSize:"0.82rem",fontWeight:700,color:PC.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>📊 Significance</div><div style={{background:PC.s2,borderRadius:8,padding:12,fontSize:"0.8rem",color:PC.text,lineHeight:1.7}}>{infoModal.sig}</div></div>}
            {infoModal.how&&<div style={{marginBottom:16}}><div style={{fontSize:"0.82rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>👐 How to Perform</div><div style={{background:PC.s2,borderRadius:8,padding:12,fontSize:"0.8rem",color:PC.text,lineHeight:1.7}}>{infoModal.how}</div></div>}
            <button onClick={()=>setInfoModal(null)} style={{padding:"10px 20px",background:PC.a2,border:"none",borderRadius:8,color:"#fff",fontWeight:700,cursor:"pointer",width:"100%",fontSize:"0.85rem"}}>Close</button>
          </div>
        </div>
      )}

      {/* Mobile nav overlay */}
      {navOpen&&<div className="pm-nav-overlay" onClick={()=>setNavOpen(false)}/>}

      {/* ── PATIENT DATABASE PANEL ── */}
      {showPatientDb && (
        <PatientDatabasePanel
          patients={patients}
          activeId={activePatientId}
          onSelect={selectPatient}
          onNew={createNewPatient}
          onDelete={deletePatient}
          onClose={()=>setShowPatientDb(false)}
          onImport={importPatientFromJSON}
          onNav={(key)=>{ setShowPatientDb(false); navTo(key); }}
          liveData={data}
        />
      )}

      {/* ── PATIENT PROFILE MODAL (from bar or dashboard) ── */}
      {profilePatient && !showPatientDb && (
        <PatientProfileModal
          patient={(()=>{
            const fresh = patients.find(p=>p.id===profilePatient.id) || profilePatient;
            return fresh.id===activePatientId
              ? {...fresh, data:{...fresh.data,...data}}
              : fresh;
          })()}
          onClose={()=>{ setProfilePatient(null); setProfileTab(null); }}
          onLoadAssessment={(p)=>{ selectPatient(p); setProfilePatient(null); }}
          onSaveField={(id,newData)=>{
            setPatients(prev=>prev.map(p=>p.id===id?{...p,data:{...p.data,...newData},name:newData.dem_name||p.name,updatedAt:new Date().toISOString()}:p));
          }}
          onNav={(key)=>{ if(key==="demographics"){ setProfileTab("demographics"); } else { setProfilePatient(null); setProfileTab(null); navTo(key); } }}
          initialTab={profileTab||undefined}
        />
      )}

      {/* ── NEW PATIENT INTAKE MODAL ── */}
      {showIntake && (
        <div style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{width:"100%",maxWidth:420,background:PC.surface,borderRadius:16,padding:"24px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:4}}>New patient</div>
            <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:20}}>Fill the basics — you can add more detail later</div>
            <IntakeForm PC={PC} onCancel={()=>setShowIntake(false)} onSubmit={finaliseNewPatient}/>
          </div>
        </div>
      )}

      {/* ── PDF REPORTS MODAL ── */}
      {showPdfReports && (
        <PdfReportsModal
          data={data}
          dx={dx}
          patients={patients}
          onClose={()=>setShowPdfReports(false)}
        />
      )}

      {/* ── UNSAVED CHANGES DIALOG ── */}
      {showUnsaved && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0e1118",border:"1px solid rgba(255,179,0,0.3)",borderRadius:14,padding:24,maxWidth:380,width:"100%"}}>
            <div style={{fontSize:"1.2rem",marginBottom:8}}>⚠️</div>
            <div style={{fontWeight:800,color:"#1a1025",fontSize:"0.92rem",marginBottom:6}}>Unsaved Changes</div>
            <div style={{fontSize:"0.78rem",color:"#5a7090",marginBottom:20,lineHeight:1.6}}>
              You have unsaved changes for <strong style={{color:"#1a1025"}}>{activePatient?.name || "this patient"}</strong>. What would you like to do?
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button onClick={()=>confirmSwitchPatient(true)} style={{padding:"11px",background:"linear-gradient(135deg,#00e5ff,#7f5af0)",border:"none",borderRadius:9,color:"#000",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                💾 Save & Switch Patient
              </button>
              <button onClick={()=>confirmSwitchPatient(false)} style={{padding:"11px",background:"rgba(255,179,0,0.1)",border:"1px solid rgba(255,179,0,0.3)",borderRadius:9,color:"#ffb300",fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>
                ↩ Discard Changes & Switch
              </button>
              <button onClick={()=>{setShowUnsaved(false);setPendingPatient(null);}} style={{padding:"10px",background:"transparent",border:"1px solid rgba(255,255,255,0.08)",borderRadius:9,color:"#5a7090",fontSize:"0.78rem",cursor:"pointer"}}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PERSISTENT RED FLAG ALERT BANNER ── */}
      {hasRedFlags && (
        <div style={{position:"sticky",top:54,zIndex:98,background:urgentFlags.length>0?"rgba(255,77,109,0.97)":"rgba(255,179,0,0.95)",borderBottom:`2px solid ${urgentFlags.length>0?"#ff4d6d":"#ffb300"}`,padding:"8px 20px",display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
            <span style={{fontSize:"1.1rem"}}>{urgentFlags.length>0?"🚨":"⚠️"}</span>
            <div>
              <div style={{fontWeight:800,fontSize:"0.78rem",color:"#000"}}>{urgentFlags.length>0?"URGENT RED FLAGS DETECTED":"RED FLAGS PRESENT"}</div>
              <div style={{fontSize:"0.82rem",color:"rgba(0,0,0,0.7)",fontWeight:600}}>{urgentFlags.length>0?"Do not proceed — refer immediately":"Review before proceeding with treatment"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",flex:1}}>
            {activeRedFlags.slice(0,4).map((f,i)=>(
              <span key={i} style={{background:"rgba(0,0,0,0.18)",borderRadius:6,padding:"2px 8px",fontSize:"0.82rem",fontWeight:700,color:"#000"}}>{f}</span>
            ))}
            {activeRedFlags.length>4&&<span style={{background:"rgba(0,0,0,0.18)",borderRadius:6,padding:"2px 8px",fontSize:"0.82rem",fontWeight:700,color:"#000"}}>+{activeRedFlags.length-4} more</span>}
          </div>
          <button onClick={()=>navTo("subjective")} style={{background:"rgba(0,0,0,0.2)",border:"1px solid rgba(0,0,0,0.3)",borderRadius:7,color:"#000",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",padding:"4px 10px",flexShrink:0,whiteSpace:"nowrap"}}>View →</button>
          <button onClick={()=>{
            const now = new Date();
            const entry = {
              id: now.getTime().toString(36),
              documentedAt: now.toISOString(),
              documentedAtDisplay: now.toLocaleDateString("en-AU",{day:"2-digit",month:"long",year:"numeric"})+" "+now.toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit"}),
              flags: activeRedFlags,
              urgent: urgentFlags.length > 0,
              action: urgentFlags.length > 0 ? "Referred to ED / GP — urgent" : "Referred to GP for review",
              patient: data["dem_name"] || "Unknown",
            };
            const existing = Array.isArray(data.rf_referral_log) ? data.rf_referral_log : [];
            set("rf_referral_log", [...existing, entry]);
            setJsonMsg({type:"success", text:"✅ Referral documented & saved to patient record"});
            setTimeout(()=>setJsonMsg(null), 3000);
          }} style={{background:"rgba(0,0,0,0.25)",border:"1px solid rgba(0,0,0,0.4)",borderRadius:7,color:"#000",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",padding:"4px 10px",flexShrink:0,whiteSpace:"nowrap"}}>
            📋 Document Referral
          </button>
        </div>
      )}

      {/* ── DRAFT RESTORED BANNER ── */}
      {draftRestored && (
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:1000,background:"rgba(124,58,237,0.95)",color:"#fff",fontWeight:700,fontSize:"0.75rem",padding:"10px 18px",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",display:"flex",gap:12,alignItems:"center",whiteSpace:"nowrap",maxWidth:"calc(100vw - 32px)"}}>
          💾 Unsaved draft restored
          <button onClick={()=>{ setDraftRestored(false); try { localStorage.removeItem(DRAFT_KEY); } catch {} }} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:6,color:"#fff",fontWeight:800,fontSize:"0.8rem",cursor:"pointer",padding:"3px 8px"}}>Dismiss</button>
        </div>
      )}

      {/* ── TOAST MESSAGE ── */}
      {jsonMsg && (
        <div style={{position:"fixed",bottom:80,left:"50%",transform:"translateX(-50%)",zIndex:999,background:jsonMsg.type==="success"?"rgba(0,201,122,0.97)":"rgba(255,77,109,0.97)",color:"#000",fontWeight:700,fontSize:"0.8rem",padding:"10px 20px",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",maxWidth:"calc(100vw - 32px)",textAlign:"center"}}>
          {jsonMsg.text}
        </div>
      )}

      {/* ── JSON EXPORT/IMPORT PANEL ── */}
      {showJsonPanel && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:PC.surface,border:`1px solid rgba(0,229,255,0.25)`,borderRadius:16,padding:22,maxWidth:500,width:"100%",maxHeight:"85vh",overflowY:"auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,color:PC.accent,fontSize:"1rem"}}>💾 Save / Load Assessment</div>
              <button onClick={()=>setShowJsonPanel(false)} style={{background:"none",border:`1px solid ${PC.border}`,borderRadius:7,color:PC.muted,cursor:"pointer",padding:"4px 10px",fontSize:"0.82rem"}}>✕ Close</button>
            </div>

            {/* Patient info preview */}
            {(data["dem_name"]||data["dem_age"]||data["dem_occupation"]) && (
              <div style={{background:PC.s2,borderRadius:10,padding:"10px 14px",marginBottom:14,border:`1px solid ${PC.border}`}}>
                <div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Current Patient</div>
                <div style={{fontWeight:700,color:PC.text,fontSize:"0.88rem"}}>{data["dem_name"]||"—"}</div>
                <div style={{fontSize:"0.82rem",color:PC.muted,marginTop:2}}>
                  {[data["dem_age"]&&`Age ${data["dem_age"]}`,data["dem_occupation"]].filter(Boolean).join(" · ")}
                </div>
              </div>
            )}

            {/* Export */}
            <div style={{marginBottom:14}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.green,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📤 Export</div>
              <button onClick={exportJSON} style={{width:"100%",padding:"12px",background:"rgba(0,201,122,0.12)",border:`1px solid rgba(0,201,122,0.3)`,borderRadius:10,color:PC.green,fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                ⬇ Download Assessment JSON
              </button>
              <div style={{fontSize:"0.75rem",color:PC.muted,marginTop:5}}>Saves all {completedCount} completed fields. Reload anytime to resume.</div>
            </div>

            {/* Import from file */}
            <div style={{marginBottom:10}}>
              <div style={{fontSize:"0.82rem",fontWeight:700,color:PC.yellow,textTransform:"uppercase",letterSpacing:"1px",marginBottom:8}}>📥 Import</div>
              <button onClick={()=>importRef.current?.click()} style={{width:"100%",padding:"12px",background:"rgba(255,179,0,0.1)",border:`1px solid rgba(255,179,0,0.3)`,borderRadius:10,color:PC.yellow,fontWeight:800,fontSize:"0.8rem",cursor:"pointer",marginBottom:8}}>
                📂 Open Assessment File
              </button>
              <input ref={importRef} type="file" accept=".json" onChange={importFromFile} style={{display:"none"}}/>
              <textarea value={jsonImportText} onChange={e=>setJsonImportText(e.target.value)}
                placeholder='Or paste JSON here...'
                style={{width:"100%",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"monospace",outline:"none",padding:"8px 10px",fontSize:"0.82rem",resize:"vertical",minHeight:80}}/>
              {jsonImportText && (
                <button onClick={importJSON} style={{width:"100%",marginTop:8,padding:"11px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:10,color:"#000",fontWeight:800,fontSize:"0.8rem",cursor:"pointer"}}>
                  ▶ Load Assessment
                </button>
              )}
            </div>

            <div style={{marginTop:10,padding:"8px 12px",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,fontSize:"0.82rem",color:PC.muted,lineHeight:1.5}}>
              ⚠ Loading an assessment will replace all current data. Export first if needed.
            </div>
          </div>
        </div>
      )}

      {/* Mobile nav drawer */}
      <div className={`pm-nav-drawer${navOpen?" open":""}`}>
        <div style={{padding:"0 8px"}}>
          <SidebarItems onNav={navTo}/>
        </div>
      </div>

      {/* Header — Medical Professional */}
      <div className="pm-header" style={{background:PC.isDark?`linear-gradient(180deg,${PC.headerBg},${PC.surface})`:`${PC.headerBg}`,borderBottom:`1px solid ${PC.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:PC.isDark?"0 1px 20px rgba(0,0,0,0.4)":"0 1px 12px rgba(0,20,50,0.06)"}}>
        <div className="pm-header-inner" style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <button className="pm-hamburger" onClick={()=>setNavOpen(o=>!o)} aria-label="Open navigation">☰</button>
            {/* Logo */}
            <img src="/logo.svg" alt="PhysioMind" style={{height:48,width:"auto",flexShrink:0,display:"block"}} />
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:"clamp(0.85rem,3vw,1.05rem)",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap",lineHeight:1.2}}>PhysioMind Pro</div>
              <div className="pm-logo-sub" style={{fontSize:"0.75rem",color:PC.muted,letterSpacing:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textTransform:"uppercase",fontWeight:600,marginTop:1}}>Clinical Assessment Platform</div>
            </div>
            {/* Live patient chip */}
            {activePatient&&(
              <div className="pm-live-chip" style={{display:"flex",alignItems:"center",gap:6,padding:"5px 12px",background:PC.isDark?"rgba(129,140,248,0.08)":"rgba(79,70,229,0.05)",border:`1px solid ${PC.isDark?"rgba(129,140,248,0.2)":"rgba(79,70,229,0.15)"}`,borderRadius:20,cursor:"pointer"}} onClick={()=>setShowPatientDb(true)}>
                <div style={{width:6,height:6,borderRadius:"50%",background:PC.a3,boxShadow:`0 0 5px ${PC.a3}`}}/>
                <span style={{fontSize:"0.82rem",fontWeight:700,color:PC.a2,whiteSpace:"nowrap"}}>{activePatient.name.length>16?activePatient.name.slice(0,16)+"…":activePatient.name}</span>
              </div>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,flexShrink:0}}>

            {/* Red flag indicator */}
            {hasRedFlags && (
              <div style={{display:"flex",alignItems:"center",gap:5,padding:"4px 10px",background:urgentFlags.length>0?"rgba(248,113,113,0.12)":"rgba(251,191,36,0.1)",border:`1px solid ${urgentFlags.length>0?"rgba(248,113,113,0.3)":"rgba(251,191,36,0.3)"}`,borderRadius:20}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:urgentFlags.length>0?PC.red:PC.yellow,animation:"pulse 1.5s infinite"}}/>
                <span style={{fontSize:"0.8rem",fontWeight:700,color:urgentFlags.length>0?PC.red:PC.yellow,whiteSpace:"nowrap"}}>{urgentFlags.length>0?"URGENT FLAG":"Flag"}</span>
              </div>
            )}
            {/* Patient selector */}
            <button className="pm-patients-btn" onClick={()=>setShowPatientDb(true)} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontWeight:600,fontSize:"0.82rem",cursor:"pointer",whiteSpace:"nowrap"}}>
              <span style={{fontSize:"0.85rem"}}>👥</span>
              <span>{patients.length} Patients</span>
            </button>


          </div>
        </div>
      </div>

      {/* ── MOBILE COMPACT HEADER (≤767px only, replaces pm-header + patient bars) ── */}
      {/* ── MOBILE HEADER — Option B: gradient accent bar ── */}
      <div className="pm-mobile-hdr" style={{
        background: PC.isDark ? PC.headerBg : "linear-gradient(90deg,#f5edff 0%,#faf8ff 100%)",
        borderBottom: `1px solid ${PC.isDark?PC.border:"#d8cce8"}`,
        borderLeft: `3.5px solid ${PC.accent}`,
      }}>
        {/* Hamburger */}
        <button className="pm-hamburger" onClick={()=>setNavOpen(o=>!o)} aria-label="Open navigation"
          style={{minHeight:34,minWidth:34,padding:"6px 8px",fontSize:"1.05rem",
            background: PC.isDark?"rgba(124,58,237,0.15)":"rgba(124,58,237,0.08)",
            border:"none",borderRadius:8,color:PC.accent,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ☰
        </button>
        {/* Logo — plain, bigger */}
        <img src="/logo.svg" alt="PhysioMind" style={{height:40,width:"auto",flexShrink:0}} />
        {/* Text */}
        <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
          <div style={{fontWeight:800,fontSize:"0.92rem",color:PC.isDark?PC.a2:"#4c1d95",letterSpacing:"-0.3px",lineHeight:1.2,whiteSpace:"nowrap"}}>PhysioMind Pro</div>
          {activePatient
            ? <div style={{fontSize:"0.72rem",color:PC.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                <span style={{color:PC.a3}}>●</span> {activePatient.name.length>18?activePatient.name.slice(0,18)+"…":activePatient.name}
                {lastSaved && <span style={{color:PC.green}}> · ✓ {lastSaved.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>}
              </div>
            : <div style={{fontSize:"0.68rem",color:PC.muted}}>No patient loaded</div>
          }
        </div>
        {/* + New — solid accent */}
        <button onClick={createNewPatient}
          style={{padding:"5px 12px",minHeight:30,background:PC.accent,border:"none",borderRadius:7,
            color:"#fff",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",
            boxShadow:`0 2px 6px ${PC.accent}50`}}>
          + New
        </button>
      </div>

      {/* ── ACTIVE PATIENT BAR ── */}
      {activePatient && (
        <div className="pm-patient-bar" style={{background:PC.isDark?"rgba(129,140,248,0.05)":"rgba(79,70,229,0.03)",borderBottom:`1px solid ${PC.border}`,padding:"6px 16px",display:"flex",flexDirection:"column",gap:4}}>
          {/* Row 1: dot + name + age/gender */}
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            <div style={{width:7,height:7,borderRadius:"50%",background:PC.a3,boxShadow:`0 0 6px ${PC.a3}`,flexShrink:0}}/>
            <div onClick={()=>setProfilePatient(activePatient)}
              style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",minWidth:0,flex:1,overflow:"hidden"}}
              onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
              onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <span style={{fontSize:"0.78rem",color:PC.a2,fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:160}}>
                {activePatient.name}
              </span>
              {activePatient.data?.dem_age && <span style={{fontSize:"0.75rem",color:PC.muted,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>· {activePatient.data.dem_age}y</span>}
              {activePatient.data?.dem_gender && <span style={{fontSize:"0.75rem",color:PC.muted,fontWeight:500,whiteSpace:"nowrap",flexShrink:0}}>{activePatient.data.dem_gender}</span>}
              <span style={{fontSize:"0.8rem",color:PC.accent,fontWeight:600,flexShrink:0,whiteSpace:"nowrap"}}>👤 Profile</span>
            </div>
          </div>
          {/* Row 2: saved time + buttons */}
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"nowrap"}}>
            <span style={{fontSize:"0.78rem",color:PC.green,fontWeight:600,flex:1,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4}}>
              {lastSaved
                ? <>✓ Saved {lastSaved.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</>
                : <>● {new Date(activePatient.updatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</>}
            </span>
            <button onClick={createNewPatient} style={{padding:"3px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:6,color:PC.text,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>＋ New</button>
            <button onClick={()=>setShowPatientDb(true)} style={{padding:"3px 10px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:6,color:PC.a2,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>Switch Patient</button>
          </div>
        </div>
      )}
      {!activePatient && (
        <div className="pm-patient-bar" style={{background:PC.isDark?"rgba(56,189,248,0.03)":"rgba(3,105,161,0.03)",borderBottom:`1px solid ${PC.border}`,padding:"9px 24px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:"0.8rem",color:PC.muted,fontWeight:500}}>No active patient — create or load a patient record to save assessments</span>
          <button onClick={createNewPatient} style={{padding:"5px 14px",background:`linear-gradient(135deg,${PC.accent}18,${PC.a2}12)`,border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:7,color:PC.accent,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>＋ New Patient</button>
          <button onClick={()=>setShowPatientDb(true)} style={{padding:"5px 14px",background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:7,color:PC.a2,fontSize:"0.78rem",fontWeight:600,cursor:"pointer"}}>Load Patient</button>
        </div>
      )}

      <div className="pm-body" style={{display:"flex",flex:1,maxWidth:1400,margin:"0 auto",width:"100%"}}>

        {/* Desktop Sidebar */}
        <div className="pm-sidebar" style={{width:210,minWidth:210,borderRight:`1px solid ${PC.border}`,padding:"16px 0 10px",background:PC.navBg,position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto"}}>
          <SidebarItems onNav={navTo}/>
        </div>

        {/* Main */}
        <div className="pm-main" style={{flex:1,padding:"28px 32px",overflowY:"auto",overflowX:"hidden",minWidth:0}}>

          {/* ── CLINICAL WORKFLOW HEADER ── */}
          {activePatient && (() => {
            const d2 = data;
            const oKeys = ["rom","mmt","special","neuro","gait","posture","palpation","fma","outcome","observation","cyriax","cyriax_full","sttt","kinetic","fascia","nkt"];
            const wfSteps = [
              { key:"demographics", label:"Demographics", short:"Demo",  nav:"demographics", done:!!(d2.dem_name&&d2.dem_age), active:active==="demographics" },
              { key:"subjective",   label:"Subjective",   short:"Sub",   nav:"subjective",   done:!!(d2.cc_main||d2.lx_loc||d2.cx_loc), active:active==="subjective" },
              { key:"objective",    label:"Objective",    short:"Obj",   nav:"rom",           done:!!(Object.keys(d2).some(k=>k.startsWith("rom_")||k.startsWith("mmt_")||k.startsWith("st_"))), active:oKeys.includes(active) },
              { key:"treatment",    label:"Treatment",    short:"Treat", nav:"treatment",     done:!!(d2.soap_modalities||d2.soap_frequency||d2.hep_programme||d2.tx_techniques), active:active==="treatment"||active==="exercise" },
              { key:"soap",         label:"SOAP",         short:"SOAP",  nav:"soap",          done:!!(d2.soap_a_diagnosis||d2.soap_icd10||d2.soap_a), active:active==="soap" },
            ];
            const doneCount = wfSteps.filter(s => s.done).length;
            const pct = Math.round((doneCount / wfSteps.length) * 100);
            return (
              <div className="pm-stepper-wrap" style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:14,padding:"10px 16px 8px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:10,fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px"}}>Clinical Workflow</span>
                  <span style={{fontSize:10,fontWeight:700,color:pct===100?"#10B981":PC.accent}}>{doneCount}/{wfSteps.length} complete</span>
                </div>
                <div className="pm-stepper-row" style={{display:"flex",alignItems:"center",gap:0}}>
                  {wfSteps.map((step, i) => {
                    const isLast = i === wfSteps.length - 1;
                    return (
                      <React.Fragment key={step.key}>
                        <div onClick={()=>navTo(step.nav)} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",flex:"0 0 auto",minWidth:0}}>
                          <div className="pm-stepper-dot" style={{width:30,height:30,borderRadius:"50%",background:step.done?"#6D28D9":step.active?"#EDE9FE":PC.s2,border:`2px solid ${step.done?"#6D28D9":step.active?"#6D28D9":"#E5E7EB"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:step.active?"0 0 0 3px rgba(109,40,217,0.15)":"none",transition:"all 0.2s",flexShrink:0}}>
                            {step.done ? <span style={{fontSize:13,color:"#fff",fontWeight:900}}>✓</span> : <span style={{fontSize:11,color:step.active?"#6D28D9":PC.muted,fontWeight:700}}>{i+1}</span>}
                          </div>
                          <div className="pm-stepper-label" style={{fontSize:9,fontWeight:step.active?800:step.done?700:500,color:step.done?"#6D28D9":step.active?"#6D28D9":PC.muted,marginTop:4,textAlign:"center",whiteSpace:"nowrap",letterSpacing:"0.1px"}}>{step.short}</div>
                        </div>
                        {!isLast && <div style={{flex:1,height:2,background:step.done?"#6D28D9":"#E5E7EB",marginBottom:14,minWidth:6,transition:"background 0.3s"}}/>}
                      </React.Fragment>
                    );
                  })}
                </div>
                <div style={{height:3,background:"#E5E7EB",borderRadius:999,marginTop:6,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:pct===100?"#10B981":"linear-gradient(90deg,#6D28D9,#8B5CF6)",borderRadius:999,transition:"width 0.4s ease"}}/>
                </div>
              </div>
            );
          })()}

          {/* Diagnosis Panel */}
          {showDx&&dx&&(
            <div style={{background:PC.surface,border:`1px solid ${PC.accent}30`,borderRadius:14,padding:20,marginBottom:20}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <div style={{fontSize:"1.05rem",fontWeight:800,color:PC.accent}}>📋 Multi-System Diagnosis Report</div>
                <div style={{display:"flex",gap:8}}>
                  <span style={{fontSize:"0.75rem",padding:"2px 8px",borderRadius:10,background:"rgba(0,229,255,0.1)",color:PC.accent}}>{completedCount} fields · {dx.dx.length} diagnoses</span>
                  <button onClick={()=>setShowDx(false)} style={{background:"none",border:`1px solid ${PC.border}`,color:PC.muted,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
                </div>
              </div>
              {dx.redFlags.length>0&&(
                <div style={{background:"rgba(255,77,109,0.1)",border:`1px solid ${PC.red}40`,borderRadius:10,padding:14,marginBottom:14}}>
                  <div style={{fontWeight:800,color:PC.red,marginBottom:8}}>🚨 RED FLAGS</div>
                  {dx.redFlags.map((rf,i)=><div key={i} style={{padding:"5px 10px",background:"rgba(255,77,109,0.07)",borderRadius:6,marginBottom:4,fontSize:"0.76rem",color:rf.severity==="urgent"?PC.red:PC.yellow,fontWeight:600}}>{rf.severity==="urgent"?"🔴 URGENT: ":"🟡 REFER: "}{rf.label}</div>)}
                </div>
              )}
              {dx.dx.length===0?(
                <div style={{textAlign:"center",padding:30,color:PC.muted}}><div style={{fontSize:"2rem",marginBottom:8}}>📝</div><div>Enter patient data above to refine diagnosis.</div></div>
              ):(
                <>
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
                    {dx.dx.map(d=><span key={d.name+d.system} style={{padding:"2px 9px",borderRadius:20,fontSize:"0.66rem",fontWeight:700,background:`${sysColors[d.system]||PC.accent}15`,color:sysColors[d.system]||PC.accent,border:`1px solid ${sysColors[d.system]||PC.accent}30`}}>✓ {d.system}</span>)}
                  </div>
                  {dx.dx.map((d,i)=>{
                    const col=sysColors[d.system]||PC.accent;
                    const exp=expandedDx[i];
                    return(
                      <div key={i} style={{background:PC.s2,border:`1px solid ${PC.border}`,borderRadius:10,marginBottom:9,overflow:"hidden"}}>
                        <div onClick={()=>setExpandedDx(p=>({...p,[i]:!p[i]}))} style={{padding:"11px 13px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderLeft:`3px solid ${col}`}}>
                          <div>
                            <div style={{display:"flex",gap:7,alignItems:"center",marginBottom:4}}>
                              <span style={{fontSize:"0.8rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:`${col}20`,color:col}}>{d.system}</span>
                              <span style={{fontSize:"0.8rem",fontWeight:700,padding:"2px 7px",borderRadius:7,background:d.confidence==="High"?"rgba(0,201,122,0.15)":"rgba(255,179,0,0.15)",color:d.confidence==="High"?PC.green:PC.yellow}}>{d.confidence}</span>
                            </div>
                            <div style={{fontWeight:700,fontSize:"0.86rem"}}>{i+1}. {d.name}</div>
                          </div>
                          <span style={{color:PC.muted,fontSize:"0.75rem"}}>{exp?"▲":"▼"}</span>
                        </div>
                        {exp&&(
                          <div style={{padding:"0 13px 13px 16px"}}>
                            <div style={{marginBottom:10}}><div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Evidence</div><div style={{display:"flex",flexWrap:"wrap",gap:5}}>{d.evidence.map((e,j)=><span key={j} style={{fontSize:"0.78rem",padding:"2px 7px",borderRadius:7,background:PC.s3,color:PC.text,border:`1px solid ${PC.border}`}}>✓ {e}</span>)}</div></div>
                            {d.mechanism&&<div style={{marginBottom:10}}><div style={{fontSize:"0.8rem",fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Mechanism</div><div style={{background:PC.s3,borderRadius:8,padding:10,fontSize:"0.76rem",color:PC.text,lineHeight:1.6}}>{d.mechanism}</div></div>}
                            {d.treatment&&d.treatment.length>0&&<div><div style={{fontSize:"0.8rem",fontWeight:700,color:PC.a3,textTransform:"uppercase",letterSpacing:"1px",marginBottom:6}}>Treatment Plan</div>{d.treatment.map((t,j)=><div key={j} style={{display:"flex",gap:8,padding:"5px 9px",background:PC.s3,borderRadius:7,marginBottom:4,alignItems:"flex-start"}}><span style={{color:PC.a3,fontWeight:700,flexShrink:0}}>→</span><span style={{fontSize:"0.76rem",color:PC.text,lineHeight:1.5}}>{t}</span></div>)}</div>}
                            {d.interpretation&&<div style={{marginTop:10,padding:"8px 11px",background:"rgba(255,179,0,0.07)",border:"1px solid rgba(255,179,0,0.2)",borderRadius:8,fontSize:"0.78rem",color:PC.yellow,lineHeight:1.5}}>⚠ {d.interpretation}</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {dx.fmsTotal!==null&&(
                    <div style={{marginTop:10,padding:12,background:PC.s2,borderRadius:8,border:`1px solid ${PC.border}`,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{textAlign:"center",minWidth:55}}><div style={{fontSize:"1.8rem",fontWeight:800,color:dx.fmsTotal>=17?PC.green:dx.fmsTotal>=15?PC.yellow:PC.red}}>{dx.fmsTotal}</div><div style={{fontSize:"0.78rem",color:PC.muted}}>FMS/21</div></div>
                      <div style={{fontSize:"0.76rem",color:PC.muted}}>{dx.fmsTotal>=17?"✅ Low risk":dx.fmsTotal>=15?"⚠️ Moderate risk — corrective exercises":"🔴 High risk — corrective exercises before loading"}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {currentSection && active !== "treatment" && active !== "exercise" && active !== "tx_techniques" && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <div style={{width:38,height:38,background:PC.isDark?`linear-gradient(135deg,${PC.accent}15,${PC.a2}10)`:`linear-gradient(135deg,${PC.accent}10,${PC.a2}08)`,border:`1px solid ${PC.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{currentSection.icon}</div>
              <div>
                <div style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,letterSpacing:"-0.3px",color:PC.text,lineHeight:1.1}}>{currentSection.label}</div>
                <div style={{fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",color:PC.muted,marginTop:2}}>{currentSection.desc||"Clinical Assessment"}</div>
              </div>
            </div>
            <div style={{height:"1px",background:`linear-gradient(90deg,${PC.accent}50,${PC.a2}30,transparent)`}}/>
          </div>
          )}

          {/* Posture Analysis Module — injected at top of Posture tab */}
          {/* PostureAnalysisModule — deferred mount, hidden when not active */}
          {mountedTabs.has("posture") && (
            <div style={{marginBottom:22, display: active==="posture" ? "block" : "none"}}>
              <PostureAnalysisModule activePatient={activePatient} set={set}/>
            </div>
          )}
          {active==="posture" && !mountedTabs.has("posture") && (
            <div style={{marginBottom:22}}>
              <TabLoader/>
            </div>
          )}

          {/* Groups */}
          {currentSection && Object.entries(currentSection.groups).map(([groupName,tests])=>(
            <div key={groupName} style={{marginBottom:28}}>
              <div className="pm-group-head" style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.4px",color:PC.a2,whiteSpace:"nowrap"}}>{groupName}</div>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${PC.border},transparent)`}}/>
              </div>

              {tests==="HOME_MODULE"?(
                <HomeModule onNav={navTo}/>
              ):tests==="DASHBOARD_MODULE"?(
                <TherapistDashboardModule patients={patients} data={data} onNav={navTo} taskDB={taskDB} onCompleteTask={completeTask} onDismissTask={dismissTask} onAddTask={addOrUpdateTask} onProfile={(p)=>setProfilePatient(p)} onQuickStart={(p)=>{ selectPatient(p); navTo("subjective"); }} currentUser={currentUser} onSignOut={onSignOut}/>
              ):tests==="DEMOGRAPHICS_MODULE"?(
                <div style={{display:"flex",flexDirection:"column",gap:14}}>
                  {(()=>{
                    const inp={width:"100%",background:PC.s3,border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.85rem",boxSizing:"border-box"};
                    const lbl={fontSize:"0.78rem",fontWeight:700,color:PC.muted,marginBottom:5,display:"block"};
                    const sel=(id,opts)=>(<select style={inp} value={data[id]||""} onChange={e=>set(id,e.target.value)}><option value="">— select —</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>);
                    const field=(label,el)=>(<div style={{marginBottom:12}}><label style={lbl}>{label}</label>{el}</div>);
                    const card=(title,children)=>(<div style={{background:PC.s2,borderRadius:12,border:`1px solid ${PC.border}`,padding:"14px 16px"}}><div style={{fontSize:"0.78rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>{title}</div>{children}</div>);
                    return(<>
                      {card("Personal Details",<>
                        {field("Full Name",<input style={inp} placeholder="e.g. Riya Sharma" value={data.dem_name||""} onChange={e=>set("dem_name",e.target.value)}/>)}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div>{field("Date of Birth",<input style={inp} type="date" value={data.dem_dob||""} onChange={e=>set("dem_dob",e.target.value)}/>)}</div>
                          <div>{field("Age",<input style={inp} type="number" placeholder="e.g. 34" value={data.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>)}</div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div>{field("Sex",sel("dem_sex",["Female","Male","Non-binary","Prefer not to say"]))}</div>
                          <div>{field("Dominant Hand",sel("dem_dominant",["Right","Left","Ambidextrous"]))}</div>
                        </div>
                        {field("Occupation",<input style={inp} placeholder="e.g. Teacher, Desk worker" value={data.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>)}
                        {field("Employer / Industry",<input style={inp} placeholder="e.g. ABC Corp, Healthcare" value={data.dem_employer||""} onChange={e=>set("dem_employer",e.target.value)}/>)}
                        {field("Work Status",sel("dem_work_status",["Full time","Part time","Self employed","Off work — injury","Off work — illness","Retired","Unemployed","Student","Home duties"]))}
                      </>)}
                      {card("Contact Details",<>
                        {field("Phone Number",<input style={inp} type="tel" placeholder="+91 98765 43210" value={data.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>)}
                        {field("Email Address",<input style={inp} type="email" placeholder="patient@email.com" value={data.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>)}
                        {field("Address",<input style={inp} placeholder="Street, City, Postcode" value={data.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>)}
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                          <div>{field("Emergency Contact Name",<input style={inp} placeholder="Full name" value={data.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}</div>
                          <div>{field("Emergency Contact Phone",<input style={inp} type="tel" placeholder="+91 98765 43210" value={data.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}</div>
                        </div>
                      </>)}
                      {card("Clinical & Referral",<>
                        {field("Referring Doctor / GP",<input style={inp} placeholder="Dr. Name, Hospital" value={data.dem_referral_dr||data.dem_gp||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>)}
                        {field("Referral Source",sel("dem_referral",["GP","Self-referral","Specialist","Workplace / Employer","Insurance","Other"]))}
                        {field("Insurance / Fund",<input style={inp} placeholder="e.g. CGHS, ESI, Private, Self-pay" value={data.dem_insurance||""} onChange={e=>set("dem_insurance",e.target.value)}/>)}
                        {field("Policy / Member Number",<input style={inp} placeholder="Optional" value={data.dem_policy_no||""} onChange={e=>set("dem_policy_no",e.target.value)}/>)}
                        {field("Relevant Medical History",<textarea style={{...inp,minHeight:72,resize:"vertical"}} placeholder="Diabetes, hypertension, previous surgeries..." value={data.dem_medical_hx||""} onChange={e=>set("dem_medical_hx",e.target.value)}/>)}
                        {field("Current Medications",<input style={inp} placeholder="e.g. Metformin 500mg, Amlodipine 5mg" value={data.dem_medications||""} onChange={e=>set("dem_medications",e.target.value)}/>)}
                      </>)}
                      {card("Consent",<>
                        {field("Consent to Treatment",sel("dem_consent",["Yes — verbal","Yes — written","Not yet"]))}
                        <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginTop:4}}>
                          <input type="checkbox" checked={!!data.consent_treat} onChange={e=>set("consent_treat",e.target.checked)} style={{width:16,height:16,flexShrink:0}}/>
                          <span style={{fontSize:"0.82rem",color:PC.text,fontWeight:600}}>Written consent obtained</span>
                        </label>
                      </>)}
                    </>);
                  })()}
                  {/* ── Save Patient Button ── */}
                  <div style={{marginTop:20,padding:"14px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:14,display:"flex",flexDirection:"column",gap:10}}>
                    {!activePatientId ? (
                      <div style={{textAlign:"center"}}>
                        <div style={{fontSize:12,color:PC.muted,marginBottom:10}}>Fill in the patient name above, then save to create their record.</div>
                        <button
                          disabled={!data.dem_name?.trim()}
                          onClick={()=>{
                            if(!data.dem_name?.trim()) return;
                            const newP={id:genId(),name:data.dem_name,data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),hasRedFlags:false,lastDx:data.cc_main||""};
                            setPatients(prev=>{const updated=[newP,...prev];savePatientDB(updated);return updated;});
                            setActivePatientId(newP.id);
                            setJsonMsg({type:"success",text:`✅ Patient saved: ${data.dem_name}`});
                            setTimeout(()=>setJsonMsg(null),2500);
                          }}
                          style={{padding:"12px 32px",background:data.dem_name?.trim()?PC.accent:"#D1D5DB",border:"none",borderRadius:10,color:"#fff",fontWeight:800,fontSize:"0.9rem",cursor:data.dem_name?.trim()?"pointer":"not-allowed",width:"100%"}}>
                          💾 Save Patient to Database
                        </button>
                      </div>
                    ) : (
                      <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"center"}}>
                        <span style={{fontSize:13,color:"#059669",fontWeight:700}}>✅ Patient record auto-saving</span>
                        <button onClick={()=>navTo("subjective")} style={{padding:"8px 20px",background:PC.accent,border:"none",borderRadius:8,color:"#fff",fontWeight:700,fontSize:"0.82rem",cursor:"pointer"}}>
                          Next → Subjective
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ):tests==="SUBJECTIVE_MODULE"?(
                <div>
                  <Suspense fallback={<TabFallback/>}><LazySubjective data={data} set={set} onNav={navTo} onTabChange={(t)=>setSubjBodyChartTab(t==="bodychart")}/></Suspense>
                  {subjBodyChartTab && (
                    <Suspense fallback={<TabFallback/>}><LazyBodyChart data={data} set={set}/></Suspense>
                  )}
                </div>
              ):tests==="PALPATION_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyPalpation data={data} set={set}/></Suspense>
              ):tests==="POSTURE_DEFECT_MODULE"?(
                <PostureDefectModule/>
              ):tests==="OBSERVATION_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <ObservationModule data={data} set={set}/>
                </>
              ):tests==="CYRIAX_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazySTT data={data} set={set} navContext={active==="cyriax"?navContext:{}}/></Suspense>
                </>
              ):tests==="SPECIAL_TESTS_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <SpecialTestsSection data={data} set={set} navContext={active==="special"?navContext:{}}/>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="NKT_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyCPA data={data} set={set} navContext={active==="nkt"?navContext:{}}/></Suspense>
                </>
              ):tests==="FMA_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <FMASection data={data} set={set} navTo={navTo} navContext={active==="fma"?navContext:{}}/>
                </>
              ):tests==="FASCIA_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <FasciaSection data={data} set={set} navContext={active==="fascia"?navContext:{}}/>
                </>
              ):tests==="KC_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <KineticChainSection data={data} set={set} navContext={active==="kinetic"?navContext:{}}/>
                </>
              ):tests==="CYRIAX_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <CyriaxRegionTests data={data} set={set}/>
                </>
              ):tests==="NEURO_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyNeuro data={data} set={set} navContext={active==="neuro"?navContext:{}}/></Suspense>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="GAIT_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyGait data={data} set={set}/></Suspense>
                </>
              ):tests==="MMT_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <MMTModule data={data} set={set} navContext={active==="mmt"?navContext:{}}/>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="ROM_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <ROMModule data={data} set={set} navContext={active==="rom"?navContext:{}}/>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </>
              ):tests==="OUTCOME_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyOutcomes data={data} set={set}/></Suspense>
                </>
              ):tests==="TREATMENT_MODULE"?(
                <>
                {(()=>{
                  const isMobile=window.innerWidth<768;
                  if(isMobile){
                    return(
                      <div>
                        <div style={{display:"flex",gap:8,marginBottom:16}}>
                          <button onClick={()=>setTxTab("exercise")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${txTab==="exercise"?PC.accent:PC.border}`,background:txTab==="exercise"?`${PC.accent}15`:PC.s2,color:txTab==="exercise"?PC.accent:PC.text,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>🏋 Exercise</button>
                          <button onClick={()=>setTxTab("tx")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${txTab==="tx"?PC.accent:PC.border}`,background:txTab==="tx"?`${PC.accent}15`:PC.s2,color:txTab==="tx"?PC.accent:PC.text,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>🤲 Techniques</button>
                          <button onClick={()=>setTxTab("hep")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${txTab==="hep"?PC.accent:PC.border}`,background:txTab==="hep"?`${PC.accent}15`:PC.s2,color:txTab==="hep"?PC.accent:PC.text,fontWeight:700,fontSize:"0.75rem",cursor:"pointer"}}>🏠 Home Protocol</button>
                        </div>
                        {txTab==="exercise"
                          ? <Suspense fallback={<TabFallback/>}><LazyExercise data={data} set={set}/></Suspense>
                          : txTab==="hep"
                          ? <HomeProtocolTab data={data} set={set} PC={PC}/>
                          : <Suspense fallback={<TabFallback/>}><LazyTreatment data={data} set={set}/></Suspense>
                        }
                      </div>
                    );
                  }
                  return(
                    <div>
                      {/* Desktop 3-tab row */}
                      <div style={{display:"flex",gap:6,marginBottom:16,background:PC.s2,borderRadius:10,padding:4,border:`1px solid ${PC.border}`}}>
                        {[["exercise","🏋","Exercise Prescription"],["tx","🤲","Tx Techniques"],["hep","🏠","Home Protocol"]].map(([key,icon,label])=>(
                          <button key={key} onClick={()=>setTxTab(key)} style={{flex:1,padding:"9px 8px",borderRadius:8,border:`1.5px solid ${txTab===key?PC.accent:PC.border}`,background:txTab===key?`${PC.accent}12`:PC.surface,color:txTab===key?PC.accent:PC.muted,fontWeight:700,fontSize:"0.8rem",cursor:"pointer",transition:"all 0.15s"}}>
                            {icon} {label}
                          </button>
                        ))}
                      </div>
                      {txTab==="exercise" && <Suspense fallback={<TabFallback/>}><LazyExercise data={data} set={set}/></Suspense>}
                      {txTab==="tx"       && <Suspense fallback={<TabFallback/>}><LazyTreatment data={data} set={set}/></Suspense>}
                      {txTab==="hep"      && <HomeProtocolTab data={data} set={set} PC={PC}/>}
                    </div>
                  );
                })()}</>
              ):tests==="EXERCISE_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyExercise data={data} set={set}/></Suspense>
              ):tests==="TX_TECHNIQUES_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyTreatment data={data} set={set}/></Suspense>
              ):tests==="TX_SESSION_MODULE"?(
                <div>
                  {/* ── Quick Visit Banner ── */}
                  <div style={{background:`linear-gradient(135deg,${PC.accent}12,${PC.a2}08)`,border:`1.5px solid ${PC.accent}30`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:"0.88rem",color:PC.accent,marginBottom:4}}>⚡ Quick Visit</div>
                    <div style={{fontSize:"0.8rem",color:PC.muted,marginBottom:12}}>For follow-ups — fill these 4 fields and sign. Takes 60 seconds.</div>
                    <QuickVisitForm PC={PC} data={data} set={set} navTo={navTo}/>
                  </div>
                </div>
              ):tests==="SOAP_MODULE"?(
              <SOAPNoteModule data={data} set={set}/>
              ):tests==="AI_MODULE"?(
              <AIAssistant data={data} PC={PC}/>
              ):(
                <div style={{display:"grid",gap:8}}>
                  {tests.map(t=>{
                    const hasVal=t.type==="bilateral_num"||t.type==="bilateral_select"?(data[t.id+"_left"]||data[t.id+"_right"]):data[t.id];
                    const hasInfo=t.sig||t.how;
                    return(
                      <div key={t.id} style={{background:PC.surface,border:`1px solid ${hasVal?PC.accent+"28":PC.border}`,borderRadius:12,padding:"16px 18px",transition:"border-color 0.2s",boxShadow:hasVal?`0 0 0 1px ${PC.accent}08`:"none"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10,gap:8}}>
                          <label style={{fontSize:"0.82rem",fontWeight:600,color:hasVal?PC.text:PC.muted,lineHeight:1.4,flex:1,letterSpacing:"-0.1px"}}>
                            {t.label}
                            {hasVal&&<span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",width:16,height:16,background:PC.a3+"22",borderRadius:"50%",marginLeft:7,fontSize:"0.75rem",color:PC.a3,fontWeight:800,verticalAlign:"middle"}}>✓</span>}
                          </label>
                          {hasInfo&&<button type="button" onClick={()=>setInfoModal(t)} style={{padding:"3px 10px",background:PC.isDark?"rgba(129,140,248,0.1)":"rgba(79,70,229,0.06)",border:`1px solid ${PC.a2}30`,borderRadius:7,color:PC.a2,fontSize:"0.82rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.2px"}}>ℹ Info</button>}
                        </div>
                        <Field t={t}/>
                        {hasVal&&t.sig&&(
                          <div style={{marginTop:10,padding:"9px 12px",background:PC.accentSoft||"rgba(56,189,248,0.06)",border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:8,fontSize:"0.78rem",color:PC.text,lineHeight:1.6,opacity:0.9}}>
                            <span style={{fontWeight:700,color:PC.accent,marginRight:5,fontSize:"0.75rem",letterSpacing:"0.3px"}}>⚕ CLINICAL</span>{t.sig}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
          <div style={{height:60}}/>
        </div>
      </div>

      {/* ── BOTTOM NAV DRAWER (mobile) — always visible ── */}
      <nav className="pm-bnav" aria-label="Section navigation">

        {/* ── Expandable sub-panel ── */}
        {(()=>{
          const assessKeys=["demographics","subjective","posture","palpation","rom","mmt","special","neuro","outcome"];
          const advKeys=["fma","gait","cyriax_full","kinetic","nkt","fascia"];
          const treatKeys=["treatment","exercise","tx_techniques"];
          const docKeys=["tx_sessions","soap"];

          const BnavItem = ({navKey,icon,label}) => {
            const isAct = active===navKey;
            const pct = getSectionPct(navKey);
            return (
              <button className={`pm-bnav-item${isAct?" active":""}`}
                onClick={()=>{ navTo(navKey); setBnavTab(null); }}>
                <span className="pm-bnav-item-icon">{icon}</span>
                <span className="pm-bnav-item-label">{label}</span>
                {pct===100 && <span className="pm-bnav-item-done">✓</span>}
                {pct>0&&pct<100 && <span className="pm-bnav-item-pct">{pct}%</span>}
              </button>
            );
          };

          return (
            <>
              <div className={`pm-bnav-panel${bnavTab==="assessment"?" open":""}`}>
                <BnavItem navKey="demographics" icon="👤" label="Demographics"/>
                <BnavItem navKey="subjective"  icon="📝" label="Subjective Assessment"/>
                <BnavItem navKey="posture"     icon="🧍" label="Posture Analysis"/>
                <BnavItem navKey="observation" icon="👁️" label="Observation"/>
                <BnavItem navKey="palpation"   icon="🖐️" label="Palpation"/>
                <BnavItem navKey="rom"         icon="📐" label="Range of Motion"/>
                <BnavItem navKey="mmt"         icon="💪" label="MMT"/>
                <BnavItem navKey="special"     icon="🔬" label="Special Tests (100+)"/>
                <BnavItem navKey="neuro"       icon="⚡" label="Neurological"/>
                <BnavItem navKey="outcome"     icon="📈" label="Outcome Measures"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="advanced"?" open":""}`}>
                <BnavItem navKey="fma"         icon="🏃" label="Functional Assessment"/>
                <BnavItem navKey="gait"        icon="🚶" label="Gait Analysis"/>
                <BnavItem navKey="cyriax_full" icon="🦴" label="STTT"/>
                <BnavItem navKey="kinetic"     icon="⛓️" label="Kinetic Chain"/>
                <BnavItem navKey="nkt"         icon="🧠" label="CPA"/>
                <BnavItem navKey="fascia"      icon="🕸️" label="Fascia Integration"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="treatment"?" open":""}`}>
                <BnavItem navKey="treatment"    icon="💊" label="Treatment"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="documentation"?" open":""}`}>
                <BnavItem navKey="tx_sessions" icon="⚡" label="Quick Visit"/>
                <BnavItem navKey="soap"        icon="📋" label="SOAP Notes"/>
                <BnavItem navKey="ai_assistant" icon="🤖" label="AI Assistant"/>
              </div>
              <div className={`pm-bnav-panel${bnavTab==="patient"?" open":""}`}>
                {data.dem_name ? (
                  <div style={{padding:"4px 2px 8px"}}>
                    {/* Patient pill */}
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",background:"rgba(124,58,237,0.07)",borderRadius:10,marginBottom:8,border:"1px solid rgba(124,58,237,0.15)"}}>
                      <span style={{fontSize:"1.3rem"}}>👤</span>
                      <div style={{minWidth:0}}>
                        <div style={{fontWeight:800,fontSize:"0.95rem",color:"#3b1f6b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.dem_name}</div>
                        {data.dem_age && <div style={{fontSize:"0.72rem",color:"#7c3aed",fontWeight:600}}>Age {data.dem_age}</div>}
                      </div>
                    </div>
                    {/* PDF buttons */}
                    <div style={{display:"flex",flexDirection:"column",gap:6}}>
                      <button className="pm-bnav-pdf-btn"
                        onClick={()=>{ setBnavTab(null); setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="assessment"]'); if(el) el.click(); },350); }}>
                        <span style={{fontSize:"1.1rem"}}>📋</span>
                        <span>Assessment PDF</span>
                      </button>
                      <button className="pm-bnav-pdf-btn"
                        onClick={()=>{ setBnavTab(null); setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="treatment"]'); if(el) el.click(); },350); }}>
                        <span style={{fontSize:"1.1rem"}}>🗒️</span>
                        <span>Treatment PDF</span>
                      </button>
                      <button className="pm-bnav-pdf-btn"
                        onClick={()=>{ setBnavTab(null); setShowPdfReports(true); setTimeout(()=>{ const el=document.querySelector('[data-pdf-type="hep"]'); if(el) el.click(); },350); }}>
                        <span style={{fontSize:"1.1rem"}}>🏃</span>
                        <span>HEP PDF</span>
                      </button>
                    </div>
                    {/* Switch patient */}
                    <button className="pm-bnav-dx" style={{marginTop:10}}
                      onClick={()=>{ setBnavTab(null); setShowPatientDb(true); }}>
                      👥 Switch / Load Patient
                    </button>
                  </div>
                ) : (
                  <div style={{padding:"6px 2px"}}>
                    <div style={{textAlign:"center",padding:"16px 12px",color:"#9a82c0",fontSize:"0.85rem",fontWeight:600}}>No patient loaded</div>
                    <button className="pm-bnav-dx"
                      onClick={()=>{ setBnavTab(null); setShowPatientDb(true); }}>
                      👥 Load Patient
                    </button>
                  </div>
                )}
              </div>
              <div className={`pm-bnav-panel${bnavTab==="top"?" open":""}`}>
                <BnavItem navKey="home"      icon="🏠" label="Home"/>
                <BnavItem navKey="dashboard" icon="📊" label="Dashboard"/>

              </div>
            </>
          );
        })()}

        {/* ── Tab strip ── */}
        <div className="pm-bnav-tabs">
          {(()=>{
            const assessKeys=["demographics","subjective","posture","palpation","rom","mmt","special","neuro","outcome"];
            const advKeys=["fma","gait","cyriax_full","kinetic","nkt","fascia"];
            const treatKeys=["treatment","exercise","tx_techniques"];
            const docKeys=["tx_sessions","soap"];
            const topKeys=["home","dashboard"];

            const TabBtn = ({id,icon,label,matchKeys}) => {
              const isActive = bnavTab===id || (matchKeys&&matchKeys.includes(active));
              return (
                <button className={`pm-bnav-tab${isActive?" active":""}`}
                  onClick={()=>setBnavTab(t=> t===id ? null : id)}>
                  <span className="pm-bnav-tab-icon">{icon}</span>
                  <span className="pm-bnav-tab-label">{label}</span>
                </button>
              );
            };

            return (
              <>
                <TabBtn id="top"           icon="☰"  label="Menu"    matchKeys={topKeys}/>
                <TabBtn id="patient"       icon="👤" label="Patient" matchKeys={[]}/>
                <TabBtn id="assessment"    icon="🩺" label="Assess"  matchKeys={assessKeys}/>
                <TabBtn id="advanced"      icon="🔭" label="Adv."    matchKeys={advKeys}/>
                <TabBtn id="treatment"     icon="💊" label="Treat"   matchKeys={treatKeys}/>
                <TabBtn id="documentation" icon="📋" label="Docs"    matchKeys={docKeys}/>
              </>
            );
          })()}
        </div>
      </nav>
      {/* ── Live SOAP Panel — always visible floating panel ── */}
      <LiveSOAPPanel data={data} onNavigate={navTo}/>
    </div>
  );
}

function LandingAndAuth({ onAuth }) {
  const [showAuth, setShowAuth] = React.useState(false);
  if (showAuth) {
    return <AuthScreen onAuth={onAuth} />;
  }
  return (
    <LandingPage
      onGetStarted={() => setShowAuth(true)}
      onSignIn={() => setShowAuth(true)}
    />
  );
}

export default function App() {
  // ── AUTH DISABLED FOR TESTING — to re-enable, restore the full auth flow ──
  const devUser = { id: "dev", email: "dev@physiomind.app", user_metadata: { full_name: "Dr. Demo" } };
  return <ErrorBoundary><AppInner currentUser={devUser} onSignOut={()=>{}}/></ErrorBoundary>;
}
