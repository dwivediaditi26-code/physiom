import { useState } from "react";
import { Pencil } from "lucide-react";
import { Icon } from "../shared/icons.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditEducationModal from "./EditEducationModal.jsx";

// `entries` prop (2026-08-19): OtherProfilePage.jsx passes the OTHER
// user's real education_entries rows here (via getEducationByUser()) with
// readOnly -- previously other-user profiles had no Education card at
// all. Falls back to your own list from context (and shows the Edit
// button) when no entries prop is given, so ProfilePage.jsx's existing
// usage is unchanged.
export default function EducationCard({ entries, readOnly = false }) {
  const { education: ownEducation } = useAppData();
  const education = entries ?? ownEducation;
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Education & certifications</p>
        {!readOnly && (
          <button onClick={() => setEditing(true)} aria-label="Edit education & certifications" className="text-slate-400 hover:text-violet-600 p-1 -m-1 rounded-md hover:bg-violet-50">
            <Pencil size={13} />
          </button>
        )}
      </div>
      {education.length === 0 ? (
        <p className="text-sm text-slate-400">{readOnly ? "No education or certifications added yet." : "Add your education & certifications."}</p>
      ) : (
        <div className="space-y-3">
          {education.map((e) => (
            <div key={e.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Icon name={e.iconName} size={14} className="text-violet-600" /></div>
              <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{e.title}</p><p className="text-xs text-slate-400">{e.subtitle}</p></div>
            </div>
          ))}
        </div>
      )}
      {!readOnly && editing && <EditEducationModal entries={education} onClose={() => setEditing(false)} />}
    </div>
  );
}
