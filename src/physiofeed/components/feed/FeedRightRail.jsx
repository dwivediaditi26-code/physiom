import Avatar from "../shared/Avatar.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

const TRENDING = ["ACL Rehabilitation", "Dry Needling", "Low Back Pain", "Shoulder Instability"];

export default function FeedRightRail() {
  const { people, followPerson } = useAppData();
  const suggestions = people.filter((p) => !p.following).slice(0, 3);

  return (
    <aside className="hidden lg:block w-64 shrink-0 space-y-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">People you may know</p>
        <div className="space-y-3">
          {suggestions.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5">
              <Avatar size={34} grad={p.grad} initials={initialsOf(p.name)} photoUrl={p.avatarUrl} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                <p className="text-[10px] text-slate-400 truncate">{p.role} · {p.mutual} mutual</p>
              </div>
              <button onClick={() => followPerson(p.id)} className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-md bg-violet-50 text-violet-700 hover:bg-violet-100">Follow</button>
            </div>
          ))}
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <p className="text-sm font-semibold text-slate-900 mb-3">Trending in Physio</p>
        <div className="space-y-2.5">
          {TRENDING.map((t) => (
            <div key={t} className="text-sm"><p className="font-medium text-slate-700">#{t.replace(/\s/g, "")}</p><p className="text-xs text-slate-400">{t}</p></div>
          ))}
        </div>
      </div>
    </aside>
  );
}
