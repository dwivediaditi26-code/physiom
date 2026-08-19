import { useState } from "react";
import { Pencil } from "lucide-react";
import { Icon } from "../shared/icons.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";
import EditAchievementsModal from "./EditAchievementsModal.jsx";

// Feature (2026-08-19): real editing. Same "always your own profile, so
// the Edit button is always safe to show" reasoning as EducationCard.jsx.
export default function AchievementsCard() {
  const { achievements } = useAppData();
  const [editing, setEditing] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Achievements</p>
        <button onClick={() => setEditing(true)} aria-label="Edit achievements" className="text-slate-400 hover:text-violet-600 p-1 -m-1 rounded-md hover:bg-violet-50">
          <Pencil size={13} />
        </button>
      </div>
      <div className="space-y-3">
        {achievements.map((a) => (
          <div key={a.id} className="flex items-start gap-2.5">
            <Icon name={a.iconName} size={16} className={`shrink-0 mt-0.5 ${a.tone}`} />
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{a.title}</p><p className="text-xs text-slate-400">{a.subtitle}</p></div>
          </div>
        ))}
      </div>
      {editing && <EditAchievementsModal entries={achievements} onClose={() => setEditing(false)} />}
    </div>
  );
}
