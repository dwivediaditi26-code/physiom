import { useState } from "react";
import { Pencil } from "lucide-react";
import { Icon } from "../shared/icons.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditEducationModal from "./EditEducationModal.jsx";

// Feature (2026-08-19): real editing. This card only ever renders on YOUR
// OWN profile (ProfilePage.jsx has no "view someone else's profile" route
// yet -- see HANDOFF.md), so the Edit button is always safe to show here,
// same reasoning as ProfileHeader.jsx's "Edit Profile" button.
export default function EducationCard() {
  const { education } = useAppData();
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Education & certifications</p>
        <button onClick={() => setEditing(true)} aria-label="Edit education & certifications" className="text-slate-400 hover:text-violet-600 p-1 -m-1 rounded-md hover:bg-violet-50">
          <Pencil size={13} />
        </button>
      </div>
      <div className="space-y-3">
        {education.map((e) => (
          <div key={e.id} className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Icon name={e.iconName} size={14} className="text-violet-600" /></div>
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{e.title}</p><p className="text-xs text-slate-400">{e.subtitle}</p></div>
          </div>
        ))}
      </div>
      {editing && <EditEducationModal entries={education} onClose={() => setEditing(false)} />}
    </div>
  );
}
