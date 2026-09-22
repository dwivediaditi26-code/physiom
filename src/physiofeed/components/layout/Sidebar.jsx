import { NavLink } from "react-router-dom";
import { Icon } from "../shared/icons.jsx";
import { PRO_NAV } from "../shared/constants.js";
import { useAppData } from "../../context/AppDataContext.jsx";

function NavSection({ title, items }) {
  return (
    <div className="mb-6">
      <p className="px-3 mb-2 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `pf-font-head w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                isActive ? "bg-[#FFF4E0] text-[#B0790A]" : "text-slate-600 hover:bg-[#F7F5FF] hover:text-[#2B2140]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon name={item.icon} size={17} className={isActive ? "text-[#E09A1F]" : "text-slate-400"} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-[#FFF4E0] text-[#B0790A]">{item.badge}</span>}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// Note: the original CLINICAL_NAV (Dashboard/Patients/Assessments/SOAP/...)
// and the "Upgrade to Premium" upsell block were removed here. Physiom
// already has real versions of every clinical section (reachable via the
// Home/Clinical tabs) -- keeping stub links to them here would just be
// confusing duplicates, and "Upgrade to Premium" was a fabricated feature
// that doesn't exist in this app.
export default function Sidebar() {
  const { profile } = useAppData();
  return (
    <aside className="hidden lg:block w-60 shrink-0">
      <NavSection title="PhysioFeed" items={PRO_NAV} />
      {profile?.isAdmin && (
        <NavSection title="Admin" items={[
          { path: "/admin/reports", label: "Reported posts", icon: "ShieldCheck" },
          { path: "/admin/evidence", label: "Add Evidence", icon: "Plus" },
        ]} />
      )}
    </aside>
  );
}
