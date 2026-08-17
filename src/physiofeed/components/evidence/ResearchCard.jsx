import { Bookmark, ExternalLink, Share2 } from "lucide-react";
import GradientTile from "../shared/GradientTile.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

const LEVEL_TONE = { "Level 1": "bg-emerald-50 text-emerald-700", "Level 2": "bg-amber-50 text-amber-700", "Level 3": "bg-slate-100 text-slate-600" };

export default function ResearchCard({ article }) {
  const { saveEvidence } = useAppData();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <GradientTile grad={article.grad} className="h-2" />
      <div className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${LEVEL_TONE[article.level] || "bg-slate-100 text-slate-600"}`}>{article.level}</span>
          <span className="text-[10px] font-medium text-slate-400">{article.type} · {article.year}</span>
        </div>
        <h3 className="font-bold text-slate-900 text-sm leading-snug mb-1.5">{article.title}</h3>
        <p className="text-xs text-slate-400 mb-3">{article.journal}</p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {article.tags.map((t) => <span key={t} className="text-[10px] font-medium text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-md">#{t}</span>)}
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700">Read research <ExternalLink size={12} /></button>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400"><Share2 size={15} /></button>
            <button onClick={() => saveEvidence(article.id)} className="p-1.5 rounded-lg hover:bg-slate-50">
              <Bookmark size={15} className={article.saved ? "fill-violet-600 text-violet-600" : "text-slate-400"} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
