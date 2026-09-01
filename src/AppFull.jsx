// AppFull.jsx — Posture engine, camera, patient DB, dashboard, AppInner, App
import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense, lazy } from "react";
import { track } from "@vercel/analytics";
import { supabase } from "./supabase.js";
import { createPortal } from "react-dom";
import { r2, mid, px, C, getC, useTheme, MobileStyleInjector, ErrorBoundary, TabLoader } from "./utils.jsx";
import {
  NKT_REGIONS, KC_REGIONS, UNIV_S, REG_MOD_S, BPS_S, SLEEP_S, SPORT_S,
} from "./sharedClinicalData.js";
// NOTE: SpecialTestsSection, FMASection, FasciaSection, KineticChainSection,
// CyriaxRegionTests, SubjectiveModule, NKTSection, ErgoModule, CyriaxModule,
// PDF_BASE_STYLES, makePDFPage, MOVEMENTS, downloadPDFFromHTML used to be
// imported here too. SubjectiveModule/NKTSection/ErgoModule/CyriaxModule were
// dead imports (only ever rendered via their existing lazy_*.jsx wrappers
// below); PDF_BASE_STYLES/makePDFPage/downloadPDFFromHTML were unused
// entirely; MOVEMENTS only fed a dead percentage calc for the old, already-
// removed classic-FMS scoring (see getSectionPct's old fmaKeys). The 5 real,
// actively-rendered components moved to lazy()+Suspense below -- this file
// (SubjectiveObjective.jsx) is ~15k lines and was the single largest bundle
// chunk (~1MB), forced eager on every single page load purely because these
// 5 components were statically imported/rendered here without the lazy
// wrapper every sibling screen already uses.
// NOTE: GaitModule, OutcomeMeasuresModule, SOAPNoteModule,
// ExercisePrescriptionModule, LiveSOAPPanel, PalpationModule,
// TreatmentTechniquesModule, TreatmentSessionLogModule, ObservationModule,
// buildClinicalInterpretation, Sparkline, EXERCISE_DB, ALL_EXERCISES,
// PROGRAMME_TEMPLATES, TEMPLATE_TX used to be imported here. GaitModule/
// OutcomeMeasuresModule/ExercisePrescriptionModule/PalpationModule/
// TreatmentTechniquesModule/TreatmentSessionLogModule/buildClinicalInterpretation/
// Sparkline/EXERCISE_DB/ALL_EXERCISES/PROGRAMME_TEMPLATES/TEMPLATE_TX were
// dead imports (unused directly, or only rendered via their existing
// lazy_*.jsx wrappers). SOAPNoteModule, LiveSOAPPanel, and ObservationModule
// WERE actively rendered directly (not lazy) -- moved to lazy()+Suspense
// below, same reasoning as the SubjectiveObjective.jsx cleanup above:
// ClinicalModules.jsx (~530KB) was forced eager on every page load only
// because of these 3 direct renders.
import BodyChartPro from "./BodyChartPro.jsx";
import OutcomeMeasuresPro from "./OutcomeMeasuresPro.jsx";
import AuthScreen from "./AuthScreen.jsx";
import { NeurologicalModule, NeuroTemplatesHub } from "./PhysioNeuro.jsx";
import AssessmentEngine from "./streams/engine.jsx";
// Dynamic import -- ObjectiveHub statically imports REGION_NAV/REGION_FAMILY_KEY
// from SubjectiveObjective.jsx (the same big shared file lazy_special.jsx,
// lazy_subjective.jsx etc re-export from). A static import here would pull
// that whole file into the main bundle, same class of bug as the earlier
// lazy_rom static-import regression -- keep it lazy like every other tab.
const LazyObjectiveHub = lazy(() => import("./ObjectiveHub.jsx"));
import neuroStream from "./streams/neuro.js";
import { GCSWidget, CranialWidget, ReflexWidget, CoordinationWidget, SensoryWidget, MyotomeWidget, NeuralTensionWidget, VestibularWidget, PerceptualWidget, RedFlagsWidget, SensoryRegionWidget } from "./streams/neuroWidgets.jsx";
import { ALL_TESTS, MMT_DATA, DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO } from "./sharedClinicalData.js";
import AIAssistant from "./AIAssistant.jsx";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

import { PostureAnalysisModule, PC } from "./PostureEngine.jsx";
import {
  dbKey, draftKey,
  loadPatientDB, savePatientDB,
  loadTaskDB, saveTaskDB,
  genId,
  PatientDatabasePanel, PatientProfileModal, TreatmentCaseloadPanel,
} from "./PatientDatabase.jsx";
import { PostureDefectModule, HomeModule, TherapistDashboardModule } from "./DashboardModules.jsx";
import AssessmentReportView from "./AssessmentReportView.jsx";
import SpecialtyPatientProfile from "./SpecialtyPatientProfile.jsx";
import { PdfReportsModal, QuickVisitForm, IntakeForm, OnboardingModal } from "./AppModules.jsx";
import InstallPrompt from "./InstallPrompt.jsx";
import AuthRequiredPrompt from "./AuthRequiredPrompt.jsx";

// ── Lazy-loaded heavy modules (split into separate async chunks) ──────────────
const LazyPhysioFeedEntry = lazy(() => import("./physiofeed/PhysioFeedEntry.jsx"));
const LazyProfileTabEntry = lazy(() => import("./physiofeed/ProfileTabEntry.jsx"));
const LazyLearnTabEntry = lazy(() => import("./physiofeed/LearnTabEntry.jsx"));
const LazySubjective    = lazy(() => import("./lazy_subjective.jsx"));
const LazySubjectiveNew = lazy(() => import("./SubjectiveAssessmentNew.jsx"));
const LazySubjectiveCompare = lazy(() => import("./SubjectiveCompare.jsx"));
const LazyCardioAssessment = lazy(() => import("./CardiopulmonaryAssessment.jsx"));
// Replaces the old config-driven Neuro stream engine (STREAM_CONFIGS.neuro
// below, now unreachable from the UI -- see the specialty-picker and
// StreamSelector changes, both now navTo("neuro_assessment") instead of
// setStream("neuro")) with a standalone tool, same pattern as Cardio.
const LazyNeuroAssessment = lazy(() => import("./NeurologicalAssessment.jsx"));
// New Ortho Assessment module — standalone tool, same pattern as Cardio/Neuro
// above. The old config-driven "ortho" stream stays reachable, relabeled
// "Old Ortho" in STREAMS below.
// New Ortho Assessment module — standalone tool, same pattern as Cardio/Neuro
// above. The old config-driven "ortho" stream stays reachable, relabeled
// "Old Ortho" in STREAMS below. (All ortho*.jsx/js support files are now
// present in the repo -- must be committed together with this file so the
// production build can resolve the import.)
const LazyOrthoAssessmentNew = lazy(() => import("./OrthoAssessmentNew.jsx"));
const LazySTT           = lazy(() => import("./lazy_stt.jsx"));
const LazyCPA           = lazy(() => import("./lazy_cpa.jsx"));
const LazyExercise      = lazy(() => import("./lazy_exercise.jsx"));
const LazyOutcomes      = lazy(() => import("./lazy_outcomes.jsx"));
const LazyNeuro         = lazy(() => import("./lazy_neuro.jsx"));
const LazyNeuroTemplates = lazy(() => import("./lazy_neurotemplates.jsx"));
const LazyBodyChart     = lazy(() => import("./lazy_bodychart.jsx"));
const LazyGait          = lazy(() => import("./lazy_gait.jsx"));
const LazyPalpation     = lazy(() => import("./lazy_palpation.jsx"));
const LazyTreatment     = lazy(() => import("./lazy_treatment.jsx"));
const LazySpecial       = lazy(() => import("./lazy_special.jsx"));
const LazyFMA           = lazy(() => import("./lazy_fma.jsx"));
const LazyFascia        = lazy(() => import("./lazy_fascia.jsx"));
const LazyKinetic       = lazy(() => import("./lazy_kinetic.jsx"));
const LazyCyriaxRegion  = lazy(() => import("./lazy_cyriax_region.jsx"));
const LazyObservation   = lazy(() => import("./lazy_observation.jsx"));
const LazySOAPNote      = lazy(() => import("./lazy_soapnote.jsx"));
const LazyMMT           = lazy(() => import("./lazy_mmt.jsx"));
const LazyROM           = lazy(() => import("./lazy_rom.jsx"));

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
// ── CLINICAL STREAMS (Step 1) ────────────────────────────────────────────────
// The 5 top-level assessment specialties. Each will own its own
// config-driven flow (demographics → subjective → objective → plan).
// Step 1 wires the selector + routing shell; only "ortho" is live today.
// Config-driven stream registry. A stream with a config renders via the
// AssessmentEngine; others fall back to the "coming soon" placeholder.
const STREAM_CONFIGS = { neuro: neuroStream };
const TemplatesWidget = ({ data, navTo, PC }) => <NeuroTemplatesHub data={data} navTo={navTo} navContext={{}}/>;
const STREAM_WIDGETS = { Templates: TemplatesWidget, GCS: GCSWidget, Cranial: CranialWidget, Reflexes: ReflexWidget, Coordination: CoordinationWidget, Sensory: SensoryWidget, SensoryRegion: SensoryRegionWidget, Myotome: MyotomeWidget, NeuralTension: NeuralTensionWidget, Vestibular: VestibularWidget, Perceptual: PerceptualWidget, RedFlags: RedFlagsWidget };

const STREAMS = [
  { id:"ortho",     label:"Old Ortho",        icon:"🦴", color:"#7c3aed", live:true  },
  { id:"ortho_new", label:"Ortho Assessment", icon:"🦴", color:"#7c3aed", live:true  },
  { id:"neuro",     label:"Neuro",            icon:"🧠", color:"#0d9488", live:true  },
  { id:"sports",    label:"Sports",           icon:"🏃", color:"#ea580c", live:false },
  { id:"pedia",     label:"Pedia",            icon:"🧸", color:"#db2777", live:false },
  { id:"cardio",    label:"Cardio",           icon:"❤️", color:"#dc2626", live:false },
];

function StreamEnginePlaceholder({ stream, setStream, PC }) {
  const st = STREAMS.find(s=>s.id===stream) || {};
  return (
    <div style={{textAlign:"center",padding:"56px 24px",maxWidth:560,margin:"0 auto"}}>
      <div style={{fontSize:"3rem",marginBottom:12}}>{st.icon}</div>
      <h2 style={{fontSize:"1.4rem",fontWeight:800,color:PC.text,marginBottom:8}}>
        {st.label} assessment</h2>
      <p style={{fontSize:"0.9rem",color:PC.muted,lineHeight:1.6,marginBottom:22}}>
        This stream will run on the config-driven assessment engine —
        demographics, subjective, objective and plan all tailored for
        {" "}{st.label.toLowerCase()} patients. It's being built next (Step 2).
      </p>
      <button type="button" onClick={()=>setStream("ortho")}
        style={{padding:"10px 20px",borderRadius:10,border:`2px solid ${STREAMS[0].color}`,
          background:STREAMS[0].color+"12",color:STREAMS[0].color,fontWeight:700,
          fontSize:"0.85rem",cursor:"pointer"}}>
        ← Back to Ortho (live)
      </button>
    </div>
  );
}

function AppInner({ currentUser, onSignOut, isGuest=false }) {
  // Per-user storage keys — see PatientDatabase.jsx's dbKey()/draftKey() for
  // why this matters: without this, two students sharing one browser/device
  // would silently read and overwrite each other's local patient cache.
  const DB_KEY = dbKey(currentUser?.id);
  const DRAFT_KEY = draftKey(currentUser?.id);

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
  // ── Back navigation (in-app Back button + real browser/hardware back) ──
  // activeRef mirrors `active` synchronously so navTo (a stable useCallback)
  // can tell whether a nav call is actually going somewhere new, without
  // needing `active` in its dependency array.
  const activeRef = useRef("home");
  useEffect(() => { activeRef.current = active; }, [active]);
  const [canGoBack, setCanGoBack] = useState(false);

  // ── Guest Mode auth gate ─────────────────────────────────────────────
  // Guests can browse and use the whole real workflow (nothing they do
  // writes to Supabase -- every save path already guards on currentUser?.id
  // being present, see savePatientDB / the cloud-sync effect below). The
  // ONLY things that genuinely cannot work without a real account are the
  // AI-backed endpoints (/api/parse, /api/chat, and friends) -- the server
  // hard-requires a real Supabase JWT (see api/_lib/rateLimit.js), so there
  // is no safe way to let a guest actually call them. requireAuth() is the
  // single gate every AI-triggering button checks first: real users pass
  // straight through, guests get a "sign in to continue" popup instead of
  // a button that would otherwise just silently 401.
  const [authPromptFeature, setAuthPromptFeature] = useState(null); // null | feature label string
  const requireAuth = useCallback((featureLabel) => {
    if (isGuest) { setAuthPromptFeature(featureLabel); return false; }
    return true;
  }, [isGuest]);
  // ── CLINICAL STREAM (Step 1 scaffold) ──────────────────────────────
  // Top-level specialty that drives the whole assessment flow. "ortho"
  // keeps the existing app; other streams render via the config-driven
  // AssessmentEngine (built in Step 2).
  const [stream, setStream] = useState(() => localStorage.getItem("pm_stream") || "ortho");
  useEffect(() => { try { localStorage.setItem("pm_stream", stream); } catch(e){} }, [stream]);
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('pm_onboarded'));
  const [lastSaved, setLastSaved] = useState(null);
  // 'idle' | 'saving' | 'saved' | 'error' — reflects whether the active
  // patient's data has actually reached Supabase (the real record), not just
  // whether it's cached in this browser's local storage.
  const [cloudSaveStatus, setCloudSaveStatus] = useState("idle");

  // ── Deferred mounting: heavy tabs only render after first visit ──────────
  // This cuts initial render time dramatically
  // Once mounted, component stays mounted (data preserved)
  const [mountedTabs, setMountedTabs] = useState(new Set(["home", "demographics", "subjective"]));
  const [subjBodyChartTab, setSubjBodyChartTab] = useState(false);
  const [chartPalpTab, setChartPalpTab] = useState("chart");  // "chart" | "palpation" -- combined Body Chart/Palpation step
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
      // Draft is empty/too thin but a patient is still active (raw.pid). Load
      // that patient's saved record so the Subjective form matches the header
      // instead of rendering blank while the header shows the patient's name.
      if (raw && raw.pid) {
        const active = loadPatientDB(currentUser?.id).find(p => p.id === raw.pid);
        if (active && active.data && Object.keys(active.data).length > 0) return active.data;
      }
    } catch {}
    return {};
  });
  const [infoModal, setInfoModal] = useState(null);
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
  const [patients, setPatients] = useState(() => loadPatientDB(currentUser?.id));
  const [taskDB, setTaskDB] = useState(() => loadTaskDB());

  // ── Supabase: load patients on mount and merge with localStorage ──────────
  useEffect(() => {
    supabase.from("patients").select("*")
      .eq("user_id", currentUser?.id || "")
      .is("deleted_at", null) // hide soft-deleted rows -- see deletePatient() below
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

  // ── Auto-save to the CLOUD (debounced, ~2s after typing stops) ────────────
  // This is what makes Supabase the real source of truth instead of local
  // storage: every change to the active patient gets pushed up here, not
  // just cached on this device. Same TDZ-avoidance reason as above for why
  // activePatientId/currentUser are captured via closure, not in deps.
  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;
    if (!activePatientId || !currentUser?.id) return;
    const pid = activePatientId;
    const uid = currentUser.id;
    const timer = setTimeout(() => {
      setCloudSaveStatus("saving");
      setPatients(prev => {
        const updated = prev.map(p => p.id === pid
          ? { ...p, data, name: data["dem_name"] || p.name, updatedAt: new Date().toISOString() }
          : p);
        savePatientDB(updated, uid)
          .then(() => { setCloudSaveStatus("saved"); setLastSaved(new Date()); })
          .catch(() => setCloudSaveStatus("error")); // network/RLS failure — will retry on the next edit
        return updated;
      });
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
  const [showPdfReports, setShowPdfReports] = useState(false);
  const [profilePatient, setProfilePatient] = useState(null);
  const [profileTab, setProfileTab] = useState(null);
  // Clinical tab's own sub-navigation (2026-08-22): "Patients" is the
  // existing default (must stay first/default so clinicalTabRedesign.test.jsx
  // -- which clicks "Clinical" and expects the patient search box immediately
  // -- keeps passing); "Today" and "Treatment" are new lenses onto the same
  // patients array, not separate data.
  const [clinicalSubTab, setClinicalSubTab] = useState("patients"); // "today" | "patients" | "treatment"
  const [showIntake, setShowIntake] = useState(false);
  const [intakeData, setIntakeData] = useState({});
  // Clinical tab landing: "+ New Assessment" asks which specialty stream
  // before creating the patient, instead of always assuming Ortho.
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  // Shared "start a new assessment for this specialty" logic -- used by
  // both the "+ New Assessment" specialty-picker modal below and the
  // Clinical tab's own "Assessment" sub-tab pills (2026-08-23), so picking
  // a specialty does the exact same real thing (blank-slate + navigate to
  // that specialty's real tool) no matter which entry point was used.
  function startSpecialty(st) {
    if (st.id === "cardio") {
      setData({});
      setActivePatientId(null);
      navTo("cardio_assessment");
    } else if (st.id === "neuro") {
      setData({});
      setActivePatientId(null);
      navTo("neuro_assessment");
    } else if (st.id === "ortho") {
      setStream("ortho");
      setData({});
      setActivePatientId(null);
      navTo("demographics");
    } else if (st.id === "ortho_new") {
      setData({});
      setActivePatientId(null);
      navTo("ortho_new_assessment");
    } else {
      setStream(st.id);
      createNewPatient();
    }
  }
  // "New Assessment" picker's two honest entry points -- both go into the
  // same real Outpatient wizard (the only pathway that picker offers),
  // differing only in whether the AI intake box auto-opens on Subjective.
  // See OrthoAssessment.jsx's entryMode handling for the skip-ahead logic.
  function startOrthoEntry(mode) {
    setData({});
    setActivePatientId(null);
    navTo("ortho_new_assessment", { entryMode: mode });
  }
  // Demographics step redesign: the 6 core fields (name/dob/age/gender/
  // phone/email/occupation) show up front; everything else the clinic
  // still needs on file (sex detail, work info, address, emergency
  // contact, referral, insurance, medical history, consent) lives behind
  // this "More details" toggle instead of disappearing.
  const [demMoreOpen, setDemMoreOpen] = useState(false);

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
      savePatientDB(updated, currentUser?.id);
      return updated;
    });
  }, [data, activePatientId]);

  // Cardio/Neuro have no "Create Patient & Continue" button of their own
  // (see the Ortho Demographics CTA below) -- a therapist who goes straight
  // to "Cardiopulmonary/Neurological Assessment" from the sidebar with no
  // patient selected was filling in dem_name (mirrored from the wizard's
  // own demographics step) but never creating a patients[] row, since the
  // auto-save effect above bails out while activePatientId is null. Aditi:
  // "whenever i am doing assessment of cardio no cardio patient showing in
  // clinical". Fix: as soon as a name appears with no active patient while
  // on one of these two screens, create the patient row the same way the
  // Ortho CTA does, then adopt it as the active patient so the auto-save
  // effect above takes over from here.
  useEffect(() => {
    if (activePatientId) return;
    if (active !== "cardio_assessment" && active !== "neuro_assessment" && active !== "ortho_new_assessment") return;
    const name = (data.dem_name || "").trim();
    if (!name) return;
    const newP = { id: genId(), name, data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: "" };
    setPatients(prev => { const updated = [newP, ...prev]; savePatientDB(updated, currentUser?.id); return updated; });
    setActivePatientId(newP.id);
  }, [data.dem_name, activePatientId, active]);

  const createNewPatient = () => {
    setIntakeData({});
    setShowIntake(true);
    setShowPatientDb(false);
  };
  const finaliseNewPatient = (intake) => {
    const name = intake.dem_name || "New Patient";
    // Stamp which specialty stream this assessment was started under. The
    // intake form's own step 2 now asks this outright (2026-08-31), so its
    // answer wins; the `stream` fallback still covers the older entry points
    // that set the specialty before calling createNewPatient(). Patients
    // created before this field existed simply have no value here, so they
    // show up under "All" in the Clinical patient list's specialty filter
    // rather than a guessed/fabricated specialty.
    const chosenSpecialty = intake.assessment_specialty || stream;
    const intakeWithSpecialty = { ...intake, assessment_specialty: chosenSpecialty };
    const newP = { id: genId(), name, data: intakeWithSpecialty, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: intake.cc_main||"" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated, currentUser?.id);
    setData(intakeWithSpecialty);
    setActivePatientId(newP.id);
    setShowIntake(false);
    // Land in the flow the clinician actually picked on step 2, instead of
    // always dropping into the ortho Subjective wizard. navTo() snaps
    // `stream` back to "ortho" itself, and both of these are ortho-flow
    // `active` keys (the same ones startSpecialty() uses), so no extra
    // setStream() is needed here.
    navTo(chosenSpecialty === "cardio" ? "cardio_assessment"
        : chosenSpecialty === "neuro"  ? "neuro_assessment"
        : "subjective");
    setJsonMsg({ type:"success", text:`✅ Patient created: ${name}` });
    setTimeout(() => setJsonMsg(null), 2500);
  };

  const selectPatient = (p) => {
    // Flush any edits on the outgoing patient before switching -- the 2s
    // debounced autosave effects already do this in the background, but
    // switching mid-edit shouldn't have to wait out that debounce window.
    if (Object.keys(data).length > 0 && activePatientId && activePatientId !== p.id) {
      setPatients(prev => {
        const updated = prev.map(pt => pt.id === activePatientId ? { ...pt, data, name: data["dem_name"] || pt.name, updatedAt: new Date().toISOString() } : pt);
        savePatientDB(updated, currentUser?.id);
        return updated;
      });
    }
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

  const deletePatient = (id) => {
    if (!window.confirm("Delete this patient? This removes it from your list -- it can still be recovered if needed.")) return;
    const updated = patients.filter(p => p.id !== id);
    setPatients(updated);
    savePatientDB(updated, currentUser?.id);
    // Soft delete: mark deleted_at instead of removing the row (see
    // supabase/soft_delete_patients.sql). A single misclick through the
    // confirm() dialog used to be an unrecoverable permanent DELETE with
    // no undo path short of a full database restore -- this way the real
    // clinical record survives and can be restored by us on request,
    // matching the 30-day deletion grace period already promised in the
    // Privacy Policy. savePatientDB only UPSERTs the patients that remain
    // locally, so this explicit Supabase call is still needed, same as
    // before -- just an UPDATE instead of a DELETE now.
    if (currentUser?.id) {
      supabase.from("patients").update({ deleted_at: new Date().toISOString() })
        .eq("id", id).eq("user_id", currentUser.id)
        .then(({ error }) => { if (error) console.warn("[Supabase soft-delete]", error.message); })
        .catch((e) => console.warn("[Supabase soft-delete error]", e));
    }
    if (activePatientId === id) { setData({}); setActivePatientId(null); }
    setJsonMsg({ type:"success", text:"Patient deleted" });
    setTimeout(() => setJsonMsg(null), 2000);
  };

  const importPatientFromJSON = (parsed) => {
    if (!parsed.data) return;
    const newP = { id: genId(), name: parsed.patientName || parsed.data?.dem_name || "Imported Patient", data: parsed.data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: parsed.lastDx || "" };
    const updated = [newP, ...patients];
    setPatients(updated);
    savePatientDB(updated, currentUser?.id);
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

  const navTo = useCallback((key, ctx = {}, navOpts = {}) => {
    // Every navTo() target (sidebar items, bottom nav, Home tiles, dashboard
    // rows, Neuro Templates' own deep-link checklist, outcome-scale rows,
    // patient-profile jumps, etc.) is an ortho-flow `active` tab -- none of
    // them render while `stream !== "ortho"` (see STREAM ROUTING SHELL
    // below). Previously navTo left `stream` untouched, so calling it from
    // inside a live stream (e.g. Neuro) updated `active`/sidebar highlight
    // but the main pane stayed locked on the stream engine -- looked like
    // "every other button stopped working." Always snap back to ortho first.
    setStream("ortho");
    setActive(key);
    setNavContext(ctx || {});
    setNavOpen(false);
    // Mount tab on first visit
    setMountedTabs(prev => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    // Back navigation: push a browser history entry for every *real* nav
    // (skipped when this call is itself replaying a popstate event, and
    // when the target is the screen we're already on -- e.g. a Home tile
    // re-firing onNav for the current tab just to reset navContext --
    // otherwise Back would need two presses to actually move). This makes
    // the phone/browser hardware Back button and the in-header Back button
    // both work off the same real history stack instead of a separate one
    // we'd have to keep in sync by hand.
    if (!navOpts.__fromPopState && key !== activeRef.current) {
      try {
        window.history.pushState({ pmNavKey: key, pmNavCtx: ctx || {} }, "", window.location.href);
        setCanGoBack(true);
      } catch {}
    }
    // Every nav path in the app (desktop sidebar, mobile drawer, bottom nav,
    // Home tiles, dashboard rows, deep-links) funnels through here -- single
    // choke point, so this is the one place that needs a track() call to
    // answer "what's the most-used module" (Vercel Web Analytics' automatic
    // pageview tracking can't see this: it's a single-page app, module
    // switches are internal state, not separate URLs). Fire-and-forget,
    // silently no-ops if Web Analytics isn't enabled on the project yet.
    try { track('module_opened', { module: key }); } catch {}
  }, []);

  // Seed the browser history stack with the starting screen once on mount,
  // so the very first Back press has something real to land on instead of
  // popping straight out of the app.
  useEffect(() => {
    try { window.history.replaceState({ pmNavKey: activeRef.current, pmNavCtx: {} }, "", window.location.href); } catch {}
  }, []);

  // Real hardware/browser Back (and Forward) button support: replays
  // whatever nav state the browser landed on. If a user goes back further
  // than our first replaceState entry (state is null/foreign), fall back to
  // Home rather than leaving them on a blank pane.
  useEffect(() => {
    const onPopState = (e) => {
      const s = e.state;
      navTo(s?.pmNavKey || "home", s?.pmNavCtx || {}, { __fromPopState: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navTo]);

  // In-header "← Back" button: defers to the real browser history (rather
  // than a hand-rolled stack) so it stays perfectly in sync with the
  // hardware back button -- one press of either always does the same thing.
  const goBack = useCallback(() => {
    try { window.history.back(); } catch {}
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
    // Real fix (was always 0%, see prior comment history in git blame): the
    // "Functional Assessment" sidebar item checked dead fma_<movement>
    // fields nothing has written since the module moved to
    // FunctionalScreenHub. FunctionalScreenHub itself doesn't store one
    // flat field per test -- each of its 10 body-region sub-screens
    // (LumbarFunctionalScreen, ShoulderFunctionalScreen, ... in
    // SubjectiveObjective.jsx) persists ALL its findings as a single JSON
    // blob under its own region key (lfs_data, sfs_data, hfs_data,
    // kfs_data, afs_data, cfs_data, thfs_data, elfs_data, wffs_data,
    // tmjfs_data), written only on real user interaction (setObs/setGrade/
    // setNote), never auto-initialised on mount -- confirmed by reading
    // each screen's own useEffect (read-only) vs save() (write, user-
    // triggered only). So a simple flat truthy check per region -- the
    // same pattern this file already uses for every other section -- is
    // both correct and consistent: 1 region assessed with any real finding
    // counts as 1 of 10, not a fine-grained per-test count that would
    // require parsing 10 separate JSON blobs to keep in sync.
    const FMA_REGION_DATA_KEYS = ["lfs_data","sfs_data","hfs_data","kfs_data","afs_data","cfs_data","thfs_data","elfs_data","wffs_data","tmjfs_data"];
    const fmaKeys=key==="fma"?FMA_REGION_DATA_KEYS:[];
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

  const doctorInitials = (currentUser?.user_metadata?.full_name || currentUser?.email || "Dr")
    .replace(/@.*/,"").trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();

  const SidebarItems = ({ onNav }) => (
    <>
      {/* Greeting */}
      <div style={{padding:"10px 12px 8px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:36,height:36,borderRadius:"50%",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,color:"#fff",fontWeight:800,fontSize:"0.82rem"}}>
          {doctorInitials}
        </div>
        <div>
          <div style={{fontSize:"0.82rem",fontWeight:800,color:PC.text,lineHeight:1.2}}>Hello, Dr {(currentUser?.user_metadata?.full_name||currentUser?.email?.split("@")[0]||"Doctor").replace(/^dr\.?\s+/i,"").split(" ")[0]}</div>
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
        {data.dem_name && (
          <button onClick={()=>{ setNavOpen(false); setShowPdfReports(true); }} style={{width:"100%",marginTop:5,padding:"8px 10px",background:"rgba(37,99,235,0.06)",border:"1px solid rgba(37,99,235,0.25)",borderRadius:8,color:"#2563eb",fontWeight:600,fontSize:"0.78rem",cursor:"pointer",display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>
            📄 PDF Reports
          </button>
        )}

        {/* ── Active patient + PDF buttons ── */}
        {data.dem_name && (
          <div style={{marginTop:8,background:"rgba(37,99,235,0.05)",border:"1px solid rgba(37,99,235,0.18)",borderRadius:9,padding:"8px 10px"}}>
            {/* Patient name pill */}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}>
              <span style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",flexShrink:0,display:"inline-block"}}/>
              <span style={{fontSize:"0.78rem",fontWeight:700,color:"#1e293b",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1}}>{data.dem_name}</span>
              {data.dem_age && <span style={{fontSize:"0.72rem",color:"#64748b",flexShrink:0}}>{data.dem_age}y</span>}
            </div>
            {/* Profile / Start Session buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5}}>
              <button
                onClick={()=>setProfilePatient(activePatient)}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#1a3a5c,#2563eb)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(37,99,235,0.3)"}}>
                👤 Profile
              </button>
              <button
                onClick={()=>navTo("tx_sessions")}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#065f46,#059669)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(5,150,105,0.3)"}}>
                ▶️ Start Session
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
        <SidebarItem navKey="subjective_compare" icon="🆚" label="Subjective — New vs Old"/>
        <SidebarItem navKey="cardio_assessment" icon="🫀" label="Cardiopulmonary Assessment"/>
        <SidebarItem navKey="neuro_assessment" icon="🧠" label="Neurological Assessment (Full)"/>
        <SidebarItem navKey="ortho_new_assessment" icon="🦴" label="Ortho Assessment"/>
        <SidebarItem navKey="posture"       icon="🧍" label="Posture Analysis"/>
        <SidebarItem navKey="observation"   icon="👁️" label="Observation"/>
        <SidebarItem navKey="palpation"     icon="🖐️" label="Palpation"/>
        <SidebarItem navKey="rom"           icon="📐" label="Range of Motion"/>
        <SidebarItem navKey="mmt"           icon="💪" label="MMT"/>
        <SidebarItem navKey="special"       icon="🔬" label="Special Tests (100+)"/>
        {/* Disambiguated (2026-08-20, Aditi: clicking "neuro new assessment"
            was landing on this old item) -- this is an Ortho objective-exam
            quick screen (reflexes/sensation as part of an Ortho physical
            exam, config-driven NEURO_MODULE), not the standalone Neuro
            specialty tool above it. Label made explicit so it can't be
            mistaken for the real entry point. */}
        <SidebarItem navKey="neuro"         icon="⚡" label="Neuro Screen (Ortho exam)"/>
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
        <SidebarItem navKey="tx_sessions"  icon="⚡" label="Sessions"/>
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

      {/* ── Guest Mode: "sign in to use this" popup, shown by requireAuth() ── */}
      {authPromptFeature && (
        <AuthRequiredPrompt
          feature={authPromptFeature}
          onClose={()=>setAuthPromptFeature(null)}
          onSignIn={()=>{ setAuthPromptFeature(null); onSignOut(); }}
        />
      )}

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
          onNew={()=>setShowSpecialtyPicker(true)}
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
            // BUG FIX: this used to only update in-memory `patients` state and
            // never actually persisted — Quick Notes / Clinical Impression
            // entries saved from the Patient Profile modal could silently be
            // lost on refresh, since neither localStorage nor Supabase ever
            // saw them. Now routed through the same savePatientDB() path
            // (local cache + cloud) everything else uses.
            setPatients(prev=>{
              const updated = prev.map(p=>p.id===id?{...p,data:{...p.data,...newData},name:newData.dem_name||p.name,updatedAt:new Date().toISOString()}:p);
              savePatientDB(updated, currentUser?.id);
              return updated;
            });
          }}
          onNav={(key)=>{ if(key==="demographics"){ setProfileTab("demographics"); } else { setProfilePatient(null); setProfileTab(null); navTo(key); } }}
          initialTab={profileTab||undefined}
        />
      )}

      {/* ── NEW PATIENT INTAKE MODAL ── */}
      {/* ── NEW ASSESSMENT: SPECIALTY PICKER ──
          Reuses the same STREAMS registry the Home/Demographics
          StreamSelector already uses -- Ortho/Neuro are live, Sports/Pedia/
          Cardio show the same SOON badge and just don't proceed yet. */}
      {showSpecialtyPicker && (
        <div data-testid="specialty-picker-modal" style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{width:"100%",maxWidth:440,maxHeight:"88vh",overflowY:"auto",background:PC.surface,borderRadius:16,padding:"24px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:4}}>New Assessment</div>
            <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:18}}>How would you like to assess?</div>

            {/* Only two real entry points today -- both lead into the same
                Orthopaedic Outpatient wizard (the only pathway that's
                actually built), differing only in whether AI drives
                Subjective or the therapist fills it manually. Everything
                else (IPD, Cardio, Neuro as Ortho "streams", Pedia, Sports)
                is listed honestly as not-yet-built below instead of sitting
                here pretending to be an equal, working option. */}
            <button type="button"
              onClick={()=>{ setShowSpecialtyPicker(false); startOrthoEntry("ai"); }}
              style={{display:"flex",flexDirection:"column",gap:4,width:"100%",padding:"16px",borderRadius:14,
                cursor:"pointer",fontFamily:"inherit",textAlign:"left",marginBottom:10,
                border:`1.5px solid ${PC.accent}50`,background:`linear-gradient(135deg,${PC.accent}14,${PC.a2}0c)`}}>
              <span style={{fontSize:"0.95rem",fontWeight:800,color:PC.accent}}>✨ AI Assessment</span>
              <span style={{fontSize:"0.8rem",color:PC.muted,lineHeight:1.5}}>Say your assessment in your own words. AI structures your subjective assessment and suggests relevant objective tests.</span>
              <span style={{fontSize:"0.8rem",fontWeight:700,color:PC.accent,marginTop:4}}>Start with AI →</span>
            </button>

            <button type="button"
              onClick={()=>{ setShowSpecialtyPicker(false); startOrthoEntry("template"); }}
              style={{display:"flex",flexDirection:"column",gap:4,width:"100%",padding:"16px",borderRadius:14,
                cursor:"pointer",fontFamily:"inherit",textAlign:"left",marginBottom:18,
                border:`1.5px solid ${PC.border}`,background:PC.s2}}>
              <span style={{fontSize:"0.95rem",fontWeight:800,color:PC.text}}>📋 Assessment Template</span>
              <span style={{fontSize:"0.8rem",color:PC.muted,lineHeight:1.5}}>Orthopaedic Outpatient — your current assessment workflow.</span>
              <span style={{fontSize:"0.8rem",fontWeight:700,color:PC.text,marginTop:4}}>Start Assessment →</span>
            </button>

            <div style={{fontSize:"0.68rem",fontWeight:800,letterSpacing:"0.4px",textTransform:"uppercase",color:PC.muted,marginBottom:8}}>More coming soon</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:18}}>
              {["IPD","Post-operative","Neurological","Cardiopulmonary","Paediatric","Sports"].map(label=>(
                <span key={label} style={{fontSize:"0.74rem",fontWeight:600,padding:"4px 10px",borderRadius:20,background:PC.s2,border:`1px solid ${PC.border}`,color:PC.muted}}>{label}</span>
              ))}
            </div>

            <button type="button" onClick={()=>setShowSpecialtyPicker(false)}
              style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${PC.border}`,borderRadius:10,color:PC.muted,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showIntake && (
        <div data-testid="intake-modal" style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",background:PC.surface,borderRadius:16,padding:"24px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)",WebkitOverflowScrolling:"touch"}}>
            <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:4}}>New patient</div>
            <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:20}}>Fill the basics — you can add more detail later</div>
            <IntakeForm PC={PC} currentUser={currentUser} onCancel={()=>setShowIntake(false)} onSubmit={finaliseNewPatient}/>
          </div>
        </div>
      )}

      {/* ── PDF REPORTS MODAL ── */}
      {showPdfReports && (
        <PdfReportsModal
          data={data}
          patients={patients}
          onClose={()=>setShowPdfReports(false)}
        />
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
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,padding:"max(18px, env(safe-area-inset-top)) 14px 14px",borderBottom:`1px solid ${PC.border}`,marginBottom:8}}>
          <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
            <img src="/logo.svg" alt="PhysioMind" style={{height:26,width:"auto",flexShrink:0,display:"block"}}/>
            <div style={{fontWeight:800,fontSize:"0.88rem",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap"}}>PhysioMind Pro</div>
          </div>
          <button onClick={()=>setNavOpen(false)} aria-label="Close navigation" style={{width:30,height:30,borderRadius:8,border:`1px solid ${PC.border}`,background:PC.s2,color:PC.muted,fontSize:"0.9rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
        </div>
        <div style={{padding:"0 8px"}}>
          <SidebarItems onNav={navTo}/>
        </div>
      </div>

      {/* Header — Medical Professional */}
      <div className="pm-header" style={{background:PC.isDark?`linear-gradient(180deg,${PC.headerBg},${PC.surface})`:`${PC.headerBg}`,borderBottom:`1px solid ${PC.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:PC.isDark?"0 1px 20px rgba(0,0,0,0.4)":"0 1px 12px rgba(0,20,50,0.06)"}}>
        <div className="pm-header-inner" style={{maxWidth:1400,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,gap:10}}>
          <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
            <button className="pm-hamburger" onClick={()=>setNavOpen(o=>!o)} aria-label="Open navigation">☰</button>
            {active!=="home" && canGoBack && (
              <button onClick={goBack} aria-label="Go back" title="Go back"
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 10px",background:PC.s2,
                  border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontWeight:600,
                  fontSize:"0.82rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                <span style={{fontSize:"0.9rem"}}>←</span> Back
              </button>
            )}
            {/* Logo */}
            <img src="/logo.svg" alt="PhysioMind" style={{height:48,width:"auto",flexShrink:0,display:"block"}} />
            <div style={{minWidth:0}}>
              <div style={{fontWeight:800,fontSize:"clamp(0.85rem,3vw,1.05rem)",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap",lineHeight:1.2}}>PhysioMind Pro</div>
              <div className="pm-logo-sub" style={{fontSize:"0.75rem",color:PC.muted,letterSpacing:"1px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",textTransform:"uppercase",fontWeight:600,marginTop:1}}>Posture Screening & Education</div>
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
        background: "#FFFFFF",
        borderBottom: `1px solid ${PC.isDark?PC.border:"#E0E0E2"}`,
        borderLeft: `3.5px solid ${PC.accent}`,
      }}>
        {/* Hamburger */}
        <button className="pm-hamburger" onClick={()=>setNavOpen(o=>!o)} aria-label="Open navigation"
          style={{minHeight:34,minWidth:34,padding:"6px 8px",fontSize:"1.05rem",
            background: PC.isDark?"rgba(124,58,237,0.15)":"transparent",
            border:"none",borderRadius:8,color:PC.accent,cursor:"pointer",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
          ☰
        </button>
        {active!=="home" && canGoBack && (
          <button onClick={goBack} aria-label="Go back" title="Go back"
            style={{minHeight:34,minWidth:34,padding:"6px 8px",fontSize:"1.05rem",
              background: PC.isDark?"rgba(124,58,237,0.15)":"transparent",
              border:"none",borderRadius:8,color:PC.accent,cursor:"pointer",flexShrink:0,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
            ←
          </button>
        )}
        {/* Logo — plain, bigger */}
        <img src="/logo.svg" alt="PhysioMind" style={{height:40,width:"auto",flexShrink:0}} />
        {/* Text */}
        <div style={{flex:1,minWidth:0,overflow:"hidden"}}>
          <div style={{fontWeight:800,fontSize:"0.92rem",color:PC.isDark?PC.a2:"#4c1d95",letterSpacing:"-0.3px",lineHeight:1.2,whiteSpace:"nowrap"}}>PhysioMind Pro</div>
          {activePatient
            ? <div style={{fontSize:"0.72rem",color:PC.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                <span style={{color:PC.a3}}>●</span> {activePatient.name.length>18?activePatient.name.slice(0,18)+"…":activePatient.name}
                {cloudSaveStatus === "saving" && <span style={{color:PC.muted}}> · Saving…</span>}
                {cloudSaveStatus === "saved" && lastSaved && <span style={{color:PC.green}}> · ✓ Saved {lastSaved.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</span>}
                {cloudSaveStatus === "error" && <span style={{color:"#dc2626"}}> · ⚠ Offline — will retry</span>}
              </div>
            : <div style={{fontSize:"0.68rem",color:PC.muted}}>No patient loaded</div>
          }
        </div>
        {/* Notifications */}
        <button onClick={()=>navTo("physiofeed")} aria-label="Notifications" title="Notifications"
          style={{position:"relative",minHeight:34,minWidth:34,padding:0,background:"transparent",
            border:"none",borderRadius:8,color:PC.text,cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span style={{position:"absolute",top:6,right:7,width:7,height:7,borderRadius:"50%",background:"#7C3AED",border:"1.5px solid #fff"}}/>
        </button>
        {/* Messages */}
        <button onClick={()=>navTo("physiofeed")} aria-label="Messages" title="Messages"
          style={{minHeight:34,minWidth:34,padding:0,background:"transparent",
            border:"none",borderRadius:8,color:PC.text,cursor:"pointer",flexShrink:0,
            display:"flex",alignItems:"center",justifyContent:"center"}}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
          </svg>
        </button>
        {/* + New — solid accent */}
        <button onClick={createNewPatient}
          style={{padding:"5px 12px",minHeight:30,background:PC.accent,border:"none",borderRadius:7,
            color:"#fff",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",
            boxShadow:`0 2px 6px ${PC.accent}50`}}>
          + New
        </button>
      </div>

      {/* ── GUEST MODE BANNER — always visible, never lets a guest mistake
          this for a real saved session. Sign in / Create account here exits
          guest mode and returns to the real login screen. ── */}
      {isGuest && (
        <div style={{background:"#fef9e7",borderBottom:"1px solid #f5e6a8",padding:"7px 16px",
          display:"flex",alignItems:"center",justifyContent:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:"0.76rem",color:"#92720c",fontWeight:600}}>
            👤 Guest mode — your work here isn't saved, and AI features need an account
          </span>
          <button onClick={onSignOut} style={{padding:"3px 12px",background:"#fff",
            border:"1px solid #f0d98a",borderRadius:20,color:"#92720c",fontSize:"0.72rem",
            fontWeight:700,cursor:"pointer",whiteSpace:"nowrap"}}>
            Sign in / Create free account →
          </button>
        </div>
      )}

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
            <span style={{fontSize:"0.78rem",fontWeight:600,flex:1,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:4,
              color: cloudSaveStatus==="error" ? "#dc2626" : cloudSaveStatus==="saving" ? PC.muted : PC.green}}>
              {cloudSaveStatus === "saving" && <>⏳ Saving…</>}
              {cloudSaveStatus === "error" && <>⚠ Offline — will retry on next edit</>}
              {cloudSaveStatus !== "saving" && cloudSaveStatus !== "error" && (
                lastSaved
                  ? <>✓ Saved to cloud {lastSaved.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}</>
                  : <>● {new Date(activePatient.updatedAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</>
              )}
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

          {/* Neuro went live (2026-07-30): STREAMS' neuro entry flipped to
              live:true -- config (streams/neuro.js) is Step-2-complete (all
              4 phases, condition-aware showIf, checklists) and its widgets
              (streams/neuroWidgets.jsx) are the same ones already proven out
              under the old Neurological/Neuro Templates sidebar screens, not
              new/untested code. Sports/Pedia/Cardio stay live:false -- still
              StreamEnginePlaceholder, no STREAM_CONFIGS entry for them yet.
              Root cause of the earlier trap wasn't AssessmentEngine crashing
              -- it's a self-contained view with no nav of its own, so once
              rendered it ignores `active`/sidebar/bottom-nav clicks entirely.
              StreamSelector (above) was the only escape, but it's scoped to
              active==="home"/"demographics", so navigating away (e.g.
              clicking a sidebar item) hid it too, with no way back except a
              reload. Fixed by giving AssessmentEngine its own always-visible
              "Back to Ortho" pill below, same as StreamEnginePlaceholder
              already has -- so the escape hatch can't disappear regardless
              of `active`. Applies to any future live stream, not just Neuro. */}
          {stream !== "ortho" ? (
            (STREAMS.find(s=>s.id===stream)?.live && STREAM_CONFIGS[stream]) ? (
              <>
                <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
                  <button type="button" onClick={()=>setStream("ortho")}
                    style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${PC.border}`,
                      background:PC.s2||"#f8fafc",color:PC.muted,fontSize:"0.76rem",fontWeight:700,cursor:"pointer"}}>
                    ← Back to Ortho
                  </button>
                </div>
                <AssessmentEngine config={STREAM_CONFIGS[stream]} components={STREAM_WIDGETS} data={data} set={set} PC={PC} navTo={navTo}/>
              </>
            ) : (
              <StreamEnginePlaceholder stream={stream} setStream={setStream} PC={PC}/>
            )
          ) : (
          <>

          {/* ── CLINICAL WORKFLOW HEADER ── */}
          {/* Shown on every step of the workflow, patient or no patient --
              New Assessment's specialty picker lands on Demographics with
              no patient created yet (that only happens once "Create
              Patient & Continue" is pressed), and someone should be able to
              freely jump between steps (Subjective, Body Regions, etc.) to
              edit/review while still mid-assessment, before a patient
              record formally exists. Screen-scoping is handled below by
              wfScreens.includes(active) -- no separate activePatient gate
              needed on top of that. */}
          {(() => {
            const d2 = data;
            const oKeys = ["rom","mmt","special","neuro","neurotemplates","gait","posture","palpation","fma","outcome","observation","cyriax","cyriax_full","sttt","kinetic","fascia","nkt"];
            // Only render this stepper on the actual clinical-workflow
            // screens it navigates between -- it was gated on activePatient
            // alone, so once a patient existed it kept showing at the top
            // of Home/PhysioFeed/Learn/Profile too (those aren't part of
            // this workflow at all). Scope it to the exact screens wfSteps
            // below can land on.
            const wfScreens = ["demographics","subj_region","subjective","subj_ai","chart_palpation","objective","treatment","exercise","soap",...oKeys];
            // Posture Analysis has its own dedicated entry screen (hero card,
            // AI/Manual toggle, view grid) that doesn't fit the S->O->A->P
            // step flow -- hide the stepper there specifically, not the rest
            // of oKeys (2026-08-21).
            if (!wfScreens.includes(active) || active==="posture") return null;
            // Expanded from 5 to 9 steps (2026-08-17) -- Subjective's region
            // picker / AI panel / body-chart+palpation were previously all
            // bundled into one long "Subjective" scroll. They're broken out
            // into their own steps here so each opens as its own page, per
            // the requested line-by-line workflow. No new logic anywhere --
            // "region"/"ai" reuse SubjectiveModule itself (viewStep prop
            // controls which part of it is visible), "chart" reuses the
            // existing BodyChart + Palpation modules behind a small toggle,
            // and "home" reuses the existing Treatment screen's HEP tab
            // (txTab==="hep") instead of being a new screen.
            const wfSteps = [
              { key:"demographics", label:"Demographics",  short:"Demo",   nav:"demographics",    done:!!(d2.dem_name&&d2.dem_age), active:active==="demographics" },
              { key:"region",       label:"Body Regions",  short:"Region", nav:"subj_region",     done:!!(d2.cx_selected_regions&&d2.cx_selected_regions!=="[]"), active:active==="subj_region" },
              { key:"ai",           label:"AI",            short:"AI",     nav:"subj_ai",         done:!!(d2.ai_extraction_audit), active:active==="subj_ai" },
              { key:"subjective",   label:"Subjective",    short:"Sub",    nav:"subjective",      done:!!(d2.cc_main||d2.lx_loc||d2.cx_loc), active:active==="subjective" },
              { key:"chart",        label:"Chart/Palp",    short:"Chart",  nav:"chart_palpation", done:!!(d2.body_chart_pro||d2.palpation_site), active:active==="chart_palpation" },
              { key:"objective",    label:"Objective",     short:"Obj",    nav:"objective",       done:!!(Object.keys(d2).some(k=>k.startsWith("rom_")||k.startsWith("mmt_")||k.startsWith("st_"))), active:active==="objective"||oKeys.includes(active) },
              { key:"treatment",    label:"Treatment",     short:"Treat",  nav:"treatment",       done:!!(d2.soap_modalities||d2.soap_frequency||d2.tx_exercise_prescription||d2.tx_techniques), active:(active==="treatment"||active==="exercise")&&txTab!=="hep" },
              { key:"soap",         label:"SOAP",          short:"SOAP",   nav:"soap",            done:!!(d2.soap_a_diagnosis||d2.soap_icd10||d2.soap_a), active:active==="soap" },
              { key:"home",         label:"Home Protocol", short:"Home",   nav:"treatment",       done:!!(d2.hep_programme), active:active==="treatment"&&txTab==="hep" },
            ];
            const doneCount = wfSteps.filter(s => s.done).length;
            const pct = Math.round((doneCount / wfSteps.length) * 100);
            return (
              <div className="pm-stepper-wrap" style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:14,padding:"10px 16px 8px",marginBottom:18}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <span style={{fontSize:10,fontWeight:700,color:PC.muted,textTransform:"uppercase",letterSpacing:"1px"}}>Screening Workflow</span>
                  <span style={{fontSize:10,fontWeight:700,color:pct===100?"#10B981":PC.accent}}>{doneCount}/{wfSteps.length} complete</span>
                </div>
                <div className="pm-stepper-row" style={{display:"flex",alignItems:"center",gap:0}}>
                  {wfSteps.map((step, i) => {
                    const isLast = i === wfSteps.length - 1;
                    return (
                      <React.Fragment key={step.key}>
                        <div onClick={()=>{
                          if (step.key==="home") { navTo("treatment"); setTxTab("hep"); }
                          else if (step.key==="treatment") { navTo("treatment"); if (txTab==="hep") setTxTab("exercise"); }
                          else navTo(step.nav);
                        }} data-testid={`wf-step-${step.key}`} style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",flex:"0 0 auto",minWidth:0}}>
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


          {currentSection && active !== "home" && active !== "treatment" && active !== "exercise" && active !== "tx_techniques" && active !== "subjective" && active !== "physiofeed" && active !== "profile" && active !== "learn" && active !== "clinical" && active !== "posture" && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <div style={{width:38,height:38,background:PC.isDark?`linear-gradient(135deg,${PC.accent}15,${PC.a2}10)`:`linear-gradient(135deg,${PC.accent}10,${PC.a2}08)`,border:`1px solid ${PC.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{currentSection.icon}</div>
              <div>
                <div style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,letterSpacing:"-0.3px",color:PC.text,lineHeight:1.1}}>{currentSection.label}</div>
                <div style={{fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",color:PC.muted,marginTop:2}}>{currentSection.desc||"Posture Screening & Education"}</div>
              </div>
            </div>
            <div style={{height:"1px",background:`linear-gradient(90deg,${PC.accent}50,${PC.a2}30,transparent)`}}/>
          </div>
          )}

          {/* Posture Analysis Module — injected at top of Posture tab */}
          {/* PostureAnalysisModule — deferred mount, hidden when not active */}
          {mountedTabs.has("posture") && (
            <div style={{marginBottom:22, display: active==="posture" ? "block" : "none"}}>
              <PostureAnalysisModule activePatient={activePatient} set={set} navContext={active==="posture"?navContext:{}} patients={patients} onSelectPatient={selectPatient} onAddNewPatient={createNewPatient}/>
            </div>
          )}
          {active==="posture" && !mountedTabs.has("posture") && (
            <div style={{marginBottom:22}}>
              <TabLoader/>
            </div>
          )}

          {/* Objective hub — ROM/MMT/Special/Neuro expand in place, scoped to
              the region(s) picked in Subjective. Not part of the ALL_TESTS/
              currentSection group system (there's no "objective" entry there),
              same standalone-block pattern as Posture above. */}
          {active==="objective" && (
            <div style={{marginBottom:22}}>
              <Suspense fallback={<TabFallback/>}><LazyObjectiveHub data={data} set={set} navTo={navTo} PC={PC} requireAuth={requireAuth}/></Suspense>
            </div>
          )}

          {/* Body region selection — its own step page now (2026-08-17),
              was previously bundled into the top of the Subjective scroll.
              Reuses SubjectiveModule itself (same region-picker state/logic)
              via the viewStep prop, which just controls what part of that
              component's render is visible -- nothing about the region
              picker's own behaviour changed. */}
          {active==="subj_region" && (
            <div style={{marginBottom:22}}>
              <Suspense fallback={<TabFallback/>}><LazySubjective data={data} set={set} onNav={navTo} onTabChange={(t)=>setSubjBodyChartTab(t==="bodychart")} navContext={{}} requireAuth={requireAuth} viewStep="region"/></Suspense>
            </div>
          )}

          {/* Subjective — New vs Old comparison. Review-only screen for
              evaluating a proposed redesign against the current live
              Subjective Assessment, side by side. Fully isolated from any
              real patient data (own local state inside SubjectiveCompare.jsx)
              -- nothing entered on either side here is saved. */}
          {active==="subjective_compare" && (
            <div style={{marginBottom:22}}>
              <Suspense fallback={<TabFallback/>}><LazySubjectiveCompare onBack={()=>navTo("subjective")}/></Suspense>
            </div>
          )}

          {/* Cardiopulmonary Assessment -- was uploaded as a fully
              standalone tool taking no props at all, so nothing it did
              ever reached the real patient record (Aditi: "when I have
              done with the patient assessment, it's not saving in the
              list of the patient"). Now wired the same way every other
              module here is (data/set), so its own autosave effects
              (below) pick it up -- see CardiopulmonaryAssessment.jsx's own
              header comment for the full explanation, including how it
              shares ONE patient identity with Ortho's Demographics
              instead of a second, disconnected form.
              The exit button (never used elsewhere -- every other
              assessment relies on the sidebar/bottom nav to leave) is
              removed, and the standard pm-main side padding is negated the
              same way CLINICAL_MODULE above does, so this fills the full
              tab width like every other assessment screen instead of
              floating in a narrower column. */}
          {active==="cardio_assessment" && (
            <div style={{margin:"-24px -20px 0"}}>
              <Suspense fallback={<TabFallback/>}><LazyCardioAssessment patientData={data} activePatientId={activePatientId} onSave={set} onNav={navTo}/></Suspense>
            </div>
          )}

          {/* Neurological Assessment -- replaces the old config-driven
              Neuro stream engine (STREAM_CONFIGS.neuro / AssessmentEngine
              below) with a standalone tool, same pattern and same reasons
              as Cardiopulmonary Assessment just above (own header comment
              in NeurologicalAssessment.jsx has the full explanation). Note:
              this is NOT the same thing as the "Neurological" sidebar item
              a few lines up (navKey="neuro") -- that's a shared quick
              neuro screen usable within any specialty's assessment and is
              untouched; this is the full Neuro specialty stream, same
              relationship Cardiopulmonary Assessment already has to
              Special Tests/ROM/etc. */}
          {active==="neuro_assessment" && (
            <div style={{margin:"-24px -20px 0"}}>
              <Suspense fallback={<TabFallback/>}><LazyNeuroAssessment patientData={data} activePatientId={activePatientId} onSave={set} onNav={navTo}/></Suspense>
            </div>
          )}

          {/* New Ortho Assessment -- standalone tool, same pattern as
              Cardiopulmonary/Neurological Assessment above. The old
              config-driven "ortho" stream (demographics -> subjective ->
              objective stepper) stays reachable, relabeled "Old Ortho" in
              STREAMS, untouched below. */}
          {active==="ortho_new_assessment" && (
            <div style={{margin:"-24px -20px 0"}}>
              <Suspense fallback={<TabFallback/>}><LazyOrthoAssessmentNew patientData={data} activePatientId={activePatientId} onSave={set} onNav={navTo} requireAuth={requireAuth} entryMode={active==="ortho_new_assessment"?navContext.entryMode:undefined}/></Suspense>
            </div>
          )}

          {/* Full documented assessment report -- lives ONLY in Clinical
              (reached via "📄 View Report" on a patient row in
              PatientDatabase.jsx's patient list), per Aditi's explicit
              request not to duplicate this into Patient Profile or the
              sidebar. One continuous read-only document (not tabs/cards)
              for whichever of Cardio/Neuro that patient has recorded --
              see AssessmentReportView.jsx.
              Merges live in-session `data` over the flushed patient record
              the same way PatientProfileModal already does just below, so
              edits made in THIS session show up here immediately instead
              of only after the next autosave flush. */}
          {active==="assessment_report" && (
            <div style={{margin:"-24px -20px 0",background:"#f8fafc",minHeight:"100vh"}}>
              <AssessmentReportView
                patient={activePatient ? {...activePatient, data:{...activePatient.data, ...(activePatient.id===activePatientId?data:{})}} : null}
                onNav={navTo}
                onBack={()=>navTo("clinical")}
              />
            </div>
          )}

          {/* Separate, simple Cardio/Neuro patient hub -- lives ONLY in
              Clinical (reached via "🫀🧠 Specialty Profile" on a patient
              row), deliberately NOT merged into the Ortho PatientProfileModal
              a few hundred lines below (Aditi: "donot mix the ortho[']s
              patient profile ... make new patient profile for cardio
              neuro"). See SpecialtyPatientProfile.jsx's header comment for
              why it's Overview+Assessments only, no Progress/Treatment/
              Documents tabs yet. Same live-data merge as the report view
              above. */}
          {active==="specialty_profile" && (
            <div style={{margin:"-24px -20px 0",background:"#f8fafc",minHeight:"100vh"}}>
              <SpecialtyPatientProfile
                patient={activePatient ? {...activePatient, data:{...activePatient.data, ...(activePatient.id===activePatientId?data:{})}} : null}
                onNav={navTo}
                onBack={()=>navTo("clinical")}
              />
            </div>
          )}

          {/* AI — its own step page now, same reuse pattern as region above:
              same SubjectiveModule mount, viewStep="ai" shows only the
              hero AI/mic buttons + expandable AI panel. */}
          {active==="subj_ai" && (
            <div style={{marginBottom:22}}>
              <Suspense fallback={<TabFallback/>}><LazySubjective data={data} set={set} onNav={navTo} onTabChange={(t)=>setSubjBodyChartTab(t==="bodychart")} navContext={{}} requireAuth={requireAuth} viewStep="ai"/></Suspense>
            </div>
          )}

          {/* Body Chart / Palpation — combined into one step page per
              request, via a small Chart|Palpation toggle. Reuses the exact
              same LazyBodyChart/LazyPalpation modules already used
              elsewhere (Body Chart tab inside Subjective, Palpation
              sidebar item) -- no new assessment logic, just a shared page
              for two things that used to live on separate screens. */}
          {active==="chart_palpation" && (
            <div style={{marginBottom:22}}>
              <div style={{display:"flex",gap:8,marginBottom:14}}>
                <button type="button" onClick={()=>setChartPalpTab("chart")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${chartPalpTab==="chart"?PC.accent:PC.border}`,background:chartPalpTab==="chart"?`${PC.accent}15`:PC.s2,color:chartPalpTab==="chart"?PC.accent:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>🧍 Body Chart</button>
                <button type="button" onClick={()=>setChartPalpTab("palpation")} style={{flex:1,padding:"9px 6px",borderRadius:10,border:`2px solid ${chartPalpTab==="palpation"?PC.accent:PC.border}`,background:chartPalpTab==="palpation"?`${PC.accent}15`:PC.s2,color:chartPalpTab==="palpation"?PC.accent:PC.text,fontWeight:700,fontSize:"0.8rem",cursor:"pointer"}}>🤚 Palpation</button>
              </div>
              {chartPalpTab==="chart"
                ? <Suspense fallback={<TabFallback/>}><LazyBodyChart data={data} set={set}/></Suspense>
                : <Suspense fallback={<TabFallback/>}><LazyPalpation data={data} set={set} navContext={active==="chart_palpation"?navContext:{}}/></Suspense>}
            </div>
          )}

          {/* Groups */}
          {currentSection && Object.entries(currentSection.groups).map(([groupName,tests])=>(
            <div key={groupName} style={{marginBottom:28}}>
              {tests!=="PHYSIOFEED_MODULE" && tests!=="PROFILE_MODULE" && tests!=="LEARN_MODULE" && (
              <div className="pm-group-head" style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
                <div style={{fontSize:"0.82rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"1.4px",color:PC.a2,whiteSpace:"nowrap"}}>{groupName}</div>
                <div style={{flex:1,height:"1px",background:`linear-gradient(90deg,${PC.border},transparent)`}}/>
              </div>
              )}

              {tests==="HOME_MODULE"?(
                <HomeModule onNav={navTo} patients={patients} data={data} taskDB={taskDB} onNewPatient={createNewPatient} currentUser={currentUser}/>
              ):tests==="PHYSIOFEED_MODULE"?(
                <div style={{margin:"-24px -20px 0"}}>
                  <Suspense fallback={<div style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading PhysioFeed…</div>}>
                    <LazyPhysioFeedEntry/>
                  </Suspense>
                </div>
              ):tests==="LEARN_MODULE"?(
                <Suspense fallback={<div style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading…</div>}>
                  <LazyLearnTabEntry onNav={navTo}/>
                </Suspense>
              ):tests==="PROFILE_MODULE"?(
                <Suspense fallback={<div style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading profile…</div>}>
                  <LazyProfileTabEntry onSignOut={onSignOut}/>
                </Suspense>
              ):tests==="CLINICAL_MODULE"?(
                // Same negative-margin full-bleed trick PhysioFeed uses just
                // above -- Clinical's own header/search/CTA want the full
                // tab width, not the standard pm-main content padding.
                <div style={{margin:"-24px -20px 0"}}>
                  {/* Clinical sub-nav (2026-08-22, extended 2026-08-23 with
                      "Assessment"): Today / Patients / Treatment / Assessment
                      -- lenses on the same `patients` array plus a dedicated,
                      minimal "start a new assessment" screen (Aditi: "the
                      patient list should only show patient list"). "Patients"
                      stays the default so tapping the bottom-nav "Clinical"
                      tab still lands exactly where it always has. */}
                  <div style={{display:"flex",gap:6,padding:"12px 16px 0",background:"#fff",borderBottom:"1px solid #F1F5F9",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
                    {[["today","🩺 Today"],["patients","👥 Patients"],["treatment","💊 Treatment"],["assessment","📋 Assessment"]].map(([k,label])=>(
                      <button key={k} onClick={()=>setClinicalSubTab(k)}
                        style={{padding:"8px 14px",borderRadius:"10px 10px 0 0",border:"none",borderBottom:clinicalSubTab===k?"2px solid #6D28D9":"2px solid transparent",
                          background:clinicalSubTab===k?"#F5F3FF":"transparent",color:clinicalSubTab===k?"#6D28D9":"#6B7280",
                          fontSize:"0.8rem",fontWeight:700,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                        {label}
                      </button>
                    ))}
                  </div>
                  {clinicalSubTab==="today" ? (
                    <TherapistDashboardModule patients={patients} data={data} onNav={navTo} taskDB={taskDB} onCompleteTask={completeTask} onDismissTask={dismissTask} onAddTask={addOrUpdateTask} onProfile={(p)=>setProfilePatient(p)} onQuickStart={(p)=>{ selectPatient(p); navTo("subjective"); }} currentUser={currentUser} onSignOut={onSignOut}/>
                  ) : clinicalSubTab==="treatment" ? (
                    <TreatmentCaseloadPanel patients={patients}
                      onContinue={(p)=>{ selectPatient(p); navTo("tx_sessions"); }}
                      onProfile={(p)=>{ setProfilePatient(p); setProfileTab("treatment"); }}/>
                  ) : clinicalSubTab==="assessment" ? (
                    <div style={{padding:"22px 18px 24px"}}>
                      <div style={{fontWeight:900,fontSize:"1.15rem",color:"#111827",marginBottom:4}}>Assessment</div>
                      <div style={{fontSize:"0.82rem",color:"#6B7280",marginBottom:20}}>Pick a specialty to start a new assessment.</div>
                      {/* Square speciality cards (2026-08-27, Aditi: "in
                          assessment tab it should show square cards of
                          speciality") -- replaces the old vertical row list;
                          the By Speciality browsing grid that used to live
                          on the Patients tab moved here instead, now paired
                          with its actual purpose (starting a new assessment)
                          rather than mixed into the plain patient list.
                          gridTemplateColumns uses minmax/auto-fit rather than
                          a literal "1fr 1fr" -- utils.jsx has a global mobile
                          override that force-collapses any inline grid style
                          containing that exact substring to 1 column below
                          400px width, which combined with aspect-ratio:1
                          turned each card into a near full-height square
                          instead of a compact tile. auto-fit sidesteps that
                          match entirely while still naturally going to 1
                          column on genuinely narrow widths where 2×150px
                          truly doesn't fit. */}
                      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
                        {STREAMS.filter(s=>["ortho_new","neuro","cardio","sports"].includes(s.id)).map(st=>{
                          const clickable = st.live || st.id === "cardio";
                          return (
                            <button key={st.id} type="button"
                              onClick={()=>{ if(!clickable) return; startSpecialty(st); }}
                              style={{position:"relative",aspectRatio:"1",maxWidth:180,display:"flex",flexDirection:"column",
                                alignItems:"center",justifyContent:"center",gap:8,borderRadius:16,
                                cursor:clickable?"pointer":"not-allowed",fontFamily:"inherit",
                                border:`1.5px solid ${clickable?st.color+"50":"#E5E7EB"}`,
                                background:clickable?st.color+"10":"#F9FAFB",opacity:clickable?1:0.6}}>
                              {!clickable && <span style={{position:"absolute",top:8,right:8,fontSize:"0.6rem",fontWeight:800,padding:"2px 7px",borderRadius:8,background:"#E5E7EB",color:"#9CA3AF"}}>SOON</span>}
                              <span style={{fontSize:"1.8rem"}}>{st.icon}</span>
                              <span style={{fontWeight:700,fontSize:"0.9rem",color:clickable?st.color:"#9CA3AF"}}>{st.id==="ortho_new"?"Ortho":st.label}</span>
                            </button>
                          );
                        })}
                      </div>
                      <button onClick={()=>setShowSpecialtyPicker(true)}
                        style={{width:"100%",padding:"15px",background:"linear-gradient(135deg,#7c3aed,#9333ea)",
                          border:"none",borderRadius:14,color:"white",fontWeight:800,fontSize:"0.92rem",cursor:"pointer",
                          boxShadow:"0 4px 14px rgba(124,58,237,0.3)"}}>
                        ＋ New Assessment
                      </button>
                    </div>
                  ) : (
                    <PatientDatabasePanel
                      embedded
                      patients={patients}
                      activeId={activePatientId}
                      onSelect={selectPatient}
                      onNew={()=>setShowSpecialtyPicker(true)}
                      onDelete={deletePatient}
                      onImport={importPatientFromJSON}
                      onNav={navTo}
                      liveData={data}
                    />
                  )}
                </div>
              ):tests==="DASHBOARD_MODULE"?(
                <TherapistDashboardModule patients={patients} data={data} onNav={navTo} taskDB={taskDB} onCompleteTask={completeTask} onDismissTask={dismissTask} onAddTask={addOrUpdateTask} onProfile={(p)=>setProfilePatient(p)} onQuickStart={(p)=>{ selectPatient(p); navTo("subjective"); }} currentUser={currentUser} onSignOut={onSignOut}/>
              ):tests==="DEMOGRAPHICS_MODULE"?(
                <div className="pm-form-panel" style={{display:"flex",flexDirection:"column",gap:14,background:"#fff",borderRadius:16,border:`1px solid ${PC.border}`,padding:"20px 18px",margin:"-4px"}}>
                  {(()=>{
                    // "More details" styling -- plain white, matches the
                    // core-fields look above instead of the old lavender
                    // card treatment.
                    const inp={width:"100%",background:"#fff",border:`1px solid ${PC.border}`,borderRadius:8,color:PC.text,fontFamily:"inherit",outline:"none",padding:"9px 11px",fontSize:"0.85rem",boxSizing:"border-box"};
                    const lbl={fontSize:"0.78rem",fontWeight:700,color:PC.muted,marginBottom:5,display:"block"};
                    const sel=(id,opts)=>(<select style={inp} value={data[id]||""} onChange={e=>set(id,e.target.value)}><option value="">— select —</option>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>);
                    const field=(label,el)=>(<div style={{marginBottom:12}}><label style={lbl}>{label}</label>{el}</div>);
                    const card=(title,children)=>(<div style={{background:"#fff",borderRadius:12,border:`1px solid ${PC.border}`,padding:"14px 16px"}}><div style={{fontSize:"0.78rem",fontWeight:800,color:PC.accent,textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:12}}>{title}</div>{children}</div>);

                    // New front-and-center styling for the 6 core fields.
                    const nInp={width:"100%",background:PC.surface,border:`1.5px solid ${PC.border}`,borderRadius:10,color:PC.text,fontFamily:"inherit",outline:"none",padding:"11px 13px",fontSize:"0.9rem",boxSizing:"border-box"};
                    const nLbl={fontSize:"0.82rem",fontWeight:700,color:PC.text,marginBottom:6,display:"block"};
                    const req=<span style={{color:"#dc2626"}}> *</span>;
                    // id/htmlFor pairing: real accessibility win (screen
                    // readers, click-to-focus on the label), and lets tests
                    // target fields like Date of Birth that have no visible
                    // placeholder text.
                    const nField=(label,el,required,id)=>(<div style={{marginBottom:16}}><label htmlFor={id} style={nLbl}>{label}{required&&req}</label>{el}</div>);

                    const requiredOk = !!(data.dem_name?.trim() && data.dem_age && data.dem_sex && data.dem_phone?.trim());
                    const genderOpts = ["Male","Female","Other"];

                    return(<>
                      <div style={{fontSize:"1.15rem",fontWeight:800,color:PC.text}}>Demographics</div>

                      {nField("Full Name",<input id="dem_name" style={nInp} placeholder="e.g. Riya Sharma" value={data.dem_name||""} onChange={e=>set("dem_name",e.target.value)}/>,true,"dem_name")}
                      {/* className (not just the inline grid style) so this
                          survives the global [style*="1fr 1fr"] mobile
                          override in utils.jsx, which force-collapses ANY
                          "1fr 1fr" inline grid to 1 column below 400px --
                          catching this DOB/Age pair even though it's meant
                          to always stay side-by-side (see .pm-nowrap-2col
                          override rule added alongside that block). Date
                          input also gets -webkit-appearance:none -- without
                          it, iOS Safari renders type="date" with its own
                          oversized native control instead of respecting
                          nInp's padding/font-size, which is what was making
                          the DOB box look huge. */}
                      <div className="pm-nowrap-2col" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                        <div>{nField("Date of Birth",<input id="dem_dob" style={{...nInp,WebkitAppearance:"none",appearance:"none"}} type="date" value={data.dem_dob||""} onChange={e=>set("dem_dob",e.target.value)}/>,false,"dem_dob")}</div>
                        <div>{nField("Age",<input id="dem_age" style={nInp} type="number" placeholder="e.g. 34" value={data.dem_age||""} onChange={e=>set("dem_age",e.target.value)}/>,true,"dem_age")}</div>
                      </div>
                      <div style={{marginBottom:16}}>
                        <label style={nLbl}>Gender{req}</label>
                        <div style={{display:"flex",gap:8}}>
                          {genderOpts.map(g=>(
                            <button key={g} type="button" onClick={()=>set("dem_sex",g)}
                              style={{flex:1,padding:"11px 0",textAlign:"center",borderRadius:10,fontSize:"0.85rem",fontWeight:700,
                                border:`1.5px solid ${data.dem_sex===g?PC.accent:PC.border}`,
                                background:data.dem_sex===g?PC.accent:PC.surface,
                                color:data.dem_sex===g?"#fff":PC.text,cursor:"pointer"}}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      {nField("Phone",<input id="dem_phone" style={nInp} type="tel" placeholder="+91 98765 43210" value={data.dem_phone||""} onChange={e=>set("dem_phone",e.target.value)}/>,true,"dem_phone")}
                      {nField("Email",<input id="dem_email" style={nInp} type="email" placeholder="patient@email.com" value={data.dem_email||""} onChange={e=>set("dem_email",e.target.value)}/>,false,"dem_email")}
                      {nField("Occupation",<input id="dem_occupation" style={nInp} placeholder="e.g. Teacher, Desk worker" value={data.dem_occupation||""} onChange={e=>set("dem_occupation",e.target.value)}/>,false,"dem_occupation")}
                      {nField("Address",<input id="dem_address" style={nInp} placeholder="Street, City, Postcode" value={data.dem_address||""} onChange={e=>set("dem_address",e.target.value)}/>,false,"dem_address")}
                      {nField("Referring Doctor / Hospital",<input id="dem_referral_dr" style={nInp} placeholder="Dr. Name, Hospital" value={data.dem_referral_dr||data.dem_gp||""} onChange={e=>set("dem_referral_dr",e.target.value)}/>,false,"dem_referral_dr")}

                      {/* ── More details toggle: everything the clinic still needs on file, just tucked away by default ── */}
                      <button type="button" onClick={()=>setDemMoreOpen(v=>!v)}
                        style={{display:"flex",alignItems:"center",gap:6,background:"none",border:"none",padding:"4px 0 8px",color:PC.accent,fontWeight:700,fontSize:"0.82rem",cursor:"pointer",width:"fit-content"}}>
                        <span style={{transform:demMoreOpen?"rotate(90deg)":"none",transition:"transform .15s",display:"inline-block"}}>▶</span>
                        More details {demMoreOpen?"(dominant hand, work, emergency contact, insurance, medical history…)":""}
                      </button>

                      {demMoreOpen && (
                        <div style={{display:"flex",flexDirection:"column",gap:14,marginBottom:4}}>
                          {card("Personal Details",<>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                              <div>{field("Dominant Hand",sel("dem_dominant",["Right","Left","Ambidextrous"]))}</div>
                              <div>{field("Work Status",sel("dem_work_status",["Full time","Part time","Self employed","Off work — injury","Off work — illness","Retired","Unemployed","Student","Home duties"]))}</div>
                            </div>
                            {field("Employer / Industry",<input style={inp} placeholder="e.g. ABC Corp, Healthcare" value={data.dem_employer||""} onChange={e=>set("dem_employer",e.target.value)}/>)}
                          </>)}
                          {card("Contact Details",<>
                            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                              <div>{field("Emergency Contact Name",<input style={inp} placeholder="Full name" value={data.dem_ec_name||""} onChange={e=>set("dem_ec_name",e.target.value)}/>)}</div>
                              <div>{field("Emergency Contact Phone",<input style={inp} type="tel" placeholder="+91 98765 43210" value={data.dem_ec_phone||""} onChange={e=>set("dem_ec_phone",e.target.value)}/>)}</div>
                            </div>
                          </>)}
                          {card("Clinical & Referral",<>
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
                        </div>
                      )}

                      {/* ── Create/Continue CTA ── */}
                      <button
                        disabled={!requiredOk}
                        onClick={()=>{
                          if(!requiredOk) return;
                          if(!activePatientId){
                            const newP={id:genId(),name:data.dem_name,data,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),hasRedFlags:false,lastDx:data.cc_main||""};
                            setPatients(prev=>{const updated=[newP,...prev];savePatientDB(updated, currentUser?.id);return updated;});
                            setActivePatientId(newP.id);
                            setJsonMsg({type:"success",text:`✅ Patient saved: ${data.dem_name}`});
                            setTimeout(()=>setJsonMsg(null),2500);
                          }
                          navTo("subjective");
                        }}
                        style={{marginTop:6,padding:"15px",background:requiredOk?PC.accent:"#D1D5DB",border:"none",borderRadius:12,color:"#fff",fontWeight:800,fontSize:"0.95rem",cursor:requiredOk?"pointer":"not-allowed",width:"100%"}}>
                        {activePatientId?"Save & Continue →":"Create Patient & Continue →"}
                      </button>
                      <div style={{textAlign:"center",fontSize:"0.72rem",color:PC.muted,lineHeight:1.5,padding:"2px 8px 4px"}}>
                        Enter basic patient information.<br/>Patient ID is generated automatically.
                      </div>
                    </>);
                  })()}
                </div>
              ):tests==="SUBJECTIVE_MODULE"?(
                <div className="pm-form-panel">
                  {/* 2026-08-19: swapped in the simplified redesign at Aditi's
                      request (real patient data now, via data/set -- same
                      props the old SubjectiveModule used, so autosave/
                      Supabase sync keep working exactly as before since
                      those watch the whole `data` object generically, not
                      specific field names). Its own fields are stored under
                      new simple_* keys (see SubjectiveAssessmentNew.jsx) to
                      avoid colliding with the old engine's field semantics;
                      chiefComplaint is mirrored into cc_main so the
                      workflow-stepper "done" check and the patient-list
                      chief-complaint preview still light up. The old
                      SubjectiveModule/LazySubjective is untouched and still
                      reachable from the sidebar's "Subjective — New vs Old"
                      compare screen (SubjectiveCompare.jsx) -- not removed,
                      per instruction. Body Chart is no longer inlined here
                      (the new design has no internal tab for it) -- still
                      available via the separate "Chart/Palp" workflow step. */}
                  <Suspense fallback={<TabFallback/>}><LazySubjectiveNew data={data} set={set}/></Suspense>
                </div>
              ):tests==="PALPATION_MODULE"?(
                <div className="pm-form-panel"><Suspense fallback={<TabFallback/>}><LazyPalpation data={data} set={set} navContext={active==="palpation"?navContext:{}}/></Suspense></div>
              ):tests==="POSTURE_DEFECT_MODULE"?(
                <PostureDefectModule/>
              ):tests==="OBSERVATION_MODULE"?(
                <div className="pm-form-panel">{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyObservation data={data} set={set} navContext={active==="observation"?navContext:{}}/></Suspense>
                </div>
              ):tests==="CYRIAX_MODULE"?(
                <div className="pm-form-panel">{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazySTT data={data} set={set} navContext={active==="cyriax"?navContext:{}}/></Suspense>
                </div>
              ):tests==="SPECIAL_TESTS_MODULE"?(
                <div className="pm-form-panel">{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazySpecial data={data} set={set} navContext={active==="special"?navContext:{}}/></Suspense>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </div>
              ):tests==="NKT_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyCPA data={data} set={set} navContext={active==="nkt"?navContext:{}}/></Suspense>
                </>
              ):tests==="FMA_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyFMA data={data} set={set} navTo={navTo} navContext={active==="fma"?navContext:{}}/></Suspense>
                </>
              ):tests==="FASCIA_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyFascia data={data} set={set} navContext={active==="fascia"?navContext:{}}/></Suspense>
                </>
              ):tests==="KC_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyKinetic data={data} set={set} navContext={active==="kinetic"?navContext:{}}/></Suspense>
                </>
              ):tests==="CYRIAX_REGION"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyCyriaxRegion data={data} set={set}/></Suspense>
                </>
              ):tests==="NEURO_MODULE"?(
                <div className="pm-form-panel">{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyNeuro data={data} set={set} navTo={navTo} navContext={active==="neuro"?navContext:{}}/></Suspense>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </div>
              ):tests==="NEURO_TEMPLATES_MODULE"?(
                <Suspense fallback={<TabFallback/>}><LazyNeuroTemplates data={data} navTo={navTo} navContext={active==="neurotemplates"?navContext:{}}/></Suspense>
              ):tests==="GAIT_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyGait data={data} set={set}/></Suspense>
                </>
              ):tests==="MMT_MODULE"?(
                <div className="pm-form-panel">{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyMMT data={data} set={set} navContext={active==="mmt"?navContext:{}}/></Suspense>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </div>
              ):tests==="ROM_MODULE"?(
                <div className="pm-form-panel">{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyROM data={data} set={set} navContext={active==="rom"?navContext:{}}/></Suspense>
                {/* ── Done → Continue SOAP bar ── */}
                <div style={{marginTop:20,padding:"12px 16px",background:`${PC.accent}08`,border:`1.5px solid ${PC.accent}25`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
                  <div style={{fontSize:"0.82rem",color:PC.muted}}>Finished? Your data is auto-saved.</div>
                  <button onClick={()=>navTo("soap")} style={{padding:"9px 18px",background:`linear-gradient(135deg,${PC.accent},${PC.a2})`,border:"none",borderRadius:9,color:"#fff",fontWeight:800,fontSize:"0.75rem",cursor:"pointer",whiteSpace:"nowrap",flexShrink:0}}>
                    Continue SOAP →
                  </button>
                </div>
              </div>
              ):tests==="OUTCOME_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazyOutcomes data={data} set={set} navTo={navTo} navContext={active==="outcome"?navContext:{}}/></Suspense>
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
                  {/* ── Sessions Banner ── */}
                  <div style={{background:PC.surface,border:`1px solid ${PC.border}`,borderRadius:14,padding:"14px 16px",marginBottom:16}}>
                    <div style={{fontWeight:800,fontSize:"0.88rem",color:"#0F6E56",marginBottom:4}}>⚡ Sessions</div>
                    <div style={{fontSize:"0.8rem",color:PC.muted,marginBottom:12}}>For follow-ups — fill these 4 fields and sign. Takes 60 seconds.</div>
                    <QuickVisitForm PC={PC} data={data} set={set} navTo={navTo}/>
                  </div>
                </div>
              ):tests==="SOAP_MODULE"?(
              <Suspense fallback={<TabFallback/>}><LazySOAPNote data={data} set={set} onNav={navTo} initialTab={active==="soap"?navContext.initialTab:undefined}/></Suspense>
              ):tests==="AI_MODULE"?(
              <AIAssistant data={data} set={set} PC={PC} onClose={()=>navTo("home")} requireAuth={requireAuth}/>
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
          </>
          )}
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) — always visible. Old Menu/Patient/Assess/Adv./
          Treat/Docs quick-tabs retired -- every section they linked to is
          still reachable via the full section drawer (SidebarItems), which
          "Clinical" now opens directly. Nothing is actually removed from the
          app, just this one redundant quick-access bar. ── */}
      <nav className="pm-bnav" aria-label="Main navigation">
        <div className="pm-bnav-tabs">
          {(()=>{
            const NavIcon = ({name}) => {
              const common = {width:20,height:20,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round"};
              if (name==="home") return (<svg {...common}><path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/></svg>);
              if (name==="clinical") return (<svg {...common}><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>);
              if (name==="physiofeed") return (<svg {...common} width={16} height={16} style={{filter:"drop-shadow(0 1px 1.5px rgba(0,0,0,0.35))"}}><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.86a10 10 0 0 1 14 0"/><path d="M8.5 16.43a5 5 0 0 1 7 0"/></svg>);
              if (name==="learn") return (<svg {...common}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>);
              if (name==="profile") return (<svg {...common}><circle cx="12" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/></svg>);
              return null;
            };
            const outerKeys = ["home","physiofeed","learn","profile"];
            return [
              {key:"home",       icon:"home",       label:"Home"},
              {key:"__clinical", icon:"clinical",   label:"Clinical"},
              {key:"physiofeed", icon:"physiofeed", label:"PhysioFeed", center:true},
              {key:"learn",      icon:"learn",      label:"Learn"},
              {key:"profile",    icon:"profile",    label:"Profile"},
            ].map(item=>{
              const isClinical = item.key==="__clinical";
              // Clinical is a real tab now (2026-08-17), same as Home/
              // PhysioFeed/Learn/Profile -- navTo("clinical") swaps the main
              // content area in place, instead of opening PatientDatabasePanel
              // as a fixed-overlay modal (which only covered part of the
              // screen width and needed an explicit Close button, unlike
              // every other bottom-nav tab). "+ New Assessment" still asks
              // which specialty stream to start, then opens the same real
              // intake -> subjective -> objective flow as before. Active
              // whenever the current screen isn't one of the other four
              // named tabs -- covers "clinical" itself plus every
              // assessment screen reached from it (demographics/subjective/
              // objective/etc, none of which have their own bottom-nav tab).
              const isActive = isClinical ? !outerKeys.includes(active) : active===item.key;
              const handleClick = () => { if (isClinical) navTo("clinical"); else navTo(item.key); };
              return item.center ? (
                <button key={item.key} data-testid={`bnav-tab-${item.key}`} onClick={handleClick} style={{flex:"1 0 auto",display:"flex",flexDirection:"column",
                  alignItems:"center",justifyContent:"flex-end",gap:2,background:"none",border:"none",cursor:"pointer",padding:"0 0 6px"}}>
                  {/* 3D glossy bubble -- gradient fill + bottom ridge + inset
                      top highlight, same "raised button" formula already used
                      for the AI/Mic 3D blocks elsewhere in the app, on top of
                      the white glow ring. Icon shrunk (22->16px) to sit
                      smaller inside the circle, per "small and 3D" feedback. */}
                  <span style={{width:46,height:46,borderRadius:"50%",
                    background:isActive?"linear-gradient(180deg,#7c3aed,#5b21b6)":"linear-gradient(180deg,#9061f9,#7c3aed)",
                    color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                    marginTop:-18,boxShadow:"0 0 0 6px rgba(255,255,255,0.55), 0 3px 0 rgba(76,29,149,0.4), 0 5px 10px rgba(124,58,237,0.4), inset 0 1px 1px rgba(255,255,255,0.5), inset 0 -2px 3px rgba(0,0,0,0.15)"}}><NavIcon name={item.icon}/></span>
                  <span className="pm-bnav-tab-label" style={{color:isActive?"#6D28D9":undefined,fontWeight:700}}>{item.label}</span>
                </button>
              ) : (
                <button key={item.key} data-testid={`bnav-tab-${item.key}`} className={`pm-bnav-tab${isActive?" active":""}`} onClick={handleClick}>
                  <span className="pm-bnav-tab-icon" style={{display:"flex",alignItems:"center",justifyContent:"center"}}><NavIcon name={item.icon}/></span>
                  <span className="pm-bnav-tab-label">{item.label}</span>
                </button>
              );
            });
          })()}
        </div>
      </nav>
    </div>
  );
}

// NOTE: LandingAndAuth (a marketing landing page shown before the login
// form, with its own "Try Free"/"Sign In" CTAs) used to be defined here,
// wrapping LandingPage.jsx. Confirmed via App()'s actual render logic
// below that it was never called by anything -- App() renders <AuthScreen/>
// directly when signed out, always. Removed as genuine dead code, along
// with LandingPage.jsx itself (deleted -- nothing else imported it).

export default function App() {
  // `undefined` = still checking for an existing session, `null` = signed out,
  // an object = signed in. Kept as three distinct states so we never flash the
  // login screen for a split second while Supabase is still resolving the
  // session on page load.
  const [session, setSession] = useState(undefined);
  // Guest Mode: lets a visitor use the real app (not the scripted demo)
  // without an account. Only ever set true by explicitly clicking "Continue
  // without signing in" on AuthScreen -- never a fallback/default. Once a
  // real `session` exists this is irrelevant (the authenticated branch below
  // is checked first), so there's no risk of a stale true value re-trapping
  // someone in guest mode after they actually sign in.
  const [guestMode, setGuestMode] = useState(false);

  useEffect(() => {
    let active = true;
    // A rejected getSession() promise is caught below, but a promise that
    // never SETTLES at all (request goes out, no response ever comes back --
    // seen against a cold/just-created Supabase project) is caught by
    // neither .then() nor .catch(), and `session` would stay `undefined`
    // forever -- permanent loading spinner, no way in, no visible error.
    // Racing against an 8s timeout bounds the wait either way.
    const timeout = new Promise((resolve) => setTimeout(() => resolve({ timedOut: true }), 8000));
    Promise.race([supabase.auth.getSession(), timeout]).then((result) => {
      if (!active) return;
      if (result?.timedOut) {
        console.error("supabase.auth.getSession() timed out after 8s");
        setSession(null);
        return;
      }
      setSession(result.data.session ?? null);
    }).catch((err) => {
      // No .catch() here previously -- if this call ever rejected (network
      // blip, project waking from pause, any transient error), `session`
      // stayed `undefined` forever and the app was stuck on the loading
      // spinner permanently, with no way in and no visible error. Found via
      // E2E tests hanging on a fresh/cold Supabase project waiting for the
      // login screen that never appeared. Falling back to signed-out (not
      // signed-in) on failure -- worst case a real user sees the login
      // screen and can retry, instead of a silent infinite spinner.
      console.error("supabase.auth.getSession() failed:", err);
      if (active) setSession(null);
    });
    // Keeps `session` in sync with sign-in, sign-out, and token refresh —
    // this is what actually drives the app in/out of AppInner, not just the
    // one-time getSession() check above.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (session === undefined) {
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F7F7F8"}}>
        <TabLoader />
      </div>
    );
  }

  if (!session) {
    if (guestMode) {
      // isGuest=true -> requireAuth() inside AppInner gates the handful of
      // AI-backed actions that need a real Supabase JWT; everything else in
      // the real app works normally. onSignOut here just exits guest mode
      // and drops back to the real login screen -- there's no real session
      // to actually sign out of.
      return (
        <ErrorBoundary>
          <AppInner currentUser={null} isGuest={true} onSignOut={() => setGuestMode(false)} />
          <InstallPrompt />
        </ErrorBoundary>
      );
    }
    // AuthScreen's onAuth is largely redundant with onAuthStateChange above
    // (Supabase fires SIGNED_IN either way) but harmless to pass through.
    return <AuthScreen onAuth={() => {}} onTryGuest={() => setGuestMode(true)} />;
  }

  return (
    <ErrorBoundary>
      <AppInner currentUser={session.user} onSignOut={() => supabase.auth.signOut()} />
      <InstallPrompt />
    </ErrorBoundary>
  );
}
