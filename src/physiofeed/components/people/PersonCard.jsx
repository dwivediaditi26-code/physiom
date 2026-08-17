import { MapPin, UserPlus, Check } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function PersonCard({ person }) {
  const { followPerson } = useAppData();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <Avatar size={44} grad={person.grad} initials={initialsOf(person.name)} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate">{person.name}</p>
        <p className="text-xs text-slate-400 truncate">{person.role}</p>
        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {person.location} · {person.mutual} mutual</p>
      </div>
      <button onClick={() => followPerson(person.id)}
        className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${person.following ? "bg-slate-50 text-slate-500 border border-slate-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
        {person.following ? <><Check size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
      </button>
    </div>
  );
}
