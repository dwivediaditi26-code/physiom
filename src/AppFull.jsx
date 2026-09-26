// AppFull.jsx — Posture engine, camera, patient DB, dashboard, AppInner, App
import { useState, useCallback, useRef, useEffect, Suspense, lazy } from "react";
import { track } from "@vercel/analytics";
import { supabase } from "./supabase.js";
import { Sparkles, Bone, HeartPulse, Brain, Footprints, Stethoscope, Users as UsersIcon, Pill as PillIcon, ClipboardList as ClipboardListIcon, PersonStanding, Search as SearchIcon, Bell as BellIcon, MessageSquare as MessageSquareIcon } from "lucide-react";
import { getNotifications as getPfNotifications, getUnreadMessageCount as getPfUnreadMessages } from "./physiofeed/data/db.js";
import { C, useTheme, MobileStyleInjector, ErrorBoundary, TabLoader } from "./utils.jsx";
import OfflineBanner from "./OfflineBanner.jsx";
import DeleteAccountButton from "./AccountDeletion.jsx";
import AuthScreen from "./AuthScreen.jsx";
import { PrivacyPolicy, TermsOfService } from "./LegalPages.jsx";
import { ALL_TESTS } from "./sharedClinicalData.js";
import HomeProtocolTab from "./HomeProtocolTab.jsx";

import { PostureAnalysisModule, PC } from "./PostureEngine.jsx";
import {
  draftKey,
  loadPatientDB, savePatientDB, savePatientDBLocalOnly,
  hydrateLocalCache, clearPatientCache,
  loadTaskDB, saveTaskDB,
  genId,
  PatientDatabasePanel, TreatmentCaseloadPanel,
  getTodaysPatients,
} from "./PatientDatabase.jsx";
import { setSessionKey, clearSessionKey } from "./localCrypto.js";
import { HomeModule, TherapistDashboardModule } from "./DashboardModules.jsx";
import { CLINICAL_PASTEL } from "./clinicalHomeTheme.js";
import AssessmentReportView from "./AssessmentReportView.jsx";
import SpecialtyPatientProfile from "./SpecialtyPatientProfile.jsx";
import { PdfReportsModal, QuickVisitForm, OnboardingModal } from "./AppModules.jsx";
import InstallPrompt from "./InstallPrompt.jsx";
import AuthRequiredPrompt from "./AuthRequiredPrompt.jsx";

// Leave-assessment save gate: which navTo targets count as actually
// "leaving" (the 5 real destinations reachable from the bottom nav), and
// which `active` screens count as "inside a patient's assessment" (the
// three self-contained specialty tools).
const LEAVE_GATE_TARGETS = new Set(["home", "physiofeed", "learn", "profile", "clinical"]);
// The 4 bottom-nav tabs that sit OUTSIDE Clinical -- everything else (the
// Clinical landing page itself, plus every assessment step/wizard reached
// from it) counts as "inside Clinical" for the resume-on-return behavior
// below (see lastClinicalNavRef).
const OUTER_TAB_KEYS = new Set(["home", "physiofeed", "learn", "profile"]);
const OPAQUE_ASSESSMENT_KEYS = new Set(["ortho_new_assessment", "neuro_assessment", "cardio_assessment"]);
const ASSESSMENT_ACTIVE_KEYS = OPAQUE_ASSESSMENT_KEYS;
// Screens of the old step-by-step "Screening Workflow" (and its standalone
// ROM/MMT/Special Tests/... pages), removed 2026-09-25 at Aditi's request.
// A reload or browser Back that still points at one lands on Home instead
// of a blank page.
const RETIRED_SCREEN_KEYS = new Set(["demographics", "subj_region", "subj_ai", "subjective", "chart_palpation", "objective", "rom", "mmt", "special", "neuro", "neurotemplates", "gait", "palpation", "observation", "cyriax", "cyriax_full", "sttt", "kinetic", "fascia", "fma", "nkt", "outcome", "dashboard", "ai_assistant"]);
function isDemographicsComplete(d) {
  return !!(d?.dem_name?.trim() && d?.dem_age && d?.dem_sex && d?.dem_phone?.trim());
}

// ── Lazy-loaded heavy modules (split into separate async chunks) ──────────────
const LazyPhysioFeedEntry = lazy(() => import("./physiofeed/PhysioFeedEntry.jsx"));
const LazyProfileTabEntry = lazy(() => import("./physiofeed/ProfileTabEntry.jsx"));
const LazyLearnTabEntry = lazy(() => import("./physiofeed/LearnTabEntry.jsx"));
const LazyCardioAssessment = lazy(() => import("./CardiopulmonaryAssessment.jsx"));
const LazyNeuroAssessment = lazy(() => import("./NeurologicalAssessment.jsx"));
// New Ortho Assessment module — standalone tool, same pattern as Cardio/Neuro.
const LazyOrthoAssessmentNew = lazy(() => import("./OrthoAssessmentNew.jsx"));
const LazyExercise      = lazy(() => import("./lazy_exercise.jsx"));
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
// Specialties offered by "+ New Assessment" and the Assess sub-tab.
const STREAMS = [
  { id:"ortho_new", label:"Ortho Assessment", icon:"🦴", color:"#7c3aed", live:true  },
  { id:"neuro",     label:"Neuro",            icon:"🧠", color:"#0d9488", live:true  },
  { id:"sports",    label:"Sports",           icon:"🏃", color:"#ea580c", live:false },
  { id:"pedia",     label:"Pedia",            icon:"🧸", color:"#db2777", live:false },
  { id:"cardio",    label:"Cardio",           icon:"❤️", color:"#dc2626", live:false },
];

// Real lucide SVG icon + soft tint background per specialty, for the
// Assessment tab's speciality cards -- same Bone/HeartPulse/Brain/
// Footprints icon set (and the exact same STREAMS colours above) that
// PatientDatabase.jsx's "By Speciality" card grid already uses on the
// Patients tab, so both grids look like the same design language instead
// of one using flat emoji and the other real icons.
const STREAM_ICONS = {
  ortho_new: { Icon: Bone,       bg: "#F3EEFF" },
  neuro:     { Icon: Brain,      bg: "#E6FBF8" },
  cardio:    { Icon: HeartPulse, bg: "#FDEAEC" },
  sports:    { Icon: Footprints, bg: "#FFF1E6" },
};

function AppInner({ currentUser, onSignOut, isGuest=false }) {
  // Per-user storage keys — see PatientDatabase.jsx's dbKey()/draftKey() for
  // why this matters: without this, two students sharing one browser/device
  // would silently read and overwrite each other's local patient cache.
  const DRAFT_KEY = draftKey(currentUser?.id);
  // Per-user, same reasoning as DRAFT_KEY above -- remembers which screen
  // (`active`) and routing detail (`navContext`, e.g. an opaque assessment
  // wizard's current step) was showing, so a real browser reload lands back
  // there instead of Home (2026-09-24, Aditi: "remember the recent page even
  // if reload... wherever page we are it should be we are stuck there only
  // if we press back or double click clinical"). Written by navTo (the one
  // real-navigation choke point) and read once at mount just below.
  const NAV_KEY = `physio_nav_v1_${currentUser?.id || "anon"}`;

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

  const [active, setActive] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(NAV_KEY) || "null");
      if (raw && typeof raw.active === "string" && !RETIRED_SCREEN_KEYS.has(raw.active)) return raw.active;
    } catch {}
    return "home";
  });
  const [navContext, setNavContext] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(NAV_KEY) || "null");
      if (raw && !RETIRED_SCREEN_KEYS.has(raw.active) && raw.navContext && typeof raw.navContext === "object") return raw.navContext;
    } catch {}
    return {};
  });
  // Unread dot for the relocated bell icon in the mobile header (see
  // pm-mobile-hdr below) -- fetched the same standalone way Home's
  // Evidence preview already reads PhysioFeed data (getEvidence()) without
  // needing to be mounted inside PhysioFeed's own AppDataProvider/router.
  const [pfUnread, setPfUnread] = useState(false);
  useEffect(() => { getPfNotifications().then((n) => setPfUnread(n.some((x) => !x.read))).catch(() => {}); }, []);
  // Same, for the message icon beside it (P3) -- it had no unread dot at
  // all, so a DM that arrived while you were outside PhysioFeed's
  // Messages page was invisible. Re-checked on every tab change rather
  // than subscribed: this header lives outside PhysioFeed's
  // AppDataProvider, and tapping between tabs is the only moment the
  // dot's state can matter to you here.
  const [pfUnreadMsgs, setPfUnreadMsgs] = useState(0);
  useEffect(() => { getPfUnreadMessages().then(setPfUnreadMsgs).catch(() => {}); }, [active]);
  // ── Back navigation (in-app Back button + real browser/hardware back) ──
  // activeRef mirrors `active` synchronously so navTo (a stable useCallback)
  // can tell whether a nav call is actually going somewhere new, without
  // needing `active` in its dependency array.
  const activeRef = useRef("home");
  useEffect(() => { activeRef.current = active; }, [active]);
  // Mirrors `navContext` the same way activeRef mirrors `active` -- navTo
  // needs to read the CURRENT context's `wizardStep` (see OPAQUE_ASSESSMENT_KEYS
  // below) without putting navContext in its own dependency array.
  const navContextRef = useRef({});
  useEffect(() => { navContextRef.current = navContext; }, [navContext]);
  // Wherever Clinical was last showing -- its own landing page, or any
  // assessment step/wizard reached from it (demographics/subjective/rom/
  // neuro_assessment/etc). Restored when the Clinical bottom-nav tab is
  // tapped from Home/PhysioFeed/Learn/Profile, instead of always resetting
  // to Clinical's landing page (Aditi, 2026-09-23: "whatever page I left
  // off it should be on that page until... I double click the clinical or
  // go back"). A genuine re-tap while already inside Clinical still resets
  // to its landing page -- see the bottom nav's handleClick below -- same
  // "re-tap to go home" pattern already used for Learn/PhysioFeed.
  const lastClinicalNavRef = useRef({ key: "clinical", ctx: {} });
  useEffect(() => {
    if (!OUTER_TAB_KEYS.has(active)) lastClinicalNavRef.current = { key: active, ctx: navContext };
  }, [active, navContext]);
  const [canGoBack, setCanGoBack] = useState(false);
  // PhysioFeedEntry.jsx's BackBridge writes { canGoBack, goBack } here on
  // every internal navigation -- lets goBack() below unwind PhysioFeed's
  // own Feed/Explore/People/.../discussion navigation one step at a time
  // instead of always falling straight through to window.history.back()
  // (see goBack's own comment for why that alone isn't enough).
  const physioFeedBackRef = useRef({ canGoBack: false, goBack: () => {} });
  // Bumped when the Learn tab is tapped while Learn is already open, so the
  // <LazyLearnTabEntry key=...> below remounts and lands back on Learn's home
  // instead of staying inside whichever study screen is open (2026-09-19,
  // Aditi: "when we click on learn it should open the learn page again... i
  // have to click back again and again").
  const [learnResetKey, setLearnResetKey] = useState(0);
  // Same idea as learnResetKey, for PhysioFeed (Aditi, 2026-09-23: "when I
  // click on physio feed after clinical it should take me to the past page
  // that I'm working on... but when I double click it, it should give the
  // home page"). Bumped only on a real re-tap of the PhysioFeed tab while
  // it's already open -- see the matching check in navTo() below.
  const [physioFeedResetKey, setPhysioFeedResetKey] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(null);
  // Every tab stays mounted once visited (DeferredMount below just toggles
  // display:none/block, see mountedTabs) inside this one shared scrollable
  // container -- so switching tabs never naturally resets scroll the way a
  // real page navigation would; whatever scrollTop the previous tab was at
  // carries straight over, landing the new page "mid-scroll" instead of at
  // its top. navTo (the one place every nav path funnels through) resets it.
  const mainScrollRef = useRef(null);

  // .pm-bnav's real rendered height (icons row + its own safe-area padding)
  // varies by device -- the assessment wizards' .bottombar (Back/Next) used
  // to guess this with a hardcoded "60px", which left a visible gap of the
  // page's grey background between the two bars on devices where the guess
  // ran short (looked like the Back/Next bar "floating" above the tab bar).
  // Measuring the real box and exposing it as --pm-bnav-h lets .bottombar
  // sit flush against it on every device, the same pattern already used for
  // --pm-mobile-hdr-h above.
  const bnavRef = useRef(null);
  useEffect(() => {
    const el = bnavRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const setH = () => document.documentElement.style.setProperty("--pm-bnav-h", `${el.offsetHeight}px`);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Guest Mode auth gate ─────────────────────────────────────────────
  // Guests can browse and use the whole real workflow (nothing they do
  // writes to Supabase -- every save path already guards on currentUser?.id
  // being present, see savePatientDB / the cloud-sync effect below). The
  // ONLY things that genuinely cannot work without a real account are the
  // AI-backed endpoints (/api/parse and friends) -- the server
  // hard-requires a real Supabase JWT (see api/_lib/rateLimit.js), so there
  // is no safe way to let a guest actually call them. requireAuth() is the
  // single gate every AI-triggering button checks first: real users pass
  // straight through, guests get a "sign in to continue" popup instead of
  // a button that would otherwise just silently 401.
  const [authPromptFeature, setAuthPromptFeature] = useState(null); // null | feature label string
  // Optional 2nd arg (2026-09-11) -- most callers are the AI-backed
  // features the default copy describes, but Clinic Protocols is a plain
  // Supabase-backed save/list feature (needs an account for a different
  // reason: per-user rows, not a rate-limited AI endpoint), so it passes
  // its own accurate body text instead of the AI-specific default.
  const requireAuth = useCallback((featureLabel, bodyText) => {
    if (isGuest) { setAuthPromptFeature({ label: featureLabel, bodyText }); return false; }
    return true;
  }, [isGuest]);
  // Tied to the ACCOUNT (Supabase user_metadata), not just this browser's
  // localStorage -- a device-local flag alone re-prompted signed-in users
  // on every new browser/device/private-window/cleared-storage session,
  // reading as being asked for consent "every time I login" (2026-09-15,
  // Aditi). localStorage is still checked first for guest-mode users, who
  // have no account to attach this to, and as a fast synchronous default
  // before currentUser's metadata is known.
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem('pm_onboarded'));
  useEffect(() => {
    if (currentUser?.user_metadata?.pm_onboarded) {
      try { localStorage.setItem('pm_onboarded', '1'); } catch {}
      setShowOnboarding(false);
    }
  }, [currentUser?.user_metadata?.pm_onboarded]);
  const [lastSaved, setLastSaved] = useState(null);
  // 'idle' | 'saving' | 'saved' | 'error' — reflects whether the active
  // patient's data has actually reached Supabase (the real record), not just
  // whether it's cached in this browser's local storage.
  const [cloudSaveStatus, setCloudSaveStatus] = useState("idle");

  // ── Deferred mounting: heavy tabs only render after first visit ──────────
  // This cuts initial render time dramatically
  // Once mounted, component stays mounted (data preserved)
  // `active` may already be a restored-from-reload screen (see NAV_KEY
  // above) by the time this runs -- include it so that screen's real
  // component renders immediately instead of the "not yet mounted"
  // TabLoader placeholder some tabs (e.g. the opaque assessment wizards)
  // show until a real navTo() call adds them.
  const [mountedTabs, setMountedTabs] = useState(() => new Set(["home", active]));
  const [txTab, setTxTab] = useState("exercise");  // "exercise" | "tx" | "hep"

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
  // Declared here (not down near activePatientIdRef/the rest of the patient-
  // switching helpers below) so the two autosave effects right after it can
  // put it in their own dependency arrays -- putting it in an array literal
  // built during render requires its `const` binding to already exist at
  // THIS point in the function's top-to-bottom execution, and it used to be
  // declared much further down, past those effects, which crashed with
  // "Cannot access 'activePatientId' before initialization" (2026-09-24
  // investigation: a brand-new patient auto-created mid-Ortho-assessment
  // reloaded back to a blank draft, traced to this same staleness -- the old
  // workaround read activePatientId through a closure instead, which meant
  // whichever value was current the LAST time `data` itself changed silently
  // stuck around in the saved draft until some unrelated edit changed `data`
  // again, so a reload in that narrow window restored to no active patient
  // at all even though the assessment data was already saved under one).
  const [activePatientId, setActivePatientId] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
      return (raw && raw.pid) ? raw.pid : null;
    } catch { return null; }
  });
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
          savePatientDBLocalOnly(merged, currentUser?.id); // encrypted local cache write, no re-upload
          return merged;
        });
      });
  }, []);

  // ── Auto-save draft to localStorage (2s debounce) ─────────────────────
  // activePatientId is a real dep now (2026-09-24) -- see its own declaration
  // above for why it had to move up above this effect first.
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
  }, [data, activePatientId]);

  // ── Auto-save to the CLOUD (debounced, ~2s after typing stops) ────────────
  // This is what makes Supabase the real source of truth instead of local
  // storage: every change to the active patient gets pushed up here, not
  // just cached on this device. activePatientId is a real dep now (2026-09-24,
  // same fix as the localStorage draft-save effect above).
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
  }, [data, activePatientId]);

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
  // Leave-assessment save/demographics gate (see navTo below): refs mirror
  // the live values navTo needs but can't have in its own dep array
  // without recreating the stable callback every render.
  const activePatientIdRef = useRef(null);
  useEffect(() => { activePatientIdRef.current = activePatientId; });
  const dataRef = useRef({});
  useEffect(() => { dataRef.current = data; });
  const [showPatientDb, setShowPatientDb] = useState(false);
  const [showPdfReports, setShowPdfReports] = useState(false);
  const [profileTab, setProfileTab] = useState(null);
  // Clinical tab's own sub-navigation. "Today" is the default landing view
  // (2026-09-10 redesign, Aditi: Swiggy-Instamart-style Clinical home) --
  // clinicalTabRedesign.test.jsx's assumption that "Patients" is default was
  // already failing before this change (ambiguous getByText("Clinical") hits
  // both the bottom-nav label and other text), so this isn't a regression.
  // "Patients" and "Treatment" are still other lenses onto the same patients
  // array, not separate data.
  const [clinicalSubTab, setClinicalSubTab] = useState("today"); // "today" | "patients" | "treatment" | "assessment"
  // Lets a navTo("clinical", {clinicalSubTab:"assessment"}) call (Home's
  // own "Assessment" tile, e.g.) land directly on the Assessment sub-tab
  // instead of always the Patients default. Aditi: "when we click on
  // assessment it should take us to assessment tab of clinical .. it is
  // taking us to older tabs" -- Home's tile used to call onNav("subjective"),
  // the legacy config-driven Ortho stream's own tab, instead of this one.
  useEffect(() => {
    if (active === "clinical" && navContext?.clinicalSubTab) setClinicalSubTab(navContext.clinicalSubTab);
  }, [active, navContext]);
  // Clinical tab landing: "+ New Assessment" opens a minimal 5-question
  // intake (name, age, sex, phone, region) instead of asking AI-vs-Template
  // first (2026-09-10, Aditi: "i want patient small 5 ques minimal data
  // demographic data to be fill not this page") -- Ortho Outpatient is the
  // only pathway that's actually live, so there's nothing else to choose.
  const [showSpecialtyPicker, setShowSpecialtyPicker] = useState(false);
  const [quickStart, setQuickStart] = useState({ name: "", age: "", sex: "", phone: "", chiefComplaint: "" });
  // Two-step picker (2026-09-10, Aditi: "change region to chief complaint
  // and then ask which specialty and then normal workflow") -- step 1
  // captures the 5 quick-intake fields (chief complaint replacing the
  // body-region picker, since region no longer needs to be known before
  // specialty is even chosen), step 2 asks which specialty so the
  // assessment can actually route to the right tool instead of assuming
  // Ortho for everyone.
  const [quickStartStep, setQuickStartStep] = useState("form"); // "form" | "specialty"
  // Shared "start a new assessment for this specialty" logic -- used by
  // both the "+ New Assessment" specialty-picker modal below and the
  // Clinical tab's own "Assessment" sub-tab pills (2026-08-23), so picking
  // a specialty does the exact same real thing (blank-slate + navigate to
  // that specialty's real tool) no matter which entry point was used.
  function startSpecialty(st) {
    if (st.id === "cardio") {
      setData({}); setActivePatientId(null);
      navTo("cardio_assessment");
    } else if (st.id === "neuro") {
      setData({}); setActivePatientId(null);
      navTo("neuro_assessment");
    } else if (st.id === "ortho_new") {
      setData({}); setActivePatientId(null);
      navTo("ortho_new_assessment");
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
  // "+ New Assessment"'s minimal 5-question intake (name, age, sex, phone,
  // chief complaint) -- replaces the old AI-vs-Template picker. Step 1
  // captures these 5 fields, step 2 asks which specialty, then this
  // seeds the shared `data` state and routes into that specialty's own
  // real tool -- the exact same real navigation startSpecialty() already
  // uses for the Assessment tab's specialty cards, just pre-filled instead
  // of blank, so every specialty runs its own normal, complete step order
  // (no safety steps silently skipped; region/pathway/condition for Ortho
  // are asked normally too, since the intake no longer captures region).
  function startQuickAssessment(st) {
    const { name, age, sex, phone, chiefComplaint } = quickStart;
    const seedData = {
      dem_name: name.trim(),
      dem_age: age,
      dem_sex: sex,
      dem_phone: phone.trim(),
      demographics: { name: name.trim(), age, sex },
      chiefComplaint: chiefComplaint.trim(),
      cc_main: chiefComplaint.trim(),
    };
    setActivePatientId(null);
    setData(seedData);
    setShowSpecialtyPicker(false);
    setQuickStartStep("form");
    setQuickStart({ name: "", age: "", sex: "", phone: "", chiefComplaint: "" });
    if (st.id === "cardio") {
      navTo("cardio_assessment");
    } else if (st.id === "neuro") {
      navTo("neuro_assessment");
    } else if (st.id === "ortho_new") {
      // Plain navigate, no entryMode/resume shortcut -- the actual normal
      // Ortho flow (pathway: Outpatient/IPD/Post-op, then region, then
      // condition, then the wizard itself), just pre-filled with the
      // quick-intake answers instead of starting blank.
      navTo("ortho_new_assessment");
    }
  }

  // Auto-save current data to active patient whenever data changes -- LOCAL
  // cache only. This effect has no debounce, so it fires on every keystroke
  // while filling an assessment; it used to call savePatientDB (which also
  // upserts to Supabase) here too, meaning a signed-in user firing one
  // network request per keystroke with no ordering guarantee and no error
  // handling -- a slower, older request completing after a newer one could
  // silently overwrite the just-typed data on the server, and any RLS/auth
  // failure became an unhandled rejection nobody saw (2026-09-11, Aditi:
  // "after filling its not saving in assessment"). The real cloud sync
  // already happens properly debounced (~2s) with cloudSaveStatus/error
  // handling in the effect right below this one -- this one only needs to
  // keep the local encrypted cache and React state in sync immediately.
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
      savePatientDBLocalOnly(updated, currentUser?.id);
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
  // Same gap, one step earlier: the "✨ Say your assessment" AI intake fills
  // Subjective/Pain/Red Flags straight from the narrative but almost never
  // extracts a patient *name* out of it (2026-09-11, Aditi: "ai assisted
  // form filling is not documenting in assessment review summary") -- a
  // clinician who only used AI intake and never typed the Full Name field
  // left dem_name empty for the whole session, so this effect never fired,
  // no patients[] row ever existed, and SpecialtyPatientProfile's Review
  // Summary (which reads patient.data.ortho_outpatient_assessment) had
  // nothing to show even though the wizard's own local Review step had the
  // data all along. Fall back to creating the row as soon as the AI-filled
  // blob has real Subjective/Pain content, same "New Patient" placeholder
  // name finaliseNewPatient() already uses below.
  useEffect(() => {
    if (activePatientId) return;
    if (active !== "cardio_assessment" && active !== "neuro_assessment" && active !== "ortho_new_assessment") return;
    const name = (data.dem_name || "").trim();
    let hasAiFilledData = false;
    if (!name && active === "ortho_new_assessment" && data.ortho_outpatient_assessment) {
      try {
        const wizardData = JSON.parse(data.ortho_outpatient_assessment)?.data || {};
        const subj = wizardData.subjective || {};
        const pain = wizardData.pain || {};
        hasAiFilledData =
          Object.entries(subj).some(([k, v]) => k !== "__aiExtracted" && String(v || "").trim()) ||
          Object.values(pain).some((v) => String(v || "").trim());
      } catch { /* malformed/partial JSON mid-typing -- just wait for the next tick */ }
    }
    if (!name && !hasAiFilledData) return;
    const newP = { id: genId(), name: name || "New Patient", data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), hasRedFlags: false, lastDx: "" };
    setPatients(prev => { const updated = [newP, ...prev]; savePatientDB(updated, currentUser?.id); return updated; });
    setActivePatientId(newP.id);
  }, [data.dem_name, data.ortho_outpatient_assessment, activePatientId, active]);

  // Every "+ New"/"+ New Patient" entry point (header, patient bar, no-
  // active-patient banner) now opens the exact same minimal 5-question
  // intake as "+ New Assessment" (2026-09-16, Aditi: "I want it to be the
  // same. I don't want it to be different.") -- there used to be a second,
  // separate "New patient" modal (IntakeForm/showIntake, AppModules.jsx)
  // with extra Occupation/Address fields, a tab layout, and its own consent
  // checkbox; retired in favor of one consistent flow everywhere.
  const createNewPatient = () => {
    setShowSpecialtyPicker(true);
    setShowPatientDb(false);
  };

  const selectPatient = (p) => {
    // Re-selecting the patient who is ALREADY active (e.g. tapping their
    // profile mid-assessment): keep the current in-memory `data` -- it holds
    // the freshest, possibly-unsaved edits. Resetting it here to a stale
    // draft/saved copy would silently drop in-flight Care Plan edits
    // (2026-09-05).
    if (p && p.id === activePatientId && Object.keys(data).length > 0) {
      setShowPatientDb(false);
      return;
    }
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
    // Leave-assessment gate (Aditi: "when we leave any assessment, it
    // should ask that do you want to save this assessment or not"):
    // intercept a real "leave the assessment" nav -- one of the 5
    // bottom-nav destinations, fired while a patient's assessment is
    // actively open -- before it happens, and let the confirm modal below
    // decide whether to continue it. Popstate replays and the modal's own
    // follow-up call (__skipLeaveGate) bypass this so Back/Forward and the
    // "Save & leave"/"Leave without saving" buttons themselves don't loop.
    if (
      !navOpts.__fromPopState &&
      !navOpts.__skipLeaveGate &&
      LEAVE_GATE_TARGETS.has(key) &&
      key !== activeRef.current &&
      activePatientIdRef.current &&
      ASSESSMENT_ACTIVE_KEYS.has(activeRef.current)
    ) {
      setPendingLeave({ key, ctx, navOpts });
      return;
    }
    // Tapping "Learn" while already on Learn = back to Learn's home page. Not
    // for popstate replays (browser Back/Forward keeps Learn as it was).
    if (key === "learn" && key === activeRef.current && !navOpts.__fromPopState) {
      setLearnResetKey((k) => k + 1);
    }
    // Same for PhysioFeed -- but only a bare re-tap (no explicit pfTab
    // target), so the header's search/bell/message icons (navTo("physiofeed",
    // {pfTab:...}), fired from OUTSIDE PhysioFeed while it's already the
    // active tab) still land on that specific section instead of getting
    // reset back to the feed.
    if (key === "physiofeed" && key === activeRef.current && !navOpts.__fromPopState && !ctx?.pfTab) {
      setPhysioFeedResetKey((k) => k + 1);
    }
    setActive(key);
    setNavContext(ctx || {});
    setNavOpen(false);
    // Persist so a real browser reload (not just an in-app tab switch)
    // lands back on this exact screen too -- see NAV_KEY above.
    try { localStorage.setItem(NAV_KEY, JSON.stringify({ active: key, navContext: ctx || {} })); } catch {}
    // Every tab stays mounted (display:none/block, not unmounted) inside
    // the one shared .pm-main scroll container, so it never gets a fresh
    // scrollTop of its own the way a real page load would -- without this,
    // navigating in after scrolling down on the previous tab lands the new
    // page already scrolled to wherever the old one left off, instead of
    // its top (see mainScrollRef above).
    // The actual scrolling element here is <body> itself (utils.jsx's
    // .pm-shell/global CSS gives html AND body their own independent
    // overflow-y:auto, with html pinned to the viewport height and body
    // holding the real scrollable content) -- window.scrollTo/scrollY is a
    // no-op against it, so body.scrollTop is reset directly. mainScrollRef
    // is reset too for any layout where .pm-main itself ends up being the
    // scrollable one instead (e.g. the desktop sidebar layout above, which
    // constrains its own height).
    if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    try { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; window.scrollTo(0, 0); } catch {}
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
    //
    // One deliberate exception: Ortho/Neuro/Cardio's guided assessment
    // wizards (OPAQUE_ASSESSMENT_KEYS) each mount under a single opaque key
    // for their entire internal step list (Demographics/Subjective/ROM/...)
    // -- useWizardStepHistory.js re-navigates to that SAME key on every
    // internal step, tagging `ctx.wizardStep` with whichever step id it
    // landed on, specifically so THIS still counts as a real nav and still
    // pushes (Aditi, 2026-09-22: "when we click on back it takes us to
    // total home button ...even if we are in middle of assessment" -- every
    // step was collapsing into the one history entry this whole opaque
    // screen got when it first opened).
    const isWizardStepChange =
      key === activeRef.current &&
      OPAQUE_ASSESSMENT_KEYS.has(key) &&
      ctx?.wizardStep !== undefined &&
      ctx.wizardStep !== navContextRef.current?.wizardStep;
    if (!navOpts.__fromPopState && (key !== activeRef.current || isWizardStepChange)) {
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

  // "Save this assessment?" -> Yes: only actually leaves once the
  // patient's core demographics (Name/Age/Sex/Phone -- the same
  // requiredOk fields the Demographics steps themselves gate on) are
  // filled in. Incomplete: cancel the leave and stay put, with the alert
  // telling the clinician what's missing (the three specialty tools can't
  // be driven to a specific internal step from outside).
  function leaveConfirmSave() {
    const target = pendingLeave;
    setPendingLeave(null);
    if (!target) return;
    if (isDemographicsComplete(dataRef.current)) {
      navTo(target.key, target.ctx, { ...target.navOpts, __skipLeaveGate: true });
      return;
    }
    alert("Please fill in the patient's Name, Age, Sex and Phone before leaving this assessment.");
  }
  function leaveWithoutSaving() {
    const target = pendingLeave;
    setPendingLeave(null);
    if (!target) return;
    navTo(target.key, target.ctx, { ...target.navOpts, __skipLeaveGate: true });
  }

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
  //
  // BUG FIX (2026-09-09, "there is nothing pop up is coming when leaving mid
  // way"): the leave-assessment gate lives inside navTo() and explicitly
  // skips itself for `__fromPopState` calls (to avoid looping when the gate's
  // own Save&Leave/Leave-without-saving buttons replay a popstate-originated
  // nav). But EVERY real exit from this app funnels through popstate --
  // the in-header "← Back" button just calls window.history.back() (see
  // goBack below), and so does the hardware/gesture back button -- so the
  // gate that only fires from navTo's direct callers (bottom nav taps) was
  // silently unreachable from the one button clinicians actually use to
  // leave a screen. This runs the identical gate check here too: the browser
  // has already moved history by the time popstate fires, but `active`
  // (React state) hasn't changed yet, so the assessment screen just stays
  // visually put while the confirm modal shows -- cancelLeave() below
  // re-pushes the current screen's history entry if the clinician stays.
  useEffect(() => {
    const onPopState = (e) => {
      const s = e.state;
      const rawKey = s?.pmNavKey || "home";
      const targetKey = RETIRED_SCREEN_KEYS.has(rawKey) ? "home" : rawKey;
      if (
        LEAVE_GATE_TARGETS.has(targetKey) &&
        targetKey !== activeRef.current &&
        activePatientIdRef.current &&
        ASSESSMENT_ACTIVE_KEYS.has(activeRef.current)
      ) {
        setPendingLeave({ key: targetKey, ctx: s?.pmNavCtx || {}, navOpts: { __fromPopState: true } });
        return;
      }
      navTo(targetKey, targetKey === rawKey ? (s?.pmNavCtx || {}) : {}, { __fromPopState: true });
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [navTo]);

  // "Stay on this screen" (button or backdrop tap): if the gate was raised
  // by a real popstate (browser/hardware Back already moved history one
  // slot before we intercepted it), restore that slot so a second Back
  // press still lands correctly instead of skipping over the assessment
  // screen entirely.
  function cancelLeave() {
    if (pendingLeave?.navOpts?.__fromPopState) {
      try { window.history.pushState({ pmNavKey: activeRef.current, pmNavCtx: navContext }, "", window.location.href); } catch {}
    }
    setPendingLeave(null);
  }

  // In-header "← Back" button: defers to the real browser history (rather
  // than a hand-rolled stack) so it stays perfectly in sync with the
  // hardware back button -- one press of either always does the same thing.
  //
  // EXCEPT inside PhysioFeed (2026-09-23, "it takes us directly to home...
  // it should take us just previous open page"): PhysioFeedEntry.jsx's
  // MemoryRouter deliberately never touches window.history (its own header
  // comment explains why -- a second router driving the real URL would
  // fight with navTo's pushState), so there is nothing finer-grained than
  // "leave PhysioFeed" for window.history.back() to fall back to. While
  // inside PhysioFeed with somewhere internal left to unwind, defer to
  // BackBridge's tracked depth instead. The hardware/gesture back button
  // still goes through window.history.back() directly and so still jumps
  // straight out of PhysioFeed in one step -- fully unifying the two would
  // mean PhysioFeed's internal nav pushing real history entries, a much
  // bigger change than this one button.
  const goBack = useCallback(() => {
    if (activeRef.current === "physiofeed" && physioFeedBackRef.current.canGoBack) {
      physioFeedBackRef.current.goBack();
      return;
    }
    try { window.history.back(); } catch {}
  }, []);

  // Single choke point for every "open this patient's profile" action
  // (sidebar "👤 Profile" button, patient bar name tap, dashboard/
  // treatment-list profile buttons). Every patient now opens the same
  // SpecialtyPatientProfile hub -- the legacy PatientProfileModal this
  // used to fall back to for patients with no Cardio/Neuro/Ortho data has
  // been removed entirely (2026-09-02, Aditi: "remove old ortho patient
  // profile totally").
  const openPatientProfile = useCallback((p, tab) => {
    if (!p) return;
    selectPatient(p);
    if (tab) setProfileTab(tab);
    navTo("specialty_profile");
  }, [selectPatient, navTo]);

  // shared sidebar list renderer used by both desktop sidebar and mobile drawer
  // Top-level nav item (no indent)
  const SidebarTopItem = ({ navKey, navCtx, icon, label, onClick }) => {
    const isAct = active === navKey;
    return (
      <div onClick={onClick || (()=>navTo(navKey, navCtx||{}))} style={{
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
                onClick={()=>openPatientProfile(activePatient)}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#1a3a5c,#2563eb)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(37,99,235,0.3)"}}>
                👤 Profile
              </button>
              <button
                onClick={()=>openPatientProfile(activePatient,"sessions")}
                style={{padding:"7px 6px",background:"linear-gradient(135deg,#065f46,#059669)",border:"none",borderRadius:7,color:"#fff",fontWeight:700,fontSize:"0.7rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:4,boxShadow:"0 1px 6px rgba(5,150,105,0.3)"}}>
                ▶️ Start Session
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Simplified flat nav (Aditi: "remove old, put this" -- Home /
          Patients / Clinical / Learn / PhysioFeed, divider, Settings).
          Replaces the old Assessment/Advanced Assessment/Treatment/
          Documentation tool groups, which duplicated the real navigation
          already on the bottom nav and inside Clinical's own sub-tabs. */}
      <SidebarTopItem navKey="home" icon="🏠" label="Home"/>
      <SidebarTopItem navKey="clinical" navCtx={{clinicalSubTab:"patients"}} icon="👥" label="Patients"/>
      {/* Same resume-on-return behavior as the mobile bottom nav's Clinical
          tab (see lastClinicalNavRef above): from Home/Learn/PhysioFeed/
          Settings this returns to wherever Clinical was left, not always
          its landing page. Clicked while already inside Clinical, it's a
          deliberate "take me home" -- same "re-tap to go home" pattern as
          the other tabs. */}
      <SidebarTopItem navKey="clinical" icon="🩺" label="Clinical" onClick={()=>{
        if (OUTER_TAB_KEYS.has(active)) {
          const { key, ctx } = lastClinicalNavRef.current;
          navTo(key, ctx);
        } else {
          navTo("clinical");
        }
      }}/>
      <SidebarTopItem navKey="learn" icon="📚" label="Learn"/>
      <SidebarTopItem navKey="physiofeed" icon="📰" label="PhysioFeed"/>

      <div style={{height:1,background:PC.border,margin:"6px 12px"}}/>

      <SidebarTopItem navKey="profile" icon="⚙️" label="Settings"/>

      {/* Sign out / Delete account -- moved here from the Clinical "Today"
          tab's own header (2026-09-10, Aditi screenshot: "put this red
          circle in side bar below the settings ... remove from todays
          clinical section"). Account-level actions belong in the settings
          menu, not floating in the middle of a patient-facing dashboard. */}
      <div style={{padding:"10px 14px 4px",display:"flex",flexDirection:"column",gap:8}}>
        <button onClick={onSignOut}
          style={{width:"100%",padding:"8px 10px",borderRadius:9,border:`1px solid ${PC.border}`,
            background:"transparent",color:PC.muted,fontSize:"0.8rem",
            fontWeight:700,cursor:"pointer"}}>
          Sign out
        </button>
        <DeleteAccountButton patients={patients} buttonStyle={{
          width:"100%",padding:"8px 10px",borderRadius:9,border:"1px solid #FCA5A5",
          background:"transparent",color:"#DC2626",fontSize:"0.8rem",
          fontWeight:700,cursor:"pointer"}}/>
      </div>

    </>
  );

  // Ortho (incl. AI-assisted, same `active` value, entryMode just differs),
  // Neuro, and Cardio each render their own full-screen wizard with its own
  // sticky .topbar (back button, title, step nav) directly under .pm-main --
  // still nested below .pm-mobile-hdr, which is ALSO position:sticky at
  // top:0 in that same scroll (body). Two independent sticky elements
  // stacked in one scroll container is a known iOS WebKit jitter trigger;
  // contain:paint/isolation:isolate on both (2026-09-16/17) cut it down but
  // Aditi confirmed on video it's still visibly vibrating on a real device.
  // Removing one of the two stickies removes the mechanism outright instead
  // of continuing to paper over it -- the assessment's own topbar already
  // has back/close, so pm-mobile-hdr is redundant chrome while one of these
  // is open, not lost functionality.
  const isFullScreenAssessment = active === "ortho_new_assessment" || active === "neuro_assessment" || active === "cardio_assessment";

  return(
    <div className="pm-shell" style={{background:PC.bg,color:PC.text,fontFamily:"'SF Pro Display','Helvetica Neue',system-ui,sans-serif",transition:"background 0.2s,color 0.15s"}}>
      <MobileStyleInjector/>
      <OfflineBanner/>

      {/* ── Onboarding Modal — fires once on first visit ─────────────────── */}
      {showOnboarding&&<OnboardingModal PC={PC} onDismiss={()=>{
        localStorage.setItem("pm_onboarded","1");
        setShowOnboarding(false);
        // Signed-in accounts: persist to Supabase user_metadata too, so this
        // never reappears on another device/browser or after this one's
        // storage is cleared. Guest mode has no account to attach it to --
        // localStorage above is all it gets, same as before.
        if (currentUser?.id) { supabase.auth.updateUser({ data: { pm_onboarded: true } }).catch(()=>{}); }
      }}/>}

      {/* ── Leave-assessment save/demographics gate ───────────────────────── */}
      {pendingLeave && (
        <div style={{position:"fixed",inset:0,zIndex:9999,background:"rgba(17,17,27,0.5)",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}
          onClick={cancelLeave}>
          <div style={{background:PC.surface,borderRadius:16,padding:"22px 20px",maxWidth:360,width:"100%",boxShadow:"0 20px 50px rgba(0,0,0,0.3)"}}
            onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:"1.02rem",fontWeight:800,color:PC.text,marginBottom:6}}>Save this assessment?</div>
            <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:18,lineHeight:1.4}}>
              Your entries are kept either way. Choosing "Save" also checks that the patient's core details (Name, Age, Sex, Phone) are filled in before you leave.
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <button type="button" onClick={leaveConfirmSave}
                style={{padding:"11px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7c3aed,#9333ea)",color:"#fff",fontWeight:800,fontSize:"0.88rem",cursor:"pointer",fontFamily:"inherit"}}>
                Save & Leave
              </button>
              <button type="button" onClick={leaveWithoutSaving}
                style={{padding:"11px",borderRadius:10,border:`1.5px solid ${PC.border}`,background:PC.surface,color:PC.text,fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:"inherit"}}>
                Leave without saving
              </button>
              <button type="button" onClick={cancelLeave}
                style={{padding:"9px",borderRadius:10,border:"none",background:"none",color:PC.muted,fontWeight:600,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
                Stay on this screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Guest Mode: "sign in to use this" popup, shown by requireAuth() ── */}
      {authPromptFeature && (
        <AuthRequiredPrompt
          feature={authPromptFeature.label}
          bodyText={authPromptFeature.bodyText}
          onClose={()=>setAuthPromptFeature(null)}
          onSignIn={()=>{ setAuthPromptFeature(null); onSignOut(); }}
        />
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

      {/* ── NEW PATIENT INTAKE MODAL ── */}
      {/* ── NEW ASSESSMENT: MINIMAL QUICK-START ──
          2026-09-10, Aditi: "i want patient small 5 ques minimal data
          demographic data to be fill not this page" -- replaces the old
          AI-vs-Template picker outright. Two steps: (1) Name/Age/Sex/Phone/
          Chief complaint, (2) which specialty -- since the intake no longer
          asks for a body region up front, specialty has to be picked
          explicitly instead of always assuming Ortho. Picking a specialty
          seeds `data` with these 5 answers and routes into that specialty's
          own real tool via startQuickAssessment(), same real navigation
          startSpecialty() already uses -- normal step order, nothing
          skipped, just pre-filled instead of blank. */}
      {showSpecialtyPicker && (
        <div data-testid="specialty-picker-modal" style={{position:"fixed",inset:0,zIndex:600,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{width:"100%",maxWidth:440,maxHeight:"88vh",overflowY:"auto",background:PC.surface,borderRadius:16,padding:"24px 20px",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
            {quickStartStep==="form" ? (<>
              <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:4}}>New assessment</div>
              <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:18}}>Quick patient details — you can fill in the rest once you're in.</div>

              <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:16}}>
                <div>
                  <label style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4}}>Full name</label>
                  <input value={quickStart.name} onChange={e=>setQuickStart(q=>({...q,name:e.target.value}))}
                    placeholder="e.g. Riya Sharma"
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${PC.border}`,background:PC.s2,color:PC.text,fontFamily:"inherit",fontSize:"0.88rem",outline:"none",boxSizing:"border-box"}}/>
                </div>
                <div style={{display:"flex",gap:10}}>
                  <div style={{flex:1}}>
                    <label style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4}}>Age</label>
                    <input value={quickStart.age} onChange={e=>setQuickStart(q=>({...q,age:e.target.value}))}
                      type="number" placeholder="yrs"
                      style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${PC.border}`,background:PC.s2,color:PC.text,fontFamily:"inherit",fontSize:"0.88rem",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                  <div style={{flex:1}}>
                    <label style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4}}>Phone</label>
                    <input value={quickStart.phone} onChange={e=>setQuickStart(q=>({...q,phone:e.target.value}))}
                      type="tel" placeholder="+91 98765 43210"
                      style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${PC.border}`,background:PC.s2,color:PC.text,fontFamily:"inherit",fontSize:"0.88rem",outline:"none",boxSizing:"border-box"}}/>
                  </div>
                </div>
                <div>
                  <label style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:6}}>Sex</label>
                  <div style={{display:"flex",gap:6}}>
                    {["Male","Female","Other"].map(opt=>(
                      <button key={opt} type="button" onClick={()=>setQuickStart(q=>({...q,sex:opt}))}
                        style={{flex:1,padding:"9px 6px",borderRadius:10,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:"0.82rem",fontWeight:700,
                          background:quickStart.sex===opt?PC.accent:PC.s2,color:quickStart.sex===opt?"#fff":PC.muted}}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{fontSize:"0.72rem",fontWeight:700,color:PC.muted,display:"block",marginBottom:4}}>Chief complaint</label>
                  <textarea value={quickStart.chiefComplaint} onChange={e=>setQuickStart(q=>({...q,chiefComplaint:e.target.value}))}
                    placeholder="e.g. Right knee pain for 2 weeks" rows={2}
                    style={{width:"100%",padding:"10px 12px",borderRadius:10,border:`1.5px solid ${PC.border}`,background:PC.s2,color:PC.text,fontFamily:"inherit",fontSize:"0.88rem",outline:"none",boxSizing:"border-box",resize:"vertical"}}/>
                </div>
              </div>

              <button type="button" onClick={()=>setQuickStartStep("specialty")}
                disabled={!quickStart.name.trim() || !quickStart.chiefComplaint.trim()}
                style={{width:"100%",padding:"14px",background:!quickStart.name.trim()||!quickStart.chiefComplaint.trim()?PC.border:"linear-gradient(135deg,#7c3aed,#9333ea)",
                  border:"none",borderRadius:14,color:"white",fontWeight:800,fontSize:"0.9rem",
                  cursor:!quickStart.name.trim()||!quickStart.chiefComplaint.trim()?"not-allowed":"pointer",marginBottom:10,
                  boxShadow:!quickStart.name.trim()||!quickStart.chiefComplaint.trim()?"none":"0 4px 14px rgba(124,58,237,0.3)"}}>
                Next →
              </button>

              <button type="button" onClick={()=>{ setShowSpecialtyPicker(false); setQuickStartStep("form"); setQuickStart({ name:"", age:"", sex:"", phone:"", chiefComplaint:"" }); }}
                style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${PC.border}`,borderRadius:10,color:PC.muted,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                Cancel
              </button>
            </>) : (<>
              <div style={{fontSize:"1rem",fontWeight:800,color:PC.accent,marginBottom:4}}>Which specialty?</div>
              <div style={{fontSize:"0.82rem",color:PC.muted,marginBottom:18}}>This decides which assessment tool opens next.</div>

              {/* gridTemplateColumns uses minmax/auto-fit rather than a
                  literal "1fr 1fr" -- utils.jsx has a global mobile
                  override that force-collapses any inline grid style
                  containing that exact substring to 1 column below 400px
                  width (see the Assessment sub-tab's own specialty grid,
                  which hit this same trap first). */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:16}}>
                {STREAMS.filter(s=>["ortho_new","neuro","cardio","sports"].includes(s.id)).map(st=>{
                  const clickable = st.live || st.id === "cardio";
                  const { Icon, bg } = STREAM_ICONS[st.id];
                  return (
                    <button key={st.id} type="button"
                      onClick={()=>{ if(!clickable) return; startQuickAssessment(st); }}
                      style={{position:"relative",textAlign:"left",display:"flex",flexDirection:"column",
                        borderRadius:16,cursor:clickable?"pointer":"not-allowed",fontFamily:"inherit",
                        border:`1.5px solid ${clickable?PC.border:"#E5E7EB"}`,
                        background:PC.surface,padding:"14px 12px",opacity:clickable?1:0.6}}>
                      {st.id==="ortho_new" && <span style={{position:"absolute",top:10,right:10,display:"inline-flex",alignItems:"center",gap:3,fontSize:"0.6rem",fontWeight:800,padding:"3px 7px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",letterSpacing:"0.03em"}}><Sparkles size={10} strokeWidth={2.2}/>AI</span>}
                      {!clickable && <span style={{position:"absolute",top:10,right:10,fontSize:"0.58rem",fontWeight:800,padding:"2px 6px",borderRadius:8,background:"#E5E7EB",color:"#9CA3AF"}}>SOON</span>}
                      <div style={{width:38,height:38,borderRadius:12,background:bg,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>
                        <Icon size={19} color={st.color} strokeWidth={1.75}/>
                      </div>
                      <span style={{fontWeight:800,fontSize:"0.86rem",color:clickable?PC.text:"#9CA3AF",marginTop:10}}>{st.id==="ortho_new"?"Ortho":st.label}</span>
                    </button>
                  );
                })}
              </div>

              <button type="button" onClick={()=>setQuickStartStep("form")}
                style={{width:"100%",padding:"10px",background:"transparent",border:`1px solid ${PC.border}`,borderRadius:10,color:PC.muted,fontSize:"0.82rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>
                ← Back
              </button>
            </>)}
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
        <div style={{position:"fixed",bottom:"calc(80px + env(safe-area-inset-bottom))",left:"50%",transform:"translateX(-50%)",zIndex:999,background:jsonMsg.type==="success"?"rgba(0,201,122,0.97)":"rgba(255,77,109,0.97)",color:"#000",fontWeight:700,fontSize:"0.8rem",padding:"10px 20px",borderRadius:12,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",maxWidth:"calc(100vw - 32px)",textAlign:"center"}}>
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
            <div style={{fontWeight:800,fontSize:"0.88rem",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap"}}>PhysioMind</div>
          </div>
          <button onClick={()=>setNavOpen(false)} aria-label="Close navigation" style={{width:30,height:30,borderRadius:8,border:`1px solid ${PC.border}`,background:PC.s2,color:PC.muted,fontSize:"0.9rem",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>✕</button>
        </div>
        <div style={{padding:"0 8px"}}>
          <SidebarItems onNav={navTo}/>
        </div>
      </div>

      {/* Header — Medical Professional */}
      <div className="pm-header" style={{background:"#ffffff",borderBottom:`1px solid ${PC.border}`,padding:"0 24px",position:"sticky",top:0,zIndex:100,boxShadow:"0 1px 12px rgba(0,20,50,0.06)",transform:"translateZ(0)",WebkitTransform:"translateZ(0)",willChange:"transform",backfaceVisibility:"hidden"}}>
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
              <div style={{fontWeight:800,fontSize:"clamp(0.85rem,3vw,1.05rem)",letterSpacing:"-0.3px",background:`linear-gradient(90deg,${PC.accent},${PC.a2})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",whiteSpace:"nowrap",lineHeight:1.2}}>PhysioMind</div>
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
      {/* Hidden while a full-screen assessment (Ortho/AI/Neuro/Cardio) is
          open -- see isFullScreenAssessment above. That screen has its own
          sticky back/title bar, so this was a second sticky element
          stacked in the same scroll, the actual cause of the header
          jitter CSS containment alone couldn't fully fix. */}
      {!isFullScreenAssessment && (
      <div className="pm-mobile-hdr" style={{
        background: "#FFFFFF",
        borderBottom: `1px solid ${PC.isDark?PC.border:"#E0E0E2"}`,
        borderLeft: `3.5px solid ${PC.accent}`,
        transform: "translateZ(0)", WebkitTransform: "translateZ(0)",
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
          <div style={{fontWeight:800,fontSize:"0.92rem",color:PC.isDark?PC.a2:"#4c1d95",letterSpacing:"-0.3px",lineHeight:1.2,whiteSpace:"nowrap"}}>PhysioMind</div>
        </div>
        {/* Right side: swaps by tab instead of always showing "+ New" --
            PhysioFeed and Profile don't create patients, they have their
            own search/notifications/messages, which used to live in a
            second sticky row inside PhysioFeed's own Header.jsx, stacked
            right below this one. Relocated up here instead of duplicated
            (2026-09-17, Aditi: "search notification and message should go
            up there when we open the physio feed... if we open the
            clinical it should be the new patient button... and normally"
            -- "normally" being every other tab, which keeps "+ New"). */}
        {active==="physiofeed"||active==="profile" ? (
          <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
            <button onClick={()=>navTo("physiofeed",{pfTab:"search"})} aria-label="Search"
              style={{minHeight:32,minWidth:32,padding:6,background:"transparent",border:"none",borderRadius:8,color:PC.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <SearchIcon size={18}/>
            </button>
            <button onClick={()=>navTo("physiofeed",{pfTab:"notifications"})} aria-label="Notifications"
              style={{position:"relative",minHeight:32,minWidth:32,padding:6,background:"transparent",border:"none",borderRadius:8,color:PC.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <BellIcon size={18}/>
              {pfUnread && <span style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:"#f43f5e"}}/>}
            </button>
            <button onClick={()=>navTo("physiofeed",{pfTab:"messages"})} aria-label={pfUnreadMsgs>0?`Messages (${pfUnreadMsgs} unread)`:"Messages"}
              style={{position:"relative",minHeight:32,minWidth:32,padding:6,background:"transparent",border:"none",borderRadius:8,color:PC.muted,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <MessageSquareIcon size={18}/>
              {pfUnreadMsgs>0 && <span style={{position:"absolute",top:6,right:6,width:7,height:7,borderRadius:"50%",background:"#f43f5e"}}/>}
            </button>
          </div>
        ) : active==="clinical" ? (
          <button onClick={createNewPatient}
            style={{padding:"5px 12px",minHeight:30,background:PC.accent,border:"none",borderRadius:7,
              color:"#fff",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",
              boxShadow:`0 2px 6px ${PC.accent}50`}}>
            + New Patient
          </button>
        ) : (
          <button onClick={createNewPatient}
            style={{padding:"5px 12px",minHeight:30,background:PC.accent,border:"none",borderRadius:7,
              color:"#fff",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",flexShrink:0,whiteSpace:"nowrap",
              boxShadow:`0 2px 6px ${PC.accent}50`}}>
            + New
          </button>
        )}
      </div>
      )}

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
            <div onClick={()=>openPatientProfile(activePatient)}
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
        <div className="pm-patient-bar" style={{background:"#ffffff",borderBottom:`1px solid ${PC.border}`,padding:"9px 24px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
          <span style={{fontSize:"0.8rem",color:PC.muted,fontWeight:500}}>No active patient — create or load a patient record to save assessments</span>
          <button onClick={createNewPatient} style={{padding:"5px 14px",background:`linear-gradient(135deg,${PC.accent}18,${PC.a2}12)`,border:`1px solid ${PC.accentBorder||PC.border}`,borderRadius:7,color:PC.accent,fontSize:"0.78rem",fontWeight:700,cursor:"pointer"}}>＋ New Patient</button>
        </div>
      )}

      <div className="pm-body" style={{display:"flex",flex:1,maxWidth:1400,margin:"0 auto",width:"100%"}}>

        {/* Desktop Sidebar */}
        <div className="pm-sidebar" style={{width:210,minWidth:210,borderRight:`1px solid ${PC.border}`,padding:"16px 0 10px",background:"#ffffff",position:"sticky",top:60,height:"calc(100vh - 60px)",overflowY:"auto"}}>
          <SidebarItems onNav={navTo}/>
        </div>

        {/* Main */}
        {/* overflowY was "auto" -- .pm-main has no height cap at any
            breakpoint (flex:1 alone), so it never actually overflows
            internally; body is always the real scrolling element (see the
            navTo() comment above mainScrollRef). A declared overflow-y:auto
            still claims the "nearest scrolling ancestor" slot for any
            position:sticky element nested inside it though, which silently
            broke every sticky assessment header (Ortho/Cardio/Neuro) since
            their sticky topbar bound to this inert box instead of body.
            overflow-x:clip (not hidden) so the visible y-axis doesn't get
            forced back to auto by the browser's overflow axis-pairing rule. */}
        <div className="pm-main" ref={mainScrollRef} style={{flex:1,overflowY:"visible",overflowX:"clip",minWidth:0,
          /* pm-mobile-hdr is hidden during a full-screen assessment (see
             isFullScreenAssessment) -- the assessment's own .topbar reads
             this same custom property to offset itself below that header
             (utils.jsx :root default, ~64px). With the header gone there's
             nothing to sit under, so this override zeroes it here so the
             topbar sticks flush to the real top instead of leaving a dead
             64px gap. */
          ...(isFullScreenAssessment ? {"--pm-mobile-hdr-h":"0px"} : {})
        }}>

          {currentSection && active !== "home" && active !== "treatment" && active !== "exercise" && active !== "tx_techniques" && active !== "physiofeed" && active !== "profile" && active !== "learn" && active !== "clinical" && active !== "posture" && (
          <div style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
              <div style={{width:38,height:38,background:PC.isDark?`linear-gradient(135deg,${PC.accent}15,${PC.a2}10)`:`linear-gradient(135deg,${PC.accent}10,${PC.a2}08)`,border:`1px solid ${PC.border}`,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.2rem",flexShrink:0}}>{currentSection.icon}</div>
              <div>
                <div style={{fontSize:"clamp(1rem,3vw,1.25rem)",fontWeight:800,letterSpacing:"-0.3px",color:PC.text,lineHeight:1.1}}>{currentSection.label}</div>
                {/* No hardcoded fallback here (2026-09-17, Aditi: "this
                    session page is old type") -- this was defaulting to
                    the literal string "Posture Screening & Education" for
                    EVERY section that doesn't define its own `desc` in
                    ALL_TESTS (sharedClinicalData.js), e.g. tx_sessions
                    (Session Log) and several others -- a leftover
                    placeholder that only ever made sense for the actual
                    Posture module, not a sensible generic default. Just
                    omit the line when there's nothing real to show. */}
                {currentSection.desc && (
                  <div style={{fontSize:"0.82rem",fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",color:PC.muted,marginTop:2}}>{currentSection.desc}</div>
                )}
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

          {/* PhysioFeed -- same deferred-mount/hidden-when-not-active pattern as
              Posture just above, NOT the currentSection/ALL_TESTS group map
              below (that map only renders whichever group belongs to the
              CURRENT `active` tab, so routing PhysioFeed through it meant it
              fully unmounted -- losing its MemoryRouter state, scroll
              position, whatever screen you were on -- every single time you
              left and came back. PhysioFeedEntry.jsx's own header comment
              already assumed "AppFull.jsx keeps every tab alive"; this is
              what actually makes that true for it. key={physioFeedResetKey}
              is the one intentional exception: bumped in navTo() only on a
              bare re-tap of an already-open PhysioFeed, forcing a fresh
              mount back to the feed home -- everything else (leaving to
              Clinical and coming back, a header search/bell/message jump)
              preserves whatever screen you were on. 2026-09-23, Aditi: "jab
              hum clinical pe jaate hain aur physio feed pe wapas aate hain
              to woh naye jaisa khulta hai... jab main physio feed pe click
              karu clinical ke baad to woh mujhe us purani screen pe le jaana
              chahiye jahan main kaam kar raha tha". */}
          {mountedTabs.has("physiofeed") && (
            <div className="pm-bleed" style={{display: active==="physiofeed" ? "block" : "none"}}>
              <Suspense fallback={<div style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading PhysioFeed…</div>}>
                <LazyPhysioFeedEntry key={physioFeedResetKey} jumpTo={active==="physiofeed"?navContext:undefined} backRef={physioFeedBackRef}/>
              </Suspense>
            </div>
          )}
          {active==="physiofeed" && !mountedTabs.has("physiofeed") && (
            <div className="pm-bleed" style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading PhysioFeed…</div>
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
              floating in a narrower column.
              Deferred-mount/hidden-when-not-active (2026-09-24, Aditi:
              "whatever page I left off it should be on that page until...
              I double click the clinical or go back") -- this used to be a
              plain `{active==="cardio_assessment" && (...)}` conditional,
              which fully UNMOUNTED the whole module (losing its internal
              wizard step -- see its own `useState(() => hasExisting ? 1 :
              0)` initializer) every time you so much as glanced at Learn or
              PhysioFeed and came back. Same fix, same reasoning as
              PhysioFeed's own deferred-mount comment just above. */}
          {mountedTabs.has("cardio_assessment") && (
            <div className="pm-bleed" style={{display: active==="cardio_assessment" ? "block" : "none"}}>
              <Suspense fallback={<TabFallback/>}><LazyCardioAssessment patientData={data} activePatientId={activePatientId} onSave={set} onNav={navTo} navContext={active==="cardio_assessment"?navContext:undefined}/></Suspense>
            </div>
          )}
          {active==="cardio_assessment" && !mountedTabs.has("cardio_assessment") && (
            <div className="pm-bleed"><TabLoader/></div>
          )}

          {/* Neurological Assessment -- standalone tool, same pattern and
              same reasons as Cardiopulmonary Assessment just above (own
              header comment in NeurologicalAssessment.jsx has the full
              explanation). Same deferred-mount fix as Cardiopulmonary. */}
          {mountedTabs.has("neuro_assessment") && (
            <div className="pm-bleed" style={{display: active==="neuro_assessment" ? "block" : "none"}}>
              <Suspense fallback={<TabFallback/>}><LazyNeuroAssessment patientData={data} activePatientId={activePatientId} onSave={set} onNav={navTo} navContext={active==="neuro_assessment"?navContext:undefined}/></Suspense>
            </div>
          )}
          {active==="neuro_assessment" && !mountedTabs.has("neuro_assessment") && (
            <div className="pm-bleed"><TabLoader/></div>
          )}

          {/* Ortho Assessment -- standalone tool, same pattern as
              Cardiopulmonary/Neurological Assessment above. (The old
              step-by-step Ortho "Screening Workflow" it replaced was
              removed 2026-09-25.) Same deferred-mount fix as above. */}
          {mountedTabs.has("ortho_new_assessment") && (
            <div className="pm-bleed" style={{display: active==="ortho_new_assessment" ? "block" : "none"}}>
              <Suspense fallback={<TabFallback/>}><LazyOrthoAssessmentNew patientData={data} activePatientId={activePatientId} onSave={set} onNav={navTo} navContext={active==="ortho_new_assessment"?navContext:undefined} requireAuth={requireAuth} entryMode={active==="ortho_new_assessment"?navContext.entryMode:undefined} resume={active==="ortho_new_assessment"?navContext.resume:undefined}/></Suspense>
            </div>
          )}
          {active==="ortho_new_assessment" && !mountedTabs.has("ortho_new_assessment") && (
            <div className="pm-bleed"><TabLoader/></div>
          )}

          {/* Full documented assessment report -- lives ONLY in Clinical
              (reached via "📄 View Report" on a patient row in
              PatientDatabase.jsx's patient list), per Aditi's explicit
              request not to duplicate this into Patient Profile or the
              sidebar. One continuous read-only document (not tabs/cards)
              for whichever of Cardio/Neuro that patient has recorded --
              see AssessmentReportView.jsx.
              Merges live in-session `data` over the flushed patient record
              the same way SpecialtyPatientProfile does just below, so
              edits made in THIS session show up here immediately instead
              of only after the next autosave flush. */}
          {active==="assessment_report" && (
            <div className="pm-bleed" style={{background:"#f8fafc",minHeight:"100dvh"}}>
              <AssessmentReportView
                patient={activePatient ? {...activePatient, data:{...activePatient.data, ...(activePatient.id===activePatientId?data:{})}} : null}
                onNav={navTo}
                onBack={()=>navTo("clinical")}
              />
            </div>
          )}

          {/* The one patient profile screen in the app (2026-09-02, Aditi:
              "remove old ortho patient profile totally") -- every patient
              (Cardio/Neuro/any Ortho pathway, or none) now opens here.
              Same live-data merge as the report view above. */}
          {active==="specialty_profile" && (
            <div className="pm-bleed" style={{background:"#f8fafc",minHeight:"100dvh"}}>
              <SpecialtyPatientProfile
                patient={activePatient ? {...activePatient, data:{...activePatient.data, ...(activePatient.id===activePatientId?data:{})}} : null}
                initialTab={profileTab||undefined}
                onNav={navTo}
                onBack={()=>{ setProfileTab(null); navTo("clinical"); }}
                onSaveField={(id,newData)=>{
                  setPatients(prev=>{
                    const updated = prev.map(p=>p.id===id?{...p,data:{...p.data,...newData},name:newData.dem_name||p.name,updatedAt:new Date().toISOString()}:p);
                    savePatientDB(updated, currentUser?.id);
                    return updated;
                  });
                  // CRITICAL (2026-09-05): the profile edits patients[] directly,
                  // but the active patient's in-memory `data` + its localStorage
                  // draft are a SEPARATE source of truth. If we don't mirror the
                  // edit into them, re-selecting the patient restores the STALE
                  // draft and the 2s autosave writes it back over patients[] --
                  // silently wiping Care Plan problems/goals/treatments/sessions
                  // saved from the profile. Keep all three in sync here.
                  if (id === activePatientId) {
                    setData(prev => {
                      const next = { ...prev, ...newData };
                      try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ pid: id, data: next })); } catch {}
                      return next;
                    });
                  }
                }}
                onOpenPosture={(p)=>{ selectPatient(p); navTo("posture"); }}
              />
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
                <HomeModule onNav={navTo} patients={patients} data={data} taskDB={taskDB} onNewPatient={createNewPatient} currentUser={currentUser} onStartAI={()=>startOrthoEntry("ai")}/>
              ):tests==="PHYSIOFEED_MODULE"?(
                // Actually rendered by the mountedTabs-gated block up near
                // Posture (see its own comment) so it stays mounted across
                // tab switches instead of losing state every time -- this
                // branch only exists so the group-header guard above still
                // recognizes the key; nothing to render here.
                null
              ):tests==="LEARN_MODULE"?(
                <Suspense fallback={<div style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading…</div>}>
                  <LazyLearnTabEntry key={learnResetKey} onNav={navTo}/>
                </Suspense>
              ):tests==="PROFILE_MODULE"?(
                <Suspense fallback={<div style={{textAlign:"center",padding:"48px 20px",color:"#6B7280"}}>Loading profile…</div>}>
                  <LazyProfileTabEntry onSignOut={onSignOut}/>
                </Suspense>
              ):tests==="CLINICAL_MODULE"?(
                // Same negative-margin full-bleed trick PhysioFeed uses just
                // above -- Clinical's own header/search/CTA want the full
                // tab width, not the standard pm-main content padding.
                <div className="pm-bleed">
                  {/* Clinical sub-nav (2026-09-10 redesign): Today / Patients /
                      Treatment / Assessment -- lenses on the same `patients`
                      array plus a dedicated, minimal "start a new assessment"
                      screen. "Today" is now the default landing view (Swiggy/
                      Instamart-inspired home). Header (title+tabs) and the
                      sub-tab content below are ONE rounded card -- lavender
                      on top, white below, zero gap at the seam -- so the
                      active tab's white background flows straight into the
                      content instead of reading as two disconnected blocks. */}
                  {(() => {
                    const todayCount = getTodaysPatients(patients).length;
                    const treatmentDue = patients.filter(p=>Array.isArray(p.data?.tx_sessions)&&p.data.tx_sessions.length>0).length;
                    const firstName = currentUser?.name || currentUser?.email?.split("@")[0] || null;
                    const SUBTABS = [
                      ["today","Today",Stethoscope,null,""],
                      ["assessment","Assess",ClipboardListIcon,null,""],
                      ["patients","Patients",UsersIcon,patients.length,""],
                      ["treatment","Treatment",PillIcon,treatmentDue,"due"],
                      ["posture","Posture",PersonStanding,null,""],
                    ];
                    return (
                      <div style={{background:"#fff",padding:"14px 14px 0"}}>
                        <div style={{borderRadius:20,boxShadow:"0 14px 30px rgba(187,107,227,.35)",overflow:"hidden"}}>
                          <div style={{background:"linear-gradient(135deg,#8f63f0 0%,#bb6be3 52%,#e77fc0 100%)",padding:"16px 16px 0"}}>
                            <div style={{marginBottom:14}}>
                              <div style={{fontSize:"1.05rem",fontWeight:800,color:"#fff"}}>Clinical <span style={{fontWeight:400,opacity:0.7}}>›</span></div>
                              <div style={{fontSize:"0.78rem",color:"rgba(255,255,255,.9)",marginTop:2}}>
                                {firstName ? `Dr ${firstName} · ` : ""}{todayCount} patient{todayCount===1?"":"s"} today
                              </div>
                            </div>
                            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
                              {SUBTABS.map(([k,label,Icon,badge,badgeSuffix])=>{
                                const active = clinicalSubTab===k;
                                return (
                                  <button key={k} onClick={()=>k==="posture" ? navTo("posture") : setClinicalSubTab(k)} type="button"
                                    style={{position:"relative",display:"flex",flexDirection:"column",alignItems:"center",
                                      gap:6,justifyContent:"flex-end",cursor:"pointer",fontFamily:"inherit",
                                      border:"none",flex:"0 0 auto",
                                      borderRadius:active?"16px 16px 0 0":0,
                                      padding:active?"12px 16px 14px":"0 0 12px",
                                      background:active?"#fff":"transparent",
                                      boxShadow:"none"}}>
                                    {badge > 0 && (
                                      <span style={{position:"absolute",top:-8,right:-4,fontSize:"0.72rem",fontWeight:800,
                                        background:"#10B981",color:"#fff",padding:"2px 8px",borderRadius:999,
                                        whiteSpace:"nowrap"}}>{badge}{badgeSuffix?` ${badgeSuffix}`:""}</span>
                                    )}
                                    <span style={{width:active?32:30,height:active?32:30,borderRadius:active?11:"50%",
                                      background:"#fff",boxShadow:active?"none":"0 2px 6px rgba(0,0,0,.2)",
                                      display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                                      <Icon size={active?15:13} color={active?CLINICAL_PASTEL.lavender.fg:"#7C3AED"} strokeWidth={2.2}/>
                                    </span>
                                    <span style={{fontSize:active?"0.78rem":"0.68rem",fontWeight:700,
                                      color:active?"#1A1A2E":"rgba(255,255,255,.88)",whiteSpace:"nowrap"}}>{label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div style={{background:"#fff"}}>
                            {clinicalSubTab==="today" ? (
                              <TherapistDashboardModule patients={patients} data={data} onNav={navTo} onProfile={(p)=>openPatientProfile(p)} onQuickStart={(p)=>{ selectPatient(p); navTo("ortho_new_assessment"); }} onStartAI={()=>startOrthoEntry("ai")} currentUser={currentUser} onSignOut={onSignOut}/>
                            ) : clinicalSubTab==="treatment" ? (
                              <TreatmentCaseloadPanel patients={patients}
                                onContinue={(p)=>openPatientProfile(p, "sessions")}
                                onProfile={(p)=>openPatientProfile(p, "treatment")}
                                // 2026-09-02, Aditi: "in treatment we can remove the
                                // old treatments... delete if we want to delete" --
                                // this list had no way to clear a patient's logged
                                // treatment sessions (only Continue/Profile), so a
                                // finished/old case just stayed in "Ongoing Treatment"
                                // forever. Clears tx_sessions only -- the patient
                                // record itself (demographics, assessment, etc.)
                                // isn't touched, they just drop off this caseload
                                // list; deleting the whole patient is a separate,
                                // already-existing action on the Patients tab.
                                onDeleteTreatment={(p)=>{
                                  setPatients(prev=>{
                                    const updated = prev.map(x=>x.id===p.id?{...x,data:{...x.data,tx_sessions:[]},updatedAt:new Date().toISOString()}:x);
                                    savePatientDB(updated, currentUser?.id);
                                    return updated;
                                  });
                                  if (p.id===activePatientId) set("tx_sessions", []);
                                }}/>
                            ) : clinicalSubTab==="assessment" ? (
                              <div style={{padding:"22px 18px 24px"}}>
                                <div style={{fontWeight:900,fontSize:"1.15rem",color:"#111827",marginBottom:4}}>Assessment</div>
                                <div style={{fontSize:"0.82rem",color:"#6B7280",marginBottom:20}}>Pick a specialty to start a new assessment.</div>
                                {/* Speciality cards, same white-card + tinted-icon-badge
                                    look as the Patients tab's "By Speciality" grid
                                    (PatientDatabase.jsx's SPECIALTY_CARD_META) instead
                                    of a flat emoji glyph on a tinted square.
                                    gridTemplateColumns uses minmax/auto-fit rather than
                                    a literal "1fr 1fr" -- utils.jsx has a global mobile
                                    override that force-collapses any inline grid style
                                    containing that exact substring to 1 column below
                                    400px width. */}
                                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:10,marginBottom:18}}>
                                  {STREAMS.filter(s=>["ortho_new","neuro","cardio","sports"].includes(s.id)).map(st=>{
                                    const clickable = st.live || st.id === "cardio";
                                    const { Icon, bg } = STREAM_ICONS[st.id];
                                    return (
                                      <button key={st.id} type="button"
                                        onClick={()=>{ if(!clickable) return; startSpecialty(st); }}
                                        style={{position:"relative",textAlign:"left",display:"flex",flexDirection:"column",
                                          borderRadius:18,cursor:clickable?"pointer":"not-allowed",fontFamily:"inherit",
                                          border:`1.5px solid ${clickable?"#EEEDF5":"#E5E7EB"}`,
                                          background:"#fff",padding:"16px 14px",opacity:clickable?1:0.6}}>
                                        {st.id==="ortho_new" && <span style={{position:"absolute",top:12,right:12,display:"inline-flex",alignItems:"center",gap:3,fontSize:"0.6rem",fontWeight:800,padding:"3px 7px",borderRadius:10,background:"linear-gradient(135deg,#7c3aed,#a855f7)",color:"#fff",letterSpacing:"0.03em"}}><Sparkles size={10} strokeWidth={2.2}/>AI</span>}
                                        {!clickable && <span style={{position:"absolute",top:12,right:12,fontSize:"0.6rem",fontWeight:800,padding:"2px 7px",borderRadius:8,background:"#E5E7EB",color:"#9CA3AF"}}>SOON</span>}
                                        <div style={{width:44,height:44,borderRadius:14,background:bg,
                                          display:"flex",alignItems:"center",justifyContent:"center"}}>
                                          <Icon size={22} color={st.color} strokeWidth={1.75}/>
                                        </div>
                                        <span style={{fontWeight:800,fontSize:"0.92rem",color:clickable?"#111827":"#9CA3AF",marginTop:12}}>{st.id==="ortho_new"?"Ortho":st.label}</span>
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
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ):tests==="TREATMENT_MODULE"?(
                <>
                {(()=>{
                  const isMobile=window.innerWidth<1024;
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
              ):null}
            </div>
          ))}
          <div style={{height:60}}/>
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) — always visible. Old Menu/Patient/Assess/Adv./
          Treat/Docs quick-tabs retired -- every section they linked to is
          still reachable via the full section drawer (SidebarItems), which
          "Clinical" now opens directly. Nothing is actually removed from the
          app, just this one redundant quick-access bar. ── */}
      <nav className="pm-bnav" ref={bnavRef} aria-label="Main navigation">
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
            const outerKeys = [...OUTER_TAB_KEYS];
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
              // Tapping Clinical FROM Home/PhysioFeed/Learn/Profile resumes
              // wherever Clinical was left (its landing page, or an
              // in-progress assessment step/wizard) instead of always
              // jumping to the landing page. Tapping it again while already
              // inside Clinical (isActive) is a deliberate re-tap -- that
              // still resets to the landing page, same "re-tap to go home"
              // pattern already used for Learn/PhysioFeed above.
              const handleClick = () => {
                if (!isClinical) { navTo(item.key); return; }
                if (isActive) { navTo("clinical"); return; }
                const { key, ctx } = lastClinicalNavRef.current;
                navTo(key, ctx);
              };
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
  // Public, no-auth-required routes for the App Store / Play Store listing
  // forms and web crawlers -- these must resolve before any session check
  // so /privacy and /terms work even for a signed-out visitor with no
  // account, hitting the URL directly (see vercel.json for the rewrite that
  // makes a direct navigation to these paths reach index.html at all).
  const publicPath = typeof window !== "undefined" ? window.location.pathname.replace(/\/+$/, "") : "";
  if (publicPath === "/privacy") {
    return <PrivacyPolicy onClose={() => { window.location.href = "/"; }} />;
  }
  if (publicPath === "/terms") {
    return <TermsOfService onClose={() => { window.location.href = "/"; }} />;
  }

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

  // ── Local-cache encryption key lifecycle ──────────────────────────────
  // The AES key that protects the local patient cache (see localCrypto.js /
  // PatientDatabase.jsx) is derived from the session's access token and
  // held only in memory. On a genuinely new sign-in we must decrypt the
  // existing local cache (hydrateLocalCache) BEFORE AppInner's synchronous
  // `useState(() => loadPatientDB(...))` runs, or that first read sees an
  // empty placeholder instead of the real cached list. `keyHydrated` gates
  // that. On sign-out, wipe the key and the decrypted cache from memory.
  const hydratedUserIdRef = useRef(null);
  const [keyHydrated, setKeyHydrated] = useState(false);
  useEffect(() => {
    if (!session) {
      clearSessionKey();
      clearPatientCache();
      hydratedUserIdRef.current = null;
      setKeyHydrated(false);
      return;
    }
    const uid = session.user?.id;
    if (hydratedUserIdRef.current === uid) {
      // Same user as last time this ran (e.g. a token refresh) -- keep the
      // in-memory key current, but no need to re-show the loading gate or
      // redo the (already-done) cache hydration.
      setSessionKey(session.access_token);
      return;
    }
    hydratedUserIdRef.current = uid;
    setKeyHydrated(false);
    let active = true;
    (async () => {
      await setSessionKey(session.access_token);
      await hydrateLocalCache(uid);
      if (active) setKeyHydrated(true);
    })();
    return () => { active = false; };
  }, [session]);

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
          <InstallPrompt currentUser={null} />
        </ErrorBoundary>
      );
    }
    // AuthScreen's onAuth is largely redundant with onAuthStateChange above
    // (Supabase fires SIGNED_IN either way) but harmless to pass through.
    return <AuthScreen onAuth={() => {}} onTryGuest={() => setGuestMode(true)} />;
  }

  if (!keyHydrated) {
    // Brief gate on a genuinely new sign-in while the local patient cache
    // is decrypted (see the effect above) -- not shown on token refreshes.
    return (
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#F7F7F8"}}>
        <TabLoader />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AppInner currentUser={session.user} onSignOut={() => supabase.auth.signOut()} />
      <InstallPrompt currentUser={session.user} />
    </ErrorBoundary>
  );
}
