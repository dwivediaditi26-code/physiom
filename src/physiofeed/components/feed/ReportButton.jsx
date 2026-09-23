import { useState } from "react";
import { Flag, Check } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";

const REASONS = ["Spam", "Inappropriate", "Misinformation", "Other"];

// Minimal V1 moderation entry point -- see supabase/add_moderation.sql and
// db.js's reportPost(). No confirmation dialog, no "why" follow-up beyond
// picking a reason -- keeps this to one click past "Flag" instead of a
// whole report flow, which is plenty for a teaching-clinic feed at this
// stage. Reports land in the admin page (pages/AdminReportsPage.jsx).
export default function ReportButton({ postId }) {
  const { reportPost } = useAppData();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  // P9 (2026-09-22): db.reportPost() used to return false on failure and
  // this showed "Reported" regardless -- a report that never reached the
  // table looked filed. It throws now, and a failure says so.
  const [error, setError] = useState(null);

  if (done) {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium px-1.5 py-1.5">
        <Check size={13} /> Reported
      </span>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Report post"
        aria-expanded={open}
        className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
      >
        <Flag size={15} />
      </button>
      {error && <p className="absolute right-0 top-full mt-1 w-44 text-[11px] text-rose-600 bg-white border border-rose-200 rounded-lg px-2 py-1.5 shadow-sm z-20">{error}</p>}
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20">
          <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Report this post</p>
          {REASONS.map((r) => (
            <button
              key={r}
              onClick={async () => {
                setOpen(false);
                try {
                  await reportPost(postId, r);
                  setDone(true);
                } catch (e) {
                  setError(e?.message || "Couldn't send that report -- please try again.");
                }
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              {r}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
