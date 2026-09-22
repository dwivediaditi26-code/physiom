import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Plus, Briefcase, ChevronRight } from "lucide-react";
import { INITIAL_OPPORTUNITIES, OPPORTUNITY_CATEGORIES } from "../data/opportunitiesMock.js";
import { INITIAL_APPLICANTS } from "../data/applicantsMock.js";
import OpportunityCard from "../components/opportunities/OpportunityCard.jsx";
import OpportunityDetail from "../components/opportunities/OpportunityDetail.jsx";
import WorkshopDetail from "../components/opportunities/WorkshopDetail.jsx";
import OpportunityChat from "../components/opportunities/OpportunityChat.jsx";
import PostOpportunityModal from "../components/opportunities/PostOpportunityModal.jsx";
import MyPostingsPage from "../components/opportunities/MyPostingsPage.jsx";
import ApplicantPipeline from "../components/opportunities/ApplicantPipeline.jsx";
import ApplicantProfileSheet from "../components/opportunities/ApplicantProfileSheet.jsx";
import ApplicantChatModal from "../components/opportunities/ApplicantChatModal.jsx";

// Explore -> Opportunities board (2026-09-21, Aditi's brief + mockups: jobs,
// internships, workshops and research collaborations for physiotherapists).
// Replaces the previous "trending topics / popular posts" Explore page --
// this is what she asked to "put in Explore". Demo content only, same as
// the rest of PhysioFeed's seed data (see AppShell.jsx's "Demo content"
// banner) -- there's no opportunities table in Supabase yet, so postings
// and applications here are local state and don't survive a reload.
//
// The Recruiter / Poster Dashboard (2026-09-22, same brief + real mockup
// references) lives here too: "My Postings" -> ApplicantPipeline ->
// ApplicantProfileSheet, all reading/writing `applicantsByOpp` below so
// Pass/Shortlist/Invite are real state changes, not decoration.
export default function ExplorePage() {
  const [opportunities, setOpportunities] = useState(INITIAL_OPPORTUNITIES);
  const [applicantsByOpp, setApplicantsByOpp] = useState(INITIAL_APPLICANTS);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(null); // the opportunity object, or null = hub
  const [chatFor, setChatFor] = useState(null); // opportunity being messaged about, or null
  const [postOpen, setPostOpen] = useState(false);

  const [myPostingsOpen, setMyPostingsOpen] = useState(false);
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
  const view = chatFor ? "chat" : pipelineFor ? "pipeline" : myPostingsOpen ? "myPostings" : active ? "detail" : "hub";
  useEffect(() => {
    try { document.body.scrollTop = 0; document.documentElement.scrollTop = 0; window.scrollTo(0, 0); } catch {}
  }, [view]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return opportunities.filter((o) => {
      if (o.status === "closed") return false;
      if (category !== "all" && o.type !== category) return false;
      if (!q) return true;
      return o.title.toLowerCase().includes(q) || o.org.toLowerCase().includes(q) || (o.location || "").toLowerCase().includes(q) || o.tags?.some((t) => t.toLowerCase().includes(q));
    });
  }, [opportunities, category, query]);

  const myPostings = useMemo(() => opportunities.filter((o) => o.postedByMe), [opportunities]);

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

  const publish = (opp) => {
    setOpportunities((prev) => [opp, ...prev]);
    setApplicantsByOpp((prev) => ({ ...prev, [opp.id]: [] }));
    setPostOpen(false);
  };

  const toggleListingStatus = (oppId) => {
    setOpportunities((prev) => prev.map((o) => o.id === oppId ? { ...o, status: o.status === "closed" ? "active" : "closed" } : o));
  };

  const openPipeline = (opp) => { setMyPostingsOpen(false); setPipelineFor(opp); };
  const closePipeline = () => { setPipelineFor(null); setProfileSheetId(null); setChatModalId(null); };

  const setApplicantStatus = (oppId, applicantId, status) => {
    setApplicantsByOpp((prev) => ({
      ...prev,
      [oppId]: (prev[oppId] || []).map((a) => a.id === applicantId ? { ...a, status: a.status === status ? "new" : status } : a),
    }));
  };

  const inviteApplicant = (oppId, applicantId) => {
    setApplicantsByOpp((prev) => ({
      ...prev,
      [oppId]: (prev[oppId] || []).map((a) => a.id === applicantId ? { ...a, status: "shortlisted" } : a),
    }));
  };

  const pipelineApplicants = pipelineFor ? (applicantsByOpp[pipelineFor.id] || []) : [];
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
          onOpenApplicant={(a) => setProfileSheetId(a.id)}
          onPass={(id) => setApplicantStatus(pipelineFor.id, id, "passed")}
          onShortlist={(id) => setApplicantStatus(pipelineFor.id, id, "shortlisted")}
          onChat={(a) => setChatModalId(a.id)}
        />
        {profileSheetApplicant && (
          <ApplicantProfileSheet
            applicant={profileSheetApplicant}
            opp={pipelineFor}
            onClose={() => setProfileSheetId(null)}
            onPass={(id) => setApplicantStatus(pipelineFor.id, id, "passed")}
            onShortlist={(id) => setApplicantStatus(pipelineFor.id, id, "shortlisted")}
            onMessage={(a) => { setProfileSheetId(null); setChatModalId(a.id); }}
          />
        )}
        {chatModalApplicant && (
          <ApplicantChatModal
            applicant={chatModalApplicant}
            opp={pipelineFor}
            onClose={() => setChatModalId(null)}
            onInvite={(id) => inviteApplicant(pipelineFor.id, id)}
          />
        )}
      </>
    );
  }

  if (myPostingsOpen) {
    return (
      <MyPostingsPage
        postings={myPostings}
        applicantsByOpp={applicantsByOpp}
        onBack={() => setMyPostingsOpen(false)}
        onNewPost={() => { setMyPostingsOpen(false); setPostOpen(true); }}
        onViewApplicants={openPipeline}
        onToggleStatus={toggleListingStatus}
      />
    );
  }

  if (active) {
    return (
      <main className="flex-1 min-w-0">
        {active.type === "workshop" ? (
          <WorkshopDetail opp={active} onBack={closeDetail} />
        ) : (
          <OpportunityDetail opp={active} onBack={closeDetail} onMessage={openChat} />
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

      <div className="flex items-center gap-2 bg-[#F7F5FF] border-2 border-[#EFE9FF] rounded-2xl px-3.5 h-11 mb-3.5">
        <Search size={16} className="text-[#8A7FA3] shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities, clinics, cities…"
          className="pf-font-body bg-transparent text-sm outline-none w-full placeholder:text-[#A79CC4] text-[#2B2140]"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0.5">
        {OPPORTUNITY_CATEGORIES.map((c) => {
          const live = opportunities.filter((o) => o.status !== "closed");
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

      {filtered.length === 0 ? (
        <div className="pf-font-body text-center py-14 text-[#A79CC4] text-sm">No opportunities match "{query}".</div>
      ) : (
        <div ref={gridRef} className="grid sm:grid-cols-2 gap-4 pb-28 lg:pb-20">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={openOpportunity} />)}
        </div>
      )}

      {!postOpen && (
      <button
        ref={fabRef}
        type="button"
        onClick={() => setPostOpen(true)}
        tabIndex={fabHidden ? -1 : undefined}
        aria-hidden={fabHidden}
        className={`pf-font-head fixed sm:absolute bottom-24 lg:bottom-6 right-5 sm:right-0 z-30 flex items-center gap-1.5 text-sm font-bold text-[#3A2A00] bg-gradient-to-br from-[#FFCB5C] to-[#FF9F1C] pl-4 pr-5 py-3.5 rounded-full shadow-[0_10px_24px_-6px_rgba(255,159,28,0.6)] active:scale-[0.97] transition ${fabHidden ? "opacity-0 pointer-events-none" : "opacity-100"}`}
      >
        <Plus size={17} /> Post
      </button>
      )}

      {postOpen && <PostOpportunityModal onClose={() => setPostOpen(false)} onPublish={publish} />}
    </main>
  );
}
