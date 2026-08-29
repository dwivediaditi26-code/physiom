import { MapPin, UserPlus, Check, MessageSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../shared/Avatar.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

export default function PersonCard({ person }) {
  const { followPerson } = useAppData();
  const navigate = useNavigate();
  return (
    // flex-wrap (2026-08-27): on narrow real devices the row (avatar + name/
    // role/location + message icon + Follow/Following button) added up
    // wider than the viewport -- shrink-0 kept the buttons from being
    // crushed, but with nothing left to give, they were simply pushed past
    // the right edge and clipped by the page's global overflow-x:hidden
    // instead of ever being reachable. flex-wrap lets the action buttons
    // drop to their own row under the text when there isn't room beside it.
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
      <Link to={`/profile/${person.id}`} className="shrink-0">
        <Avatar size={44} grad={person.grad} initials={initialsOf(person.name)} photoUrl={person.avatarUrl} />
      </Link>
      <Link to={`/profile/${person.id}`} className="min-w-0 flex-1 basis-40">
        <p className="text-sm font-semibold text-slate-800 truncate hover:underline">{person.name}</p>
        <p className="text-xs text-slate-400 truncate">{person.role}</p>
        <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {person.location} · {person.mutual} mutual</p>
      </Link>
      <div className="flex items-center gap-2 ml-auto shrink-0">
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
    </div>
  );
}
