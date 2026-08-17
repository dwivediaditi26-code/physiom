import { Users, Check } from "lucide-react";
import GradientTile from "../shared/GradientTile.jsx";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function CommunityCard({ community }) {
  const { joinCommunity } = useAppData();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <GradientTile grad={community.grad} className="h-16" />
      <div className="p-4">
        <h3 className="font-bold text-slate-900 text-sm mb-1">{community.name}</h3>
        <p className="text-xs text-slate-500 mb-3 line-clamp-2">{community.desc}</p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-slate-400"><Users size={13} /> {community.members.toLocaleString()} members</span>
          <button onClick={() => joinCommunity(community.id)}
            className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${community.joined ? "bg-slate-50 text-slate-500 border border-slate-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
            {community.joined ? <><Check size={12} /> Joined</> : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}
