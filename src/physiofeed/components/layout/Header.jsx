import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, ChevronLeft } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { Icon } from "../shared/icons.jsx";
import { initialsOf } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Search-a-physio (2026-08-18): this bar used to be a decorative
// placeholder input that did nothing. Now it live-filters the same
// `people` list PeoplePage.jsx already searches (name/role/location),
// shows up to 5 matches in a dropdown, and hands off to the full People
// page (with the query carried over via ?q=) for anything beyond a quick
// lookup -- there's no "view a stranger's profile" page yet, so a result
// row takes you to the People list rather than a profile you can't reach.
export default function Header() {
  const [notifOpen, setNotifOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { notifications, profile, people } = useAppData();
  const navigate = useNavigate();
  const location = useLocation();

  const trimmedQuery = query.trim();
  const qLower = trimmedQuery.toLowerCase();
  const matches = trimmedQuery
    ? people.filter((p) =>
        p.name.toLowerCase().includes(qLower) ||
        (p.role || "").toLowerCase().includes(qLower) ||
        (p.location || "").toLowerCase().includes(qLower)
      ).slice(0, 5)
    : [];
  // Bug fix (2026-08-18): getPeople() deliberately excludes you from the
  // "people to follow" list (see the matching comment in PeoplePage.jsx),
  // so searching your own name here always came back empty -- looked
  // broken even though it was working as designed. Surface yourself as a
  // distinct "You" row (goes to your real profile, not the People list)
  // whenever the search matches you.
  const selfMatches = !!trimmedQuery && !!profile && (
    profile.name.toLowerCase().includes(qLower) ||
    (profile.role || "").toLowerCase().includes(qLower) ||
    (profile.location || "").toLowerCase().includes(qLower)
  );

  const goToPeople = (q) => {
    navigate(`/people?q=${encodeURIComponent(q)}`);
    setQuery("");
  };
  const goToOwnProfile = () => {
    navigate("/profile");
    setQuery("");
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      <div className="max-w-[1200px] mx-auto flex items-center gap-4 px-4 sm:px-6 h-16">
        {location.pathname !== "/feed" && (
          <button onClick={() => navigate(-1)} className="md:hidden p-1 -ml-1 text-slate-500">
            <ChevronLeft size={22} />
          </button>
        )}
        <Link to="/feed" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600" />
          <div className="hidden sm:block leading-tight">
            <p className="font-bold text-slate-900 text-sm">PhysioFeed</p>
            <p className="text-[10px] text-slate-400 -mt-0.5">Stronger Together</p>
          </div>
        </Link>

        <div className="hidden md:block relative flex-1 max-w-md">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-9">
            <Search size={15} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmedQuery) goToPeople(trimmedQuery);
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Search physios by name, specialty, or city…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
            />
          </div>
          {trimmedQuery && (
            <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-30">
              {selfMatches && (
                <button
                  onClick={goToOwnProfile}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 text-left"
                >
                  <Avatar size={30} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{profile.name} <span className="text-violet-500 font-medium">(You)</span></p>
                    <p className="text-[10px] text-slate-400 truncate">{profile.role}{profile.location ? ` · ${profile.location}` : ""}</p>
                  </div>
                </button>
              )}
              {matches.length > 0 ? (
                <>
                  {matches.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => goToPeople(p.name)}
                      className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 text-left"
                    >
                      <Avatar size={30} grad={p.grad} initials={initialsOf(p.name)} photoUrl={p.avatarUrl} />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">{p.role}{p.location ? ` · ${p.location}` : ""}</p>
                      </div>
                    </button>
                  ))}
                  <button
                    onClick={() => goToPeople(trimmedQuery)}
                    className="w-full text-center text-xs font-semibold text-violet-600 hover:text-violet-700 px-2 py-2 mt-1 border-t border-slate-100"
                  >
                    See all results in People
                  </button>
                </>
              ) : !selfMatches ? (
                <p className="text-xs text-slate-400 px-2 py-3 text-center">No physios found for "{trimmedQuery}"</p>
              ) : null}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-slate-50 focus:outline-none">
              <Bell size={19} className="text-slate-500" />
              {notifications.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-30">
                <p className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notifications</p>
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-slate-50">
                    <Icon name={n.iconName} size={16} className={`mt-0.5 shrink-0 ${n.tone}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{n.time} ago</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button className="hidden sm:block p-2 rounded-lg hover:bg-slate-50"><MessageSquare size={19} className="text-slate-500" /></button>
          {profile && (
            <Link to="/profile" className="hidden sm:flex items-center gap-2 focus:outline-none">
              <Avatar size={32} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
              <div className="leading-tight text-left">
                <p className="text-xs font-semibold text-slate-900">{profile.name.replace(", PT", "")}</p>
                <p className="text-[10px] text-slate-400">Physiotherapist</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
