import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, MapPin } from "lucide-react";
import PersonCard from "../components/people/PersonCard.jsx";
import Avatar from "../components/shared/Avatar.jsx";
import { useAppData } from "../context/AppDataContext.jsx";

export default function PeoplePage() {
  const { people, profile, connectionRequests, acceptConnection, ignoreConnection } = useAppData();
  const [actingOn, setActingOn] = useState(null);
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  // Header.jsx's search dropdown hands off here via ?q=... -- keep the
  // local box in sync whenever that changes (e.g. searching again from
  // the header while already on this page), without overwriting
  // whatever the person then types directly into this page's own box.
  useEffect(() => { setQuery(urlQuery); }, [urlQuery]);
  const q = query.trim().toLowerCase();
  const filtered = people.filter((p) => !q || p.name.toLowerCase().includes(q) || p.role.toLowerCase().includes(q) || (p.location || "").toLowerCase().includes(q));

  // Bug fix (2026-08-18): searching your own name/specialty/city here
  // always came back empty. That's because getPeople() deliberately
  // excludes you from the "people to follow" list (db.js's `.neq("id",
  // uid)`) -- you can't follow yourself, so you never belonged in that
  // list to begin with. But when you're actively SEARCHING, coming back
  // with zero results for your own name looks broken, not intentional.
  // Show yourself as a distinct "You" result (no Follow button -- links
  // to your real profile instead) whenever the search matches you,
  // without adding yourself into the general people list/count.
  const selfMatches = !!q && !!profile && (
    profile.name.toLowerCase().includes(q) ||
    (profile.role || "").toLowerCase().includes(q) ||
    (profile.location || "").toLowerCase().includes(q)
  );

  return (
    <main className="flex-1 min-w-0">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-slate-900 mb-1">People</h1>
        <p className="text-sm text-slate-500">Physiotherapists across the PhysioFeed network.</p>
      </div>
      <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 h-10 mb-5">
        <Search size={16} className="text-slate-400" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people…" className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400" />
      </div>

      {/* Incoming connection requests (P2). Only rendered when there are
          any -- this is an inbox, not a permanent empty section. Sits above
          the people list because it's the one thing here that needs a
          decision from you rather than browsing. */}
      {connectionRequests.length > 0 && (
        <section className="mb-5">
          <h2 className="pf-font-head text-sm font-extrabold text-slate-900 mb-2.5">
            Connection requests <span className="text-slate-400 font-bold">({connectionRequests.length})</span>
          </h2>
          <div className="space-y-2.5">
            {connectionRequests.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-3">
                <Link to={`/profile/${r.userId}`} className="shrink-0">
                  <Avatar size={44} grad={r.grad} initials={r.initials} photoUrl={r.avatarUrl} />
                </Link>
                <Link to={`/profile/${r.userId}`} className="min-w-0 flex-1 basis-40">
                  <p className="text-sm font-semibold text-slate-800 truncate hover:underline">{r.name}</p>
                  <p className="text-xs text-slate-600 truncate">{r.role}</p>
                  {r.location && <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {r.location}</p>}
                </Link>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  <button
                    onClick={async () => { setActingOn(r.userId); try { await ignoreConnection(r.userId); } finally { setActingOn(null); } }}
                    disabled={actingOn === r.userId}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Ignore
                  </button>
                  <button
                    onClick={async () => { setActingOn(r.userId); try { await acceptConnection(r.userId); } finally { setActingOn(null); } }}
                    disabled={actingOn === r.userId}
                    className="pf-font-head text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        {selfMatches && (
          <div className="bg-white rounded-2xl border-2 border-[#FFD98A] shadow-sm p-4 flex items-center gap-3 sm:col-span-2">
            <Avatar size={44} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 truncate">{profile.name} <span className="text-[#B0790A] font-medium">(You)</span></p>
              <p className="text-xs text-slate-400 truncate">{profile.role}</p>
              {profile.location && <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5"><MapPin size={11} /> {profile.location}</p>}
            </div>
            <Link to="/profile" className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">View profile</Link>
          </div>
        )}
        {filtered.map((p) => <PersonCard key={p.id} person={p} />)}
      </div>
    </main>
  );
}
