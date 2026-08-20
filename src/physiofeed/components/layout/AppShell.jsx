import { useState } from "react";
import { NavLink } from "react-router-dom";
import { X } from "lucide-react";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import { Icon } from "../shared/icons.jsx";
import { PRO_NAV } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Mobile-only horizontal tab strip for switching between PhysioFeed's own
// pages (Feed/Evidence/Explore/Communities/People/Messages/Saved).
// Replaces the original MobileNav, which duplicated physiom's own real
// bottom nav (Home/Clinical/PhysioFeed/Learn/Profile) with a second,
// conflicting fixed-bottom bar and stub links (Dashboard/Patients) to
// screens physiom already has for real.
//
// Redesign (2026-08-18, Aditi's request): the old version rendered each
// item as plain underlined text with a border-bottom active indicator --
// looked like a row of webpage hyperlinks, not app navigation, and once
// Messages was added there wasn't room for all 7 items, so the last one
// or two (Saved) scrolled fully off-screen with nothing hinting there was
// more to see. Now each item is a rounded pill (filled violet when
// active, soft gray otherwise) with real touch-target padding, and a
// subtle fade on the right edge signals there's more to scroll to.
function MobileTabs() {
  return (
    <nav className="md:hidden sticky top-16 z-10 bg-white border-b border-slate-200 relative">
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
      {/* Fade hint that there's more to scroll to -- the old version gave
          no visual cue that items past the visible edge existed at all. */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent" />
    </nav>
  );
}

function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] font-medium py-1 px-3">
      <span className="flex-1">Demo content — people and posts aren't real yet.</span>
      <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 text-amber-500 hover:text-amber-700">
        <X size={13}/>
      </button>
    </div>
  );
}

export default function AppShell({ children }) {
  const { loading } = useAppData();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-200 border-t-violet-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <DemoBanner/>
      <Header />
      <MobileTabs/>
      {/* pb-24 (not py-6's plain bottom-6) below 768px: physiom's own
          outer bottom nav bar (.pm-bnav in src/utils.jsx) is
          position:fixed;bottom:0 and sits OUTSIDE this component tree, so
          nothing here knew to leave room for it -- the last ~59px of
          every PhysioFeed page (most visibly the message composer on
          MessagesPage.jsx, and the compose bar on FeedPostCard.jsx) was
          rendering right underneath it, unclickable and mostly hidden. */}
      <div className="max-w-[1200px] mx-auto flex gap-6 px-4 sm:px-6 pt-6 pb-24 md:pb-6">
        <Sidebar />
        {children}
      </div>
    </div>
  );
}
