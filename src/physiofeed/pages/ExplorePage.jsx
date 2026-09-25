import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Briefcase, ChevronRight, FileText, SlidersHorizontal } from "lucide-react";
import { OPPORTUNITY_CATEGORIES } from "../data/opportunitiesMock.js";
import * as db from "../data/db.js";
import OpportunityCard from "../components/opportunities/OpportunityCard.jsx";
import OpportunityDetail from "../components/opportunities/OpportunityDetail.jsx";
import WorkshopDetail from "../components/opportunities/WorkshopDetail.jsx";
import OpportunityChat from "../components/opportunities/OpportunityChat.jsx";
import CreateOpportunityTypePicker from "../components/opportunities/CreateOpportunityTypePicker.jsx";
import WorkshopWizard from "../components/opportunities/wizard/WorkshopWizard.jsx";
import ApplicationOpportunityForm from "../components/opportunities/wizard/ApplicationOpportunityForm.jsx";
import MyPostingsPage from "../components/opportunities/MyPostingsPage.jsx";
import MyOpportunitiesPage from "../components/opportunities/MyOpportunitiesPage.jsx";
import ApplicantPipeline from "../components/opportunities/ApplicantPipeline.jsx";
import ApplicantProfileSheet from "../components/opportunities/ApplicantProfileSheet.jsx";
import ApplicantChatModal from "../components/opportunities/ApplicantChatModal.jsx";

// Explore -> Opportunities board (2026-09-21, Aditi's brief + mockups: jobs,
// internships, workshops and research collaborations for physiotherapists).
// Replaces the previous "trending topics / popular posts" Explore page --
// this is what she asked to "put in Explore".
//
// P4/P5 (2026-09-22): this was front-end state only -- posting a job
// pushed an object into useState and it vanished on reload, and applying
// flipped a boolean nobody else could see. Everything on this page now
// goes through db.js (`opportunities` / `applications` / `saved_items`).
// The UI itself is unchanged; only where its data comes from moved.
//
// The Recruiter / Poster Dashboard (2026-09-22, same brief + real mockup
// references) lives here too: "My Postings" -> ApplicantPipeline ->
// ApplicantProfileSheet, now reading real applicants and writing real
// status changes.
export default function ExplorePage() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pipelineApplicants, setPipelineApplicants] = useState([]);
  const [savedIds, setSavedIds] = useState([]);
  const [savedOpportunities, setSavedOpportunities] = useState([]); // full objects, for My Opportunities' Saved tab
  const [myApplications, setMyApplications] = useState([]);
  const [actionError, setActionError] = useState(null);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  // Basic filter sheet (Phase G, 2026-09-25) -- client-side over the
  // already-loaded board, no server-side search function needed at this size.
  const [filterOpen, setFilterOpen] = useState(false);
  const [priceFilter, setPriceFilter] = useState("all"); // all | free | paid (workshops only)
  const [modeFilter, setModeFilter] = useState("all"); // all | Online | In-person | Hybrid
  const [dateFilter, setDateFilter] = useState("all"); // all | week | month
  const [active, setActive] = useState(null); // the opportunity object, or null = hub
  const [chatFor, setChatFor] = useState(null); // opportunity being messaged about, or null
  // "+ Post" now opens a type picker first (2026-09-24) -- Workshop hands
  // off to its own wizard (WorkshopWizard.jsx); Job/Internship/Collaboration
  // share ApplicationOpportunityForm, parameterized by modalType.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modalType, setModalType] = useState(null); // "job" | "internship" | "collaboration" | null
  const [workshopOpen, setWorkshopOpen] = useState(false);
  // Edit (Phase D, 2026-09-25): reopens the same wizard/form as create, just
  // pre-filled and pointed at updateOpportunity instead -- editingOpp's own
  // `type` picks the wizard directly, skipping the type picker entirely.
  const [editingOpp, setEditingOpp] = useState(null);
  const postOpen = pickerOpen || !!modalType || workshopOpen || !!editingOpp; // any create/edit flow open, for FAB-hiding below

  const openCreateFlow = () => setPickerOpen(true);
  const closeCreateFlow = () => { setPickerOpen(false); setModalType(null); setWorkshopOpen(false); setEditingOpp(null); };
  const pickCreateType = (type) => {
    setPickerOpen(false);
    if (type === "workshop") setWorkshopOpen(true);
    else setModalType(type);
  };
  const openEditFlow = (opp) => { setMyPostingsOpen(false); setEditingOpp(opp); };

  const [myPostingsOpen, setMyPostingsOpen] = useState(false);
  const [myAppsOpen, setMyAppsOpen] = useState(false);

  // P6 deep links. A notification can't route to an application directly --
  // these sub-views are local state, not routes -- so getNotifications()
  // points at /explore?view=postings|applications and this opens it.
  const [searchParams] = useSearchParams();
  const deepLinkView = searchParams.get("view");
  useEffect(() => {
    if (deepLinkView === "applications") { setMyAppsOpen(true); setMyPostingsOpen(false); }
    else if (deepLinkView === "postings") { setMyPostingsOpen(true); setMyAppsOpen(false); }
  }, [deepLinkView]);

  // P8 deep link. Search results route to /explore?opp=<id>; the detail
  // screen is local state here too, and the board is loaded async, so this
  // waits for `opportunities` rather than firing once on mount. Acted on
  // once per id so a later Back to the hub isn't yanked straight back in.
  const deepLinkOpp = searchParams.get("opp");
  const handledOpp = useRef(null);
  useEffect(() => {
    if (!deepLinkOpp || handledOpp.current === deepLinkOpp || !opportunities.length) return;
    const match = opportunities.find((o) => String(o.id) === deepLinkOpp);
    if (!match) return;
    handledOpp.current = deepLinkOpp;
    setActive(match);
  }, [deepLinkOpp, opportunities]);

  const [pipelineFor, setPipelineFor] = useState(null); // opportunity whose applicants are being reviewed
  const [profileSheetId, setProfileSheetId] = useState(null); // applicant id, dossier open
  const [chatModalId, setChatModalId] = useState(null); // applicant id, poster-side chat open

  // The FAB floats fixed above the card list (bottom-right) so it's always
  // reachable while scrolling, but that means whichever card's Apply/Register
  // button (bottom-right of the card-foot row, same corner) scrolls under it
  // becomes covered and unclickable. Rather than guess a scroll offset that's
  // "safe", measure the real geometry: hide the FAB whenever its rect would
  // actually overlap a rendered CTA button, re-checked on every scroll/resize
  // and whenever the list itself changes (category/search).
  const fabRef = useRef(null);
  const gridRef = useRef(null);
  const [fabHidden, setFabHidden] = useState(false);

  // These sub-views are swapped by local state, not by the router (the URL
  // stays "/explore" throughout), so ScrollToTop.jsx's route-change effect
  // never sees them -- tapping a card/button used to open the new view
  // wherever the hub's list had been scrolled to (2026-09-22, Aditi: "it
  // takes me to the midsection... I want it to take me to the top").
  const view = chatFor ? "chat" : pipelineFor ? "pipeline" : myPostingsOpen ? "myPostings" : myAppsOpen ? "myApps" : active ? "detail" : "hub";
  useEffect(() => {
    try { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; window.scrollTo(0, 0); } catch {}
  }, [view]);

  // Board + your saves + your applications, all real (P4/P5). Saved
  // opportunities' full objects (Phase G) are fetched alongside everything
  // else -- getSavedOpportunities() existed since Phase A but had no caller
  // until the Saved tab needed real cards instead of just the id list.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [opps, saves, apps, savedOpps] = await Promise.all([
        db.getOpportunities(), db.getSavedOpportunityIds(), db.getMyApplications(), db.getSavedOpportunities(),
      ]);
      if (cancelled) return;
      setOpportunities(opps);
      setSavedIds(saves);
      setMyApplications(apps);
      setSavedOpportunities(savedOpps);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  // Applicants are fetched per listing when its pipeline opens, rather
  // than all up front -- only the creator can read them, and most people
  // never open this side of the board at all.
  useEffect(() => {
    if (!pipelineFor) { setPipelineApplicants([]); return; }
    let cancelled = false;
    (async () => {
      const list = await db.getApplicantsForOpportunity(pipelineFor.id);
      if (!cancelled) setPipelineApplicants(list);
    })();
    return () => { cancelled = true; };
  }, [pipelineFor]);

  const hasActiveFilters = priceFilter !== "all" || modeFilter !== "all" || dateFilter !== "all";
  const clearFilters = () => { setPriceFilter("all"); setModeFilter("all"); setDateFilter("all"); };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      // Phase F (2026-09-25): reads lifecycleStatus, not the coarse .status
      // (which lumped closed+cancelled together and had no idea "expired"
      // existed) -- closed/cancelled stay off the board same as before,
      // but expired now stays ON it, with OpportunityCard's own badge/
      // disabled-CTA doing the explaining instead of quietly vanishing.
      if (o.lifecycleStatus === "closed" || o.lifecycleStatus === "cancelled") return false;
      if (category !== "all" && o.type !== category) return false;
      // Price only means anything on a workshop (the only type with a real
      // Free/Paid fee) -- leave every other type alone rather than hiding
      // every job the moment someone picks "Free".
      if (priceFilter !== "all" && o.type === "workshop") {
        const free = o.fee === "Free";
        if (priceFilter === "free" && !free) return false;
        if (priceFilter === "paid" && free) return false;
      }
      // Mode (Online/In-person/Hybrid) lives on workshops as `.mode` and on
      // collaborations as `.locationType` -- a type with neither (job,
      // internship) just isn't affected by this filter.
      if (modeFilter !== "all") {
        const mode = o.mode || o.locationType;
        if (mode && mode !== modeFilter) return false;
      }
      if (dateFilter !== "all") {
        const iso = /^\d{4}-\d{2}-\d{2}$/.test(o.date || "") ? o.date : o.deadline;
        if (iso) {
          const days = (new Date(`${iso}T00:00:00`) - new Date()) / 86400000;
          const withinWeek = days >= -1 && days <= 7;
          const withinMonth = days >= -1 && days <= 31;
          if (dateFilter === "week" && !withinWeek) return false;
          if (dateFilter === "month" && !withinMonth) return false;
        }
      }
      if (!q) return true;
      return o.title.toLowerCase().includes(q) || o.org.toLowerCase().includes(q) || (o.location || "").toLowerCase().includes(q) || o.tags?.some((t) => t.toLowerCase().includes(q));
    });
  }, [opportunities, category, query, priceFilter, modeFilter, dateFilter]);

  const myPostings = useMemo(() => opportunities.filter((o) => o.postedByMe), [opportunities]);
  const appliedIds = useMemo(() => new Set(myApplications.map((a) => String(a.opportunityId))), [myApplications]);
  const isSaved = (opp) => savedIds.includes(String(opp?.id));

  // My Opportunities' four tabs (Phase G) -- an item's home is decided by
  // status first (past beats everything else) and by source second
  // (workshop registration vs. everything-else application vs. saved).
  const isPastOpp = (opp) => !opp || ["closed", "expired", "cancelled"].includes(opp.lifecycleStatus);
  const registeredItems = useMemo(() => myApplications.filter((a) => a.opportunity?.type === "workshop" && !isPastOpp(a.opportunity)), [myApplications]);
  const applicationItems = useMemo(() => myApplications.filter((a) => a.opportunity?.type !== "workshop" && !isPastOpp(a.opportunity)), [myApplications]);
  const pastApplicationItems = useMemo(() => myApplications.filter((a) => isPastOpp(a.opportunity)), [myApplications]);
  const savedActiveItems = useMemo(() => savedOpportunities.filter((o) => !isPastOpp(o)), [savedOpportunities]);
  const pastSavedItems = useMemo(() => savedOpportunities.filter((o) => isPastOpp(o)), [savedOpportunities]);

  useEffect(() => {
    if (view !== "hub" || postOpen) return;
    const GAP = 8; // px breathing room so the FAB never sits flush against a CTA either

    const overlapsAnyCta = () => {
      const fab = fabRef.current;
      const grid = gridRef.current;
      if (!fab || !grid) return false;
      const f = fab.getBoundingClientRect();
      return [...grid.querySelectorAll("[data-opp-cta]")].some((cta) => {
        const r = cta.getBoundingClientRect();
        return f.left - GAP < r.right && f.right + GAP > r.left && f.top - GAP < r.bottom && f.bottom + GAP > r.top;
      });
    };

    let settleTimer;
    const recheck = () => setFabHidden(overlapsAnyCta());
    const onScroll = () => {
      setFabHidden(true); // hide immediately while in motion, then re-measure once it settles
      clearTimeout(settleTimer);
      settleTimer = setTimeout(recheck, 120);
    };

    recheck();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", recheck);
    return () => {
      clearTimeout(settleTimer);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", recheck);
    };
  }, [view, postOpen, filtered]);

  const openOpportunity = (opp) => { setChatFor(null); setActive(opp); };
  const closeDetail = () => setActive(null);
  const openChat = (opp) => setChatFor(opp);
  const closeChat = () => setChatFor(null);

  // Every create form's Save Draft / Publish, funneled through
  // createOpportunity(fields, {publish}) -- or, when editingOpp is set,
  // through updateOpportunity(id, fields, {publish}) instead (Phase D,
  // 2026-09-25). A draft won't come back on the next getOpportunities()
  // fetch (that query excludes drafts -- My Postings' own "show my drafts"
  // fetch is a later piece of work), but updating/inserting into local
  // state here means it shows up immediately, this session, rather than
  // the form closing with no visible trace that anything saved. Left
  // uncaught here on purpose -- WorkshopWizard/ApplicationOpportunityForm
  // each keep their own try/catch around this call so the error renders
  // inside the still-open form instead of vanishing with it.
  const submitFromWizard = async (fields, { publish }) => {
    if (editingOpp) {
      // Only carry a draft-in-progress over the publish line here; a
      // listing that's already published/closed/cancelled keeps its status
      // exactly as-is -- Phase E's own actions own every other transition.
      const shouldPublish = editingOpp.rawStatus === "draft" && publish;
      const updated = await db.updateOpportunity(editingOpp.id, fields, { publish: shouldPublish });
      setOpportunities((prev) => prev.map((o) => o.id === updated.id ? updated : o));
    } else {
      const saved = await db.createOpportunity(fields, { publish });
      setOpportunities((prev) => [saved, ...prev]);
    }
    closeCreateFlow();
  };

  const deleteListing = async (oppId) => {
    const removed = opportunities.find((o) => o.id === oppId);
    // Optimistic -- the only failure mode is RLS rejecting a listing that
    // isn't yours, which this page never offers in the first place.
    setOpportunities((prev) => prev.filter((o) => o.id !== oppId));
    try {
      await db.deleteOpportunity(oppId);
    } catch (e) {
      if (removed) setOpportunities((prev) => [...prev, removed]);
      setActionError(e.message || "Couldn't delete that listing.");
    }
  };

  // MyPostingsPage's per-status action menu (Phase E, 2026-09-25) --
  // publish/close/reopen/cancel all write one column each and don't return
  // the updated row, so the optimistic patch below is applied by hand
  // instead of merging in a fetched object (same trade-off deleteListing
  // above already makes). Duplicate is the odd one out: it inserts a new
  // row and does return it, so that one just prepends like createFromWizard.
  const runListingAction = async (oppId, action, dbCall, optimisticPatch) => {
    const current = opportunities.find((o) => o.id === oppId);
    setOpportunities((prev) => prev.map((o) => o.id === oppId ? { ...o, ...optimisticPatch } : o));
    try {
      await dbCall(oppId);
    } catch (e) {
      setOpportunities((prev) => prev.map((o) => o.id === oppId ? current : o));
      setActionError(e.message || `Couldn't ${action} that listing.`);
    }
  };

  const publishListing = (oppId) => runListingAction(oppId, "publish", db.publishOpportunity, {
    rawStatus: "published", status: "active", lifecycleStatus: "published", publishedAt: new Date().toISOString(),
  });
  const closeListing = (oppId) => runListingAction(oppId, "close", db.closeOpportunity, {
    rawStatus: "closed", status: "closed", lifecycleStatus: "closed", closedAt: new Date().toISOString(),
  });
  const reopenListing = (oppId) => runListingAction(oppId, "reopen", db.reopenOpportunity, {
    rawStatus: "published", status: "active", lifecycleStatus: "published", closedAt: undefined,
  });
  const cancelListing = (oppId) => runListingAction(oppId, "cancel", db.cancelOpportunity, {
    rawStatus: "cancelled", status: "closed", lifecycleStatus: "cancelled", cancelledAt: new Date().toISOString(),
  });

  const duplicateListing = async (oppId) => {
    setActionError(null);
    try {
      const copy = await db.duplicateOpportunity(oppId);
      setOpportunities((prev) => [copy, ...prev]);
    } catch (e) {
      setActionError(e.message || "Couldn't duplicate that listing.");
    }
  };

  const viewFromPostings = (opp) => { setMyPostingsOpen(false); openOpportunity(opp); };

  const toggleSave = async (opp) => {
    setActionError(null);
    try {
      const nowSaved = await db.toggleSaveOpportunity(opp.id);
      setSavedIds((prev) => nowSaved ? [...prev, String(opp.id)] : prev.filter((id) => id !== String(opp.id)));
      // Keep the Saved tab's full objects in sync the same way -- opp is
      // already in the shape getSavedOpportunities() itself returns.
      setSavedOpportunities((prev) => nowSaved
        ? [opp, ...prev.filter((o) => o.id !== opp.id)]
        : prev.filter((o) => o.id !== opp.id));
    } catch (e) {
      setActionError(e.message || "Couldn't save that.");
    }
  };

  const refreshApplications = async () => setMyApplications(await db.getMyApplications());

  const openPipeline = (opp) => { setMyPostingsOpen(false); setPipelineFor(opp); };
  const closePipeline = () => { setPipelineFor(null); setProfileSheetId(null); setChatModalId(null); };

  // Tapping the status an applicant already has clears it back to
  // "applied" -- same toggle behaviour the local-state version had, so
  // Pass/Shortlist still act like toggles rather than one-way doors.
  const setApplicantStatus = async (applicationId, status) => {
    const current = pipelineApplicants.find((a) => a.id === applicationId);
    const next = current?.status === status ? "new" : status;
    setPipelineApplicants((prev) => prev.map((a) => a.id === applicationId ? { ...a, status: next } : a));
    try {
      await db.setApplicationStatus(applicationId, next);
    } catch (e) {
      setPipelineApplicants((prev) => prev.map((a) => a.id === applicationId ? { ...a, status: current.status } : a));
      setActionError(e.message || "Couldn't update that applicant.");
    }
  };

  const inviteApplicant = (applicationId) => setApplicantStatus(applicationId, "shortlisted");
  const profileSheetApplicant = profileSheetId ? pipelineApplicants.find((a) => a.id === profileSheetId) : null;
  const chatModalApplicant = chatModalId ? pipelineApplicants.find((a) => a.id === chatModalId) : null;

  if (chatFor) {
    return (
      <main className="flex-1 min-w-0">
        <OpportunityChat opp={chatFor} onBack={closeChat} />
      </main>
    );
  }

  if (pipelineFor) {
    return (
      <>
        <ApplicantPipeline
          opp={pipelineFor}
          applicants={pipelineApplicants}
          onBack={closePipeline}
          onOpenApplicant={(a) => { if (pipelineFor.type !== "workshop") setProfileSheetId(a.id); }}
          onPass={(id) => setApplicantStatus(id, "passed")}
          onShortlist={(id) => setApplicantStatus(id, "shortlisted")}
          onChat={(a) => setChatModalId(a.id)}
          registrantsOnly={pipelineFor.type === "workshop"}
        />
        {profileSheetApplicant && (
          <ApplicantProfileSheet
            applicant={profileSheetApplicant}
            opp={pipelineFor}
            onClose={() => setProfileSheetId(null)}
            onPass={(id) => setApplicantStatus(id, "passed")}
            onShortlist={(id) => setApplicantStatus(id, "shortlisted")}
            onMessage={(a) => { setProfileSheetId(null); setChatModalId(a.id); }}
          />
        )}
        {chatModalApplicant && (
          <ApplicantChatModal
            applicant={chatModalApplicant}
            opp={pipelineFor}
            onClose={() => setChatModalId(null)}
            onInvite={(id) => inviteApplicant(id)}
          />
        )}
      </>
    );
  }

  if (myPostingsOpen) {
    return (
      <MyPostingsPage
        postings={myPostings}
        onBack={() => setMyPostingsOpen(false)}
        onNewPost={() => { setMyPostingsOpen(false); openCreateFlow(); }}
        onViewApplicants={openPipeline}
        onView={viewFromPostings}
        onEdit={openEditFlow}
        onPublish={publishListing}
        onClose={closeListing}
        onReopen={reopenListing}
        onCancel={cancelListing}
        onDuplicate={duplicateListing}
        onDelete={deleteListing}
      />
    );
  }

  if (myAppsOpen) {
    return (
      <MyOpportunitiesPage
        registeredItems={registeredItems}
        applicationItems={applicationItems}
        savedItems={savedActiveItems}
        pastApplicationItems={pastApplicationItems}
        pastSavedItems={pastSavedItems}
        onBack={() => setMyAppsOpen(false)}
        onOpen={(opp) => { setMyAppsOpen(false); openOpportunity(opp); }}
      />
    );
  }

  if (active) {
    return (
      <main className="flex-1 min-w-0">
        {active.type === "workshop" ? (
          <WorkshopDetail
            opp={active}
            onBack={closeDetail}
            registered={appliedIds.has(String(active.id))}
            onRegistered={refreshApplications}
            onMessage={openChat}
          />
        ) : (
          <OpportunityDetail
            opp={active}
            onBack={closeDetail}
            onMessage={openChat}
            applied={appliedIds.has(String(active.id))}
            onApplied={refreshApplications}
            saved={isSaved(active)}
            onToggleSave={toggleSave}
          />
        )}
      </main>
    );
  }

  return (
    <main className="flex-1 min-w-0 relative">
      <div className="mb-5">
        <h1 className="pf-font-head text-2xl font-extrabold text-[#2B2140] mb-1">Explore</h1>
        <p className="pf-font-body text-sm text-[#8A7FA3]">Jobs, internships, workshops and collaborations for physiotherapists.</p>
      </div>

      <button
        type="button"
        onClick={() => setMyPostingsOpen(true)}
        className="w-full flex items-center gap-3 bg-white border-2 border-[#F1EEFB] rounded-2xl px-4 py-3 mb-4 hover:bg-[#FBFAFF] transition"
      >
        <span className="w-9 h-9 rounded-full bg-[#F7F5FF] flex items-center justify-center shrink-0"><Briefcase size={16} className="text-[#6E5CC7]" /></span>
        <span className="min-w-0 flex-1 text-left">
          <span className="pf-font-head block text-sm font-bold text-[#2B2140]">My Postings</span>
          <span className="pf-font-body block text-xs text-[#8A7FA3]">Manage your listings and review applicants</span>
        </span>
        {myPostings.length > 0 && <span className="pf-font-head text-xs font-bold text-white bg-[#6E5CC7] rounded-full px-2 py-0.5 shrink-0">{myPostings.length}</span>}
        <ChevronRight size={16} className="text-[#D9D2F0] shrink-0" />
      </button>

      <button
        type="button"
        onClick={() => setMyAppsOpen(true)}
        className="w-full flex items-center gap-3 bg-white border-2 border-[#F1EEFB] rounded-2xl px-4 py-3 mb-4 hover:bg-[#FBFAFF] transition"
      >
        <span className="w-9 h-9 rounded-full bg-[#F7F5FF] flex items-center justify-center shrink-0"><FileText size={16} className="text-[#6E5CC7]" /></span>
        <span className="min-w-0 flex-1 text-left">
          <span className="pf-font-head block text-sm font-bold text-[#2B2140]">My Opportunities</span>
          <span className="pf-font-body block text-xs text-[#8A7FA3]">Registered, applied, saved and past</span>
        </span>
        {(registeredItems.length + applicationItems.length + savedActiveItems.length) > 0 && (
          <span className="pf-font-head text-xs font-bold text-white bg-[#6E5CC7] rounded-full px-2 py-0.5 shrink-0">
            {registeredItems.length + applicationItems.length + savedActiveItems.length}
          </span>
        )}
        <ChevronRight size={16} className="text-[#D9D2F0] shrink-0" />
      </button>

      {actionError && <p className="pf-font-body text-xs text-rose-600 mb-3">{actionError}</p>}

      <div className="flex items-center gap-2 mb-3.5">
        <div className="flex-1 flex items-center gap-2 bg-[#F7F5FF] border-2 border-[#EFE9FF] rounded-2xl px-3.5 h-11">
          <Search size={16} className="text-[#8A7FA3] shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search opportunities, clinics, cities…"
            className="pf-font-body bg-transparent text-sm outline-none w-full placeholder:text-[#A79CC4] text-[#2B2140]"
          />
        </div>
        <button
          type="button"
          onClick={() => setFilterOpen((v) => !v)}
          aria-expanded={filterOpen}
          aria-label="Filters"
          className={`shrink-0 w-11 h-11 rounded-2xl border-2 flex items-center justify-center transition-colors ${filterOpen || hasActiveFilters ? "bg-[#FFB020] border-[#FFB020] text-[#3A2A00]" : "bg-white border-[#F1EEFB] text-[#6E5CC7]"}`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {filterOpen && (
        <div className="bg-white border-2 border-[#F1EEFB] rounded-2xl p-3.5 mb-3.5 space-y-3">
          <FilterRow label="Price (workshops)" value={priceFilter} onChange={setPriceFilter} options={[{ key: "all", label: "Any" }, { key: "free", label: "Free" }, { key: "paid", label: "Paid" }]} />
          <FilterRow label="Mode" value={modeFilter} onChange={setModeFilter} options={[{ key: "all", label: "Any" }, { key: "Online", label: "Online" }, { key: "In-person", label: "In-person" }, { key: "Hybrid", label: "Hybrid" }]} />
          <FilterRow label="When" value={dateFilter} onChange={setDateFilter} options={[{ key: "all", label: "Any time" }, { key: "week", label: "This week" }, { key: "month", label: "This month" }]} />
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className="pf-font-head text-xs font-bold text-[#6E5CC7]">Clear filters</button>
          )}
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0.5">
        {OPPORTUNITY_CATEGORIES.map((c) => {
          const live = opportunities.filter((o) => o.lifecycleStatus !== "closed" && o.lifecycleStatus !== "cancelled");
          const count = c.key === "all" ? live.length : live.filter((o) => o.type === c.key).length;
          const on = category === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`pf-font-head shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors border-2 ${on ? "bg-[#FFB020] border-[#FFB020] text-[#3A2A00] shadow-sm" : "bg-white border-[#F1EEFB] text-[#6E5CC7]"}`}
            >
              {c.label} <span className={on ? "opacity-70" : "text-[#C4BAE3]"}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* P9 (2026-09-22, mobile QA): the card grid already cleared the FAB
          with pb-28, but these two didn't -- on a phone with nothing to
          list, the "+ Post" button floated straight over the only line of
          text on the screen. */}
      {loading ? (
        <div className="pf-font-body text-center pt-10 pb-28 lg:pb-20 text-[#A79CC4] text-sm">Loading opportunities…</div>
      ) : filtered.length === 0 ? (
        <div className="pf-font-body text-center pt-10 pb-28 lg:pb-20 text-[#A79CC4] text-sm">{query ? `No opportunities match "${query}".` : "No opportunities posted yet."}</div>
      ) : (
        <div ref={gridRef} className="grid sm:grid-cols-2 gap-4 pb-28 lg:pb-20">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={openOpportunity} />)}
        </div>
      )}

      {!postOpen && (
      <button
        ref={fabRef}
        type="button"
        onClick={openCreateFlow}
        tabIndex={fabHidden ? -1 : undefined}
        aria-hidden={fabHidden}
        className={`pf-font-head fixed sm:absolute bottom-24 lg:bottom-6 right-5 sm:right-0 z-30 flex items-center gap-1.5 text-sm font-bold text-[#3A2A00] bg-gradient-to-br from-[#FFCB5C] to-[#FF9F1C] pl-4 pr-5 py-3.5 rounded-full shadow-[0_10px_24px_-6px_rgba(255,159,28,0.6)] active:scale-[0.97] transition ${fabHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <Plus size={17} /> Post
      </button>
      )}

      {pickerOpen && <CreateOpportunityTypePicker onClose={closeCreateFlow} onPick={pickCreateType} />}
      {(modalType || (editingOpp && editingOpp.type !== "workshop")) && (
        <ApplicationOpportunityForm type={editingOpp?.type || modalType} editingOpp={editingOpp} onClose={closeCreateFlow} onSubmit={submitFromWizard} />
      )}
      {(workshopOpen || editingOpp?.type === "workshop") && (
        <WorkshopWizard editingOpp={editingOpp} onClose={closeCreateFlow} onSubmit={submitFromWizard} />
      )}
    </main>
  );
}

// One labeled pill row in the filter sheet above (Price/Mode/When) --
// same PillSelect shape used throughout the create wizards, kept local
// here since it's presentational and this is its only caller.
function FilterRow({ label, value, onChange, options }) {
  return (
    <div>
      <span className="pf-font-head block text-[11px] font-bold text-[#8A7FA3] mb-1.5">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`pf-font-head text-xs font-bold rounded-full px-3 py-1.5 border-2 transition-colors ${value === o.key ? "bg-[#6E5CC7] border-[#6E5CC7] text-white" : "bg-white border-[#F1EEFB] text-[#6E5CC7]"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
