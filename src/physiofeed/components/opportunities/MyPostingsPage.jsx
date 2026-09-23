import { useState } from "react";
import { ChevronLeft, Plus, ChevronDown, Eye, Users, MessageCircle } from "lucide-react";

// "My Posted Opportunities" (2026-09-22, Aditi's brief + real mockup
// reference) -- the recruiter/poster dashboard, reachable from a banner on
// the Explore hub. Lists opportunities you posted (`postedByMe`, now
// creator_id === you -- see db.js's rowToOpportunity), split into active
// vs closed. The applicant count is `stats.applications`, which db.js
// derives by counting real `applications` rows, so it can never drift
// from the pipeline itself.
export default function MyPostingsPage({ postings, onBack, onNewPost, onViewApplicants, onToggleStatus }) {
  const [showClosed, setShowClosed] = useState(false);
  const active = postings.filter((o) => o.status !== "closed");
  const closed = postings.filter((o) => o.status === "closed");

  return (
    <main className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-5">
        <button type="button" onClick={onBack} aria-label="Back" className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={20} /></button>
        <h1 className="text-xl font-bold text-slate-900 flex-1">My Postings</h1>
        <button
          type="button"
          onClick={onNewPost}
          className="flex items-center gap-1 text-xs font-bold text-white pl-2.5 pr-3 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm active:scale-[0.97] transition"
        >
          <Plus size={14} /> New Listing
        </button>
      </div>

      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">Active listings ({active.length})</p>
      {active.length === 0 && <p className="text-sm text-slate-400 mb-5">You don't have any active postings yet.</p>}
      <div className="space-y-3 mb-6">
        {active.map((o) => (
          <PostingCard key={o.id} opp={o} count={o.stats?.applications ?? 0} onViewApplicants={onViewApplicants} onToggleStatus={onToggleStatus} />
        ))}
      </div>

      {closed.length > 0 && (
        <div className="mb-6">
          <button type="button" onClick={() => setShowClosed((v) => !v)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2.5">
            View past / closed listings ({closed.length}) <ChevronDown size={14} className={`transition-transform ${showClosed ? "rotate-180" : ""}`} />
          </button>
          {showClosed && (
            <div className="space-y-3">
              {closed.map((o) => (
                <PostingCard key={o.id} opp={o} count={o.stats?.applications ?? 0} onViewApplicants={onViewApplicants} onToggleStatus={onToggleStatus} closed />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function PostingCard({ opp, count, onViewApplicants, onToggleStatus, closed }) {
  const stats = opp.stats || { views: 0, applications: 0, chats: 0 };
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full mb-2 ${closed ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${closed ? "bg-slate-400" : "bg-emerald-500"}`} />
        {closed ? "Closed" : `Active${opp.daysRemaining != null ? ` · ${opp.daysRemaining} days left` : ""}`}
      </div>
      <p className="text-sm font-bold text-slate-900 leading-snug">{opp.title}</p>
      <p className="text-xs text-slate-500 mb-2.5">{opp.orgShort || opp.org}</p>

      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1"><Eye size={12} />{stats.views} Views</span>
        <span className="inline-flex items-center gap-1"><Users size={12} />{count} Applicants</span>
        <span className="inline-flex items-center gap-1"><MessageCircle size={12} />{stats.chats}</span>
      </div>

      <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
        <button type="button" onClick={() => onToggleStatus(opp.id)} className="text-xs font-bold text-slate-600 border border-slate-200 rounded-lg px-3.5 py-2 hover:bg-slate-50 whitespace-nowrap">
          {closed ? "Reopen" : "Close listing"}
        </button>
        <button
          type="button"
          onClick={() => onViewApplicants(opp)}
          className="flex-1 text-center text-xs font-bold text-white rounded-lg px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm active:scale-[0.97] transition"
        >
          View Applicants ({count}) →
        </button>
      </div>
    </div>
  );
}
