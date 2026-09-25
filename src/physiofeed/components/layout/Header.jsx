import { useState } from "react";
import { Link, matchPath, useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, ChevronLeft } from "lucide-react";
import Avatar from "../shared/Avatar.jsx";
import { initialsOf, PRO_NAV } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Mobile/tablet section switcher (2026-09-25 redesign, Aditi: "scrollable"):
// a row of independent, left-aligned pills instead of the previous fixed
// equal-width segmented control with a sliding thumb. That control was
// sized around "Evidence" (8 chars) as its longest label; "Opportunity" and
// "Case Discussion" broke that assumption and clipped to "Opportu…" /
// "Case D…" depending on which segment was active. Pills that size to
// their own text and scroll instead of compete for a fixed share never
// clip, at the cost of the old "every section visible at a glance" property
// -- same trade the Explore board's category chips and Feed's own topic
// tabs already made, so this also makes PhysioFeed's several pill-tab rows
// look and behave the same way instead of two different patterns.
// People was hidden behind the top bar's search icon at first, but that
// wasn't discoverable enough (2026-09-22, Aditi: "where is people button") --
// it's back in the strip now, per PRO_NAV's own order.
// Messages stays out: the top bar's message icon covers it on every
// PhysioFeed screen (AppFull.jsx pm-mobile-hdr), and the laptop sidebar
// still lists all seven.
const SECTIONS = PRO_NAV.filter((item) => item.path !== "/messages");
const SHORT_LABEL = { "Physio Feed": "Feed" };

function SectionNav() {
  const { pathname } = useLocation();
  // Same prefix rule NavLink uses, so a post opened via /discussions?post=…
  // still counts as Case Discussion.
  const activeIdx = SECTIONS.findIndex((s) => matchPath({ path: s.path, end: false }, pathname));

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" aria-label="PhysioFeed sections">
      {SECTIONS.map((item, i) => (
        <Link
          key={item.path}
          to={item.path}
          aria-current={i === activeIdx ? "page" : undefined}
          className={`pf-font-head shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors focus:outline-none ${
            i === activeIdx ? "bg-[#FFB020] text-[#3A2A00]" : "text-[#0D0D0D] hover:bg-[#F7F5FF]"
          }`}
        >
          {SHORT_LABEL[item.label] || item.label}
        </Link>
      ))}
    </nav>
  );
}

// Shared result list for both the desktop inline search bar and the
// mobile full-width search row -- same matches/selfMatches state, just
// rendered from two different trigger points.
function SearchResults({ trimmedQuery, selfMatches, matches, profile, goToOwnProfile, goToPeople, goToSearch }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-2">
      {selfMatches && (
        <button
          onClick={goToOwnProfile}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 text-left"
        >
          <Avatar size={30} grad={profile.gradient} initials={profile.initials} photoUrl={profile.avatarUrl} />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{profile.name} <span className="text-[#B0790A] font-medium">(You)</span></p>
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
            onClick={() => goToSearch(trimmedQuery)}
            className="w-full text-center text-xs font-semibold text-[#DB2777] hover:text-[#C2185B] px-2 py-2 mt-1 border-t border-slate-100"
          >
            See all results for "{trimmedQuery}"
          </button>
        </>
      ) : !selfMatches ? (
        /* P8 (2026-09-22): a name-only miss used to be a dead end here --
           the query might still match an opportunity, a post or a paper,
           and now there's a page that looks. */
        <button
          onClick={() => goToSearch(trimmedQuery)}
          className="w-full text-xs text-slate-500 px-2 py-3 text-center hover:bg-slate-50 rounded-xl"
        >
          No physios named "{trimmedQuery}" — <span className="font-semibold text-[#DB2777]">search everything</span>
        </button>
      ) : null}
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
  const [query, setQuery] = useState("");
  const { notifications, profile, people, unreadMessages } = useAppData();
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
  // P8 (2026-09-22): Enter and "see all" leave this people-only dropdown
  // for /search, which covers opportunities, posts and evidence too. The
  // dropdown itself stays people-first -- it's a quick name lookup, and
  // making it wait on four fetches per keystroke would ruin that.
  const goToSearch = (q) => {
    navigate(`/search?q=${encodeURIComponent(q)}`);
    setQuery("");
  };
  const goToOwnProfile = () => {
    navigate("/profile");
    setQuery("");
  };

  return (
    <header className="pf-header sticky z-20 bg-white border-b border-slate-200">
      {/* Mobile/tablet section nav (SectionNav above). The back chevron (any
          page but /feed) sits to its left. */}
      <div className="lg:hidden bg-white border-t border-slate-200">
        <div className="flex items-center gap-1 px-3 py-2 max-w-[460px] mx-auto">
          {location.pathname !== "/feed" && (
            <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-slate-500 shrink-0">
              <ChevronLeft size={18} />
            </button>
          )}
          <SectionNav />
        </div>
      </div>

      {/* Logo/icon row -- desktop only. On mobile the app's own top bar
          already carries the PhysioMind logo plus the search/bell/messages
          icons (this row used to be a second, empty-looking copy of it). */}
      <div className="relative hidden lg:block">
      <div className="max-w-[1200px] mx-auto flex items-center gap-3 px-4 sm:px-6 h-16">
        <Link to="/feed" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#DB2777] to-[#FFB020]" />
          <div className="hidden sm:block leading-tight">
            <p className="font-bold text-slate-900 text-sm">PhysioFeed</p>
            <p className="text-[10px] text-slate-400 -mt-0.5">Stronger Together</p>
          </div>
        </Link>

        <div className="hidden lg:block relative flex-1 max-w-md">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 h-9">
            <Search size={15} className="text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && trimmedQuery) goToSearch(trimmedQuery);
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Search physios by name, specialty, or city…"
              className="bg-transparent text-sm outline-none w-full placeholder:text-slate-400"
            />
          </div>
          {trimmedQuery && (
            <div className="absolute left-0 top-full mt-2 w-full z-30">
              <SearchResults trimmedQuery={trimmedQuery} selfMatches={selfMatches} matches={matches} profile={profile} goToOwnProfile={goToOwnProfile} goToPeople={goToPeople} goToSearch={goToSearch} />
            </div>
          )}
        </div>

        {/* Icon cluster (2026-08-27, Aditi's request): pinned at the row's
            end. Bell/Messages are lg:-only now -- on mobile these live in
            physiom's own top app header instead (AppFull.jsx's
            pm-mobile-hdr), which stays visible while this whole header
            scrolls away, so duplicating a second copy here just stacked
            two sticky bars showing the same three icons (2026-09-17,
            Aditi: "search notification and message should go up there
            when we open the physio feed"). The mobile search toggle this
            row used to also hold is gone for the same reason -- that
            header's search icon takes you to /search instead (P8; it went
            to People until 2026-09-22). */}
        <div className="hidden lg:flex items-center gap-1 sm:gap-3 ml-auto shrink-0">
          {/* Own page, not a dropdown (2026-08-27, Aditi's request): the old
              bell dropdown had no reliable close behaviour, especially once
              it lived inside the horizontally-scrolling mobile strip. A
              plain navigate() to /notifications has no open/closed state to
              get stuck in. */}
          <button onClick={() => navigate("/notifications")} aria-label="Notifications" className="relative p-2 rounded-lg hover:bg-slate-50 focus:outline-none">
            <Bell size={19} className="text-slate-500" />
            {/* Bug fix (2026-08-19): this used to be notifications.length > 0,
                so the red dot never went away even after you'd read every
                notification -- it wasn't tracking `read` at all. */}
            {notifications.some((n) => !n.read) && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
          </button>
          {/* Unread dot (P3): the bell has had one since 2026-08-19, the
              envelope never did -- a message that arrived while you were
              anywhere but /messages was completely silent. */}
          <button onClick={() => navigate("/messages")} aria-label={unreadMessages > 0 ? `Messages (${unreadMessages} unread)` : "Messages"} className="relative p-2 rounded-lg hover:bg-slate-50">
            <MessageSquare size={19} className="text-slate-500" />
            {unreadMessages > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />}
          </button>
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
      </div>
    </header>
  );
}
