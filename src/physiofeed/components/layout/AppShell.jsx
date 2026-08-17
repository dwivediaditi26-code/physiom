import { NavLink } from "react-router-dom";
import Header from "./Header.jsx";
import Sidebar from "./Sidebar.jsx";
import { Icon } from "../shared/icons.jsx";
import { PRO_NAV } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

// Mobile-only horizontal tab strip for switching between PhysioFeed's own
// pages (Feed/Evidence/Explore/Communities/People/Saved). Replaces the
// original MobileNav, which duplicated physiom's own real bottom nav
// (Home/Clinical/PhysioFeed/Learn/Profile) with a second, conflicting
// fixed-bottom bar and stub links (Dashboard/Patients) to screens physiom
// already has for real.
function MobileTabs() {
  return (
    <nav className="md:hidden sticky top-16 z-10 bg-white border-b border-slate-200 flex items-center gap-1 px-2 overflow-x-auto no-scrollbar">
      {PRO_NAV.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 ${
              isActive ? "border-violet-600 text-violet-700" : "border-transparent text-slate-500"
            }`
          }
        >
          <Icon name={item.icon} size={14} />
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}

function DemoBanner() {
  return (
    <div className="bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium text-center py-1.5 px-4">
      Demo content — these people and posts aren't real. PhysioFeed will show your real community once it's live.
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
      <div className="max-w-[1200px] mx-auto flex gap-6 px-4 sm:px-6 py-6">
        <Sidebar />
        {children}
      </div>
    </div>
  );
}
