// Shared by OpportunityDetail/WorkshopDetail (Phase F, 2026-09-25): the one
// line explaining why a listing isn't fully live any more, read off
// `lifecycleStatus` (db.js's getOpportunityEffectiveStatus) rather than the
// raw `status` column so "expired" (computed, never stored) gets the same
// treatment as the stored draft/closed/cancelled values.
const COPY = {
  draft: { tone: "slate", text: "Draft — only visible to you." },
  closed: { tone: "slate", text: "Registration closed." },
  expired: { tone: "amber", text: "This opportunity is no longer accepting registrations." },
  cancelled: { tone: "rose", text: "Cancelled by organiser." },
};

const TONE_CLS = {
  slate: "bg-slate-100 text-slate-600",
  amber: "bg-amber-50 text-amber-700",
  rose: "bg-rose-50 text-rose-600",
};

export default function LifecycleBanner({ opp }) {
  const status = opp.lifecycleStatus;
  if (status === "draft" && !opp.postedByMe) return null; // can't happen -- RLS only lets the creator see their own draft -- but don't say "only visible to you" to anyone else if it ever does
  const copy = COPY[status];
  if (!copy) return null;
  return (
    <div className={`text-xs font-semibold rounded-xl px-3.5 py-2.5 mb-4 ${TONE_CLS[copy.tone]}`}>
      {copy.text}
    </div>
  );
}

export function isRegistrationBlocked(opp) {
  return opp.lifecycleStatus === "closed" || opp.lifecycleStatus === "expired" || opp.lifecycleStatus === "cancelled";
}
