export const PROFILE_VIEWS = ["Professional Profile", "Activity"];

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
export default function ProfileViewSwitch({ active, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-slate-100 rounded-full p-1 mb-5">
      {PROFILE_VIEWS.map((view) => (
        <button
          key={view}
          type="button"
          onClick={() => onChange(view)}
          aria-current={active === view ? "page" : undefined}
          className={`flex-1 px-3 py-2 rounded-full text-sm font-bold transition-colors ${
            active === view ? "bg-white text-violet-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {view}
        </button>
      ))}
    </div>
  );
}
