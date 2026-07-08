// AppFull.jsx — Posture engine, camera, patient DB, dashboard, AppInner, App
import React, { useState, useCallback, useRef, useEffect, useMemo, Suspense, lazy } from "react";
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
import { NeurologicalModule } from "./PhysioNeuro.jsx";
import { ALL_TESTS, MMT_DATA, DERMATOMES, MYOTOMES, REFLEXES, NEURAL_TENSION, RED_FLAGS_NEURO } from "./sharedClinicalData.js";
import AIAssistant from "./AIAssistant.jsx";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

import { PostureAnalysisModule, PC } from "./PostureEngine.jsx";
import {
  dbKey, draftKey,
  loadPatientDB, savePatientDB,
  loadTaskDB, saveTaskDB,
  genId,
  PatientDatabasePanel, PatientProfileModal,
} from "./PatientDatabase.jsx";
import { PostureDefectModule, HomeModule, TherapistDashboardModule } from "./DashboardModules.jsx";
import { PdfReportsModal, QuickVisitForm, IntakeForm, OnboardingModal } from "./AppModules.jsx";
import InstallPrompt from "./InstallPrompt.jsx";

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
const LazySpecial       = lazy(() => import("./lazy_special.jsx"));
const LazyFMA           = lazy(() => import("./lazy_fma.jsx"));
const LazyFascia        = lazy(() => import("./lazy_fascia.jsx"));
const LazyKinetic       = lazy(() => import("./lazy_kinetic.jsx"));
const LazyCyriaxRegion  = lazy(() => import("./lazy_cyriax_region.jsx"));
const LazyObservation   = lazy(() => import("./lazy_observation.jsx"));
const LazySOAPNote      = lazy(() => import("./lazy_soapnote.jsx"));
const LazyLiveSOAP      = lazy(() => import("./lazy_livesoap.jsx"));
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
function AppInner({ currentUser, onSignOut }) {
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
      savePatientDB(updated, currentUser?.id);
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
    savePatientDB(updated, currentUser?.id);
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
        savePatientDB(updated, currentUser?.id);
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
    savePatientDB(updated, currentUser?.id);
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

      {/* ── UNSAVED CHANGES DIALOG ── */}
      {showUnsaved && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div style={{background:"#0e1118",border:"1px solid rgba(255,179,0,0.3)",borderRadius:14,padding:24,maxWidth:380,width:"100%"}}>
            <div style={{fontSize:"1.2rem",marginBottom:8}}>⚠️</div>
            <div style={{fontWeight:800,color:"#0D0D0D",fontSize:"0.92rem",marginBottom:6}}>Unsaved Changes</div>
            <div style={{fontSize:"0.78rem",color:"#5a7090",marginBottom:20,lineHeight:1.6}}>
              You have unsaved changes for <strong style={{color:"#0D0D0D"}}>{activePatient?.name || "this patient"}</strong>. What would you like to do?
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

          {/* ── CLINICAL WORKFLOW HEADER ── */}
          {activePatient && (() => {
            const d2 = data;
            const oKeys = ["rom","mmt","special","neuro","gait","posture","palpation","fma","outcome","observation","cyriax","cyriax_full","sttt","kinetic","fascia","nkt"];
            const wfSteps = [
              { key:"demographics", label:"Demographics", short:"Demo",  nav:"demographics", done:!!(d2.dem_name&&d2.dem_age), active:active==="demographics" },
              { key:"subjective",   label:"Subjective",   short:"Sub",   nav:"subjective",   done:!!(d2.cc_main||d2.lx_loc||d2.cx_loc), active:active==="subjective" },
              { key:"objective",    label:"Objective",    short:"Obj",   nav:"rom",           done:!!(Object.keys(d2).some(k=>k.startsWith("rom_")||k.startsWith("mmt_")||k.startsWith("st_"))), active:oKeys.includes(active) },
              { key:"treatment",    label:"Treatment",    short:"Treat", nav:"treatment",     done:!!(d2.soap_modalities||d2.soap_frequency||d2.hep_programme||d2.tx_exercise_prescription||d2.tx_techniques), active:active==="treatment"||active==="exercise" },
              { key:"soap",         label:"SOAP",         short:"SOAP",  nav:"soap",          done:!!(d2.soap_a_diagnosis||d2.soap_icd10||d2.soap_a), active:active==="soap" },
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


          {currentSection && active !== "treatment" && active !== "exercise" && active !== "tx_techniques" && active !== "subjective" && (
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
                            setPatients(prev=>{const updated=[newP,...prev];savePatientDB(updated, currentUser?.id);return updated;});
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
                <Suspense fallback={<TabFallback/>}><LazyObservation data={data} set={set}/></Suspense>
                </>
              ):tests==="CYRIAX_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazySTT data={data} set={set} navContext={active==="cyriax"?navContext:{}}/></Suspense>
                </>
              ):tests==="SPECIAL_TESTS_MODULE"?(
                <>{/* ── S→O→A→P workflow breadcrumb ── */}
                <Suspense fallback={<TabFallback/>}><LazySpecial data={data} set={set} navContext={active==="special"?navContext:{}}/></Suspense>
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
                <Suspense fallback={<TabFallback/>}><LazyMMT data={data} set={set} navContext={active==="mmt"?navContext:{}}/></Suspense>
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
                <Suspense fallback={<TabFallback/>}><LazyROM data={data} set={set} navContext={active==="rom"?navContext:{}}/></Suspense>
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
              <Suspense fallback={<TabFallback/>}><LazySOAPNote data={data} set={set}/></Suspense>
              ):tests==="AI_MODULE"?(
              <AIAssistant data={data} PC={PC} onClose={()=>navTo("home")}/>
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
                {[["exercise","🏋","Exercise Prescription"],["tx","🤲","Tx Techniques"],["hep","🏠","Home Protocol"]].map(([key,icon,label])=>(
                  <button key={key} className={`pm-bnav-item${active==="treatment"&&txTab===key?" active":""}`}
                    onClick={()=>{ navTo("treatment"); setTxTab(key); setBnavTab(null); }}>
                    <span className="pm-bnav-item-icon">{icon}</span>
                    <span className="pm-bnav-item-label">{label}</span>
                  </button>
                ))}
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
                        <div style={{fontWeight:800,fontSize:"0.95rem",color:"#0D0D0D",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{data.dem_name}</div>
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
                    <div style={{textAlign:"center",padding:"16px 12px",color:"#6B6B6B",fontSize:"0.85rem",fontWeight:600}}>No patient loaded</div>
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
      <Suspense fallback={null}><LazyLiveSOAP data={data} onNavigate={navTo}/></Suspense>
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

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session ?? null);
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
    // AuthScreen's onAuth is largely redundant with onAuthStateChange above
    // (Supabase fires SIGNED_IN either way) but harmless to pass through.
    return <AuthScreen onAuth={() => {}} />;
  }

  return (
    <ErrorBoundary>
      <AppInner currentUser={session.user} onSignOut={() => supabase.auth.signOut()} />
      <InstallPrompt />
    </ErrorBoundary>
  );
}
