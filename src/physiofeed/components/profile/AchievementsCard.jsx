import { Icon } from "../shared/icons.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function AchievementsCard() {
  const { achievements } = useAppData();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900 mb-3">Achievements</p>
      <div className="space-y-3">
        {achievements.map((a) => (
          <div key={a.title} className="flex items-start gap-2.5">
            <Icon name={a.iconName} size={16} className={`shrink-0 mt-0.5 ${a.tone}`} />
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{a.title}</p><p className="text-xs text-slate-400">{a.subtitle}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
