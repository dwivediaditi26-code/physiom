import { MapPin, UserPlus, Check, MessageSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../shared/Avatar.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function PersonCard({ person }) {
  const { followPerson } = useAppData();
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-3">
      <Link to={`/profile/${person.id}`} className="shrink-0">
        <Avatar size={44} grad={person.grad} initials={initialsOf(person.name)} photoUrl={person.avatarUrl} />
      </Link>
      <Link to={`/profile/${person.id}`} className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 truncate hover:underline">{person.name}</p>
        <p className="text-xs text-slate-400 truncate">{person.role}</p>
        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {person.location} · {person.mutual} mutual</p>
      </Link>
      <button
        onClick={() => navigate(`/messages?with=${encodeURIComponent(person.id)}`)}
        aria-label={`Message ${person.name}`}
        className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-violet-600"
      >
        <MessageSquare size={15} />
      </button>
      <button onClick={() => followPerson(person.id)}
        className={`shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${person.following ? "bg-slate-50 text-slate-500 border border-slate-200" : "bg-violet-600 text-white hover:bg-violet-700"}`}>
        {person.following ? <><Check size={13} /> Following</> : <><UserPlus size={13} /> Follow</>}
      </button>
    </div>
  );
}
