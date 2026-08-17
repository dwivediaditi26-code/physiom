import { Plus } from "lucide-react";
import { GRADIENTS, initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function StoriesBar() {
  const { stories, viewStory, profile, setComposerOpen } = useAppData();

  return (
    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar mb-4 px-0.5 py-1">
      <button onClick={() => setComposerOpen(true)} className="flex flex-col items-center gap-1 shrink-0 w-16">
        <div className="w-14 h-14 rounded-full p-[2px] bg-slate-200">
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            <div className="w-full h-full rounded-full bg-slate-50 flex items-center justify-center">
              <Plus size={18} className="text-violet-600" />
            </div>
          </div>
        </div>
        <span className="text-[11px] text-slate-500 truncate w-full text-center">Your story</span>
      </button>
      {stories.map((s) => (
        <button key={s.id} onClick={() => viewStory(s.id)} className="flex flex-col items-center gap-1 shrink-0 w-16">
          <div className={`w-14 h-14 rounded-full p-[2px] ${s.seen ? "bg-slate-200" : `bg-gradient-to-br ${GRADIENTS[s.grad]}`}`}>
            <div className="w-full h-full rounded-full bg-white p-[2px]">
              <div className={`w-full h-full rounded-full bg-gradient-to-br ${GRADIENTS[s.grad]} flex items-center justify-center text-white text-xs font-semibold`}>
                {initialsOf(s.name)}
              </div>
            </div>
          </div>
          <span className="text-[11px] text-slate-500 truncate w-full text-center">{s.name}</span>
        </button>
      ))}
    </div>
  );
}
