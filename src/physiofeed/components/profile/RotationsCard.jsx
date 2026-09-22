import { useState } from "react";
import { Pencil, Stethoscope } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditRotationsModal from "./EditRotationsModal.jsx";

// Clinical rotations & postings (2026-09-21, Aditi's brief: "Edit
// Clinical Profile & CV" -- one form feeding your public profile AND
// Explore's Instant Apply). Same "own list from context, or an `entries`
// prop for viewing someone else read-only" shape as EducationCard.jsx /
// AchievementsCard.jsx right next to it on the About tab -- see those
// for the fuller reasoning, not repeated here. Backed by
// supabase/add_profile_clinical_cv.sql's `rotations` table.
export default function RotationsCard({ entries, readOnly = false }) {
  const { rotations: ownRotations } = useAppData();
  const rotations = entries ?? ownRotations;
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Clinical rotations & postings</p>
        {!readOnly && (
          <button onClick={() => setEditing(true)} aria-label="Edit clinical rotations" className="text-slate-400 hover:text-violet-600 p-1 -m-1 rounded-md hover:bg-violet-50">
            <Pencil size={13} />
          </button>
        )}
      </div>
      {rotations.length === 0 ? (
        <p className="text-sm text-slate-400">{readOnly ? "No rotations added yet." : "Add the departments where you've had hands-on exposure."}</p>
      ) : (
        <div className="space-y-3">
          {rotations.map((r) => (
            <div key={r.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Stethoscope size={14} className="text-violet-600" /></div>
              <div className="min-w-0 flex-1 flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{r.department}</p>
                {r.duration && <p className="text-xs text-slate-400 shrink-0">{r.duration}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {!readOnly && editing && <EditRotationsModal entries={rotations} onClose={() => setEditing(false)} />}
    </div>
  );
}
