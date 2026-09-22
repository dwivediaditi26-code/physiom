import { useState } from "react";
import { MapPin, UserPlus, Check, Clock, MessageSquare } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Avatar from "../shared/Avatar.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// The Connect button reads the real connections table (P2) rather than the
// `follows` row it used to stand in for. Demo people (mockData.js) have no
// real row and can't be connected to -- sendConnectionRequest throws a
// readable message for those, shown inline here.
export default function PersonCard({ person }) {
  const { connectionStates, connectWith, acceptConnection, cancelConnection } = useAppData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const state = connectionStates[person.id] || "none";

  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Couldn't do that.");
    } finally {
      setBusy(false);
    }
  };
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
        <p className="text-xs text-slate-600 truncate">{person.role}</p>
        <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {person.location} · {person.mutual} mutual</p>
      </Link>
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <button
          onClick={() => navigate(`/messages?with=${encodeURIComponent(person.id)}`)}
          aria-label={`Message ${person.name}`}
          className="shrink-0 p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-[#7C3AED]"
        >
          <MessageSquare size={15} />
        </button>
        {state === "connected" ? (
          <span className="pf-font-head shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200">
            <Check size={13} /> Connected
          </span>
        ) : state === "pending_sent" ? (
          <button onClick={() => run(() => cancelConnection(person.id))} disabled={busy} title="Tap to withdraw your request"
            className="pf-font-head shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 disabled:opacity-60">
            <Clock size={13} /> Pending
          </button>
        ) : state === "pending_received" ? (
          <button onClick={() => run(() => acceptConnection(person.id))} disabled={busy}
            className="pf-font-head shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60">
            <Check size={13} /> Accept
          </button>
        ) : (
          <button onClick={() => run(() => connectWith(person.id))} disabled={busy}
            className="pf-font-head shrink-0 flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-60">
            <UserPlus size={13} /> Connect
          </button>
        )}
      </div>
      {error && <p className="w-full text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
