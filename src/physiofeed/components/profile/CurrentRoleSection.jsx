import { Briefcase, Pencil } from "lucide-react";
import { useState } from "react";
import { parseExperienceEntry } from "./experienceUtils.js";
import EditRotationsModal from "./EditRotationsModal.jsx";

// Current Role card (2026-09-24 redesign, Aditi's brief: a dedicated
// "WHAT THEY DO + WHERE THEY DO IT" section separate from the full
// Experience timeline). Derived from the same rotations table -- the
// most recent "Present" entry, or the last one if none is marked
// Present. No new schema; if the therapist edits it, the edit opens
// the same Experience modal since a "current role" IS an Experience
// entry, just the topmost one.
export default function CurrentRoleSection({ rotations = [], isOwn = false }) {
  const [editing, setEditing] = useState(false);

  const current =
    rotations.find((r) => /present/i.test(r.duration || "")) ||
    rotations[rotations.length - 1];

  if (!current) {
    if (!isOwn) return null;
    return (
      <section className="px-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="pf-font-head text-base font-extrabold text-slate-900">Current Role</h2>
        </div>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="w-full flex items-center gap-3 border border-dashed border-slate-300 bg-white p-3.5 rounded-2xl hover:bg-slate-50 transition text-left"
        >
          <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Briefcase size={16} className="text-violet-600" /></div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700">Add your current role</p>
            <p className="text-xs text-slate-400">Where do you currently work or study?</p>
          </div>
        </button>
        {editing && <EditRotationsModal entries={rotations} onClose={() => setEditing(false)} />}
      </section>
    );
  }

  const { title, organization, dateRange } = parseExperienceEntry(current);

  return (
    <section className="px-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="pf-font-head text-base font-extrabold text-slate-900">Current Role</h2>
        {isOwn && (
          <button onClick={() => setEditing(true)} aria-label="Edit current role" className="text-slate-400 hover:text-slate-700 p-1 -m-1 rounded-md hover:bg-slate-50">
            <Pencil size={13} />
          </button>
        )}
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Briefcase size={16} className="text-violet-600" /></div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900 leading-snug">{title || organization}</p>
          {title && organization && <p className="text-sm text-slate-600">{organization}</p>}
          {dateRange && <p className="text-xs text-slate-400 mt-0.5">{dateRange}</p>}
        </div>
      </div>
      {isOwn && editing && <EditRotationsModal entries={rotations} onClose={() => setEditing(false)} />}
    </section>
  );
}
