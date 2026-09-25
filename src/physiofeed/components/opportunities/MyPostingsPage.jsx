import { useState } from "react";
import { ChevronLeft, Plus, ChevronDown, Eye, Users, MessageCircle, MoreHorizontal, Pencil, Send, XCircle, Ban, RotateCcw, Copy, Trash2 } from "lucide-react";

// "My Posted Opportunities" (2026-09-22, Aditi's brief + real mockup
// reference) -- the recruiter/poster dashboard, reachable from a banner on
// the Explore hub. Lists opportunities you posted (`postedByMe`, now
// creator_id === you -- see db.js's rowToOpportunity), split into active
// vs closed. The applicant count is `stats.applications`, which db.js
// derives by counting real `applications` rows, so it can never drift
// from the pipeline itself.
//
// Phase E (2026-09-25): grouped by `lifecycleStatus` (draft/published/
// expired/closed/cancelled -- db.js's getOpportunityEffectiveStatus)
// instead of the old binary `.status`, so an expired-but-still-"published"
// listing lands in Past rather than sitting in Active with a stale Close/
// Cancel action nobody should use on something that already ended. Each
// status gets its own action set per the brief.
const STATUS_META = {
  draft: { label: "Draft", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-600" },
  published: { label: "Active", dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700" },
  closed: { label: "Closed", dot: "bg-slate-400", chip: "bg-slate-100 text-slate-500" },
  expired: { label: "Expired", dot: "bg-amber-500", chip: "bg-amber-50 text-amber-700" },
  cancelled: { label: "Cancelled", dot: "bg-rose-400", chip: "bg-rose-50 text-rose-600" },
};

export default function MyPostingsPage({
  postings, onBack, onNewPost, onViewApplicants, onView, onEdit,
  onPublish, onClose, onReopen, onCancel, onDuplicate, onDelete,
}) {
  const [showPast, setShowPast] = useState(false);
  const drafts = postings.filter((o) => o.lifecycleStatus === "draft");
  const active = postings.filter((o) => o.lifecycleStatus === "published");
  const past = postings.filter((o) => ["closed", "expired", "cancelled"].includes(o.lifecycleStatus));

  const actions = { onViewApplicants, onView, onEdit, onPublish, onClose, onReopen, onCancel, onDuplicate, onDelete };

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

      {drafts.length > 0 && (
        <>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">Drafts ({drafts.length})</p>
          <div className="space-y-3 mb-6">
            {drafts.map((o) => <PostingCard key={o.id} opp={o} count={o.stats?.applications ?? 0} {...actions} />)}
          </div>
        </>
      )}

      <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2.5">Active listings ({active.length})</p>
      {active.length === 0 && <p className="text-sm text-slate-400 mb-5">You don't have any active postings yet.</p>}
      <div className="space-y-3 mb-6">
        {active.map((o) => <PostingCard key={o.id} opp={o} count={o.stats?.applications ?? 0} {...actions} />)}
      </div>

      {past.length > 0 && (
        <div className="mb-6">
          <button type="button" onClick={() => setShowPast((v) => !v)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mb-2.5">
            View past / closed listings ({past.length}) <ChevronDown size={14} className={`transition-transform ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast && (
            <div className="space-y-3">
              {past.map((o) => <PostingCard key={o.id} opp={o} count={o.stats?.applications ?? 0} {...actions} />)}
            </div>
          )}
        </div>
      )}
    </main>
  );
}

function PostingCard({ opp, count, onViewApplicants, onView, onEdit, onPublish, onClose, onReopen, onCancel, onDuplicate, onDelete }) {
  const stats = opp.stats || { views: 0, applications: 0, chats: 0 };
  const meta = STATUS_META[opp.lifecycleStatus] || STATUS_META.published;
  // Manage (view applicants/registrations) is only meaningful once a
  // listing has been live at some point -- a draft has no applicants yet,
  // and a cancelled one shouldn't be inviting more attention to its pipeline.
  const canManage = opp.lifecycleStatus === "published" || opp.lifecycleStatus === "closed" || opp.lifecycleStatus === "expired";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className={`inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full mb-2 ${meta.chip}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
          {meta.label}{opp.lifecycleStatus === "published" && opp.daysRemaining != null ? ` · ${opp.daysRemaining} days left` : ""}
        </div>
        <PostingOptionsMenu opp={opp} count={count} onView={onView} onEdit={onEdit} onPublish={onPublish} onClose={onClose} onReopen={onReopen} onCancel={onCancel} onDuplicate={onDuplicate} onDelete={onDelete} />
      </div>
      <p className="text-sm font-bold text-slate-900 leading-snug">{opp.title}</p>
      <p className="text-xs text-slate-500 mb-2.5">{opp.orgShort || opp.org}</p>

      <div className="flex items-center gap-3 text-[11px] text-slate-500 mb-3">
        <span className="inline-flex items-center gap-1"><Eye size={12} />{stats.views} Views</span>
        <span className="inline-flex items-center gap-1"><Users size={12} />{count} {opp.type === "workshop" ? "Registered" : "Applicants"}</span>
        <span className="inline-flex items-center gap-1"><MessageCircle size={12} />{stats.chats}</span>
      </div>

      {canManage && (
        <div className="flex items-center gap-2 pt-2.5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onViewApplicants(opp)}
            className="flex-1 text-center text-xs font-bold text-white rounded-lg px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 shadow-sm active:scale-[0.97] transition"
          >
            {/* A workshop has registrations, not applicants (2026-09-23). */}
            {opp.type === "workshop" ? "View Registrations" : "View Applicants"} ({count}) →
          </button>
        </div>
      )}
    </div>
  );
}

// Every other action lives here, filtered per lifecycleStatus per the
// brief's per-status action set:
//   draft:      View, Edit, Publish, Delete
//   published:  View, Edit, Close, Cancel, Delete   (+ Manage, above)
//   closed:     View, Reopen, Delete                (+ Manage, above)
//   expired:    View, Duplicate, Delete              (+ Manage, above)
//   cancelled:  View, Delete
// Delete keeps DeletePostButton.jsx's one-menu-click-then-confirm pattern
// (2026-08-18): a second tap to confirm, since it's the one destructive
// action here -- though "destructive" now just means "no longer visible to
// anyone" (opportunities_select_visible checks deleted_at), not gone:
// deleteOpportunity is a soft delete precisely so the applications/
// registrations it's attached to survive it (add_opportunity_lifecycle.sql).
function PostingOptionsMenu({ opp, count, onView, onEdit, onPublish, onClose, onReopen, onCancel, onDuplicate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const status = opp.lifecycleStatus;

  const toggleOpen = () => {
    setOpen((o) => !o);
    setConfirming(false);
  };

  // onView/onEdit are handed the full opportunity (they reopen a detail
  // screen or a wizard pre-filled from it); every status-transition action
  // below just needs the id, same as deleteOpportunity already did.
  const run = (fn) => { setOpen(false); fn(opp.id); };
  const runWithOpp = (fn) => { setOpen(false); fn(opp); };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Listing options"
        aria-expanded={open}
        className="p-1.5 -mt-1 -mr-1 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-200"
      >
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20">
          <MenuItem icon={Eye} label="View listing" onClick={() => runWithOpp(onView)} />
          {(status === "draft" || status === "published") && <MenuItem icon={Pencil} label="Edit listing" onClick={() => runWithOpp(onEdit)} />}
          {status === "draft" && <MenuItem icon={Send} label="Publish" onClick={() => run(onPublish)} />}
          {status === "published" && <MenuItem icon={XCircle} label="Close listing" onClick={() => run(onClose)} />}
          {status === "published" && <MenuItem icon={Ban} label="Cancel listing" tone="rose" onClick={() => run(onCancel)} />}
          {status === "closed" && <MenuItem icon={RotateCcw} label="Reopen" onClick={() => run(onReopen)} />}
          {status === "expired" && <MenuItem icon={Copy} label="Duplicate as new draft" onClick={() => run(onDuplicate)} />}
          <button
            type="button"
            onClick={() => {
              if (!confirming) { setConfirming(true); return; }
              setOpen(false);
              setConfirming(false);
              onDelete(opp.id);
            }}
            className="w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 size={13} />
            {confirming ? `Tap again to confirm${count > 0 ? ` (${count} already registered)` : ""}` : "Delete listing"}
          </button>
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, onClick, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 text-left px-3 py-1.5 text-xs font-medium hover:bg-slate-50 ${tone === "rose" ? "text-rose-600 hover:bg-rose-50" : "text-slate-700"}`}
    >
      <Icon size={13} />
      {label}
    </button>
  );
}
