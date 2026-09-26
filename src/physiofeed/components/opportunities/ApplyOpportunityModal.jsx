import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Phone, Check } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import * as db from "../../data/db.js";
import { trackEvent } from "../../../analytics/trackEvent.js";

const textareaCls = "w-full text-sm bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder:text-slate-400 placeholder:text-sm resize-none";

// The "Apply with Profile" bottom sheet (2026-09-22, Aditi's brief: a
// one-tap, high-signal clinical application replacing PDF attachments).
// Attaches the signed-in profile as a read-only snapshot.
//
// P5 (2026-09-22): submitting used to be local state only -- a checkmark
// and nothing behind it. It now writes an `applications` row, so the
// recruiter's pipeline shows a real applicant and the applicant's own "My
// Applications" list can track its status. Errors surface inline instead
// of the sheet claiming success it didn't have.
export default function ApplyOpportunityModal({ opp, onClose, onApplied }) {
  const { profile } = useAppData();
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (opp.type === "job") trackEvent("job_application_started", { entityType: "opportunity", entityId: opp.id });
  }, [opp.id, opp.type]);

  const submit = async () => {
    if (busy || sent) return;
    setBusy(true);
    setError(null);
    try {
      await db.applyToOpportunity(opp.id, { coverNote: note.trim(), resumeUrl: profile?.resumeUrl || "" });
      if (opp.type === "job") trackEvent("job_application_submitted", { entityType: "opportunity", entityId: opp.id });
      if (opp.type === "internship") trackEvent("internship_application_submitted", { entityType: "opportunity", entityId: opp.id });
      setSent(true);
    } catch (e) {
      setError(e.message || "Couldn't send that application -- please try again.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(onApplied, 900);
    return () => clearTimeout(t);
  }, [sent, onApplied]);

  const posterName = opp.mentor?.name?.split(",")[0].replace("Dr. ", "") || opp.org;

  // Portaled to document.body (2026-09-22) so this always mounts as a
  // direct body child, same pattern as InfoCard.jsx's modal. z-[210]
  // (2026-09-22, Aditi's report on the sibling ApplicantProfileSheet: its
  // header painted underneath the app's own chrome) -- `.pm-mobile-hdr`
  // is z-101 and `.pm-bnav` is z-140, both above this modal's old z-60.
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center bg-slate-900/40 px-0 sm:px-4 pb-[88px] sm:pb-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl overflow-y-auto max-h-[calc(100vh-104px)] sm:max-h-[85vh]">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900">Apply to role</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><X size={18} /></button>
        </div>

        <div className="px-5 pb-8">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-1">Applying for</p>
          <p className="text-sm font-bold text-slate-900 leading-snug">{opp.title}</p>
          <p className="text-xs text-slate-500 mb-4">{opp.orgShort || opp.org}{opp.location ? ` · ${opp.location}` : ""}</p>

          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Your attached profile snapshot</p>
          <div className="flex items-center gap-3 bg-slate-50 rounded-xl px-3.5 py-3 mb-4">
            <Avatar size={40} grad={profile?.gradient} initials={profile?.initials} photoUrl={profile?.avatarUrl} />
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">{profile?.name || "Your profile"}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.clinicalTitle || profile?.role || "PhysioFeed member"}{profile?.college ? ` · ${profile.college}` : ""}</p>
              {profile?.location && <p className="text-[11px] text-slate-400 truncate mt-0.5">{profile.location}</p>}
            </div>
          </div>

          <label className="block mb-4">
            <span className="block text-xs font-semibold text-slate-600 mb-1.5">Add a quick note to {posterName} (optional)</span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Why you're a good fit for this role…" className={textareaCls} />
          </label>

          {profile?.phone && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-5"><Phone size={12} className="text-slate-400" />Contact shared: {profile.phone}</p>
          )}

          {error && <p className="text-xs text-rose-600 mb-2">{error}</p>}
          <button
            type="button"
            onClick={submit}
            disabled={sent || busy}
            className={`w-full flex items-center justify-center gap-1.5 text-sm font-bold rounded-xl py-3 transition ${sent ? "bg-emerald-50 text-emerald-700" : "text-white bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md active:scale-[0.98] disabled:opacity-60"}`}
          >
            {sent ? <><Check size={16} /> Application sent to {posterName}!</> : busy ? "Sending…" : "Confirm & submit application 🚀"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
