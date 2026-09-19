import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { Search, Bell, MessageSquare, ChevronDown, ChevronLeft } from "lucide-react";
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

// Search-a-physio (2026-08-18): this bar used to be a decorative
// placeholder input that did nothing. Now it live-filters the same
// `people` list PeoplePage.jsx already searches (name/role/location),
// shows up to 5 matches in a dropdown, and hands off to the full People
// page (with the query carried over via ?q=) for anything beyond a quick
// lookup -- there's no "view a stranger's profile" page yet, so a result
// row takes you to the People list rather than a profile you can't reach.
export default function Header() {
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
    <header className="pf-header sticky z-20 bg-white border-b border-slate-200">
      {/* Mobile-only section nav: premium tactile 3D tiles (Feed/Evidence/
          Explore/Communities/People/Messages/Saved) (2026-09-18, Aditi,
          with a reference screenshot of soft-glass cards: "premium,
          modern 3D UI... LinkedIn's credibility, Instagram's polish,
          Apple-level spacing... subtle 3D depth, not childish" --
          upgrading the flat-ish square tiles from the previous pass
          (2026-09-17: "square buttons in 3D... light blue" -> "indigo"
          -> "the clicking on it that color should be light"). Styling
          lives in .pf-tile* (physiofeed.css) since the spec's hover-lift/
          click-compress states need real :hover/:active, not inline
          JSX style objects. The warm off-white strip background is
          "Layer 2" in the spec's 3-layer depth system -- the tiles
          (Layer 3) read as floating objects sitting just above it,
          rather than sitting directly on the page's plain white.
          The back-chevron (was in the logo/icon row below) lives here
          now, since that row -- previously just a bare unlabeled logo
          square on mobile once the search/bell/message icons moved to
          physiom's own top header -- is dropped entirely on mobile:
          "PhysioMind" already has its own name+logo up there, so this
          was a second one saying nothing, with a dead gap of empty
          header height around it ("there is a space is left... remove
          it"). Kept for desktop below unchanged. */}
      <div className="lg:hidden relative border-t border-slate-200" style={{ background: "#FAFAF8" }}>
        <div className="flex items-center gap-2 px-2.5 py-2 overflow-x-auto no-scrollbar">
          {location.pathname !== "/feed" && (
            <button onClick={() => navigate(-1)} aria-label="Back" className="p-1 -ml-1 text-slate-500 shrink-0">
              <ChevronLeft size={18} />
            </button>
          )}
          {PRO_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => "pf-tile shrink-0 focus:outline-none" + (isActive ? " pf-tile-active" : "")}
            >
              <span className="pf-tile-pod">
                <Icon name={item.icon} size={13} />
              </span>
              <span className="pf-tile-label">
                {item.label === "Physio Feed" ? "Feed" : item.label === "Communities" ? "Groups" : item.label}
              </span>
              <span className="pf-tile-dot" />
            </NavLink>
          ))}
        </div>
        {/* Fade hint that there's more to scroll to -- matches the strip's
            own #FAFAF8 now rather than pure white, so the fade doesn't
            show a visible seam against it. */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8" style={{ background: "linear-gradient(to left, #FAFAF8, transparent)" }} />
      </div>

      {/* Logo/icon row -- desktop only now (see comment above). */}
      <div className="relative hidden lg:block">
      <div className="max-w-[1200px] mx-auto flex items-center gap-3 px-4 sm:px-6 h-16">
        <Link to="/feed" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600" />
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
            end. Bell/Messages are lg:-only now -- on mobile these live in
            physiom's own top app header instead (AppFull.jsx's
            pm-mobile-hdr), which stays visible while this whole header
            scrolls away, so duplicating a second copy here just stacked
            two sticky bars showing the same three icons (2026-09-17,
            Aditi: "search notification and message should go up there
            when we open the physio feed"). The mobile search toggle this
            row used to also hold is gone for the same reason -- that
            header's search icon takes you to People instead. */}
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
      </div>
    </header>
  );
}
