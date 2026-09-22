import { useState } from "react";
import { Pencil, Check } from "lucide-react";
import { Icon } from "../shared/icons.jsx";
import EditAchievementsModal from "./EditAchievementsModal.jsx";

// Certifications, its own card (2026-09-22 "LinkedIn for physiotherapists"
// redesign, Aditi's brief: Certifications is one of the profile's named
// sections, separate from About). Pulled out of ProfileAboutSection.jsx,
// which used to stack this under Clinical Expertise/Interests -- same
// `achievements` data and EditAchievementsModal.jsx, just its own card now
// that About no longer carries every field. "Verified" only ever comes
// from real data (achievement.verified) -- nothing here can set it, see
// EditAchievementsModal.jsx's own comment on why.
export default function CertificationsCard({ entries, readOnly = false }) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="pf-font-head text-sm font-extrabold text-slate-900">Certifications</p>
        {!readOnly && (
          <button onClick={() => setEditing(true)} aria-label="Edit certifications" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-md hover:bg-slate-50">
            <Pencil size={13} />
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">{readOnly ? "No certifications added yet." : "Add your licenses and certifications."}</p>
      ) : (
        <div className="space-y-3">
          {entries.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0"><Icon name={a.iconName} size={14} className="text-slate-600" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-slate-800">{a.title}</p>
                  {a.verified && <Check size={12} className="text-slate-500 shrink-0" aria-label="Verified by PhysioFeed" />}
                </div>
                {a.subtitle && <p className="text-xs text-slate-400">{a.subtitle}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!readOnly && editing && <EditAchievementsModal entries={entries} onClose={() => setEditing(false)} />}
    </div>
  );
}
