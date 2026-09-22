// Sticky profile tab bar (2026-09-22 "LinkedIn for physiotherapists"
// redesign, Aditi's brief) -- Posts | About | Experience | Education |
// Research, shared by ProfilePage.jsx (own) and OtherProfilePage.jsx
// (someone else's). Dropped the standalone Clinical tab this pass
// (ClinicalProfileTab.jsx deleted) -- the brief is explicit that Clinical
// Skills/Expertise/Interests/Patient Populations shouldn't be their own
// section at all, not just folded elsewhere. Renamed Evidence -> Research
// to match ResearchEvidenceSection.jsx. Horizontally scrollable rather
// than equal-width segments (contrast Header.jsx's SectionNav) -- five
// labels still don't reliably fit as fixed-width segments at phone width
// the way the five-item app-section strip does once names run long.
//
// Sticky offset: stacks directly under PhysioFeed's own sticky header
// (.pf-header in physiofeed.css), which itself sits under physiom's outer
// app header on mobile -- see .pf-profile-tabs there for the same
// top-offset-stacking pattern .pf-header already established, and its
// comment for why this can't just be `top: 0`.
export const PROFILE_TABS = ["Posts", "About", "Experience", "Education", "Research"];

export default function ProfileTabs({ active, onChange }) {
  return (
    <nav className="pf-profile-tabs bg-white border-b border-slate-100 -mx-1 px-1 mb-4" aria-label="Profile sections">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => onChange(tab)}
            aria-current={active === tab ? "page" : undefined}
            className={`pf-font-head shrink-0 px-3.5 py-1.5 rounded-full text-sm font-bold transition-colors ${
              active === tab ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </nav>
  );
}
