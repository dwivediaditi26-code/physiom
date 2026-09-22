import { useState } from "react";
import { Pencil, Building2 } from "lucide-react";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditRotationsModal from "./EditRotationsModal.jsx";
import { parseExperienceEntry } from "./experienceUtils.js";

// Experience section (2026-09-22 "LinkedIn for physiotherapists" redesign,
// Aditi's brief: "one of the most important sections... chronological,
// LinkedIn-style cards"). Was "Clinical rotations & postings" rendering
// raw department/duration text with a Stethoscope icon on a pink accent --
// now parses each entry via experienceUtils.js's "<Title> — <Organization>"
// convention (still backed by the same rotations table's department/
// duration text columns, see mockData.js's ROTATIONS comment) into a
// proper title/organization/date-range card, monochrome slate/navy per
// Aditi's "dnt make it green at all" (see [[feedback_no_green_physiofeed_profile]]
// in the session's own memory notes -- pink was never the ask either, it
// was this component's old accent, dropped for the same "no clutter"
// reason as green).
export default function RotationsCard({ entries, readOnly = false }) {
  const { rotations: ownRotations } = useAppData();
  const rotations = entries ?? ownRotations;
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="pf-font-head text-sm font-extrabold text-slate-900">Experience</p>
        {!readOnly && (
          <button onClick={() => setEditing(true)} aria-label="Edit experience" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-md hover:bg-slate-50">
            <Pencil size={13} />
          </button>
        )}
      </div>
      {rotations.length === 0 ? (
        <p className="text-sm text-slate-400">{readOnly ? "No experience added yet." : "Add the roles where you've worked or trained."}</p>
      ) : (
        <div className="space-y-4">
          {rotations.map((r) => {
            const { title, organization, dateRange } = parseExperienceEntry(r);
            return (
              <div key={r.id} className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Building2 size={16} className="text-violet-600" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 leading-snug">{title || organization}</p>
                  {title && organization && <p className="text-sm text-slate-600">{organization}</p>}
                  {dateRange && <p className="text-xs text-slate-400 mt-0.5">{dateRange}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!readOnly && editing && <EditRotationsModal entries={rotations} onClose={() => setEditing(false)} />}
    </div>
  );
}
