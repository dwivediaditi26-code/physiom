import { AppDataProvider } from "./context/AppDataContext.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import "./physiofeed.css";

// Reuses PhysioFeed's own profile page design (cover, avatar, stats, tabs,
// posts) for physiom's real Profile tab -- same component, no separate
// build. No router needed here: ProfilePage and its subcomponents don't use
// any react-router hooks, only useAppData().
//
// The bio/stats/posts shown are still PhysioFeed's demo data (same caveat
// as the PhysioFeed tab itself -- not real follower counts for the actual
// logged-in user yet), so this stays clearly labeled rather than presenting
// fabricated numbers as real. Real sign-out is wired in below the profile
// card since that's the one genuinely real, necessary action this screen
// needs regardless of demo content.
export default function ProfileTabEntry({ onSignOut }) {
  return (
    <div className="physiofeed-root">
      <AppDataProvider>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium rounded-xl py-1.5 px-3 mb-4">
          Demo profile — bio, stats and posts below are placeholder content, not your real activity yet.
        </div>
        <div className="flex gap-6">
          <ProfilePage/>
        </div>
        <button onClick={onSignOut} className="w-full mt-4 py-2.5 bg-white border border-slate-200 rounded-xl font-semibold text-sm text-rose-600">
          Sign out
        </button>
      </AppDataProvider>
    </div>
  );
}
