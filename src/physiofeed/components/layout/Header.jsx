import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, ChevronLeft, X } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { Icon } from "../shared/icons.jsx";
import { initialsOf, PRO_NAV } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Shared result list for both the desktop inline search bar and the
// mobile full-width search row -- same matches/selfMatches state, just
// rendered from two different trigger points.
function SearchResults({ trimmedQuery, selfMatches, matches, profile, goToOwnProfile, goToPeople }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-2">
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
  );
}

// Shared between the desktop bell dropdown (absolute, anchored under the
// button) and the mobile bell sheet (fixed, escapes the merged strip's
// overflow-x-auto clipping -- an absolute dropdown nested in a scrolling
// row gets its vertical overflow clipped too, since overflow-x:auto forces
// overflow-y:auto on the same element). `className` carries the caller's
// positioning; everything else about the panel is identical.
function NotificationsPanel({ className, notifications, navigate, markNotificationRead, setNotifOpen }) {
  return (
    <div className={`${className} bg-white rounded-2xl border border-slate-200 shadow-lg p-2 z-30`}>
      <p className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Notifications</p>
      {notifications.length === 0 ? (
        <p className="text-xs text-slate-400 px-2 py-4 text-center">No notifications yet.</p>
      ) : (
        notifications.map((n) => {
          // Clicking a notification marks it read and, where we know
          // who triggered it (see add_notification_links.sql), takes
          // you to that person's profile or the message thread with
          // them -- there's no single-post detail page to link a
          // like/comment to, so the actor's profile is the honest
          // real destination instead of a dead link.
          const openNotification = () => {
            setNotifOpen(false);
            if (!n.read) markNotificationRead(n.id);
            if (n.link) navigate(n.link);
          };
          return (
            <button
              key={n.id}
              onClick={openNotification}
              className={`w-full flex items-start gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 text-left focus:outline-none ${!n.read ? "bg-violet-50/60" : ""}`}
            >
              <Icon name={n.iconName} size={16} className={`mt-0.5 shrink-0 ${n.tone}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-xs leading-snug ${n.read ? "text-slate-700" : "text-slate-900 font-medium"}`}>{n.text}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{n.time} ago</p>
              </div>
              {!n.read && <span className="shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-violet-600" aria-label="Unread" />}
            </button>
          );
        })
      )}
    </div>
  );
}

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
  // Mobile search (2026-08-27): the search bar above is `hidden md:block`,
  // so on phones there was no way to search physios at all -- not even a
  // hidden-behind-a-tap entry point. This toggles a full-width search row
  // in its place, reusing the exact same query/matches/selfMatches state
  // and result dropdown as the desktop bar.
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const { notifications, profile, people, markNotificationRead } = useAppData();
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
    setMobileSearchOpen(false);
  };
  const goToOwnProfile = () => {
    navigate("/profile");
    setQuery("");
    setMobileSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
      {/* Mobile-only section strip: PhysioFeed's own pages only (Feed/
          Evidence/Explore/Communities/People/Messages/Saved) -- moved
          above the logo/icon row (2026-08-27, Aditi's request: section
          pills on top, search/bell/message row below). Renders before the
          row below in DOM/visual order on mobile; invisible on desktop
          (md:hidden) so it doesn't affect desktop's layout at all. */}
      <div className="md:hidden relative border-t border-slate-200">
        <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto no-scrollbar">
          {PRO_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-300 ${
                  isActive ? "bg-violet-600 text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                }`
              }
            >
              <Icon name={item.icon} size={14} />
              {item.label}
            </NavLink>
          ))}
        </div>
        {/* Fade hint that there's more to scroll to. */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>

      {/* Logo/icon row -- horizontally scrollable on mobile too (2026-08-27,
          Aditi's request: "swipe the two rows") -- matches the section-pill
          strip above instead of being the odd one out that's pinned/fixed.
          Desktop keeps its normal non-scrolling layout via md:overflow-visible. */}
      <div className="relative">
      <div className="max-w-[1200px] mx-auto flex items-center gap-3 px-4 sm:px-6 h-16 overflow-x-auto no-scrollbar md:overflow-visible">
        {location.pathname !== "/feed" && (
          <button onClick={() => navigate(-1)} className="md:hidden p-1 -ml-1 text-slate-500 shrink-0">
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
            <div className="absolute left-0 top-full mt-2 w-full z-30">
              <SearchResults trimmedQuery={trimmedQuery} selfMatches={selfMatches} matches={matches} profile={profile} goToOwnProfile={goToOwnProfile} goToPeople={goToPeople} />
            </div>
          )}
        </div>

        {/* Icon cluster (2026-08-27, Aditi's request): pinned at the row's
            end on every breakpoint -- not part of the swipeable strip
            below, which is reserved for PhysioFeed's own section pills
            only. The search toggle only exists here on mobile; desktop
            already has the always-visible inline search bar above. */}
        <div className="flex items-center gap-1 sm:gap-3 ml-auto shrink-0">
          <button
            onClick={() => { setMobileSearchOpen((v) => !v); setNotifOpen(false); }}
            aria-label="Search"
            className="md:hidden p-2 rounded-lg hover:bg-slate-50 focus:outline-none"
          >
            {mobileSearchOpen ? <X size={19} className="text-slate-500" /> : <Search size={19} className="text-slate-500" />}
          </button>
          <div className="relative">
            <button onClick={() => setNotifOpen((v) => !v)} className="relative p-2 rounded-lg hover:bg-slate-50 focus:outline-none">
              <Bell size={19} className="text-slate-500" />
              {/* Bug fix (2026-08-19): this used to be notifications.length > 0,
                  so the red dot never went away even after you'd read every
                  notification -- it wasn't tracking `read` at all. */}
              {notifications.some((n) => !n.read) && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
            </button>
            {notifOpen && <NotificationsPanel className="fixed left-4 right-4 top-16 md:absolute md:left-auto md:right-0 md:top-full md:mt-2 md:w-80" notifications={notifications} navigate={navigate} markNotificationRead={markNotificationRead} setNotifOpen={setNotifOpen} />}
          </div>
          <button onClick={() => navigate("/messages")} aria-label="Messages" className="p-2 rounded-lg hover:bg-slate-50"><MessageSquare size={19} className="text-slate-500" /></button>
          {profile && (
            <Link to="/profile" className="hidden sm:flex items-center gap-2 focus:outline-none">
              <Avatar size={32} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
              {/* Bug fix (2026-08-19): "Physiotherapist" was hardcoded
                  here regardless of what a clinician actually set as
                  their role/specialty -- shows their real profile.role
                  now (edited via EditProfileModal.jsx), same field
                  ProfileHeader.jsx shows. */}
              <div className="leading-tight text-left">
                <p className="text-xs font-semibold text-slate-900">{profile.name.replace(", PT", "")}</p>
                <p className="text-[10px] text-slate-400">{profile.role || "Physiotherapist"}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </Link>
          )}
        </div>
      </div>
      {/* Fade hint that there's more to scroll to (mobile only). */}
      <div className="md:hidden pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
      </div>

      {mobileSearchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-10">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmedQuery) goToPeople(trimmedQuery);
                if (e.key === "Escape") setMobileSearchOpen(false);
              }}
              placeholder="Search physios by name, specialty, or city…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
            />
          </div>
          {trimmedQuery && (
            <div className="mt-2">
              <SearchResults trimmedQuery={trimmedQuery} selfMatches={selfMatches} matches={matches} profile={profile} goToOwnProfile={goToOwnProfile} goToPeople={goToPeople} />
            </div>
          )}
        </div>
      )}
    </header>
  );
}
