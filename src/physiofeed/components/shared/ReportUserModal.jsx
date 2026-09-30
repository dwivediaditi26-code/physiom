import { useState } from "react";
import { X } from "lucide-react";

const REASONS = ["Spam", "Harassment or abuse", "Inappropriate content", "Impersonation", "Other"];

// Shared by OtherProfilePage's overflow menu and Messages' request card --
// reporting a PERSON, not a post (see user_reports in
// supabase/add_conversations_and_blocks.sql; the existing `reports` table
// is post-only).
export default function ReportUserModal({ name, onSubmit, onClose }) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (!reason || busy) return;
    setBusy(true);
    setError("");
    try {
      await onSubmit(note ? `${reason}: ${note}` : reason);
      setDone(true);
    } catch (e) {
      setError(e.message || "Couldn't submit that report -- please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-base font-bold text-slate-900">{done ? "Report submitted" : `Report ${name || "this person"}`}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>
        {done ? (
          <div className="px-5 pb-6">
            <p className="text-sm text-slate-500">Thanks -- an admin will look into this.</p>
            <button onClick={onClose} className="mt-4 w-full text-sm font-bold px-4 py-2.5 rounded-xl bg-slate-900 text-white hover:bg-slate-800">Done</button>
          </div>
        ) : (
          <div className="px-5 pb-5">
            <div className="space-y-1.5 mb-3">
              {REASONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={`w-full text-left text-sm px-3 py-2 rounded-xl border ${reason === r ? "border-rose-500 bg-rose-50 text-rose-700 font-semibold" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add detail (optional)"
              rows={2}
              className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none placeholder:text-slate-400 resize-none"
            />
            {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
            <button
              onClick={submit}
              disabled={!reason || busy}
              className="mt-3 w-full text-sm font-bold px-4 py-2.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
            >
              Submit report
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
