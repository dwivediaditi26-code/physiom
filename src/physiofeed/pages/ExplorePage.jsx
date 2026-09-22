import { useMemo, useState } from "react";
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
        <h1 className="text-xl font-bold text-slate-900 mb-1">Explore</h1>
        <p className="text-sm text-slate-500">Jobs, internships, workshops and collaborations for physiotherapists.</p>
      </div>

      <button
        type="button"
        onClick={() => setMyPostingsOpen(true)}
        className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 mb-4 hover:bg-slate-50 transition"
      >
        <span className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center shrink-0"><Briefcase size={16} className="text-indigo-600" /></span>
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-bold text-slate-900">My Postings</span>
          <span className="block text-xs text-slate-500">Manage your listings and review applicants</span>
        </span>
        {myPostings.length > 0 && <span className="text-xs font-bold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 shrink-0">{myPostings.length}</span>}
        <ChevronRight size={16} className="text-slate-300 shrink-0" />
      </button>

      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3.5 h-11 mb-3.5">
        <Search size={16} className="text-slate-400 shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search opportunities, clinics, cities…"
          className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5 pb-0.5">
        {OPPORTUNITY_CATEGORIES.map((c) => {
          const live = opportunities.filter((o) => o.status !== "closed");
          const count = c.key === "all" ? live.length : live.filter((o) => o.type === c.key).length;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setCategory(c.key)}
              className={`shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${category === c.key ? "bg-violet-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600"}`}
            >
              {c.label} <span className={category === c.key ? "opacity-80" : "text-slate-400"}>{count}</span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-slate-400 text-sm">No opportunities match "{query}".</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4 pb-6">
          {filtered.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={openOpportunity} />)}
        </div>
      )}

      {!postOpen && (
      <button
        type="button"
        onClick={() => setPostOpen(true)}
        className="fixed sm:absolute bottom-24 lg:bottom-6 right-5 sm:right-0 z-30 flex items-center gap-1.5 text-sm font-bold text-white pl-4 pr-5 py-3.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 shadow-lg active:scale-[0.97] transition"
      >
        <Plus size={17} /> Post
      </button>
      )}

      {postOpen && <PostOpportunityModal onClose={() => setPostOpen(false)} onPublish={publish} />}
    </main>
  );
}
