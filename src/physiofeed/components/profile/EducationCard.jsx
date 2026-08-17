import { Icon } from "../shared/icons.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function EducationCard() {
  const { education } = useAppData();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900 mb-3">Education & certifications</p>
      <div className="space-y-3">
        {education.map((e) => (
          <div key={e.title} className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center shrink-0"><Icon name={e.iconName} size={14} className="text-violet-600" /></div>
            <div className="min-w-0"><p className="text-sm font-medium text-slate-800">{e.title}</p><p className="text-xs text-slate-400">{e.subtitle}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}
