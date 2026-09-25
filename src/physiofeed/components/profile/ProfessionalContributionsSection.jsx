import { useState } from "react";
import { Pencil, Presentation } from "lucide-react";
import EditContributionsModal from "./EditContributionsModal.jsx";

// Professional Contributions (2026-09-22 redesign, 2026-09-24 backed
// per-user) -- workshops run, conference talks, guest lectures, awards.
// Reads real rows via `entries` (OtherProfilePage.jsx passes them from
// db.getContributionsByUser()); if `entries` isn't passed we're on the
// owner's ProfilePage and use their in-context list. Editable inline
// through EditContributionsModal.jsx (same modal pattern as
// EditAchievementsModal), backed by supabase/add_profile_contributions.sql.
//
// The section renders even when empty on the owner's own profile so the
// "+ Add" action is reachable; on a visitor view the parent hides it
// entirely (OtherProfilePage guards on `contributions.length > 0`).
export default function ProfessionalContributionsSection({ entries, isOwn = false, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  const list = entries || [];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="pf-font-head text-sm font-extrabold text-slate-900">Professional Evidence</p>
        {isOwn && !readOnly && (
          <button onClick={() => setEditing(true)} aria-label="Edit professional evidence" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-md hover:bg-slate-50">
            <Pencil size={13} />
          </button>
        )}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-slate-400">
          {isOwn ? "Add workshops, conference talks, guest lectures or awards." : "No contributions added yet."}
        </p>
      ) : (
        <div className="space-y-4">
          {list.map((c) => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Presentation size={15} className="text-violet-600" /></div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{c.type}</p>
                <p className="text-sm font-medium text-slate-800 leading-snug">{c.title}</p>
                <p className="text-xs text-slate-400">{[c.year, c.location].filter(Boolean).join(" • ")}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOwn && !readOnly && editing && <EditContributionsModal entries={list} onClose={() => setEditing(false)} />}
    </div>
  );
}
