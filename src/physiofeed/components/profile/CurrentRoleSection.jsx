import { Briefcase, Pencil } from "lucide-react";
import { useState } from "react";
import { parseExperienceEntry, getCurrentRoleEntry, getExperienceEntries, CURRENT_ROLE_MARK } from "./experienceUtils.js";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditCurrentRoleModal from "./EditCurrentRoleModal.jsx";

// Current Role card: a standalone "what I do + where" section. It used to be derived from the last
// Experience entry and its edit pencil opened the Experience list; it is now its own entry with its
// own editor (EditCurrentRoleModal) and never appears in, or changes, the Experience timeline.
export default function CurrentRoleSection({ rotations = [], isOwn = false }) {
  const [editing, setEditing] = useState(false);
  const { addRotation } = useAppData();
  const [copying, setCopying] = useState(false);

  const current = getCurrentRoleEntry(rotations);
  // Before this card was standalone it showed the latest Experience row. One tap copies that row in as
  // the Current Role (Experience itself is left alone), so existing profiles don't lose what they saw.
  const experience = getExperienceEntries(rotations);
  const latest = experience.find((r) => /present/i.test(r.duration || "")) || experience[experience.length - 1];
  const useLatest = async () => {
    if (!latest || copying) return;
    setCopying(true);
    try { await addRotation({ department: CURRENT_ROLE_MARK + parseExperienceEntry(latest).title.concat(parseExperienceEntry(latest).title ? " — " : "", parseExperienceEntry(latest).organization), duration: latest.duration }); }
    finally { setCopying(false); }
  };

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
        {latest && (
          <button type="button" onClick={useLatest} disabled={copying} className="mt-2 w-full text-left text-xs font-semibold text-violet-600 hover:text-violet-700 px-1 py-1.5 disabled:opacity-50">
            {copying ? "Adding…" : `Use my latest experience: ${parseExperienceEntry(latest).title || parseExperienceEntry(latest).organization}`}
          </button>
        )}
        {editing && <EditCurrentRoleModal entry={null} onClose={() => setEditing(false)} />}
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
      {isOwn && editing && <EditCurrentRoleModal entry={current} onClose={() => setEditing(false)} />}
    </section>
  );
}
