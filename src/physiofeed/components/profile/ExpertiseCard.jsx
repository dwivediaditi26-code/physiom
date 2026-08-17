import StarRating from "../shared/StarRating.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function ExpertiseCard() {
  const { expertise, endorseSkill } = useAppData();
  const total = expertise.reduce((s, k) => s + k.count, 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <p className="text-sm font-semibold text-slate-900 mb-3">Clinical expertise</p>
      <div className="space-y-2.5">
        {expertise.map((s) => (
          <div key={s.name} className="flex items-center justify-between gap-2">
            <div className="min-w-0"><p className="text-sm text-slate-700 truncate">{s.name}</p><StarRating value={s.stars} /></div>
            <button onClick={() => endorseSkill(s.name)}
              className={`shrink-0 text-[10px] font-semibold px-2 py-1 rounded-md transition-colors ${s.endorsed ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-violet-50 hover:text-violet-600"}`}>
              {s.endorsed ? "Endorsed" : "+ Endorse"}
            </button>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-400 mt-3 pt-3 border-t border-slate-100">Endorsed by {total} colleagues</p>
    </div>
  );
}
