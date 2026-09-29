import { User, Activity } from "lucide-react";
import { PROFILE_ACCENTS } from "../shared/constants.js";

export const PROFILE_VIEWS = ["Professional Profile", "Activity"];

const VIEW_ICONS = { "Professional Profile": User, Activity: Activity };

// Two-way switch between the profile's two distinct views (2026-09-24,
// Aditi: activity/posts and the professional profile "should be like...
// two things" -- clicking one shows only that, not the other mixed in).
// NOT the old five-way ProfileTabs.jsx this replaced earlier the same
// day -- that fragmented About/Experience/Education/Research into four
// separate taps; here everything under "Professional Profile" stays one
// continuous scroll (About -> Current Role -> Education -> Experience ->
// Certifications -> Research -> Professional Evidence), and "Activity"
// is the only other thing that exists, since posts are what pushed all
// that content out of reach in the first place (see ProfilePage.jsx's
// own git history for that same complaint from a different pass).
// Restyled 2026-09-28 (Aditi sent a reference screenshot: icon + label,
// active tab gets a solid rounded box, "but not purple") -- takes the same
// `gradient` the rest of the header themes off (PROFILE_ACCENTS), instead
// of the old hardcoded violet, so it recolors with whatever accent the
// profile owner picked in Edit Profile.
export default function ProfileViewSwitch({ active, onChange, gradient }) {
  const accent = PROFILE_ACCENTS[gradient] || PROFILE_ACCENTS.violet;
  return (
    <div className="flex items-center gap-2 mb-5">
      {PROFILE_VIEWS.map((view) => {
        const Icon = VIEW_ICONS[view];
        const isActive = active === view;
        return (
          <button
            key={view}
            type="button"
            onClick={() => onChange(view)}
            aria-current={isActive ? "page" : undefined}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors ${
              isActive ? `bg-white border border-slate-100 shadow-sm ${accent.text}` : "text-slate-400 hover:bg-slate-50 hover:text-slate-600"
            }`}
          >
            <Icon size={15} className={isActive ? accent.icon : "text-slate-400"} />
            {view}
          </button>
        );
      })}
    </div>
  );
}
