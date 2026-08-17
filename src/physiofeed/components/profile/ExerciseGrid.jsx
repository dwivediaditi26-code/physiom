import { Heart } from "lucide-react";
import GradientTile from "../shared/GradientTile.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

export function ExerciseFullGrid() {
  const { exercises } = useAppData();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {exercises.map((e) => (
        <div key={e.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3">
          <GradientTile grad={e.grad} className="h-20 rounded-xl mb-2" />
          <p className="text-sm font-semibold text-slate-800">{e.title}</p>
          <p className="text-xs text-slate-400 mb-2">{e.subtitle}</p>
          <div className="flex items-center gap-1 text-xs text-slate-500"><Heart size={13} /> {e.likes}</div>
        </div>
      ))}
    </div>
  );
}

export function ExerciseStrip() {
  const { exercises } = useAppData();
  return (
    <div className="mt-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-semibold text-slate-900">Top shared exercises</p>
        <button className="text-xs font-medium text-violet-600">View all</button>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar pb-1">
        {exercises.map((e) => (
          <div key={e.id} className="w-28 shrink-0">
            <GradientTile grad={e.grad} className="h-20 rounded-xl mb-2" />
            <p className="text-xs font-semibold text-slate-800 truncate">{e.title}</p>
            <p className="text-[10px] text-slate-400">{e.subtitle}</p>
            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1"><Heart size={11} /> {e.likes}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
