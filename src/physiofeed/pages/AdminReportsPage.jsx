import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { ShieldCheck, Trash2, X } from "lucide-react";
import { useAppData } from "../context/AppDataContext.jsx";
import * as db from "../data/db.js";

// Minimal V1 admin surface: open reports only, two actions (remove the
// post, or dismiss the report). No user bans, no history, no analytics --
// see supabase/add_moderation.sql's header comment for why that's
// deliberately out of scope right now. Loads its own data directly from
// db.js rather than going through AppDataContext, since reports are only
// ever relevant on this one page -- no reason to carry that state around
// globally for every PhysioFeed screen.
export default function AdminReportsPage() {
  const { profile } = useAppData();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!profile?.isAdmin) return;
    (async () => {
      setReports(await db.getReports());
      setLoading(false);
    })();
  }, [profile?.isAdmin]);

  // Real gate: even if this page were linked from somewhere, RLS on the
  // `reports` table already returns nothing to non-admins -- this redirect
  // is just so a non-admin who lands here (typed the URL directly) sees
  // "not found" behaviour instead of a page that looks broken/empty.
  if (!profile?.isAdmin) return <Navigate to="/feed" replace />;

  const handleDismiss = async (id) => {
    setBusyId(id);
    await db.dismissReport(id);
    setReports((rs) => rs.filter((r) => r.id !== id));
    setBusyId(null);
  };

  const handleRemove = async (report) => {
    setBusyId(report.id);
    await db.removeReportedPost(report.id, report.postId);
    setReports((rs) => rs.filter((r) => r.id !== report.id));
    setBusyId(null);
  };

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5 flex items-center gap-2">
        <ShieldCheck size={20} className="text-violet-600" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Reported posts</h1>
          <p className="text-sm text-slate-500">Open reports awaiting review.</p>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : reports.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <p className="text-sm text-slate-500">No open reports right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide mb-1">{r.reason}</p>
                  <p className="font-semibold text-slate-900 text-sm truncate">{r.postHeading}</p>
                  {r.postCaption && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.postCaption}</p>}
                  <p className="text-[11px] text-slate-400 mt-2">Reported by {r.reporterName}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDismiss(r.id)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <X size={13} /> Dismiss
                  </button>
                  <button
                    onClick={() => handleRemove(r)}
                    disabled={busyId === r.id}
                    className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Trash2 size={13} /> Remove post
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
